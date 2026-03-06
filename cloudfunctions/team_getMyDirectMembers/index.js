const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
 * 直属下属列表（邀请人为当前用户），按 createdAt 升序；每人含 teamSize、passedSubjects
 */
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: true, data: { list: [] } };
    const myCode = (me.inviteCode || '').trim().toUpperCase();
    if (!myCode) return { success: true, data: { list: [] } };

    const res = await usersCol
      .where({ invitedBy: myCode })
      .orderBy('createdAt', 'asc')
      .get();
    const rows = res.data || [];
    const avatarMap = await getTempUrlsForAvatars(
      cloud,
      rows.map((u) => (u.profile && u.profile.avatar) || '')
    );
    const list = [];
    for (const u of rows) {
      const records = u.user_iiqe_records || [];
      const passedSubjects = records
        .filter((r) => r && r.passed === true && r.subjectId)
        .map((r) => String(r.subjectId).padStart(2, '0'));
      const teamSize = await getSubordinateCount(usersCol, (u.inviteCode || '').trim().toUpperCase());
      const p = u.profile || {};
      const rawAvatar = p.avatar || '';
      const avatar = rawAvatar ? (avatarMap.get(rawAvatar) || rawAvatar) : '';
      list.push({
        _openid: u._openid,
        inviteCode: u.inviteCode,
        nickname: p.nickname || '微信用户',
        avatar,
        createdAt: u.createdAt,
        passedSubjects,
        teamSize,
      });
    }

    return { success: true, data: { list } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
