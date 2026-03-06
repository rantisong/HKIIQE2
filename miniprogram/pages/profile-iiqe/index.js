const { getProfile, updateIiqeRecords } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

const SUBJECT_NAMES = {
  '01': '保险原理及实务',
  '02': '一般保险',
  '03': '长期保险',
  '04': '强制性公积金计划',
  '05': '投资相连长期保险',
};

Page({
  data: {
    records: [],
    loading: true,
    saving: false,
    error: '',
  },

  async onLoad() {
    const ok = await requireLogin('/pages/profile-iiqe/index');
    if (!ok) return;
    this.loadRecords();
  },

  async loadRecords() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getProfile();
      if (res.result && res.result.success && res.result.data) {
        const user = res.result.data;
        let list = user.user_iiqe_records;
        if (!Array.isArray(list) || list.length === 0) {
          list = ['01', '02', '03', '04', '05'].map((sid) => ({
            subjectId: sid,
            subjectName: SUBJECT_NAMES[sid] || '',
            examTime: '',
            passed: false,
            passedAt: '',
          }));
        }
        const records = list.map((r) => ({
          subjectId: String(r.subjectId || '').padStart(2, '0'),
          subjectName: r.subjectName || SUBJECT_NAMES[String(r.subjectId).padStart(2, '0')],
          examTime: r.examTime || '',
          passed: !!r.passed,
          passedAt: r.passedAt || '',
        }));
        this.setData({ records, loading: false });
      } else {
        this.setData({ loading: false, error: '加载失败' });
      }
    } catch (e) {
      this.setData({ loading: false, error: (e.message || e.errMsg) || '加载失败' });
    }
  },

  onPassedChange(e) {
    const idx = e.currentTarget.dataset.index;
    const checked = e.detail.value && e.detail.value.length > 0;
    const records = this.data.records.slice();
    if (records[idx]) records[idx].passed = checked;
    this.setData({ records });
  },

  onExamTimeInput(e) {
    const idx = e.currentTarget.dataset.index;
    const val = (e.detail && e.detail.value) || '';
    const records = this.data.records.slice();
    if (records[idx]) records[idx].examTime = val;
    this.setData({ records });
  },

  onPassedAtInput(e) {
    const idx = e.currentTarget.dataset.index;
    const val = (e.detail && e.detail.value) || '';
    const records = this.data.records.slice();
    if (records[idx]) records[idx].passedAt = val;
    this.setData({ records });
  },

  async onSave() {
    const { records, saving } = this.data;
    if (saving) return;
    this.setData({ saving: true, error: '' });
    try {
      const payload = records.map((r) => ({
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        examTime: r.examTime || null,
        passed: r.passed,
        passedAt: r.passedAt || null,
      }));
      const res = await updateIiqeRecords(payload);
      if (res.result && res.result.success) {
        wx.showToast({ title: '已保存', icon: 'success' });
      } else {
        this.setData({ error: (res.result && res.result.error) || '保存失败' });
      }
    } catch (e) {
      this.setData({ error: (e.message || e.errMsg) || '保存失败' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
