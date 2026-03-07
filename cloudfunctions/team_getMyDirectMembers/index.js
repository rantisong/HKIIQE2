const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
 * 直属下属列表（邀请人为当前用户），按 createdAt 升序
 * 优化：不再为每个成员递归查询 teamSize，直接从冗余字段读取
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

    // 查询直属下属（不再需要递归计算 teamSize）
    const res = await usersCol
      .where({ invitedBy: myCode })
      .orderBy('createdAt', 'asc')
      .get();
    const rows = res.data || [];

    // 批量获取头像 URL
    const avatarMap = await getTempUrlsForAvatars(
      cloud,
      rows.map((u) => (u.profile && u.profile.avatar) || '')
    );

    // 从冗余字段直接读取 teamSize，不再递归查询
    const list = rows.map((u) => {
      const records = u.user_iiqe_records || [];
      const passedSubjects = records
        .filter((r) => r && r.passed === true && r.subjectId)
        .map((r) => String(r.subjectId).padStart(2, '0'));
      const p = u.profile || {};
      const rawAvatar = p.avatar || '';
      const avatar = rawAvatar ? (avatarMap.get(rawAvatar) || rawAvatar) : '';
      return {
        _openid: u._openid,
        inviteCode: u.inviteCode,
        nickname: p.nickname || '微信用户',
        avatar,
        createdAt: u.createdAt,
        passedSubjects,
        // 显示该成员的下属人数（不包含本人）
        teamSize: u.directMemberCount || 0,
      };
    });

    return { success: true, data: { list } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
