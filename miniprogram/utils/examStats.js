/**
 * 模拟考试基础统计（本地存储）
 * - 仅当用户完成所有题目并提交时记一次「完成次数」
 * - 正确率 ≥ 70% 记一次「通过次数」
 * - 通过率 = 通过次数 / 总完成次数（整数百分数）
 */
const STORAGE_KEY = 'examStats';
const { PASS_RATE_THRESHOLD } = require('./constants');

function getExamStats() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw && typeof raw.totalCount === 'number' && typeof raw.passCount === 'number') {
      return { totalCount: raw.totalCount, passCount: raw.passCount };
    }
  } catch (e) {
    console.warn('examStats get', e);
  }
  return { totalCount: 0, passCount: 0 };
}

function saveExamStats(stats) {
  try {
    wx.setStorageSync(STORAGE_KEY, {
      totalCount: Math.max(0, stats.totalCount),
      passCount: Math.max(0, Math.min(stats.passCount, stats.totalCount))
    });
  } catch (e) {
    console.warn('examStats save', e);
  }
}

/**
 * 记录一次完整提交的模拟考试结果（仅当完成所有题并提交时调用）
 * @param {number} correctCount 正确题数
 * @param {number} questionCount 总题数
 * @returns {{ passed: boolean, totalCount: number, passCount: number, passRatePercent: number }}
 */
function recordExamResult(correctCount, questionCount) {
  if (!questionCount || questionCount <= 0) {
    return { passed: false, ...getExamStats(), passRatePercent: 0 };
  }
  const stats = getExamStats();
  stats.totalCount += 1;
  const accuracy = correctCount / questionCount;
  if (accuracy >= PASS_RATE_THRESHOLD) {
    stats.passCount += 1;
  }
  saveExamStats(stats);
  const passRatePercent = Math.round((stats.passCount / stats.totalCount) * 100);
  return {
    passed: accuracy >= PASS_RATE_THRESHOLD,
    totalCount: stats.totalCount,
    passCount: stats.passCount,
    passRatePercent
  };
}

/**
 * 通过率（整数百分数），总次数为 0 时返回 0
 */
function getPassRatePercent() {
  const { totalCount, passCount } = getExamStats();
  return totalCount === 0 ? 0 : Math.round((passCount / totalCount) * 100);
}

module.exports = {
  getExamStats,
  saveExamStats,
  recordExamResult,
  getPassRatePercent
};
