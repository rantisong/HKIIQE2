const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取试卷详情
exports.main = async (event, context) => {
  const { paperId } = event;

  if (!paperId) {
    return {
      success: false,
      error: '缺少试卷ID',
    };
  }

  try {
    const res = await db.collection('papers').doc(paperId).get();

    if (!res.data) {
      return {
        success: false,
        error: '试卷不存在',
      };
    }

    return {
      success: true,
      data: res.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
