const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 更新当前用户资料：常驻城市、香港身份获取时间
 * 入参：city?（string）、hkIdentityAcquiredAt?（string，yyyy-MM-dd 或空）
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

  const updates = { updatedAt: new Date() };
  if (city !== undefined) updates.city = city;
  if (hkIdentityAcquiredAt !== undefined) updates.hkIdentityAcquiredAt = hkIdentityAcquiredAt;

  if (Object.keys(updates).length <= 1) {
    return { success: true, data: {} };
  }

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: false, error: '用户不存在' };

    await usersCol.doc(me._id).update({ data: updates });
    return { success: true, data: { city: updates.city, hkIdentityAcquiredAt: updates.hkIdentityAcquiredAt } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
