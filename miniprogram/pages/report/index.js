const { getReport } = require('../../utils/api');

Page({
  data: {
    record: null,
    answerDots: [],
    loading: false
  },

  onLoad(options) {
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