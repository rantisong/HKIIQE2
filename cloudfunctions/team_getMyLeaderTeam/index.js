const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

/**
 * 获取头像的临时URL（仅处理云存储头像）
 */
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
 * 优化：不再递归计算 teamSize，直接从冗余字段读取
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

      // 从冗余字段直接读取 teamSize（显示该成员的下属人数，不包含本人）
      const toItem = (u) => {
      const p = u.profile || {};
      const records = u.user_iiqe_records || [];
      const passedSubjects = records.filter((r) => r && r.passed === true).map((r) => String(r.subjectId || '').padStart(2, '0'));
      return {
        _openid: u._openid,
        inviteCode: (u.inviteCode || '').trim().toUpperCase(),
        nickname: p.nickname || '微信用户',
        avatar: resolveAvatar(p.avatar || ''),
        createdAt: u.createdAt,
        passedSubjects,
        isMe: u._openid === openid,
        isLeader: false,
        // 显示该成员的下属人数（不包含本人）
        teamSize: u.directMemberCount || 0,
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
      // 团队长显示团队总人数
      teamSize: leader.totalMemberCount || 0,
    };

    const members = [leaderItem];
    const meInList = siblings.find((s) => s._openid === openid);
    const others = siblings.filter((s) => s._openid !== openid);
    if (meInList) {
      members.push(toItem(meInList));
    }
    others.forEach((s) => {
      members.push(toItem(s));
    });

    // 直接从团队长的冗余字段读取统计信息
    const leaderStats = {
      team: leader.totalMemberCount || 0,
      qualified: leader.qualifiedCount || 0,
      fullLicense: leader.fullLicenseCount || 0,
    };

    return { success: true, data: { leader: leaderItem, members, leaderStats } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
