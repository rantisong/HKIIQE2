const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function avatarToTempUrl(cloudApi, url) {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('cloud://')) return url;
  try {
    const res = await cloudApi.getTempFileURL({ fileList: [url.trim()] });
    const item = (res.fileList || [])[0];
    return (item && item.tempFileURL) ? item.tempFileURL : url;
  } catch (e) {
    return url;
  }
}

async function getSubordinateCount(usersCol, inviteCode) {
  let count = 0;
  let currentCodes = [inviteCode];
  const IN_MAX = 20;
  while (currentCodes.length > 0) {
    const chunk = currentCodes.splice(0, IN_MAX);
    const res = await usersCol.where({ invitedBy: _.in(chunk) }).get();
    for (const u of res.data || []) {
      count += 1;
      const code = (u.inviteCode || '').trim().toUpperCase();
      if (code) currentCodes.push(code);
    }
  }
  return count;
}

/**
 * 邀请我的团队长信息；无上级时 hasLeader: false
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
      return { success: true, data: { hasLeader: false, leader: null } };
    }

    const leaderRes = await usersCol.where({ inviteCode: invitedByNorm }).limit(1).get();
    const leader = leaderRes.data && leaderRes.data[0];
    if (!leader) {
      return { success: true, data: { hasLeader: false, leader: null } };
    }

    const leaderCode = (leader.inviteCode || '').trim().toUpperCase();
    const teamSize = await getSubordinateCount(usersCol, leaderCode);
    const profile = leader.profile || {};
    const avatarUrl = await avatarToTempUrl(cloud, profile.avatar || '');
    return {
      success: true,
      data: {
        hasLeader: true,
        leader: {
          _openid: leader._openid,
          inviteCode: leader.inviteCode,
          nickname: profile.nickname || '微信用户',
          avatar: avatarUrl,
          teamSize,
        },
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
