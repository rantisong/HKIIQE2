const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

function getQualifiedAndFullLicense(records) {
  const arr = Array.isArray(records) ? records : [];
  const passedSet = new Set(
    arr.filter((r) => r && r.passed === true && r.subjectId).map((r) => String(r.subjectId).padStart(2, '0'))
  );
  const qualified = passedSet.has('01') && passedSet.has('03');
  const fullLicense = ['01', '02', '03', '04', '05'].every((s) => passedSet.has(s));
  return { qualified, fullLicense };
}

async function getSubordinateCount(usersCol, inviteCode) {
  const openids = await getSubordinateOpenids(usersCol, inviteCode);
  return openids.length;
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
 * 某成员为根的团队页数据（与团队主页结构一致）：stats、leader、directMembers
 * 入参：inviteCode 或 openid（二选一）
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const targetInviteCode = (event.inviteCode && String(event.inviteCode).trim().toUpperCase()) || '';
  const targetOpenid = (event.openid && String(event.openid).trim()) || '';

  try {
    const usersCol = db.collection('users');
    let target = null;
    if (targetInviteCode) {
      const res = await usersCol.where({ inviteCode: targetInviteCode }).limit(1).get();
      target = res.data && res.data[0];
    } else if (targetOpenid) {
      const res = await usersCol.where({ _openid: targetOpenid }).limit(1).get();
      target = res.data && res.data[0];
    }
    if (!target) return { success: false, error: '用户不存在' };

    const targetCode = (target.inviteCode || '').trim().toUpperCase();
    const subOpenids = await getSubordinateOpenids(usersCol, targetCode);

    let qualifiedCount = 0;
    let fullLicenseCount = 0;
    const BATCH = 20;
    for (let i = 0; i < subOpenids.length; i += BATCH) {
      const batch = subOpenids.slice(i, i + BATCH);
      const res = await usersCol.where({ _openid: _.in(batch) }).field({ user_iiqe_records: true }).get();
      for (const u of res.data || []) {
        const { qualified, fullLicense } = getQualifiedAndFullLicense(u.user_iiqe_records);
        if (qualified) qualifiedCount += 1;
        if (fullLicense) fullLicenseCount += 1;
      }
    }

    const stats = { team: subOpenids.length, qualified: qualifiedCount, fullLicense: fullLicenseCount };

    let leader = null;
    const targetInvitedBy = (target.invitedBy || '').trim().toUpperCase();
    if (targetInvitedBy) {
      const leaderRes = await usersCol.where({ inviteCode: targetInvitedBy }).limit(1).get();
      const leaderUser = leaderRes.data && leaderRes.data[0];
      if (leaderUser) {
        const leaderCode = (leaderUser.inviteCode || '').trim().toUpperCase();
        const leaderTeamSize = await getSubordinateCount(usersCol, leaderCode);
        const lp = leaderUser.profile || {};
        leader = {
          _openid: leaderUser._openid,
          inviteCode: leaderUser.inviteCode,
          nickname: lp.nickname || '微信用户',
          avatar: lp.avatar || '',
          teamSize: leaderTeamSize,
        };
      }
    }

    const directRes = await usersCol
      .where({ invitedBy: targetCode })
      .orderBy('createdAt', 'asc')
      .get();
    const directRows = directRes.data || [];
    const targetProfile = target.profile || {};
    const allAvatars = [
      targetProfile.avatar || '',
      ...(leader ? [leader.avatar || ''] : []),
      ...directRows.map((u) => (u.profile && u.profile.avatar) || ''),
    ];
    const avatarMap = await getTempUrlsForAvatars(cloud, allAvatars);
    const resolveAvatar = (url) => (url ? (avatarMap.get(url) || url) : '');

    if (leader && leader.avatar) leader.avatar = resolveAvatar(leader.avatar);

    const directMembers = [];
    for (const u of directRows) {
      const records = u.user_iiqe_records || [];
      const passedSubjects = records
        .filter((r) => r && r.passed === true && r.subjectId)
        .map((r) => String(r.subjectId).padStart(2, '0'));
      const teamSize = await getSubordinateCount(usersCol, (u.inviteCode || '').trim().toUpperCase());
      const p = u.profile || {};
      directMembers.push({
        _openid: u._openid,
        inviteCode: u.inviteCode,
        nickname: p.nickname || '微信用户',
        avatar: resolveAvatar(p.avatar || ''),
        createdAt: u.createdAt,
        passedSubjects,
        teamSize,
      });
    }

    const rootUser = {
      _openid: target._openid,
      inviteCode: target.inviteCode,
      nickname: targetProfile.nickname || '微信用户',
      avatar: resolveAvatar(targetProfile.avatar || ''),
    };

    return {
      success: true,
      data: { stats, leader, directMembers, rootUser },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
