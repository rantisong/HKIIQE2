const { getPaperDetail, getPaperList, getMockRandomQuestions } = require('../../utils/api');

// 从 paper 解析出 01～05 的 subjectId（科目一为 01）
function getSubjectIdFromPaper(paper) {
  if (!paper) return '';
  const s = String(paper.subjectId ?? paper.id ?? '').trim();
  if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0');
  const name = String(paper.name || '').trim();
  const map = { '卷一': '01', '卷二': '02', '卷三': '03', '卷四': '04', '卷五': '05' };
  return map[name] || '';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeQuestion(q) {
  const text = q.text || q.content || '';
  let opts = q.options || {};
  if (Array.isArray(opts)) {
    opts = opts.reduce((o, t, i) => {
      o['ABCDE'[i]] = t;
      return o;
    }, {});
  }
  return { ...q, text, options: opts };
}

Page({
  data: {
    paper: null,
    mockPaper: null,
    examList: [],
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadPaperDetail(options.id);
    } else {
      this.initFromSelectedPaper();
    }
  },

  async initFromSelectedPaper() {
    const app = getApp();
    const paper = app.globalData.selectedPaper;
    if (!paper) {
      wx.navigateBack();
      return;
    }
    this.setData({ paper, loading: true });
    try {
      await Promise.all([this.loadMockPaper(paper), this.loadRealPapers()]);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMockPaper(paper) {
    try {
      // 试卷一～五：用 subjectId 从 mock_bank 拉取该科目的模拟题库（只从该科目抽题）
      const subjectId = String(paper.subjectId ?? paper.id ?? '').replace(/^\s+|\s+$/g, '').padStart(2, '0');
      if (subjectId.length <= 3 && /^\d+$/.test(subjectId)) {
        const res = await getPaperList(1, 5, '', 'mock', subjectId);
        if (res.result && res.result.success && res.result.data.list && res.result.data.list.length > 0) {
          const first = res.result.data.list[0];
          // 若列表接口已返回完整 questions，直接使用，避免再次请求大包 getPaperDetail 导致截断
          if (Array.isArray(first.questions) && first.questions.length > 0) {
            this.setData({ mockPaper: first });
            return;
          }
          const detail = await getPaperDetail(first._id, 'mock');
          if (detail.result && detail.result.success && detail.result.data) {
            this.setData({ mockPaper: detail.result.data });
            return;
          }
        }
      }
      if (paper.id && paper.id.length > 10) {
        const res = await getPaperDetail(paper.id, 'mock');
        if (res.result && res.result.success && res.result.data) {
          this.setData({ mockPaper: res.result.data });
        }
      }
    } catch (e) {
      console.warn('loadMockPaper', e);
    }
  },

  async loadRealPapers() {
    try {
      const res = await getPaperList(1, 20, '', 'real');
      if (res.result && res.result.success && res.result.data.list && res.result.data.list.length > 0) {
        const examList = res.result.data.list.map(p => ({
          ...p,
          title: p.name || p.title,
          count: p.questionCount || 75,
          practiceCount: p.practiceCount || 0,
          accuracyRate: p.accuracyRate != null ? p.accuracyRate : null
        }));
        this.setData({ examList });
      }
    } catch (e) {
      console.warn('loadRealPapers', e);
    }
  },

  async loadPaperDetail(paperId) {
    this.setData({ loading: true });
    try {
      const resReal = await getPaperDetail(paperId, 'real');
      if (resReal.result && resReal.result.success && resReal.result.data) {
        const data = resReal.result.data;
        this.setData({
          paper: data,
          mockPaper: null,
          examList: [{ ...data, title: data.name || data.title, count: data.questionCount || 75 }]
        });
        this.setData({ loading: false });
        return;
      }
      const resMock = await getPaperDetail(paperId, 'mock');
      if (resMock.result && resMock.result.success && resMock.result.data) {
        const data = resMock.result.data;
        this.setData({ paper: data, mockPaper: data });
        await this.loadRealPapers();
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加载试卷详情失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onStartExam(e) {
    const app = getApp();
    const paper = app.globalData.selectedPaper || this.data.paper;
    const examIndex = e.currentTarget.dataset.examIndex;
    const examList = this.data.examList || [];
    const mockPaper = this.data.mockPaper;

    let selectedExamPaper = null;
    let selectedPaperQuestions = null;

    if (examIndex !== undefined && examIndex !== '' && parseInt(examIndex, 10) >= 0) {
      const full = examList[parseInt(examIndex, 10)];
      if (full && full._id) {
        selectedExamPaper = {
          _id: full._id,
          questionCount: full.questionCount || full.count || 75,
          title: full.title || full.name,
          practiceCount: full.practiceCount || 0,
          accuracyRate: full.accuracyRate
        };
        if (full.questions && full.questions.length > 0) {
          selectedPaperQuestions = full.questions.map(normalizeQuestion);
        } else {
          try {
            const res = await getPaperDetail(full._id, 'real');
            if (res.result && res.result.success && res.result.data.questions) {
              selectedPaperQuestions = res.result.data.questions.map(normalizeQuestion);
            }
          } catch (err) {}
        }
      }
    }

    if (!selectedPaperQuestions) {
      // 随机抽题：仅从当前科目的模拟题库抽取；科目一 subjectId 固定为 '01'
      const subjectId = getSubjectIdFromPaper(paper);
      const count = paper.questionCount || 75;
      if (!subjectId) {
        wx.showToast({ title: '无法识别当前科目', icon: 'none' });
        return;
      }
      wx.showLoading({ title: '抽题中…' });
      let questions = [];
      let cloudError = '';
      try {
        const res = await getMockRandomQuestions(subjectId, count);
        const payload = (res && res.result) || res || {};
        if (payload.success && payload.data && Array.isArray(payload.data.questions)) {
          questions = payload.data.questions;
        } else if (payload.error) {
          cloudError = payload.error;
        }
      } catch (err) {
        console.warn('getMockRandomQuestions failed', err);
        cloudError = (err && err.errMsg) || (err && err.message) || '网络异常';
      }
      // 云函数未部署或失败时：用已加载的 mockPaper 或拉取列表+详情在客户端抽题
      if (questions.length === 0 && mockPaper && Array.isArray(mockPaper.questions) && mockPaper.questions.length > 0) {
        questions = shuffle(mockPaper.questions).slice(0, count);
      }
      if (questions.length === 0) {
        try {
          const listRes = await getPaperList(1, 1, '', 'mock', subjectId);
          if (listRes.result && listRes.result.success && listRes.result.data.list && listRes.result.data.list.length > 0) {
            const first = listRes.result.data.list[0];
            if (Array.isArray(first.questions) && first.questions.length > 0) {
              questions = shuffle(first.questions).slice(0, count);
            } else if (first._id) {
              const detailRes = await getPaperDetail(first._id, 'mock');
              if (detailRes.result && detailRes.result.success && detailRes.result.data && Array.isArray(detailRes.result.data.questions) && detailRes.result.data.questions.length > 0) {
                questions = shuffle(detailRes.result.data.questions).slice(0, count);
              }
            }
          }
        } catch (e) {
          console.warn('fallback load mock failed', e);
        }
      }
      wx.hideLoading();
      if (questions.length === 0) {
        wx.showToast({
          title: cloudError || '该科目暂无模拟题库或网络异常，请检查导入并重试',
          icon: 'none',
          duration: 2800
        });
        return;
      }
      selectedPaperQuestions = questions.map(normalizeQuestion);
      selectedExamPaper = null;
    }

    if (!selectedPaperQuestions || selectedPaperQuestions.length === 0) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      return;
    }

    app.globalData.selectedExamPaper = selectedExamPaper;
    app.globalData.selectedPaperQuestions = selectedPaperQuestions;
    wx.navigateTo({ url: '/pages/exam/index' });
  },

  onBack() {
    wx.navigateBack();
  }
});
