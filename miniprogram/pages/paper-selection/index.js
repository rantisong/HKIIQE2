const { getPaperDetail } = require('../../utils/api');

Page({
  data: {
    paper: null,
    examList: [
      { title: '2026年2月真题', count: 100, practiceCount: 3, accuracyRate: 82 },
      { title: '2026年1月模拟卷', count: 100, practiceCount: 1, accuracyRate: 65 },
      { title: '2025年12月真题', count: 80, practiceCount: 0, accuracyRate: null },
      { title: '2025年10月考题回顾', count: 100, practiceCount: 5, accuracyRate: 94 },
    ],
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadPaperDetail(options.id);
    } else {
      const app = getApp();
      const paper = app.globalData.selectedPaper;
      if (!paper) {
        wx.navigateBack();
        return;
      }
      this.setData({ paper });
    }
  },

  async loadPaperDetail(paperId) {
    this.setData({ loading: true });
    
    try {
      const res = await getPaperDetail(paperId);
      
      if (res.result && res.result.success) {
        this.setData({ paper: res.result.data });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载试卷详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onStartExam(e) {
    const app = getApp();
    const paper = app.globalData.selectedPaper || this.data.paper;
    const examIndex = e.currentTarget.dataset.examIndex;
    if (examIndex !== undefined && examIndex !== '' && parseInt(examIndex, 10) >= 0) {
      const exam = this.data.examList[parseInt(examIndex, 10)];
      if (exam) {
        app.globalData.selectedExamPaper = {
          questionCount: exam.count,
          title: exam.title,
          practiceCount: exam.practiceCount,
          accuracyRate: exam.accuracyRate
        };
      } else {
        app.globalData.selectedExamPaper = null;
      }
    } else {
      app.globalData.selectedExamPaper = null;
    }
    wx.navigateTo({
      url: '/pages/exam/index'
    });
  },

  onBack() {
    wx.navigateBack();
  }
});
