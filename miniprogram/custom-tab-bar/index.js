Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '练习', icon: 'edit_note' },
      { pagePath: '/pages/review/index', text: '复习', icon: 'history_edu' },
      { pagePath: '/pages/team/index', text: '团队', icon: 'groups' },
      { pagePath: '/pages/profile/index', text: '我的', icon: 'person' }
    ]
  },
  lifetimes: {
    attached() {
      this.updateSelected();
    }
  },
  pageLifetimes: {
    show() {
      this.updateSelected();
    }
  },
  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current ? current.route : '';
      const idx = this.data.list.findIndex(item => item.pagePath === '/' + route);
      this.setData({ selected: idx >= 0 ? idx : 0 });
    },
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.list[index].pagePath;
      wx.switchTab({ url: path });
    }
  }
});
