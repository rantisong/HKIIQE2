const { getTeamMyLeaderTeam, getTeamMemberTeam } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user';

Page({
  data: {
    mode: '',
    loading: true,
    error: '',
    // 所属团队 mode=leaderTeam
    leader: null,
    leaderStats: [],
    members: [],
    leaderTeamMembers: [],
    // 某成员团队 mode=member
    rootUser: null,
    stats: [],
    hasLeader: false,
    leaderCard: null,
    directMembers: [],
  },

  async onLoad(options) {
    const ok = await requireLogin('/pages/team-detail/index');
    if (!ok) return;

    const type = (options.type || '').trim();
    const inviteCode = (options.inviteCode || '').trim();

    if (type === 'leaderTeam') {
      wx.setNavigationBarTitle({ title: '所属团队' });
      this.setData({ mode: 'leaderTeam' });
      this.loadLeaderTeam();
    } else if (type === 'member' && inviteCode) {
      wx.setNavigationBarTitle({ title: '团队' });
      this.setData({ mode: 'member', inviteCode });
      this.loadMemberTeam(inviteCode);
    } else {
      this.setData({ loading: false, error: '参数错误' });
    }
  },

  async loadLeaderTeam() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getTeamMyLeaderTeam();
      if (res.result && res.result.success && res.result.data) {
        const { leader: lead, members: list, leaderStats: stats } = res.result.data;
        const members = (list || []).map((m) => ({
          ...m,
          avatar: m.avatar || DEFAULT_AVATAR,
        }));
        const nonLeader = (list || []).filter((m) => !m.isLeader);
        const leaderTeamMembers = nonLeader.map((m) => {
          const dots = [1, 2, 3, 4, 5].map((num) => ({
            num,
            passed: (m.passedSubjects || []).indexOf(String(num).padStart(2, '0')) >= 0,
          }));
          return {
            _openid: m._openid,
            inviteCode: m.inviteCode,
            name: m.nickname || '微信用户',
            avatar: m.avatar || DEFAULT_AVATAR,
            dots,
            isMe: m.isMe === true,
          };
        });
        const s = stats && typeof stats === 'object' ? stats : {};
        const leaderStats = [
          { label: '团队', value: String(s.team ?? 0) },
          { label: '合资格', value: String(s.qualified ?? 0) },
          { label: '全牌照', value: String(s.fullLicense ?? 0) },
        ];
        this.setData({
          leader: lead,
          leaderStats,
          members,
          leaderTeamMembers,
          loading: false,
        });
      } else {
        this.setData({ loading: false, error: (res.result && res.result.error) || '加载失败' });
      }
    } catch (e) {
      this.setData({ loading: false, error: (e.message || e.errMsg) || '加载失败' });
    }
  },

  async loadMemberTeam(inviteCode) {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getTeamMemberTeam({ inviteCode });
      if (res.result && res.result.success && res.result.data) {
        const d = res.result.data;
        const stats = [
          { label: '团队', value: String((d.stats && d.stats.team) || 0) },
          { label: '合资格', value: String((d.stats && d.stats.qualified) || 0) },
          { label: '全牌照', value: String((d.stats && d.stats.fullLicense) || 0) },
        ];
        const directMembers = (d.directMembers || []).map((m) => {
          const dots = [1, 2, 3, 4, 5].map((num) => ({
            num,
            passed: (m.passedSubjects || []).indexOf(String(num).padStart(2, '0')) >= 0,
          }));
          return {
            ...m,
            name: m.nickname,
            avatar: m.avatar || DEFAULT_AVATAR,
            dots,
            hasSubordinates: (m.teamSize || 0) > 0,
          };
        });
        this.setData({
          rootUser: d.rootUser,
          stats,
          hasLeader: !!(d.leader),
          leaderCard: d.leader,
          directMembers,
          loading: false,
        });
        if (d.rootUser && d.rootUser.nickname) {
          wx.setNavigationBarTitle({ title: d.rootUser.nickname + '的团队' });
        }
      } else {
        this.setData({ loading: false, error: (res.result && res.result.error) || '加载失败' });
      }
    } catch (e) {
      this.setData({ loading: false, error: (e.message || e.errMsg) || '加载失败' });
    }
  },

  async onMemberTap(e) {
    const item = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.item;
    if (!item || !item.hasSubordinates) return;
    const ok = await requireLogin('/pages/team-detail/index');
    if (!ok) return;
    wx.navigateTo({
      url: '/pages/team-detail/index?type=member&inviteCode=' + encodeURIComponent(item.inviteCode || ''),
    });
  },
});
