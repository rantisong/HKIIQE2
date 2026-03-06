const { updateInvitedBy } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

Page({
  data: {
    inviteCode: '',
    loading: false,
    error: '',
  },

  async onLoad() {
    await requireLogin('/pages/profile-invite/index');
  },

  onInput(e) {
    this.setData({
      inviteCode: (e.detail && e.detail.value) || '',
      error: '',
    });
  },

  async onConfirm() {
    const code = (this.data.inviteCode || '').trim().toUpperCase();
    if (!code) {
      this.setData({ error: '请输入邀请码' });
      return;
    }
    if (code.length !== 6) {
      this.setData({ error: '邀请码为 6 位' });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const res = await updateInvitedBy(code);
      if (res.result && res.result.success) {
        wx.showToast({ title: '已更新', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      } else {
        this.setData({ error: (res.result && res.result.error) || '更新失败' });
      }
    } catch (e) {
      this.setData({ error: (e.message || e.errMsg) || '网络异常' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
