Page({
  data: {
    stats: [
      { label: '累计学习', value: '24', unit: '天' },
      { label: '刷题总数', value: '1,240', unit: '' },
      { label: '平均正确率', value: '78%', unit: '' },
    ]
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },
  onCustomerService() {
    wx.showToast({ title: '敬请期待', icon: 'none' });
  },
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  }
});
