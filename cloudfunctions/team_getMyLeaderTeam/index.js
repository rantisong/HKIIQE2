const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 获取某 inviteCode 下所有下属的 openid 列表（多层级）
 */
async function getSubordinateOpenids(usersCol, inviteCode) {
  const openids = [];
  let currentCodes = [inviteCode];
  const IN_MAX = 20;
  while (currentCodes.length > 0) {
    const chunk = currentCodes.splice(0, IN_MAX);
    const res = await usersCol.where({ invitedBy: _.in(chunk) }).get();
    for (const u of res.data || []) {
      openids.push(u._openid);
      const code = (u.inviteCode || '').trim().toUpperCase();
      if (code) currentCodes.push(code);
    }
  }
  return openids;
}

/**
 * 从 user_iiqe_records 判断：合资格=01+03 通过，全牌照=01～05 全通过
 */
function getQualifiedAndFullLicense(records) {
  const arr = Array.isArray(records) ? records : [];
  const passedSet = new Set(
    arr.filter((r) => r && r.passed === true && r.subjectId).map((r) => String(r.subjectId).padStart(2, '0'))
  );
  const qualified = passedSet.has('01') && passedSet.has('03');
  const fullLicense = ['01', '02', '03', '04', '05'].every((s) => passedSet.has(s));
  return { qualified, fullLicense };
}

async function getTempUrlsForAvatars(cloudApi, avatars) {
  const cloudIds = [...new Set(avatars)].filter((a) => a && String(a).trim().startsWith('cloud://'));
  if (cloudIds.length === 0) return new Map();
  try {
    const res = await cloudApi.getTempFileURL({ fileList: cloudIds });
    const map = new Map();
    (res.fileList || []).forEach((item) => {
      if (item.fileID && item.tempFileURL) map.set(item.fileID, item.tempFileURL);
    });
    return map;
  } catch (e) {
    return new Map();
  }
}

/**
 * 所属团队列表：团队长第一，当前用户第二，其余按 createdAt 升序
 */
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    const invitedByNorm = (me.invitedBy || '').trim().toUpperCase();
    if (!me || !invitedByNorm) {
      return { success: true, data: { leader: null, members: [] } };
    }

    const leaderRes = await usersCol.where({ inviteCode: invitedByNorm }).limit(1).get();
    const leader = leaderRes.data && leaderRes.data[0];
    if (!leader) {
      return { success: true, data: { leader: null, members: [] } };
    }

    const leaderCode = (leader.inviteCode || '').trim().toUpperCase();
    const siblingsRes = await usersCol
      .where({ invitedBy: leaderCode })
      .orderBy('createdAt', 'asc')
      .get();
    const siblings = siblingsRes.data || [];
    const leaderProfile = leader.profile || {};
    const allAvatars = [leaderProfile.avatar || '', ...siblings.map((s) => (s.profile && s.profile.avatar) || '')];
    const avatarMap = await getTempUrlsForAvatars(cloud, allAvatars);
    const resolveAvatar = (url) => (url ? (avatarMap.get(url) || url) : '');

    const toItem = (u) => {
      const p = u.profile || {};
      const records = u.user_iiqe_records || [];
      const passedSubjects = records.filter((r) => r && r.passed === true).map((r) => String(r.subjectId || '').padStart(2, '0'));
      return {
        _openid: u._openid,
        inviteCode: u.inviteCode,
        nickname: p.nickname || '微信用户',
        avatar: resolveAvatar(p.avatar || ''),
        createdAt: u.createdAt,
        passedSubjects,
        isMe: u._openid === openid,
        isLeader: false,
      };
    };

    const leaderItem = {
      _openid: leader._openid,
      inviteCode: leader.inviteCode,
      nickname: leaderProfile.nickname || '微信用户',
      avatar: resolveAvatar(leaderProfile.avatar || ''),
      createdAt: leader.createdAt,
      passedSubjects: [],
      isMe: false,
      isLeader: true,
    };

    const members = [leaderItem];
    const meInList = siblings.find((s) => s._openid === openid);
    const others = siblings.filter((s) => s._openid !== openid);
    if (meInList) members.push(toItem(meInList));
    others.forEach((s) => members.push(toItem(s)));

    let leaderStats = { team: 0, qualified: 0, fullLicense: 0 };
    const openids = await getSubordinateOpenids(usersCol, leaderCode);
    if (openids.length > 0) {
      leaderStats.team = openids.length;
      const BATCH = 20;
      for (let i = 0; i < openids.length; i += BATCH) {
        const batch = openids.slice(i, i + BATCH);
        const res = await usersCol.where({ _openid: _.in(batch) }).field({ user_iiqe_records: true }).get();
        for (const u of res.data || []) {
          const { qualified, fullLicense } = getQualifiedAndFullLicense(u.user_iiqe_records);
          if (qualified) leaderStats.qualified += 1;
          if (fullLicense) leaderStats.fullLicense += 1;
        }
      }
    }

    return { success: true, data: { leader: leaderItem, members, leaderStats } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
