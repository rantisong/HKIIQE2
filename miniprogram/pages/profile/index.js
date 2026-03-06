const { getProfile, getAnswerStats } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

const SUBJECT_NAMES = {
  '01': '保险原理及实务',
  '02': '一般保险',
  '03': '长期保险',
  '04': '强制性公积金计划考试',
  '05': '投资相连长期保险',
};

const SUBJECT_LABELS = { '01': '一', '02': '二', '03': '三', '04': '四', '05': '五' };

function normalizeIiqeRecords(list) {
  const ids = ['01', '02', '03', '04', '05'];
  const arr = Array.isArray(list) ? list : [];
  const byId = {};
  arr.forEach((r) => {
    const sid = String(r.subjectId || '').padStart(2, '0');
    if (ids.includes(sid)) byId[sid] = r;
  });
  return ids.map((sid) => {
    const r = byId[sid] || {};
    const examTime = r.examTime || '';
    const examDate = examTime ? new Date(examTime) : null;
    const now = new Date();
    let countdownText = '';
    let countdownClass = '';
    if (examDate && !isNaN(examDate.getTime())) {
      const diffMs = examDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays > 0) countdownText = `倒计时 ${diffDays}天`;
      else if (diffDays === 0) countdownText = '今天';
      else countdownText = '已过期';
      countdownClass = diffDays < 0 ? 'expired' : '';
    }
    const passedAt = r.passedAt || '';
    let passedAtDisplay = '';
    if (passedAt) {
      const d = new Date(passedAt);
      if (!isNaN(d.getTime())) passedAtDisplay = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      else passedAtDisplay = passedAt;
    }
    return {
      subjectId: sid,
      subjectLabel: SUBJECT_LABELS[sid] || sid,
      subjectName: r.subjectName || SUBJECT_NAMES[sid] || '',
      examTime: examTime,
      examTimeDisplay: examTime ? (examTime.length > 16 ? examTime.slice(0, 16) : examTime) : '',
      hasExamTime: !!examTime,
      countdownText,
      countdownClass,
      passed: !!r.passed,
      passedAt: passedAtDisplay,
    };
  });
}

function memberDays(createdAt) {
  if (!createdAt) return 0;
  const start = new Date(createdAt);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.ceil((now - start) / (24 * 60 * 60 * 1000)));
  return diff === 0 ? 1 : diff;
}

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
    examProgressList: [],
    loading: false,
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
        if (app.globalData.userInfo) {
          app.globalData.userInfo = user;
        }
        this.setData({ userInfo: user });
        this.setProfileDisplay(user);
        this.setData({
          examProgressList: normalizeIiqeRecords(user.user_iiqe_records),
        });
      }

      const statsRes = await getAnswerStats();
      let totalQuestions = 0;
      let totalCorrect = 0;
      if (statsRes.result && statsRes.result.success && statsRes.result.data) {
        totalQuestions = statsRes.result.data.totalQuestions || 0;
        totalCorrect = statsRes.result.data.totalCorrect || 0;
      }
      const accuracyPercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const user = this.data.userInfo;
      const days = user && user.createdAt ? memberDays(user.createdAt) : 0;

      this.setData({
        stats: [
          { label: '累计学习', value: String(days), unit: '天' },
          { label: '刷题总数', value: String(totalQuestions), unit: '' },
          { label: '平均正确率', value: `${accuracyPercent}%`, unit: '' },
        ],
      });

      if (!this.data.examProgressList || this.data.examProgressList.length === 0) {
        this.setData({
          examProgressList: normalizeIiqeRecords(this.data.userInfo ? this.data.userInfo.user_iiqe_records : []),
        });
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onExamProgressItem() {
    wx.navigateTo({ url: '/pages/profile-iiqe/index' });
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/profile-settings/index' });
  },

  onPullDownRefresh() {
    this.loadUserData().then(() => {
      wx.stopPullDownRefresh();
    });
  },
});
