const { getPaperList } = require('../../utils/api');

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

  async loadPapers() {
    this.setData({ loading: true });
    
    try {
      const res = await getPaperList(1, 20);
      
      if (res.result && res.result.success) {
        const papers = res.result.data.list.map((p, index) => ({
          ...p,
          displayId: String(index + 1).padStart(2, '0')
        }));
        this.setData({ papers });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载试卷失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
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
  },

  onPullDownRefresh() {
    this.loadPapers().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
