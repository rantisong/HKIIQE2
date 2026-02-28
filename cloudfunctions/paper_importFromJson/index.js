const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 将 options 数组转为对象 { A: "...", B: "...", ... }
function optionsToObject(opts) {
  if (!opts) return {};
  if (typeof opts === 'object' && !Array.isArray(opts)) return opts;
  const arr = Array.isArray(opts) ? opts : [];
  const keys = ['A', 'B', 'C', 'D', 'E'];
  const obj = {};
  arr.forEach((text, i) => {
    if (keys[i] != null) obj[keys[i]] = String(text || '').trim() || keys[i];
  });
  return obj;
}

// 校验并规范化题目
function normalizeQuestion(q, index) {
  const content = (q.content || q.text || '').trim();
  if (!content) throw new Error(`题目 ${index + 1} 缺少题干 content/text`);
  const opts = optionsToObject(q.options);
  if (Object.keys(opts).length === 0) throw new Error(`题目 ${index + 1} 缺少选项 options`);
  const correct = String(q.correctAnswer || '').trim().toUpperCase();
  if (!correct) throw new Error(`题目 ${index + 1} 缺少正确答案 correctAnswer`);
  return {
    id: q.id || `q${index + 1}`,
    type: q.type || 'single',
    content,
    text: content, // 兼容考试页使用的 question.text
    options: opts,
    correctAnswer: correct,
    explanation: (q.explanation || '').trim() || '',
    score: typeof q.score === 'number' ? q.score : 10
  };
}

exports.main = async (event, context) => {
  const { fileId, content } = event;

  try {
    let raw = content;
    if (fileId && !raw) {
      const res = await cloud.downloadFile({ fileID: fileId });
      const buffer = res.fileContent;
      if (!buffer) throw new Error('无法下载文件');
      raw = JSON.parse(buffer.toString('utf-8'));
    }
    if (!raw || typeof raw !== 'object') {
      return { success: false, error: '无效的 JSON 内容，需提供 fileId 或 content' };
    }

    const paperType = (raw.paperType || raw.category || 'mock').toLowerCase();
    if (!['mock', 'real'].includes(paperType)) {
      return { success: false, error: 'paperType 必须为 mock 或 real' };
    }

    const name = (raw.name || raw.title || '').trim();
    const fullName = (raw.fullName || raw.description || name || '').trim();
    const questionCount = parseInt(raw.questionCount, 10) || 0;
    const durationMinutes = parseInt(raw.durationMinutes, 10) || 120;

    if (!name) return { success: false, error: '缺少 name 或 title' };
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
      return { success: false, error: 'questions 必须为非空数组' };
    }

    let subjectId = null;
    if (paperType === 'mock') {
      subjectId = (raw.subjectId || '').toString().trim();
      if (!subjectId) return { success: false, error: '模拟题库需提供 subjectId（如 01～05）' };
    }

    const questions = raw.questions.map((q, i) => normalizeQuestion(q, i));
    const category = raw.category || (paperType === 'mock' ? 'HKIIQE_MOCK' : 'HKIIQE_REAL');
    const now = new Date();

    // 模拟题与真题分集合存储：mock_bank（模拟题库）、real_papers（真题列表）
    const ensureCollection = async (name) => {
      try {
        await db.createCollection(name);
      } catch (e) {
        // 集合已存在时忽略
      }
    };

    if (paperType === 'mock') {
      await ensureCollection('mock_bank');
      const col = db.collection('mock_bank');
      const doc = {
        subjectId,
        name,
        fullName,
        questionCount: questionCount || questions.length,
        durationMinutes,
        questions,
        updatedAt: now
      };
      const existing = await col.where({ subjectId }).get();
      if (existing.data && existing.data.length > 0) {
        await col.doc(existing.data[0]._id).update({
          data: { ...doc, updatedAt: now }
        });
        return {
          success: true,
          data: { _id: existing.data[0]._id, action: 'updated', paperType: 'mock', subjectId }
        };
      }
      const addRes = await col.add({ data: { ...doc } });
      return {
        success: true,
        data: { _id: addRes._id, action: 'created', paperType: 'mock', subjectId, name }
      };
    }

    // paperType === 'real'：仅写入真题集合，每次导入产生一条真题记录
    await ensureCollection('real_papers');
    const realCol = db.collection('real_papers');
    const realDoc = {
      name,
      fullName,
      title: raw.title || `${name}：${fullName}`,
      questionCount: questionCount || questions.length,
      durationMinutes,
      questions,
      updatedAt: now,
      createdAt: now
    };
    const existingReal = await realCol.where({ name }).get();
    if (existingReal.data && existingReal.data.length > 0) {
      await realCol.doc(existingReal.data[0]._id).update({
        data: { ...realDoc, updatedAt: now }
      });
      return {
        success: true,
        data: { _id: existingReal.data[0]._id, action: 'updated', paperType: 'real', name }
      };
    }
    const addRes = await realCol.add({ data: realDoc });
    return {
      success: true,
      data: { _id: addRes._id, action: 'created', paperType: 'real', name }
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err)
    };
  }
};
