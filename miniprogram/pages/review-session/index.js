const { MOCK_QUESTIONS } = require('../../utils/constants');

Page({
  data: {
    paper: null,
    index: 0,
    questionCount: 42,
    question: null,
    mockUserChoice: null,
    questions: MOCK_QUESTIONS
  },
  onLoad() {
    const app = getApp();
    const paper = app.globalData.selectedPaper;
    if (!paper) {
      wx.navigateBack();
      return;
    }
    const q = MOCK_QUESTIONS[0];
    const mockUserChoice = q.correctAnswer === 'B' ? 'A' : 'B';
    const question = {
      ...q,
      optionsList: Object.entries(q.options).map(([key, text]) => ({ key, text }))
    };
    this.setData({ paper, question, mockUserChoice });
  },
  onPrev() {
    const index = this.data.index;
    if (index <= 0) return;
    const newIndex = index - 1;
    const q = MOCK_QUESTIONS[newIndex % MOCK_QUESTIONS.length];
    const mockUserChoice = q.correctAnswer === 'B' ? 'A' : 'B';
    const question = { ...q, optionsList: Object.entries(q.options).map(([k, t]) => ({ key: k, text: t })) };
    this.setData({ index: newIndex, question, mockUserChoice });
  },
  onNext() {
    const index = this.data.index;
    const questionCount = this.data.questionCount;
    if (index >= questionCount - 1) {
      wx.navigateBack();
      return;
    }
    const newIndex = index + 1;
    const q = MOCK_QUESTIONS[newIndex % MOCK_QUESTIONS.length];
    const mockUserChoice = q.correctAnswer === 'B' ? 'A' : 'B';
    const question = { ...q, optionsList: Object.entries(q.options).map(([k, t]) => ({ key: k, text: t })) };
    this.setData({ index: newIndex, question, mockUserChoice });
  }
});
