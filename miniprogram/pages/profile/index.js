const { getProfile, getRecordList } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    avatarDisplay: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    nicknameDisplay: '微信用户',
    inviteCodeDisplay: '--',
    stats: [
      { label: '累计学习', value: '0', unit: '天' },
      { label: '刷题总数', value: '0', unit: '' },
      { label: '平均正确率', value: '0%', unit: '' },
    ],
    loading: false
  },

  async onShow() {
    const ok = await requireLogin('/pages/profile/index', { fromTab: true });
    if (!ok) return;
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.loadUserData();
  },

  onLoad() {
    this.loadUserData();
  },

  setProfileDisplay(user) {
    if (!user) return;
    const profile = user.profile || {};
    const nickname = (profile.nickname || '').trim() || '微信用户';
    const avatar = (profile.avatar || '').trim();
    const inviteCode = (user.inviteCode || (user._id ? String(user._id).slice(-8).toUpperCase() : '') || '--');
    this.setData({
      nicknameDisplay: nickname,
      avatarDisplay: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
      inviteCodeDisplay: inviteCode,
    });
  },

  async loadUserData() {
    this.setData({ loading: true });
    const app = getApp();
    const cached = app.globalData.userInfo;
    if (cached) {
      this.setProfileDisplay(cached);
    }
    try {
      const userRes = await getProfile();
      if (userRes.result && userRes.result.success && userRes.result.data) {
        const user = userRes.result.data;
        // 仅当已登录（本地已有 userInfo）时用云端数据刷新缓存，避免未点击「确认授权并登录」就被视为已登录
        if (app.globalData.userInfo) {
          app.globalData.userInfo = user;
        }
        this.setData({ userInfo: user });
        this.setProfileDisplay(user);
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
          getApp().globalData.userInfo = null;
          wx.showToast({ title: '已退出', icon: 'none', duration: 1500 });
          setTimeout(() => {
            const returnUrl = encodeURIComponent('/pages/profile/index');
            wx.reLaunch({ url: `/pages/login/index?from=logout&returnUrl=${returnUrl}` });
          }, 300);
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
