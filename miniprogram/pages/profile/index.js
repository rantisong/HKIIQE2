const { getUserInfo, getRecordList } = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    stats: [
      { label: '累计学习', value: '0', unit: '天' },
      { label: '刷题总数', value: '0', unit: '' },
      { label: '平均正确率', value: '0%', unit: '' },
    ],
    loading: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  onLoad() {
    this.loadUserData();
  },

  async loadUserData() {
    this.setData({ loading: true });
    
    try {
      // 获取用户信息
      const userRes = await getUserInfo();
      if (userRes.result && userRes.result.success) {
        this.setData({ userInfo: userRes.result.data });
      }

      // 获取答题记录统计
      const recordRes = await getRecordList(1, 100);
      if (recordRes.result && recordRes.result.success) {
        const records = recordRes.result.data.list;
        const totalRecords = records.length;
        
        // 计算平均正确率
        let totalScore = 0;
        records.forEach(r => {
          totalScore += r.score || 0;
        });
        const avgScore = totalRecords > 0 ? Math.round(totalScore / totalRecords) : 0;

        // 模拟累计学习天数（实际应根据记录计算）
        const studyDays = new Set(records.map(r => 
          new Date(r.createdAt).toDateString()
        )).size;

        this.setData({
          stats: [
            { label: '累计学习', value: String(studyDays), unit: '天' },
            { label: '刷题总数', value: String(totalRecords), unit: '' },
            { label: '平均正确率', value: `${avgScore}%`, unit: '' },
          ]
        });
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCustomerService() {
    wx.showToast({ title: '敬请期待', icon: 'none' });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  onPullDownRefresh() {
    this.loadUserData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
