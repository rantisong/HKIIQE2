const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 按科目统计累计通过次数（模拟+真题，完成考试后正确率≥70% 的次数）
 * 返回各科目 01～05 的 passCount
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const subjectIds = ['01', '02', '03', '04', '05'];

  try {
    const subjects = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const countRes = await db.collection('records')
          .where({
            _openid: openid,
            subjectId,
            score: _.gte(70),
          })
          .count();
        return { subjectId, passCount: countRes.total || 0 };
      })
    );

    const map = {};
    subjects.forEach((s) => {
      map[s.subjectId] = s.passCount;
    });

    return {
      success: true,
      data: { subjects: map },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
