const { MOCK_TEAM_MEMBERS } = require('../../utils/constants');

Page({
  data: {
    stats: [
      { label: '团队', value: '20' },
      { label: '合资格', value: '10' },
      { label: '全牌照', value: '3' }
    ],
    members: MOCK_TEAM_MEMBERS.map(m => ({
      ...m,
      dots: [1, 2, 3, 4, 5].map(p => ({ num: p, passed: m.progress.indexOf(p) >= 0 }))
    }))
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },
  onTeamLeaderTap() {
    wx.navigateTo({
      url: '/pages/team-detail/index'
    });
  }
});
