const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 获取当前用户各科目的收藏题目数量汇总
 *
 * 返回：
 * {
 *   success: boolean,
 *   error?: string,
 *   data?: {
 *     totalCollected: number,
 *     subjects: { subjectId: string, collected: number }[]
 *   }
 * }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return {
      success: false,
      error: '未获取到微信身份，请在微信环境中调用并完成登录。',
    };
  }

  try {
    const usersCol = db.collection('users');
    const userRes = await usersCol.where({ _openid: openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在，请先完成用户注册/登录。',
      };
    }

    const userId = userRes.data[0]._id;
    const reviewsCol = db.collection('reviews');

    // 目前系统支持的科目列表（01～05）
    const subjectIds = ['01', '02', '03', '04', '05'];
    const subjects = [];
    let totalCollected = 0;

    for (const subjectId of subjectIds) {
      const { total } = await reviewsCol
        .where({
          userId,
          subjectId,
          status: 'favorited',
        })
        .count();

      subjects.push({
        subjectId,
        collected: total,
      });
      totalCollected += total;
    }

    return {
      success: true,
      data: {
        totalCollected,
        subjects,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

