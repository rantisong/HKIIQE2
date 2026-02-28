const { MOCK_QUESTIONS } = require('../../utils/constants');
const { recordExamResult } = require('../../utils/examStats');

function getSubjectIdFromPaper(paper) {
  if (!paper) return '';
  const s = String(paper.subjectId ?? paper.id ?? '').trim();
  if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0');
  const name = String(paper.name || '').trim();
  const map = { '卷一': '01', '卷二': '02', '卷三': '03', '卷四': '04', '卷五': '05' };
  return map[name] || '';
}

// 与试卷选择页一致：缓存超过此时长视为异常退出，不再复用
const RANDOM_PRACTICE_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function getRandomPracticeCacheKey(subjectId) {
  return `randomPracticeCache_mock_${String(subjectId || '').trim()}`;
}

function isRandomPracticeCacheValid(cache, subjectId) {
  if (!cache || cache.subjectId !== subjectId || !Array.isArray(cache.questions) || cache.questions.length === 0) return false;
  const age = typeof cache.cachedAt === 'number' ? Date.now() - cache.cachedAt : Infinity;
  return age <= RANDOM_PRACTICE_CACHE_MAX_AGE_MS;
}

function ensureOptionsObject(opts) {
  if (!opts) return {};
  if (typeof opts === 'object' && !Array.isArray(opts)) return opts;
  const arr = Array.isArray(opts) ? opts : [];
  return arr.reduce((o, t, i) => {
    o['ABCDE'[i]] = t;
    return o;
  }, {});
}

