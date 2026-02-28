const { PAPERS } = require('../../utils/constants');

Page({
  data: {
    papers: [],
    loading: true,
  },

  onLoad() {
    this.loadPapers();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  loadPapers() {
    this.setData({ loading: true });
    // 使用 constants 中的五个考试科目（卷一～卷五）作为展示列表
    const papers = PAPERS.map((p, index) => ({
      ...p,
      displayId: String(index + 1).padStart(2, '0')
    }));
    this.setData({ papers, loading: false });
    // 若已部署云函数 exam_getPaperList，可在此调用 getPaperList 合并云端数据
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
  },

  onPullDownRefresh() {
    this.loadPapers();
    wx.stopPullDownRefresh();
  }
});
