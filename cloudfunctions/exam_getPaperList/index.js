const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 获取试卷列表
exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, category } = event;

  try {
    let query = {};
    if (category) {
      query.category = category;
    }

    const res = await db.collection('papers')
      .where(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get();

    // 获取总数
    const countRes = await db.collection('papers').where(query).count();

    return {
      success: true,
      data: {
        list: res.data,
        total: countRes.total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
