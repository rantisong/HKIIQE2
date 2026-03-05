const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 仅根据当前 openid 查询用户，不创建。用于判断是否已注册、登录页预填等
 */
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: true, data: null };
  try {
    const res = await db.collection('users').where({ _openid: openid }).get();
    const user = res.data && res.data[0] ? res.data[0] : null;
    return { success: true, data: user };
  } catch (e) {
    return { success: false, error: e.message, data: null };
  }
};
