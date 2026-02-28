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
    text: content,
    options: opts,
    correctAnswer: correct,
    explanation: (q.explanation || '').trim() || '',
    score: typeof q.score === 'number' ? q.score : 10
  };
}

// 从云存储下载并解析 JSON
async function loadRawFromFileId(fileId) {
  const res = await cloud.downloadFile({ fileID: fileId });
  const buffer = res.fileContent;
  if (!buffer) throw new Error('无法下载文件');
  return JSON.parse(buffer.toString('utf-8'));
}

// 确保集合存在
async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (e) {
    // 集合已存在时忽略
  }
}

// 导入单份试卷到数据库，返回 { action, _id, paperType, name? }
async function importOne(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的 JSON 内容');
  }

  const paperType = (raw.paperType || raw.category || 'mock').toLowerCase();
  if (!['mock', 'real'].includes(paperType)) {
    throw new Error('paperType 必须为 mock 或 real');
  }

  const name = (raw.name || raw.title || '').trim();
  const fullName = (raw.fullName || raw.description || name || '').trim();
  const questionCount = parseInt(raw.questionCount, 10) || 0;
  const durationMinutes = parseInt(raw.durationMinutes, 10) || 120;

  if (!name) throw new Error('缺少 name 或 title');
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error('questions 必须为非空数组');
  }

  let subjectId = null;
  if (paperType === 'mock') {
    subjectId = (raw.subjectId || '').toString().trim();
    if (!subjectId) throw new Error('模拟题库需提供 subjectId（如 01～05）');
  }

  const questions = raw.questions.map((q, i) => normalizeQuestion(q, i));
  const now = new Date();

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
      return { action: 'updated', _id: existing.data[0]._id, paperType: 'mock', subjectId, name };
    }
    const addRes = await col.add({ data: { ...doc } });
    return { action: 'created', _id: addRes._id, paperType: 'mock', subjectId, name };
  }

  await ensureCollection('real_papers');
  const realCol = db.collection('real_papers');
  const subjectIdReal = (raw.subjectId || '').toString().trim() || null;
  const realDoc = {
    name,
    fullName,
    title: raw.title || `${name}：${fullName}`,
    questionCount: questionCount || questions.length,
    durationMinutes,
    questions,
    subjectId: subjectIdReal,
    updatedAt: now,
    createdAt: now
  };
  // 按 name + subjectId 精确匹配，避免不同科目的同名真题互相覆盖
    const realQuery = subjectIdReal
      ? realCol.where({ name, subjectId: subjectIdReal })
      : realCol.where({ name });
    const existingReal = await realQuery.get();
    if (existingReal.data && existingReal.data.length > 0) {
    await realCol.doc(existingReal.data[0]._id).update({
      data: { ...realDoc, updatedAt: now }
    });
    return { action: 'updated', _id: existingReal.data[0]._id, paperType: 'real', name };
  }
  const addRes = await realCol.add({ data: realDoc });
  return { action: 'created', _id: addRes._id, paperType: 'real', name };
}

/**
 * 入参（四选一，可批量）：
 * - fileId: string  单文件云存储 File ID
 * - content: object 单份试卷 JSON
 * - fileIds: string[] 多个云存储 File ID，批量导入
 * - contents: object[] 多份试卷 JSON 数组，批量导入
 * 返回：单条为 { success, data }；批量为 { success, data: { batch, total, successCount, failedCount, results } }
 */
exports.main = async (event, context) => {
  const { fileId, fileIds, content, contents } = event;

  try {
    // 归一化为「待导入列表」：每项为 raw 对象
    let rawList = [];

    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      const ids = fileIds.filter(Boolean);
      const maxBatch = 20;
      if (ids.length > maxBatch) {
        return { success: false, error: `单次最多导入 ${maxBatch} 个文件，当前 ${ids.length} 个，请分批传入 fileIds` };
      }
      const downloaded = await Promise.all(ids.map((id) => loadRawFromFileId(id)));
      downloaded.forEach((raw, i) => {
        if (raw && typeof raw === 'object') rawList.push({ raw, source: `fileIds[${i}]` });
      });
    } else if (contents && Array.isArray(contents) && contents.length > 0) {
      const maxBatch = 20;
      if (contents.length > maxBatch) {
        return { success: false, error: `单次最多导入 ${maxBatch} 份试卷，当前 ${contents.length} 份，请分批传入 contents` };
      }
      contents.forEach((c, i) => {
        if (c && typeof c === 'object') rawList.push({ raw: c, source: `contents[${i}]` });
      });
    } else if (fileId || content) {
      let raw = content;
      if (fileId && !raw) raw = await loadRawFromFileId(fileId);
      if (raw && typeof raw === 'object') rawList.push({ raw, source: 'single' });
    }

    if (rawList.length === 0) {
      return { success: false, error: '请提供 fileId、content、fileIds（数组）或 contents（数组）' };
    }

    const isBatch = rawList.length > 1;
    if (isBatch) {
      await ensureCollection('mock_bank');
      await ensureCollection('real_papers');
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rawList.length; i++) {
      const { raw, source } = rawList[i];
      try {
        const data = await importOne(raw);
        results.push({ index: i, source, success: true, data });
        successCount += 1;
      } catch (err) {
        results.push({
          index: i,
          source,
          success: false,
          error: err.message || String(err)
        });
        failedCount += 1;
      }
    }

    if (isBatch) {
      return {
        success: true,
        data: {
          batch: true,
          total: rawList.length,
          successCount,
          failedCount,
          results
        }
      };
    }

    const first = results[0];
    if (!first.success) {
      return { success: false, error: first.error };
    }
    return {
      success: true,
      data: first.data
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err)
    };
  }
};
