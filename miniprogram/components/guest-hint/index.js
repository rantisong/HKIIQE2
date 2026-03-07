Component({
  data: {
    show: false,
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
      wx.switchTab({ url: '/pages/profile/index' });
    },
    updateShow() {
      const app = getApp();
      const show = !(app.globalData && app.globalData.userInfo);
      if (this.data.show !== show) {
        this.setData({ show });
      }
    },
  },
});
