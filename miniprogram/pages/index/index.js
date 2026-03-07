const { PAPERS } = require('../../utils/constants');
const { getPaperList, getSubjectStats } = require('../../utils/api');

Page({
  data: {
    papers: [],
    loading: true,
    greeting: '您好，考生 👋',
  },

  onLoad() {
    this.updateGreeting();
    this.loadPapers();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.updateGreeting();
    this.loadPapers();
  },

  updateGreeting() {
    const app = getApp();
    const user = app.globalData && app.globalData.userInfo;
    const nickname = (user && user.profile && user.profile.nickname) ? (user.profile.nickname || '').trim() : '';
    const greeting = nickname ? `您好，${nickname} 👋` : '您好，考生 👋';
    this.setData({ greeting });
  },

  async loadPapers() {
    this.setData({ loading: true });
    const defaultSubjects = { '01': 0, '02': 0, '03': 0, '04': 0, '05': 0 };
    let subjectStats = defaultSubjects;
    let listRes = null;

    try {
      const [list, stats] = await Promise.all([
        getPaperList(1, 20, '', 'mock'),
        getSubjectStats(),
      ]);
      listRes = list;
      if (stats.result && stats.result.success && stats.result.data && stats.result.data.subjects) {
        subjectStats = { ...defaultSubjects, ...stats.result.data.subjects };
      }
    } catch (e) {
      console.warn('loadPapers', e);
    }

    const defaultPapers = PAPERS.map((p, index) => {
      const subjectId = String(p.id).padStart(2, '0');
      return {
        ...p,
        displayId: String(index + 1).padStart(2, '0'),
        completedCount: subjectStats[subjectId] ?? 0
      };
    });

    if (listRes && listRes.result && listRes.result.success && listRes.result.data.list && listRes.result.data.list.length > 0) {
      const cloudList = listRes.result.data.list;
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
          completedCount: subjectStats[subjectId] ?? 0
        };
      });
      this.setData({ papers });
    } else {
      this.setData({ papers: defaultPapers });
    }
    this.setData({ loading: false });
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
