Page({
  data: {
    subjects: [
      { id: '01', name: '卷一', fullName: '保险原理及实务', collected: 42 },
      { id: '02', name: '卷二', fullName: '一般保险', collected: 15 },
      { id: '03', name: '卷三', fullName: '长期保险', collected: 28 },
      { id: '04', name: '卷四', fullName: '强制性公积金计划', collected: 31 },
      { id: '05', name: '卷五', fullName: '投资相连长期保险', collected: 12 },
    ]
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },
  onSelectSubject(e) {
    const idx = e.currentTarget.dataset.index;
    const sub = this.data.subjects[idx];
    if (!sub) return;
    const paper = {
      id: sub.id,
      name: sub.name,
      fullName: sub.fullName,
      questionCount: sub.collected,
      completedCount: 0,
      passRate: 0
    };
    const app = getApp();
    app.globalData.selectedPaper = paper;
    wx.navigateTo({
      url: '/pages/review-session/index'
    });
  }
});
