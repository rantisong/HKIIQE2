const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取试卷详情：按 paperType 从 mock_bank 或 real_papers 读取
exports.main = async (event, context) => {
  const { paperId, paperType } = event;

  if (!paperId) {
    return {
      success: false,
      error: '缺少试卷ID',
    };
  }

  try {
    const colName = paperType === 'mock' ? 'mock_bank' : 'real_papers';
    const col = db.collection(colName);
    const res = await col.doc(paperId).get();

    if (!res.data) {
      if (!paperType) {
        const otherCol = db.collection(colName === 'real_papers' ? 'mock_bank' : 'real_papers');
        const res2 = await otherCol.doc(paperId).get();
        if (res2.data) {
          return { success: true, data: res2.data };
        }
      }
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
