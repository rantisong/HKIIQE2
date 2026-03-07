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
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  const recs = recRes.data || [];

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
      const subjectIdStr = subjectId != null ? String(subjectId).trim() : '';
      const filterBySubject = subjectIdStr && /^0[1-5]$/.test(subjectIdStr);

      let list;
      let total;

      if (filterBySubject) {
        const allRes = await col.orderBy('createdAt', 'desc').limit(200).get();
        const all = allRes.data || [];
        const filtered = all.filter((d) => String(d.subjectId || '').trim() === subjectIdStr);
        const start = (page - 1) * pageSize;
        list = filtered.slice(start, start + pageSize);
        total = filtered.length;
      } else {
        const res = await col.orderBy('createdAt', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();
        list = res.data || [];
        const countRes = await col.count();
        total = countRes.total;
      }

      const stats = await getRealPaperStats(openid, list);
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
