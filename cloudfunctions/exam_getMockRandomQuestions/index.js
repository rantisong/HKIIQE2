const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 在云端从指定科目的模拟题库中随机抽取 count 题并返回，避免单次返回整份大题量导致响应超限
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exports.main = async (event, context) => {
  const raw = event.subjectId !== undefined && event.subjectId !== null ? event.subjectId : '';
  const subjectId = String(raw).trim().replace(/^0+/, '') || '0';
  const subjectIdPadded = subjectId.padStart(2, '0');
  const count = Math.min(Math.max(1, parseInt(event.count, 10) || 75), 200);

  if (!/^\d{1,2}$/.test(subjectId) || subjectIdPadded.length > 2) {
    return { success: false, error: '缺少或无效的 subjectId（应为 01～05）' };
  }

  try {
    const col = db.collection('mock_bank');
    let res = await col.where({ subjectId: subjectIdPadded }).limit(1).get();
    if ((!res.data || res.data.length === 0) && subjectIdPadded.length === 2) {
      const numId = parseInt(subjectIdPadded, 10);
      res = await col.where({ subjectId: numId }).limit(1).get();
    }
    if (!res.data || res.data.length === 0) {
      return { success: false, error: '该科目暂无模拟题库，请先导入试卷一模拟题' };
    }
    const doc = res.data[0];
    const questions = Array.isArray(doc.questions) ? doc.questions : [];
    if (questions.length === 0) {
      return { success: false, error: '该科目模拟题库题目为空' };
    }
    const selected = shuffle(questions).slice(0, count);
    return {
      success: true,
      data: {
        subjectId: subjectIdPadded,
        name: doc.name,
        fullName: doc.fullName,
        questionCount: doc.questionCount,
        durationMinutes: doc.durationMinutes,
        questions: selected
      }
    };
  } catch (e) {
    return {
      success: false,
      error: e.message || String(e)
    };
  }
};
