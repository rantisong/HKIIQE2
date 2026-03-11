/**
 * 考试进度列表数据标准化，供「我的」页与成员详情页复用
 * 入参为 user_iiqe_records 或等效的 { subjectId, subjectName?, examTime?, passed?, passedAt? }[]
 * 返回统一展示结构：subjectId, subjectLabel, subjectName, hasExamTime, examTimeDisplay, countdownText, passed, passedAt
 */
const { SUBJECTS } = require('./constants');

const SUBJECT_LABELS = { '01': '一', '02': '二', '03': '三', '04': '四', '05': '五' };

function getSubjectName(sid) {
  const sub = SUBJECTS[sid];
  return sub ? sub.name : '';
}

function formatPassedAt(passedAt) {
  if (!passedAt) return '';
  const d = new Date(passedAt);
  if (isNaN(d.getTime())) return passedAt;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * 将 IIQE 记录列表标准化为考试进度展示结构（含考试时间、倒计时等）
 * @param {Array} list user_iiqe_records 或类似数组
 * @returns {Array} 01～05 顺序的展示项
 */
function normalizeIiqeRecords(list) {
  const ids = ['01', '02', '03', '04', '05'];
  const arr = Array.isArray(list) ? list : [];
  const byId = {};
  arr.forEach((r) => {
    const sid = String(r.subjectId || '').padStart(2, '0');
    if (ids.includes(sid)) byId[sid] = r;
  });
  return ids.map((sid) => {
    const r = byId[sid] || {};
    const examTime = r.examTime || '';
    const examDate = examTime ? new Date(examTime) : null;
    const now = new Date();
    let countdownText = '';
    if (examDate && !isNaN(examDate.getTime())) {
      const diffMs = examDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays > 0) countdownText = `倒计时 ${diffDays}天`;
      else if (diffDays === 0) countdownText = '今天';
      else countdownText = '已过期';
    }
    const passedAt = r.passedAt || '';
    return {
      subjectId: sid,
      subjectLabel: SUBJECT_LABELS[sid] || sid,
      subjectName: r.subjectName || getSubjectName(sid) || '',
      examTime,
      examTimeDisplay: examTime ? (examTime.length > 16 ? examTime.slice(0, 16) : examTime) : '',
      hasExamTime: !!examTime,
      countdownText,
      passed: !!r.passed,
      passedAt: formatPassedAt(passedAt),
    };
  });
}

/**
 * 将成员详情 API 返回的 examRecords 转为与 normalizeIiqeRecords 相同的展示结构（含考试时间、倒计时）
 * 与「我的」页显示逻辑一致：有考试时间则显示考试时间+倒计时，都没有则显示未设置
 * @param {Array} examRecords [{ subjectId, subjectName?, examTime?, passed, passedAt? }]
 * @returns {Array} 01～05 顺序的展示项
 */
function normalizeMemberExamRecords(examRecords) {
  const ids = ['01', '02', '03', '04', '05'];
  const arr = Array.isArray(examRecords) ? examRecords : [];
  const byId = {};
  arr.forEach((r) => {
    const sid = String(r.subjectId || '').padStart(2, '0');
    if (ids.includes(sid)) byId[sid] = r;
  });
  return ids.map((sid) => {
    const r = byId[sid] || {};
    const examTime = r.examTime || '';
    const examDate = examTime ? new Date(examTime) : null;
    const now = new Date();
    let countdownText = '';
    if (examDate && !isNaN(examDate.getTime())) {
      const diffMs = examDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays > 0) countdownText = `倒计时 ${diffDays}天`;
      else if (diffDays === 0) countdownText = '今天';
      else countdownText = '已过期';
    }
    return {
      subjectId: sid,
      subjectLabel: SUBJECT_LABELS[sid] || sid,
      subjectName: r.subjectName || getSubjectName(sid) || '',
      examTime,
      examTimeDisplay: examTime ? (examTime.length > 16 ? examTime.slice(0, 16) : examTime) : '',
      hasExamTime: !!examTime,
      countdownText,
      passed: !!r.passed,
      passedAt: formatPassedAt(r.passedAt || ''),
    };
  });
}

module.exports = {
  normalizeIiqeRecords,
  normalizeMemberExamRecords,
};
