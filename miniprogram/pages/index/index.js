const { PAPERS } = require('../../utils/constants');

Page({
  data: {
    papers: PAPERS.map(p => ({ ...p, displayId: p.id.padStart(2, '0') }))
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },
  onSelectPaper(e) {
    const idx = e.currentTarget.dataset.index;
    const paper = this.data.papers[idx];
    if (!paper) return;
    const app = getApp();
    app.globalData.selectedPaper = paper;
    wx.navigateTo({
      url: '/pages/paper-selection/index'
    });
  }
});
