const { getUserInfo, getProfile, uploadImage } = require('../../utils/api');
const { VALIDATORS, MESSAGES } = require('../../utils/constants');

Page({
  data: {
    nickname: '',
    avatarTempPath: '',
    avatarUrl: '',
    avatarDisplay: '',
    phone: '',
    inviteCode: '',
    inviteCodeReadonly: false,
    loading: false,
    error: '',
    isNewUser: null,
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
    const inviteCode = (options.inviteCode || '').trim().toUpperCase().slice(0, 6);
    const inviteCodeReadonly = inviteCode.length === 6;
    this.setData({
      returnUrl,
      inviteCode,
      inviteCodeReadonly,
      statusBarHeight: sys.statusBarHeight || 0,
    });
    // 不自动登录，用户需点击"微信一键登录"按钮才能登录
    // 但仍预填已有用户的信息（如果已注册）
    this.prefillFromExistingUser();
  },

  onShow() {
    // 每次显示登录页时，不自动登录，只确保页面状态正确
    // 用户必须点击"微信一键登录"按钮
  },

  onNavBack() {
    getApp().globalData.openidInSystem = false;
    wx.switchTab({ url: '/pages/index/index' });
  },

  prefillFromExistingUser() {
    getProfile()
      .then((res) => {
        if (!res.result || !res.result.success) {
          this.setData({ isNewUser: true });
          return;
        }
        const user = res.result.data;
        if (!user) {
          this.setData({ isNewUser: true });
          return;
        }
        const profile = user.profile || {};
        const nickname = (profile.nickname || '').trim();
        const avatar = (profile.avatar || '').trim();
        const phone = (user.phone || '').trim();
        this.setData({
          isNewUser: false,
          nickname: nickname || this.data.nickname,
          avatarUrl: avatar || this.data.avatarUrl,
          avatarDisplay: avatar || this.data.avatarDisplay,
          phone: phone || this.data.phone,
        });
      })
      .catch(() => {
        this.setData({ isNewUser: true });
      });
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

  onPhoneInput(e) {
    const raw = (e.detail.value || '').replace(/\D/g, '').slice(0, 11);
    this.setData({
      phone: raw,
      error: '',
    });
  },

  onInviteCodeInput(e) {
    const raw = (e.detail.value || '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    this.setData({
      inviteCode: raw.slice(0, 6),
      error: '',
    });
  },

  onConfirmLogin() {
    const { nickname, avatarUrl, avatarDisplay, phone, inviteCode, loading, isNewUser } = this.data;
    if (loading) return;
    if (!avatarDisplay) {
      this.setData({ error: '请先选择头像' });
      wx.showToast({ title: '请先选择头像', icon: 'none', duration: 2000 });
      return;
    }
    if (!nickname || !nickname.trim()) {
      this.setData({ error: '请先填写昵称' });
      wx.showToast({ title: '请先填写昵称', icon: 'none', duration: 2000 });
      return;
    }
    const phoneTrim = (phone || '').trim();
    const needPhone = isNewUser === true || isNewUser === null;
    if (needPhone && !phoneTrim) {
      this.setData({ error: '请填写联系电话' });
      wx.showToast({ title: '请填写联系电话', icon: 'none', duration: 2000 });
      return;
    }
    if (needPhone && phoneTrim && !VALIDATORS.PHONE.test(phoneTrim)) {
      this.setData({ error: MESSAGES.PHONE_INVALID });
      wx.showToast({ title: MESSAGES.PHONE_INVALID, icon: 'none', duration: 2000 });
      return;
    }
    const code = (inviteCode || '').trim().toUpperCase();
    const needInviteCode = isNewUser === true || isNewUser === null;
    if (needInviteCode) {
      if (code.length !== 6 || !/^[0-9A-Z]{6}$/.test(code)) {
        this.setData({ error: '邀请码为6位数字和字母组合，请重新输入' });
        wx.showToast({ title: '邀请码为6位数字和字母组合，请重新输入', icon: 'none', duration: 2500 });
        return;
      }
    }
    this.setData({ loading: true, error: '' });
    this.doLogin(
      { nickName: nickname.trim(), avatarUrl: avatarUrl || '' },
      needInviteCode ? code : (inviteCode || '').trim().toUpperCase(),
      phoneTrim
    );
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

  async doLogin(profile, inviteCode, phone) {
    try {
      const res = await getUserInfo(profile, inviteCode, phone);
      const result = res && res.result;
      if (result && result.success && result.data) {
        const user = result.data;
        getApp().globalData.userInfo = user;
        if (!(user.phone && String(user.phone).trim())) {
          wx.redirectTo({ url: '/pages/profile-settings/index?requirePhone=1' });
          return;
        }
        this.navigateAfterLogin(this.data.returnUrl);
        return;
      }
      const errMsg =
        (result && result.error) ||
        (res.errMsg && res.errMsg.indexOf('fail') !== -1 ? '云函数调用失败，请检查网络与云环境' : null) ||
        '登录失败，请重试';
      this.setData({ error: errMsg });
      wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
    } catch (e) {
      console.error('login error', e);
      const errMsg = (e && (e.errMsg || e.message)) || '网络异常，请重试';
      this.setData({ error: errMsg });
      wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
    } finally {
      this.setData({ loading: false });
    }
  },
});