Page({
  data: {
    paper: null,
    index: 0,
    selectedAnswers: [],     // 用户选择的答案，支持单选或多选
    answerRevealed: false,   // 是否已提交并展示正确答案
    questionStates: {},      // { [index]: { selectedAnswers, answerRevealed } } 已答题目的选择与结果
    isOptionsLocked: false,  // 当前题目是否已答（不可修改）
    secondsLeft: 3600,
    initialSeconds: 3600,    // 用于计算答题用时
    question: null,
    questions: MOCK_QUESTIONS
  },
  onLoad() {
    const app = getApp();
    const paper = app.globalData.selectedPaper;
    const examPaper = app.globalData.selectedExamPaper;
    if (!paper) {
      wx.navigateBack();
      return;
    }
    const isExamPaperMode = !!examPaper;
    let questions = app.globalData.selectedPaperQuestions || null;
    // 随机抽题练习：若用户中途退出/返回，优先从本地缓存恢复；过期或异常退出后的缓存清除并不复用
    if (!isExamPaperMode && (!questions || questions.length === 0)) {
      try {
        const subjectId = getSubjectIdFromPaper(paper);
        const cacheKey = getRandomPracticeCacheKey(subjectId);
        const cache = wx.getStorageSync(cacheKey);
        if (isRandomPracticeCacheValid(cache, subjectId)) {
          questions = cache.questions;
          app.globalData.selectedPaperQuestions = questions;
        } else if (cache && (cache.cachedAt != null || cache.questions != null)) {
          wx.removeStorageSync(cacheKey);
        }
      } catch (e) {}
    }
    questions = questions && questions.length > 0 ? questions : MOCK_QUESTIONS;
    const questionCount = examPaper ? examPaper.questionCount : (paper.questionCount || 75);
    const q0 = questions[0];
    const question = q0 ? this._prepareQuestion(q0, [], false) : null;
    if (!questions || questions.length === 0) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    const data = { paper, examPaper, question, questionCount, isExamPaperMode, questions };
    if (!isExamPaperMode) {
      const durationMinutes = paper.durationMinutes || 120;
      const total = durationMinutes * 60;
      data.secondsLeft = total;
      data.initialSeconds = total;
    }
    if (paper) {
      wx.setNavigationBarTitle({
        title: `${paper.name}：${paper.fullName}`
      });
    }
    this.setData({ ...data, isOptionsLocked: false });
    this._examCompletedOrTimeUp = false;
    if (!isExamPaperMode) this.startTimer();
  },
  startTimer() {
    const fmt = (s) => {
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    };
    this.setData({ timeText: fmt(this.data.secondsLeft) });
    const app = getApp();
    app._examTimerActive = true;
    const page = this;
    const timerId = setInterval(() => {
      try {
        if (!app._examTimerActive) {
          clearInterval(timerId);
          return;
        }
        const secondsLeft = page.data.secondsLeft - 1;
        page.setData({ secondsLeft, timeText: fmt(secondsLeft) });
        if (secondsLeft <= 0) {
          app._examTimerActive = false;
          clearInterval(timerId);
          page.timer = null;
          page.onTimeUp();
        }
      } catch (e) {
        app._examTimerActive = false;
        try { clearInterval(timerId); } catch (_) {}
      }
    }, 1000);
    this.timer = timerId;
  },
  onTimeUp() {
    wx.showToast({ title: '时间到，自动提交', icon: 'none' });
    this._examCompletedOrTimeUp = true;
    try {
      const subjectId = getSubjectIdFromPaper(this.data.paper);
      wx.removeStorageSync(getRandomPracticeCacheKey(subjectId));
    } catch (e) {}
    wx.redirectTo({ url: '/pages/report/index' });
  },
  onUnload() {
    const app = getApp();
    if (app) app._examTimerActive = false;
    if (this.timer) {
      try { clearInterval(this.timer); } catch (e) {}
      this.timer = null;
    }
    // 未正常完成考试（返回、崩溃、被杀进程等）：清除随机抽题缓存，下次进入将重新抽题
    if (!this._examCompletedOrTimeUp && !this.data.examPaper) {
      try {
        const subjectId = getSubjectIdFromPaper(this.data.paper);
        if (subjectId) wx.removeStorageSync(getRandomPracticeCacheKey(subjectId));
      } catch (e) {}
    }
  },
  _parseCorrectAnswers(correctAnswer) {
    if (!correctAnswer) return [];
    return String(correctAnswer).split(/[,，、\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  },
  _prepareQuestion(q, selectedAnswers = [], answerRevealed = false) {
    const opts = ensureOptionsObject(q.options);
    const correctAnswersList = this._parseCorrectAnswers(q.correctAnswer);
    const selected = Array.isArray(selectedAnswers) ? selectedAnswers : [];
    const correctSet = new Set(correctAnswersList);
    const selectedSet = new Set(selected);
    const optionsList = Object.entries(opts).map(([key, text]) => {
      const inCorrectSet = correctSet.has(key);
      const isSelected = selectedSet.has(key);
      const isCorrect = answerRevealed && inCorrectSet;
      const isWrong = answerRevealed && isSelected && !inCorrectSet;
      const isDimmed = answerRevealed && !inCorrectSet && !isSelected;
      const showCheck = answerRevealed ? inCorrectSet : isSelected;
      const showCross = answerRevealed && isWrong;
      return { key, text, isSelected, isCorrect, isWrong, isDimmed, showCheck, showCross };
    });
    return {
      ...q,
      text: q.text || q.content || '',
      optionsList,
      correctAnswersList,
      correctAnswerDisplay: correctAnswersList.join('、')
    };
  },
  _isAnswerCorrect(selectedAnswers, correctAnswersList) {
    const a = [...selectedAnswers].sort();
    const b = [...correctAnswersList].sort();
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  },
  formatTime(seconds) {
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  },
  onSelectOption(e) {
    if (this.data.answerRevealed) return;
    if (this.data.isOptionsLocked) return;
    const key = e.currentTarget.dataset.key;
    const selected = this.data.selectedAnswers || [];
    const next = selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key];
    const question = this._prepareQuestion(this.data.question, next, false);
    this.setData({ selectedAnswers: next, question });
  },
  saveCurrentState() {
    const { index, selectedAnswers, answerRevealed, questionStates } = this.data;
    if (selectedAnswers && selectedAnswers.length > 0 && answerRevealed) {
      const next = { ...questionStates };
      next[index] = { selectedAnswers: [...selectedAnswers], answerRevealed };
      this.setData({ questionStates: next });
    }
  },
  loadQuestionAtIndex(idx) {
    const qList = this.data.questions || MOCK_QUESTIONS;
    const q = qList[idx % qList.length];
    const saved = this.data.questionStates[idx];
    const ans = saved ? (saved.selectedAnswers || (saved.selectedAnswer ? [saved.selectedAnswer] : [])) : [];
    const revealed = saved ? saved.answerRevealed : false;
    const question = this._prepareQuestion(q, ans, revealed);
    this.setData({ index: idx, question, selectedAnswers: ans, answerRevealed: revealed, isOptionsLocked: !!saved });
  },
  onSubmitOrNext() {
    if (!this.data.answerRevealed) {
      const selectedAnswers = this.data.selectedAnswers || [];
      if (selectedAnswers.length === 0) return;
      const { index, questionStates, question } = this.data;
      const next = { ...questionStates };
      next[index] = { selectedAnswers: [...selectedAnswers], answerRevealed: true };
      const updatedQuestion = this._prepareQuestion(question, selectedAnswers, true);
      this.setData({ answerRevealed: true, questionStates: next, question: updatedQuestion });
    } else {
      this.onNext();
    }
  },
  onPrev() {
    const index = this.data.index;
    if (index <= 0) return;
    this.saveCurrentState();
    this.loadQuestionAtIndex(index - 1);
  },
  _computeCorrectCount() {
    const { questionStates, questionCount, questions } = this.data;
    const total = questionCount || 75;
    const qList = questions || MOCK_QUESTIONS;
    let correct = 0;
    for (let i = 0; i < total; i++) {
      const saved = questionStates[i];
      if (!saved || !saved.answerRevealed) continue;
      const q = qList[i % qList.length];
      const correctList = this._parseCorrectAnswers(q.correctAnswer);
      const selected = saved.selectedAnswers || (saved.selectedAnswer ? [saved.selectedAnswer] : []);
      if (this._isAnswerCorrect(selected, correctList)) correct += 1;
    }
    return correct;
  },
  onNext() {
    const index = this.data.index;
    const questionCount = this.data.questionCount || 75;
    if (index >= questionCount - 1) {
      this.saveCurrentState();
      const questionStates = this.data.questionStates || {};
      const answeredCount = Object.keys(questionStates).length;
      if (answeredCount >= questionCount) {
        const correctCount = this._computeCorrectCount();
        const result = recordExamResult(correctCount, questionCount);
        const timeSpent = Math.max(0, (this.data.initialSeconds || 0) - this.data.secondsLeft);
        getApp().globalData.examResult = {
          questionCount,
          correctCount,
          passed: result.passed,
          accuracyPercent: Math.round((correctCount / questionCount) * 100),
          timeSpent,
          totalCount: result.totalCount,
          passCount: result.passCount,
          passRatePercent: result.passRatePercent
        };
      } else {
        getApp().globalData.examResult = null;
      }
      this._examCompletedOrTimeUp = true;
      try {
        const subjectId = getSubjectIdFromPaper(this.data.paper);
        wx.removeStorageSync(getRandomPracticeCacheKey(subjectId));
      } catch (e) {}
      wx.redirectTo({ url: '/pages/report/index' });
      return;
    }
    this.saveCurrentState();
    this.loadQuestionAtIndex(index + 1);
  },
  onBack() {
    wx.navigateBack();
  }
});
