const { getUserInfo, getProfile, uploadImage } = require('../../utils/api');

Page({
  data: {
    nickname: '',
    avatarTempPath: '',
    avatarUrl: '',
    avatarDisplay: '',
    loading: false,
    error: '',
  },

  onLoad(options) {
    const sys = wx.getSystemInfoSync();
    const rawReturn = (options.returnUrl || options.returnurl || '').trim();
    let returnUrl = '/pages/index/index';
    if (rawReturn) {
      try {
        const decoded = decodeURIComponent(rawReturn).trim();
        returnUrl = decoded ? (decoded.startsWith('/') ? decoded : '/' + decoded) : returnUrl;
      } catch (e) {
        returnUrl = rawReturn.startsWith('/') ? rawReturn : '/' + rawReturn;
      }
    }
    this.setData({
      returnUrl,
      statusBarHeight: sys.statusBarHeight || 0,
    });
    if (getApp().globalData.userInfo) {
      this.navigateAfterLogin(returnUrl);
      return;
    }
    this.prefillFromExistingUser();
  },

  onNavBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  prefillFromExistingUser() {
    getProfile()
      .then((res) => {
        if (!res.result || !res.result.success || !res.result.data) return;
        const user = res.result.data;
        const profile = user.profile || {};
        const nickname = (profile.nickname || '').trim();
        const avatar = (profile.avatar || '').trim();
        if (!nickname && !avatar) return;
        this.setData({
          nickname: nickname || this.data.nickname,
          avatarUrl: avatar || this.data.avatarUrl,
          avatarDisplay: avatar || this.data.avatarDisplay,
        });
      })
      .catch(() => {});
  },

  // 用户点击选择头像（微信官方授权能力）；模拟器下可能报 ENOENT，头像改为可选
  onChooseAvatar(e) {
    const errMsg = e.detail && (e.detail.errMsg || e.detail.error);
    if (errMsg && String(errMsg).indexOf('fail') !== -1) {
      console.warn('chooseAvatar fail (e.g. simulator):', errMsg);
      this.setData({
        error: '当前环境头像不可用（可仅填昵称登录）',
        avatarUrl: '',
        avatarDisplay: '',
      });
      return;
    }
    const tempPath = (e.detail && e.detail.avatarUrl) || (e.detail && e.detail.tempFilePath) || '';
    if (!tempPath) {
      this.setData({ error: '' });
      return;
    }
    this.setData({ error: '', avatarTempPath: tempPath, avatarDisplay: tempPath, loading: true });
    uploadImage(tempPath)
      .then((res) => {
        const fileID = (res && res.fileID) || '';
        this.setData({
          avatarUrl: fileID,
          avatarDisplay: fileID || tempPath,
          loading: false,
        });
      })
      .catch((err) => {
        console.warn('upload avatar fail', err);
        const msg = (err && err.errMsg) || (err && err.message) || '';
        const isFileNotFound = /ENOENT|no such file|找不到/i.test(msg);
        this.setData({
          loading: false,
          error: isFileNotFound
            ? '当前环境头像不可用，仅填昵称也可登录'
            : msg.indexOf('permission') !== -1 || msg.indexOf('权限') !== -1
              ? '云存储权限不足，请在云开发控制台开通上传权限'
              : '头像上传失败，仅填昵称也可登录',
          avatarUrl: '',
          avatarDisplay: '',
          avatarTempPath: '',
        });
      });
  },

  onNicknameInput(e) {
    this.setData({
      nickname: (e.detail.value || '').trim(),
      error: '',
    });
  },

  onConfirmLogin() {
    const { nickname, avatarUrl, loading } = this.data;
    if (loading) return;
    if (!nickname || !nickname.trim()) {
      this.setData({ error: '请先填写昵称' });
      return;
    }
    this.setData({ loading: true, error: '' });
    this.doLogin({
      nickName: nickname.trim(),
      avatarUrl: avatarUrl || '',
    });
  },

  navigateAfterLogin(returnUrl) {
    const path = (returnUrl || '/pages/index/index').replace(/^\//, '');
    const tabBarPages = ['pages/index/index', 'pages/review/index', 'pages/team/index', 'pages/profile/index'];
    const isTabBar = tabBarPages.some((p) => path === p || path.startsWith(p + '?'));
    if (isTabBar) {
      wx.switchTab({ url: '/' + path.split('?')[0] });
    } else {
      wx.redirectTo({
        url: '/' + path,
        fail: () => wx.switchTab({ url: '/pages/index/index' }),
      });
    }
  },

  async doLogin(profile) {
    try {
      const res = await getUserInfo(profile);
      const result = res && res.result;
      if (result && result.success && result.data) {
        getApp().globalData.userInfo = result.data;
        this.navigateAfterLogin(this.data.returnUrl);
        return;
      }
      const errMsg =
        (result && result.error) ||
        (res.errMsg && res.errMsg.indexOf('fail') !== -1 ? '云函数调用失败，请检查网络与云环境' : null) ||
        '登录失败，请重试';
      this.setData({ error: errMsg });
    } catch (e) {
      console.error('login error', e);
      this.setData({
        error: (e && (e.errMsg || e.message)) || '网络异常，请重试',
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
