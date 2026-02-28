const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取答题记录列表
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { page = 1, pageSize = 10 } = event;

  try {
    const res = await db.collection('records')
      .where({
        _openid: openid,
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get();

    const countRes = await db.collection('records').where({
      _openid: openid,
    }).count();

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
