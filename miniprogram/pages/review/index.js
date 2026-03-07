const { isGuest } = require('../../utils/auth');
const { getReviewList } = require('../../utils/api');

Page({
  data: {
    subjects: [
      { id: '01', name: '卷一', fullName: '保险原理及实务', collected: 0 },
      { id: '02', name: '卷二', fullName: '一般保险', collected: 0 },
      { id: '03', name: '卷三', fullName: '长期保险', collected: 0 },
      { id: '04', name: '卷四', fullName: '强制性公积金计划', collected: 0 },
      { id: '05', name: '卷五', fullName: '投资相连长期保险', collected: 0 },
    ]
  },
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    if (isGuest()) {
      this.setData({ subjects: this.data.subjects.map((s) => ({ ...s, collected: 0 })) });
      return;
    }
    // 从云端拉取当前用户各科目的收藏数量
    try {
      const res = await getReviewList();
      const { result } = res || {};
      if (!result || !result.success || !result.data) return;
      const { subjects: list } = result.data;
      if (!Array.isArray(list)) return;

      const map = {};
      list.forEach((item) => {
        if (item && item.subjectId) {
          map[item.subjectId] = item.collected || 0;
        }
      });

      const subjects = this.data.subjects.map((s) => ({
        ...s,
        collected: map[s.id] != null ? map[s.id] : 0,
      }));
      this.setData({ subjects });
    } catch (e) {
      // 失败时保持默认值不影响页面展示
      console.error('getReviewList failed', e);
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
