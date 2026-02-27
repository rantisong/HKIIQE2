Page({
  data: {
    leader: {
      name: 'Jason Lee',
      title: '资深区域总监',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jason',
      stats: [
        { label: '团队总人数', value: '1,248' },
        { label: '本月新增', value: '156' },
        { label: '活跃成员', value: '892' }
      ]
    }
  },
  onBack() {
    wx.navigateBack();
  }
});
