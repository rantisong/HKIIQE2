Component({
  data: {
    show: true, // 默认显示游客提示
  },
  lifetimes: {
    attached() {
      this.updateShow();
    },
  },
  pageLifetimes: {
    show() {
      this.updateShow();
    },
  },
  methods: {
    onTap() {
      // 点击时检查用户是否已注册，已注册则跳转登录页，未注册才跳转 profile
      this.checkAndNavigate();
    },

    async checkAndNavigate() {
      try {
        const profileRes = await wx.cloud.callFunction({
          name: 'user_getProfile',
          data: {},
        });
        const user = profileRes.result && profileRes.result.success && profileRes.result.data;
        if (user) {
          // 已注册用户，跳转登录页（让用户确认登录）
          wx.navigateTo({ url: '/pages/login/index?returnUrl=/pages/profile/index' });
        } else {
          // 未注册用户，跳转 profile 引导注册
          wx.switchTab({ url: '/pages/profile/index' });
        }
      } catch (e) {
        console.warn('checkAndNavigate failed:', e);
        wx.switchTab({ url: '/pages/profile/index' });
      }
    },

    updateShow() {
      const app = getApp();
      app.globalData = app.globalData || {};

      // 只有当 userInfo 存在（用户已通过微信授权登录）时才隐藏游客提示
      // openidInSystem 只用于其他逻辑判断，不控制游客提示的显示
      if (app.globalData.userInfo) {
        this.setData({ show: false });
      } else {
        // 未登录时，始终显示游客提示
        this.setData({ show: true });
      }
    },
  },
});
