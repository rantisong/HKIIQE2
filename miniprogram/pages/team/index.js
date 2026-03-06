const { getProfile, getTeamMyStats, getTeamMyLeader, getTeamMyDirectMembers } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

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
  },

  async onShow() {
    const ok = await requireLogin('/pages/team/index', { fromTab: true });
    if (!ok) return;
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadTeamData();
  },

  async loadTeamData() {
    this.setData({ loading: true, error: '' });
    try {
      await getProfile();
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
    const ok = await requireLogin('/pages/team-detail/index');
    if (!ok) return;
    wx.navigateTo({
      url: '/pages/team-detail/index?type=leaderTeam',
    });
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
