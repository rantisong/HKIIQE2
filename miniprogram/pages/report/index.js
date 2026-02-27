Page({
  data: {
    answerDots: Array.from({ length: 25 }, (_, i) => ({ num: i + 1, wrong: [3, 12, 19].includes(i) }))
  },
  onBack() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
