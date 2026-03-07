const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 按用户 records 统计每份真题的：练习次数、最近一次准确率（正确题数/真题总题数 * 100）
 * @param {string} openid
 * @param {Array<{_id: string}>} paperList 真题列表
 * @returns {Object} paperId -> { practiceCount, accuracyRate }
 */
async function getRealPaperStats(openid, paperList) {
  if (!openid || !Array.isArray(paperList) || paperList.length === 0) {
    return {};
  }
  const paperIds = paperList.map((p) => p._id).filter(Boolean);
  if (paperIds.length === 0) return {};

  const recRes = await db.collection('records')
    .where({ _openid: openid, paperType: 'real' })
    .limit(500)
    .get();
  const recs = (recRes.data || []).sort((a, b) => {
    const ta = (a.createdAt && (a.createdAt.getTime ? a.createdAt.getTime() : a.createdAt)) || 0;
    const tb = (b.createdAt && (b.createdAt.getTime ? b.createdAt.getTime() : b.createdAt)) || 0;
    return tb - ta;
  });

  const map = {};
  paperIds.forEach((id) => {
    map[id] = { practiceCount: 0, accuracyRate: null };
  });
  for (const rec of recs) {
    const pid = rec.paperId;
    if (!map[pid]) continue;
    map[pid].practiceCount += 1;
    if (map[pid].accuracyRate == null && Array.isArray(rec.results) && rec.results.length > 0) {
      const total = rec.results.length;
      const correct = rec.results.filter((r) => r && r.isCorrect === true).length;
      map[pid].accuracyRate = Math.round((correct / total) * 100);
    }
  }
  return map;
}

// 获取试卷列表：模拟题从 mock_bank，真题从 real_papers（分集合存储）
exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, paperType, subjectId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (paperType === 'mock') {
      const col = db.collection('mock_bank');
      let query = col.orderBy('subjectId', 'asc');
      if (subjectId) {
        query = col.where({ subjectId }).limit(1);
      } else {
        query = query.skip((page - 1) * pageSize).limit(pageSize);
      }
      const res = await query.get();
      const countRes = subjectId ? { total: res.data.length } : await col.count();
      return {
        success: true,
        data: { list: res.data, total: countRes.total, page, pageSize }
      };
    }

    if (paperType === 'real') {
      const col = db.collection('real_papers');
      // 统一为两位科目码 01～05，便于与库中 "1"/"01" 等格式都能匹配
      const norm = (v) => {
        const s = String(v || '').trim();
        return /^\d{1,2}$/.test(s) ? s.padStart(2, '0') : s;
      };
      const subjectIdNorm = subjectId != null ? norm(subjectId) : '';
      const filterBySubject = subjectIdNorm && /^0[1-5]$/.test(subjectIdNorm);

      let list;
      let total;

      if (filterBySubject) {
        // 仅 limit 拉取，内存按 subjectId 筛选+排序，不依赖任何索引
        const allRes = await col.limit(100).get();
        const all = (allRes.data || []).filter((d) => norm(d.subjectId) === subjectIdNorm);
        const sorted = all.sort((a, b) => {
          const ta = (a.createdAt && (a.createdAt.getTime ? a.createdAt.getTime() : a.createdAt)) || 0;
          const tb = (b.createdAt && (b.createdAt.getTime ? b.createdAt.getTime() : b.createdAt)) || 0;
          return tb - ta;
        });
        const start = (page - 1) * pageSize;
        list = sorted.slice(start, start + pageSize);
        total = sorted.length;
      } else {
        const allRes = await col.limit(100).get();
        const all = (allRes.data || []).sort((a, b) => {
          const ta = (a.createdAt && (a.createdAt.getTime ? a.createdAt.getTime() : a.createdAt)) || 0;
          const tb = (b.createdAt && (b.createdAt.getTime ? b.createdAt.getTime() : b.createdAt)) || 0;
          return tb - ta;
        });
        const start = (page - 1) * pageSize;
        list = all.slice(start, start + pageSize);
        total = all.length;
      }

      let stats = {};
      try {
        stats = await getRealPaperStats(openid, list);
      } catch (e) {
        console.warn('getRealPaperStats failed (e.g. records collection not exists):', e && e.message);
      }
      const listWithStats = list.map((p) => {
        const s = stats[p._id] || { practiceCount: 0, accuracyRate: null };
        return {
          ...p,
          practiceCount: s.practiceCount,
          accuracyRate: s.accuracyRate,
        };
      });

      return {
        success: true,
        data: { list: listWithStats, total, page, pageSize }
      };
    }

    return { success: false, error: '请指定 paperType: mock 或 real' };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
