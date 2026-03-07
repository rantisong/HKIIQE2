const { getReport } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

function formatTimeSpent(seconds) {
  if (seconds == null || seconds < 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

Page({
  data: {
    record: null,
    loading: false,
    scoreValue: 0,
    accuracyPercent: 0,
    timeSpentText: '--',
    passed: false,
    fromExamResult: false
  },

  async onLoad(options) {
    const app = getApp();
    const examResult = app.globalData.examResult;
    if (examResult) {
      this.setData({
        scoreValue: examResult.accuracyPercent,
        accuracyPercent: examResult.accuracyPercent,
        timeSpentText: formatTimeSpent(examResult.timeSpent),
        passed: examResult.passed,
        fromExamResult: true
      });
      app.globalData.examResult = null;
      return;
    }
    if (options.id) {
      const ok = await requireLogin('/pages/report/index?id=' + options.id);
      if (!ok) return;
      this.loadReport(options.id);
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  async loadReport(recordId) {
    this.setData({ loading: true });
    
    try {
      const res = await getReport(recordId);
      
      if (res.result && res.result.success) {
        const record = res.result.data;
        this.setData({ record });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载报告失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onBack() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});