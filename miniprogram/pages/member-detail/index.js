const { getTeamMemberDetail } = require('../../utils/api');
const { normalizeMemberExamRecords } = require('../../utils/examProgress');
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user';

Page({
  data: {
    loading: true,
    error: '',
    member: null,
    examProgressList: [],
  },

  async onLoad(options) {
    const inviteCode = (options.inviteCode || '').trim();
    if (!inviteCode) {
      this.setData({ loading: false, error: '缺少成员信息' });
      return;
    }
    this.setData({ inviteCode });
    await this.loadMember(inviteCode);
  },

  async loadMember(inviteCode) {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getTeamMemberDetail(inviteCode);
      const result = res.result || res;
      if (!result.success || !result.data) {
        this.setData({
          loading: false,
          error: result.error || '加载失败',
        });
        return;
      }
      const d = result.data;
      const examProgressList = normalizeMemberExamRecords(d.examRecords || []);
      this.setData({
        loading: false,
        member: {
          nickname: d.nickname || '微信用户',
          avatar: d.avatar || DEFAULT_AVATAR,
          city: d.city || '',
          entryDate: d.entryDate || '',
          phone: d.phone || '',
          hkIdentityAcquiredAt: d.hkIdentityAcquiredAt || '',
          inviteCode: d.inviteCode,
        },
        examProgressList,
      });
    } catch (e) {
      this.setData({
        loading: false,
        error: (e && (e.message || e.errMsg)) || '加载失败',
      });
    }
  },

  onMoreTap() {
    // 预留：更多菜单（如查看其团队等）
  },
});
