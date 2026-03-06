const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 题目维度聚合：仅用于「我的」页的刷题总数与平均正确率。
 * 返回 totalQuestions（题目道数之和）、totalCorrect（正确题数之和）。
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  try {
    const batchSize = 100;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await db.collection('records')
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(batchSize)
        .field({ results: true })
        .get();

      const list = res.data || [];
      for (const rec of list) {
        const results = rec.results;
        if (Array.isArray(results)) {
          totalQuestions += results.length;
          totalCorrect += results.filter((r) => r && r.isCorrect === true).length;
        }
      }
      if (list.length < batchSize) hasMore = false;
      else skip += batchSize;
    }

    return {
      success: true,
      data: { totalQuestions, totalCorrect },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
