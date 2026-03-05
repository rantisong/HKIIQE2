const { MOCK_TEAM_MEMBERS } = require('../../utils/constants');
const { requireLogin } = require('../../utils/auth');

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
  async onShow() {
    const ok = await requireLogin('/pages/team/index', { fromTab: true });
    if (!ok) return;
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },
  async onTeamLeaderTap() {
    const ok = await requireLogin('/pages/team-detail/index');
    if (!ok) return;
    wx.navigateTo({
      url: '/pages/team-detail/index'
    });
  }
});
