const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取答题报告
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { recordId } = event;

  if (!recordId) {
    return {
      success: false,
      error: '缺少记录ID',
    };
  }

  try {
    const res = await db.collection('records').doc(recordId).get();

    if (!res.data) {
      return {
        success: false,
        error: '记录不存在',
      };
    }

    // 验证权限
    if (res.data._openid !== openid) {
      return {
        success: false,
        error: '无权限查看',
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
