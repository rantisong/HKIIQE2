const { getProfile, getTeamMyStats, getTeamMyLeader, getTeamMyDirectMembers, getInviteWxacode } = require('../../utils/api');
const { isGuest } = require('../../utils/auth');

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user';

Page({
  data: {
    stats: [
      { label: '团队', value: '0' },
      { label: '合资格', value: '0' },
      { label: '全牌照', value: '0' },
    ],
    hasLeader: false,
    leader: null,
    members: [],
    loading: true,
    error: '',
    inviteCodeDisplay: '',
    isGuest: true,
    showQrModal: false,
    qrCodeUrl: '',
    qrCodeLoading: false,
    qrSceneUsed: '',
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    if (isGuest()) {
      this.setData({
        isGuest: true,
        stats: [
          { label: '团队', value: '0' },
          { label: '合资格', value: '0' },
          { label: '全牌照', value: '0' },
        ],
        hasLeader: false,
        leader: null,
        members: [],
        loading: false,
      });
      return;
    }
    this.setData({ isGuest: false });
    this.loadTeamData();
  },

  async loadTeamData() {
    this.setData({ loading: true, error: '' });
    try {
      const profileRes = await getProfile();
      const user = profileRes.result && profileRes.result.success && profileRes.result.data ? profileRes.result.data : null;
      const inviteCode = user && (user.inviteCode || (user._id ? String(user._id).slice(-8).toUpperCase() : '')) ? (user.inviteCode || String(user._id).slice(-8).toUpperCase()) : '';
      if (inviteCode) this.setData({ inviteCodeDisplay: inviteCode });

      const [statsRes, leaderRes, membersRes] = await Promise.all([
        getTeamMyStats(),
        getTeamMyLeader(),
        getTeamMyDirectMembers(),
      ]);

      if (statsRes.result && statsRes.result.success && statsRes.result.data) {
        const d = statsRes.result.data;
        this.setData({
          stats: [
            { label: '团队', value: String(d.team || 0) },
            { label: '合资格', value: String(d.qualified || 0) },
            { label: '全牌照', value: String(d.fullLicense || 0) },
          ],
        });
      }

      if (leaderRes.result && leaderRes.result.success && leaderRes.result.data) {
        const data = leaderRes.result.data;
        this.setData({
          hasLeader: data.hasLeader === true,
          leader: data.leader || null,
        });
      }

      if (membersRes.result && membersRes.result.success && membersRes.result.data) {
        const list = membersRes.result.data.list || [];
        const members = list.map((m) => {
          const dots = [1, 2, 3, 4, 5].map((num) => ({
            num,
            passed: (m.passedSubjects || []).indexOf(String(num).padStart(2, '0')) >= 0,
          }));
          return {
            _openid: m._openid,
            inviteCode: m.inviteCode,
            name: m.nickname,
            avatar: m.avatar || DEFAULT_AVATAR,
            dots,
            teamSize: m.teamSize || 0,
            hasSubordinates: (m.teamSize || 0) > 0,
          };
        });
        this.setData({ members });
      }
    } catch (e) {
      this.setData({ error: (e && (e.message || e.errMsg)) || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onTeamLeaderTap() {
    if (isGuest()) return;
    wx.navigateTo({
      url: '/pages/team-detail/index?type=leaderTeam',
    });
  },

  onMemberAvatarTap(e) {
    const inviteCode = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.inviteCode;
    if (!inviteCode || isGuest()) return;
    wx.navigateTo({
      url: '/pages/member-detail/index?inviteCode=' + encodeURIComponent(inviteCode),
    });
  },

  async onMemberTap(e) {
    const item = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.item;
    if (!item || !item.hasSubordinates || isGuest()) return;
    wx.navigateTo({
      url: '/pages/team-detail/index?type=member&inviteCode=' + encodeURIComponent(item.inviteCode || ''),
    });
  },

  async onShowInviteQR() {
    const code = (this.data.inviteCodeDisplay || '').trim();
    if (!code) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' });
      return;
    }
    this.setData({ showQrModal: true, qrCodeLoading: true, qrCodeUrl: '' });
    try {
      const res = await getInviteWxacode(code);
      const result = res.result || res;
      const ok = result.success && result.data && result.data.fileID;
      if (!ok) {
        wx.showToast({ title: result.error || '生成失败', icon: 'none' });
        this.setData({ showQrModal: false, qrCodeLoading: false });
        return;
      }
      const tempRes = await wx.cloud.getTempFileURL({ fileList: [result.data.fileID] });
      const url = (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) || '';
      const sceneUsed = result.data.scene || this.data.inviteCodeDisplay || '';
      this.setData({ qrCodeUrl: url, qrCodeLoading: false, qrSceneUsed: sceneUsed });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '生成失败', icon: 'none' });
      this.setData({ showQrModal: false, qrCodeLoading: false });
    }
  },

  onCloseQrModal() {
    this.setData({ showQrModal: false });
  },

  async onSaveQrImage() {
    const url = this.data.qrCodeUrl;
    const codeText = (this.data.qrSceneUsed || this.data.inviteCodeDisplay || '').trim();
    if (!url) return;
    wx.showLoading({ title: '保存中...' });
    const handleSaveErr = (e) => {
      if (e && e.errMsg && e.errMsg.indexOf('auth deny') !== -1) {
        wx.showModal({
          title: '提示',
          content: '需要您授权保存图片到相册',
          confirmText: '去设置',
          success: (r) => { if (r.confirm) wx.openSetting(); },
        });
      } else {
        wx.showToast({ title: (e && (e.message || e.errMsg)) || '保存失败', icon: 'none' });
      }
    };
    try {
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({ url, success: resolve, fail: reject });
      });
      if (downloadRes.statusCode !== 200) throw new Error('下载失败');
      const qrPath = downloadRes.tempFilePath;
      if (codeText) {
        const w = 400;
        const h = 480;
        const ctx = wx.createCanvasContext('qrSaveCanvas', this);
        ctx.drawImage(qrPath, 0, 0, w, w);
        ctx.setFillStyle('#07C160');
        ctx.setFontSize(18);
        ctx.setTextAlign('center');
        ctx.fillText('邀请码 ' + codeText, w / 2, w + 36);
        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'qrSaveCanvas',
            width: w,
            height: h,
            success: (res) => {
              wx.saveImageToPhotosAlbum({ filePath: res.tempFilePath })
                .then(() => { wx.hideLoading(); wx.showToast({ title: '已保存到相册', icon: 'success' }); })
                .catch((err) => { wx.hideLoading(); handleSaveErr(err); });
            },
            fail: () => { wx.hideLoading(); wx.showToast({ title: '生成图片失败', icon: 'none' }); },
          }, this);
        });
      } else {
        await wx.saveImageToPhotosAlbum({ filePath: qrPath });
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      }
    } catch (e) {
      handleSaveErr(e);
    } finally {
      if (!codeText) wx.hideLoading();
    }
  },

  onShareAppMessage() {
    const code = (this.data.inviteCodeDisplay || '').trim();
    const path = code
      ? `pages/login/index?inviteCode=${encodeURIComponent(code)}`
      : 'pages/login/index';
    return {
      title: 'HKIIQE 邀请你一起备考',
      path,
    };
  },
});
