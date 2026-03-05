const { requireLogin } = require('../../utils/auth');
const { getReviewQuestions, toggleReviewFavorite } = require('../../utils/api');

Page({
  data: {
    paper: null,
    index: 0,
    questionCount: 0,
    question: null,
    mockUserChoice: null,
    questions: [],
    isFavorited: true
  },
  async onLoad() {
    const ok = await requireLogin('/pages/review-session/index');
    if (!ok) return;
    const app = getApp();
    const paper = app.globalData.selectedPaper;
    if (!paper) {
      wx.navigateBack();
      return;
    }
    try {
      const res = await getReviewQuestions(paper.id);
      const { result } = res || {};
      if (!result || !result.success || !result.data) {
        wx.showToast({
          title: (result && result.error) || '暂无收藏题目',
          icon: 'none'
        });
        return;
      }
      const { questions = [] } = result.data;
      if (!questions.length) {
        wx.showToast({
          title: '该科目暂无收藏题目',
          icon: 'none'
        });
        return;
      }
      const builtQuestions = questions.map((q) => {
        const options = q.options || {};
        const optionsList = Object.entries(options).map(([key, text]) => ({ key, text }));
        return {
          ...q,
          optionsList
        };
      });
      const first = builtQuestions[0];
      const mockUserChoice = first.userAnswer || null;
      this.setData({
        paper,
        questions: builtQuestions,
        questionCount: builtQuestions.length,
        index: 0,
        question: first,
        mockUserChoice,
        isFavorited: true
      });
    } catch (e) {
      console.error('getReviewQuestions failed', e);
      wx.showToast({
        title: '加载复习题目失败',
        icon: 'none'
      });
    }
  },
  onPrev() {
    const index = this.data.index;
    if (index <= 0) return;
    const newIndex = index - 1;
    const q = this.data.questions[newIndex];
    if (!q) return;
    const mockUserChoice = q.userAnswer || null;
    this.setData({
      index: newIndex,
      question: q,
      mockUserChoice,
      isFavorited: q.isFavorited !== false
    });
  },
  onNext() {
    const index = this.data.index;
    const questionCount = this.data.questionCount;
    if (index >= questionCount - 1) {
      wx.navigateBack();
      return;
    }
    const newIndex = index + 1;
    const q = this.data.questions[newIndex];
    if (!q) {
      wx.navigateBack();
      return;
    }
    const mockUserChoice = q.userAnswer || null;
    this.setData({
      index: newIndex,
      question: q,
      mockUserChoice,
      isFavorited: q.isFavorited !== false
    });
  },
  async onToggleFavorite() {
    const { paper, question, isFavorited } = this.data;
    if (!paper || !question) return;

    const subjectId = paper.id;
    const payload = {
      subjectId,
      sourceType: question.sourceType || 'mock',
      paperId: question.sourceType === 'real' ? (question.paperId || null) : null,
      questionId: question.questionId,
    };

    // 若当前为未收藏状态，补充快照信息，方便在练习模块也通用此云函数
    if (!isFavorited) {
      payload.snapshot = {
        content: question.text,
        text: question.text,
        options: question.options || {},
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        explanationEn: question.explanationEn || '',
        type: question.type || 'single',
        score: typeof question.score === 'number' ? question.score : 10,
        paperTitle: paper.fullName || paper.name || ''
      };
    }

    try {
      const res = await toggleReviewFavorite(payload);
      const { result } = res || {};
      if (!result || !result.success || !result.data) {
        wx.showToast({
          title: (result && result.error) || '操作失败，请稍后重试',
          icon: 'none'
        });
        return;
      }
      const action = result.data.action;
      const nextFavorited = action === 'favorited';

      // 同步更新当前题与题目数组中的状态
      const { index, questions } = this.data;
      const updatedQuestions = questions.slice();
      if (updatedQuestions[index]) {
        updatedQuestions[index] = {
          ...updatedQuestions[index],
          isFavorited: nextFavorited
        };
      }

      this.setData({
        isFavorited: nextFavorited,
        questions: updatedQuestions
      });

      wx.showToast({
        title: nextFavorited ? '已加入收藏' : '已取消收藏',
        icon: 'none'
      });
    } catch (e) {
      console.error('toggleReviewFavorite failed', e);
      wx.showToast({
        title: '操作失败，请检查网络后重试',
        icon: 'none'
      });
    }
  }
});
