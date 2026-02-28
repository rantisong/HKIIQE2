const { getReport } = require('../../utils/api');

function formatTimeSpent(seconds) {
  if (seconds == null || seconds < 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

Page({
  data: {
    record: null,
    answerDots: [],
    loading: false,
    scoreValue: 0,
    accuracyPercent: 0,
    timeSpentText: '--',
    passed: false,
    passRatePercent: 0,
    passCount: 0,
    totalCount: 0,
    fromExamResult: false
  },

  onLoad(options) {
    const app = getApp();
    const examResult = app.globalData.examResult;
    if (examResult) {
      this.setData({
        scoreValue: examResult.accuracyPercent,
        accuracyPercent: examResult.accuracyPercent,
        timeSpentText: formatTimeSpent(examResult.timeSpent),
        passed: examResult.passed,
        passRatePercent: examResult.passRatePercent ?? 0,
        passCount: examResult.passCount ?? 0,
        totalCount: examResult.totalCount ?? 0,
        fromExamResult: true
      });
      app.globalData.examResult = null;
      return;
    }
    if (options.id) {
      this.loadReport(options.id);
    }
  },

  async loadReport(recordId) {
    this.setData({ loading: true });
    
    try {
      const res = await getReport(recordId);
      
      if (res.result && res.result.success) {
        const record = res.result.data;
        
        // 生成答题状态圆点
        const answerDots = (record.results || []).map((r, i) => ({
          num: i + 1,
          wrong: !r.isCorrect,
          unanswered: !record.answers || record.answers[i] === undefined
        }));
        
        this.setData({ record, answerDots });
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