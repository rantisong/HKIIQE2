const { PAPERS } = require('../../utils/constants');
const { getExamStats, getPassRatePercent } = require('../../utils/examStats');
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
    this.loadPapers();
  },

  async loadPapers() {
    this.setData({ loading: true });
    const { passCount } = getExamStats();
    const passRatePercent = getPassRatePercent();
    const defaultPapers = PAPERS.map((p, index) => ({
      ...p,
      displayId: String(index + 1).padStart(2, '0'),
      completedCount: passCount,
      passRate: passRatePercent
    }));

    try {
      const res = await getPaperList(1, 20, '', 'mock');
      if (res.result && res.result.success && res.result.data.list && res.result.data.list.length > 0) {
        const cloudList = res.result.data.list;
        const papers = PAPERS.map((p, index) => {
          const subjectId = String(p.id).padStart(2, '0');
          const cloudPaper = cloudList.find(c => String(c.subjectId || c.id || '').padStart(2, '0') === subjectId);
          const base = cloudPaper ? {
            id: cloudPaper._id,
            name: cloudPaper.name || p.name,
            fullName: cloudPaper.fullName || p.fullName,
            questionCount: cloudPaper.questionCount || p.questionCount,
            durationMinutes: cloudPaper.durationMinutes || p.durationMinutes,
            paperType: 'mock',
            subjectId: cloudPaper.subjectId || subjectId
          } : { ...p };
          return {
            ...base,
            displayId: String(index + 1).padStart(2, '0'),
            completedCount: passCount,
            passRate: passRatePercent
          };
        });
        this.setData({ papers });
      } else {
        this.setData({ papers: defaultPapers });
      }
    } catch (e) {
      this.setData({ papers: defaultPapers });
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
    this.loadPapers();
    wx.stopPullDownRefresh();
  }
});
