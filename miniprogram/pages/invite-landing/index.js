/**
 * 邀请落地页：仅用于扫码进入时接收 scene，并跳转登录页带 inviteCode（与分享链接一致）
 */
function getScene(options) {
  let raw = '';
  if (options && options.scene != null && options.scene !== '') {
    try {
      raw = decodeURIComponent(String(options.scene)).trim();
    } catch (e) {
      raw = String(options.scene).trim();
    }
  }
  if (!raw && typeof wx.getLaunchOptionsSync === 'function') {
    try {
      const launch = wx.getLaunchOptionsSync();
      if (launch && launch.query && launch.query.scene != null && launch.query.scene !== '') {
        try {
          raw = decodeURIComponent(String(launch.query.scene)).trim();
        } catch (e) {
          raw = String(launch.query.scene).trim();
        }
      }
    } catch (e) {}
  }
  if (!raw) {
    const app = getApp();
    if (app.globalData && app.globalData.pendingInviteCode) {
      raw = String(app.globalData.pendingInviteCode).trim();
      app.globalData.pendingInviteCode = null;
    }
  }
  return raw.toUpperCase().replace(/\s+/g, '').slice(0, 32);
}

Page({
  data: { loading: true },

  onLoad(options) {
    const code = getScene(options);
    if (code && /^[0-9A-Za-z]+$/.test(code)) {
      wx.reLaunch({ url: '/pages/login/index?inviteCode=' + encodeURIComponent(code) });
    } else {
      wx.reLaunch({ url: '/pages/login/index' });
    }
  },
});
