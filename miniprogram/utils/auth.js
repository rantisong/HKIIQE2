/**
 * 登录态校验与引导
 * 仅以「是否在登录页完成过授权并登录」为准，不在此处调用云函数，避免未授权即自动建号
 */
const DEFAULT_LOGIN_PAGE = '/pages/login/index';

/**
 * 是否已登录（仅看本地缓存的 userInfo，该值仅在登录页完成授权并点击确认后由云函数返回并写入）
 * @returns {Promise<boolean>}
 */
function ensureLogin() {
  const app = getApp();
  const hasUser = !!(app.globalData && app.globalData.userInfo);
  return Promise.resolve(hasUser);
}

/**
 * 是否为游客：仅当 openid 在系统中不存在时为 true（需在「我的」等处通过 getProfile 设置 globalData.openidInSystem）
 * @returns {boolean}
 */
function isGuest() {
  const app = getApp();
  return (app.globalData && app.globalData.openidInSystem) !== true;
}

/**
 * 需要登录时跳转到登录页
 * @param {string} [returnUrl] 登录成功后要跳转的页面路径（含 query 时需已 encodeURIComponent）
 * @param {{ fromTab?: boolean }} [opts] fromTab 为 true 时使用 redirectTo，用户点返回会回到上一页并终止登录，不会再次弹出授权
 * @returns {Promise<boolean>} 已登录为 true；未登录会跳转登录页并返回 false
 */
function requireLogin(returnUrl, opts) {
  return ensureLogin().then((ok) => {
    if (ok) return true;
    wx.showToast({ title: '请先登录', icon: 'none', duration: 2000 });
    const url = returnUrl
      ? `${DEFAULT_LOGIN_PAGE}?returnUrl=${encodeURIComponent(returnUrl)}`
      : DEFAULT_LOGIN_PAGE;
    if (opts && opts.fromTab) {
      wx.redirectTo({ url });
    } else {
      wx.navigateTo({ url });
    }
    return false;
  });
}

module.exports = {
  ensureLogin,
  requireLogin,
  isGuest,
  DEFAULT_LOGIN_PAGE,
};
