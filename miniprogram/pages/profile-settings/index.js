const { getProfile, getTeamMyLeader, updateInvitedBy, updateProfile } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

function formatInviterNickname(nickname = '') {
  const raw = String(nickname || '').trim();
  if (!raw) return '';
  const hasChinese = /[\u4e00-\u9fff]/.test(raw);
  const limit = hasChinese ? 3 : 8;
  const chars = Array.from(raw);
  if (chars.length <= limit) return raw;
  return chars.slice(0, limit).join('');
}

Page({
  data: {
    inviteCode: '',
    inviteError: '',
    inviteLoading: false,
    hasJoinedTeam: false,
    currentInviteCode: '',
    inviteEditing: false,
    inviterNickname: '',
    inviterNicknameDisplay: '',
    region: [],
    city: '',
    cityDisplay: '',
    cityLoading: false,
    hkIdentityDate: '',
    hkIdentityDisplay: '',
    hkIdentityAcquiredAt: '',
    hkLoading: false,
  },

  async onLoad() {
    await requireLogin('/pages/profile-settings/index');
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const res = await getProfile();
      if (res.result && res.result.success && res.result.data) {
        const u = res.result.data;
        const city = u.city || '';
        let region = [];
        if (city) {
          const parts = city.split(/\s+/);
          if (parts.length >= 2) region = [parts[0], parts[1]];
          else if (parts.length === 1) region = [parts[0]];
        }
        const hk = u.hkIdentityAcquiredAt || '';
        const inv = (u.invitedBy && String(u.invitedBy).trim()) || '';
        this.setData({
          inviteCode: '',
          city,
          cityDisplay: city,
          region,
          hasJoinedTeam: !!inv,
          currentInviteCode: inv ? inv.toUpperCase() : '',
          inviteEditing: false,
          inviterNickname: '',
          inviterNicknameDisplay: '',
          hkIdentityAcquiredAt: hk,
          hkIdentityDate: hk ? hk.slice(0, 10) : '',
          hkIdentityDisplay: hk ? hk.slice(0, 10) : '',
        });

        if (inv) {
          try {
            const leaderRes = await getTeamMyLeader();
            const data = leaderRes && leaderRes.result && leaderRes.result.data;
            const leader = data && data.leader;
            const nickname = (leader && leader.nickname) || '';
            this.setData({
              inviterNickname: nickname,
              inviterNicknameDisplay: formatInviterNickname(nickname),
            });
          } catch (e) {
            // ignore leader fetch errors; still show invite code
          }
        }
      }
    } catch (e) {
      console.error('loadProfile', e);
    }
  },

  onInviteInput(e) {
    this.setData({
      inviteCode: (e.detail && e.detail.value) || '',
      inviteError: '',
    });
  },

  onInviteEdit() {
    this.setData({
      inviteEditing: true,
      inviteCode: '',
      inviteError: '',
    });
  },

  async onInviteConfirm() {
    const code = (this.data.inviteCode || '').trim().toUpperCase();
    if (!code) {
      this.setData({ inviteError: '请输入邀请码' });
      return;
    }
    if (code.length !== 6) {
      this.setData({ inviteError: '邀请码为 6 位' });
      return;
    }
    this.setData({ inviteLoading: true, inviteError: '' });
    try {
      const res = await updateInvitedBy(code);
      if (res.result && res.result.success) {
        wx.showToast({ title: '已更新', icon: 'success' });
        this.setData({ inviteEditing: false });
        this.loadProfile();
      } else {
        this.setData({ inviteError: (res.result && res.result.error) || '更新失败' });
      }
    } catch (e) {
      this.setData({ inviteError: (e.message || e.errMsg) || '网络异常' });
    } finally {
      this.setData({ inviteLoading: false });
    }
  },

  onCityChange(e) {
    const val = e.detail && e.detail.value;
    if (!Array.isArray(val) || val.length < 2) return;
    const province = val[0] || '';
    const city = val[1] || '';
    const cityDisplay = province && city ? `${province} ${city}` : province || city;
    this.setData({
      region: val,
      city: cityDisplay,
      cityDisplay,
    });
  },

  async onCitySave() {
    const city = (this.data.city || '').trim();
    this.setData({ cityLoading: true });
    try {
      const res = await updateProfile({ city });
      if (res.result && res.result.success) {
        wx.showToast({ title: '已保存', icon: 'success' });
        this.setData({ cityDisplay: city });
      } else {
        wx.showToast({ title: (res.result && res.result.error) || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: (e.message || e.errMsg) || '保存失败', icon: 'none' });
    } finally {
      this.setData({ cityLoading: false });
    }
  },

  onHkDateChange(e) {
    const val = (e.detail && e.detail.value) || '';
    this.setData({
      hkIdentityDate: val,
      hkIdentityDisplay: val,
      hkIdentityAcquiredAt: val,
    });
  },

  async onHkSave() {
    const hkIdentityAcquiredAt = (this.data.hkIdentityAcquiredAt || '').trim();
    this.setData({ hkLoading: true });
    try {
      const res = await updateProfile({ hkIdentityAcquiredAt });
      if (res.result && res.result.success) {
        wx.showToast({ title: '已保存', icon: 'success' });
      } else {
        wx.showToast({ title: (res.result && res.result.error) || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: (e.message || e.errMsg) || '保存失败', icon: 'none' });
    } finally {
      this.setData({ hkLoading: false });
    }
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
      },
    });
  },
});
