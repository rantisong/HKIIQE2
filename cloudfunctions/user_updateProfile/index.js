const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 更新当前用户资料：头像、昵称、联系电话、常驻城市、香港身份获取时间
 * 入参：phone?、city?、hkIdentityAcquiredAt?、profile?（{ nickname?, avatar? }）
 * 不传的字段不更新。
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const city = typeof event.city === 'string' ? event.city.trim() : undefined;
  const hkIdentityAcquiredAt = typeof event.hkIdentityAcquiredAt === 'string'
    ? event.hkIdentityAcquiredAt.trim()
    : undefined;
  const phone = typeof event.phone === 'string' ? event.phone.trim() : undefined;
  const profileInput = event.profile && typeof event.profile === 'object' ? event.profile : undefined;

  const updates = { updatedAt: new Date() };
  if (city !== undefined) updates.city = city;
  if (hkIdentityAcquiredAt !== undefined) updates.hkIdentityAcquiredAt = hkIdentityAcquiredAt;
  if (phone !== undefined) updates.phone = phone;
  if (profileInput) {
    const profile = { ...(event.profile || {}) };
    if (typeof profile.nickname === 'string') profile.nickname = profile.nickname.trim();
    if (typeof profile.avatar === 'string') profile.avatar = profile.avatar.trim();
    updates.profile = profile;
  }

  if (Object.keys(updates).length <= 1) {
    return { success: true, data: {} };
  }

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: false, error: '用户不存在' };

    const dataToUpdate = { updatedAt: updates.updatedAt };
    if (city !== undefined) dataToUpdate.city = city;
    if (hkIdentityAcquiredAt !== undefined) dataToUpdate.hkIdentityAcquiredAt = hkIdentityAcquiredAt;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (profileInput) {
      const cur = me.profile || {};
      const newNickname = typeof profileInput.nickname === 'string' ? profileInput.nickname.trim() : '';
      const newAvatar = typeof profileInput.avatar === 'string' ? profileInput.avatar.trim() : '';
      dataToUpdate.profile = {
        nickname: newNickname !== '' ? newNickname : (cur.nickname || ''),
        avatar: newAvatar !== '' ? newAvatar : (cur.avatar || ''),
      };
    }
    await usersCol.doc(me._id).update({ data: dataToUpdate });
    return { success: true, data: {} };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
