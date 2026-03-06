const { getProfile, updateIiqeRecords } = require('../../utils/api');
const { requireLogin } = require('../../utils/auth');

const SUBJECT_NAMES = {
  '01': '保险原理及实务',
  '02': '一般保险',
  '03': '长期保险',
  '04': '强制性公积金计划',
  '05': '投资相连长期保险',
};

const SUBJECT_LABELS = { '01': '一', '02': '二', '03': '三', '04': '四', '05': '五' };

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
        const records = list.map((r) => {
          const sid = String(r.subjectId || '').padStart(2, '0');
          const examTime = r.examTime || '';
          const examDate = examTime ? examTime.slice(0, 10) : '';
          const examTimePart = examTime && examTime.length >= 16 ? examTime.slice(11, 16) : '';
          return {
            subjectId: sid,
            subjectLabel: SUBJECT_LABELS[sid] || sid,
            subjectName: r.subjectName || SUBJECT_NAMES[sid],
            examTime,
            examDate,
            examTimePart,
            passed: !!r.passed,
            passedAt: r.passedAt || '',
          };
        });
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
    const passed = e.currentTarget.dataset.passed === 'true';
    const records = this.data.records.slice();
    if (!records[idx]) return;
    records[idx].passed = passed;
    if (passed) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      records[idx].passedAt = `${y}-${m}-${d}`;
    } else {
      records[idx].passedAt = '';
    }
    this.setData({ records });
  },

  onExamDateChange(e) {
    const idx = e.currentTarget.dataset.index;
    const val = (e.detail && e.detail.value) || '';
    const records = this.data.records.slice();
    if (!records[idx]) return;
    records[idx].examDate = val;
    records[idx].examTime = val + (records[idx].examTimePart ? ' ' + records[idx].examTimePart : '');
    this.setData({ records });
  },

  onExamTimePartChange(e) {
    const idx = e.currentTarget.dataset.index;
    const val = (e.detail && e.detail.value) || '';
    const records = this.data.records.slice();
    if (!records[idx]) return;
    records[idx].examTimePart = val;
    records[idx].examTime = (records[idx].examDate || '') + (val ? ' ' + val : '');
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
        setTimeout(() => wx.navigateBack(), 500);
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
