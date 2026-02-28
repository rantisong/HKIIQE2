const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 获取试卷列表：模拟题从 mock_bank，真题从 real_papers（分集合存储）
exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, paperType, subjectId } = event;

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
      const res = await col
        .orderBy('createdAt', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();
      const countRes = await col.count();
      return {
        success: true,
        data: { list: res.data, total: countRes.total, page, pageSize }
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
