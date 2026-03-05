const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 获取当前用户在指定科目下已收藏的题目列表（用于复习模式）
 *
 * 入参：
 * - subjectId: string 科目编号（01～05）
 *
 * 返回：
 * {
 *   success: boolean,
 *   error?: string,
 *   data?: {
 *     subjectId: string,
 *     questionCount: number,
 *     questions: Array<{
 *       subjectId: string,
 *       sourceType: 'mock' | 'real',
 *       paperId: string | null,
 *       questionId: string,
 *       text: string,
 *       options: Record<string, string>,
 *       correctAnswer: string | string[],
 *       explanation: string,
 *       explanationEn?: string,
 *       userAnswer: string | string[] | null,
 *       isCorrect: boolean | null
 *     }>
 *   }
 * }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const rawSubjectId = event && event.subjectId;

  if (!openid) {
    return {
      success: false,
      error: '未获取到微信身份，请在微信环境中调用并完成登录。',
    };
  }

  const subjectId = typeof rawSubjectId === 'string'
    ? rawSubjectId.trim()
    : String(rawSubjectId || '').trim();

  if (!subjectId || !/^\d{2}$/.test(subjectId)) {
    return {
      success: false,
      error: '缺少或无效的 subjectId，应为 01～05。',
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

    // 拉取当前用户在该科目下所有已收藏题目
    const res = await reviewsCol
      .where({
        userId,
        subjectId,
        status: 'favorited',
      })
      .limit(1000)
      .get();

    const records = res.data || [];

    const questions = records.map((r) => {
      const snap = r.questionSnapshot || {};

      const text = snap.text || snap.content || '';
      const options = snap.options || {};

      const correctAnswer =
        r.correctAnswer != null && r.correctAnswer !== ''
          ? r.correctAnswer
          : snap.correctAnswer != null
          ? snap.correctAnswer
          : '';

      return {
        subjectId: r.subjectId,
        sourceType: r.sourceType,
        paperId: r.paperId || null,
        questionId: r.questionId,
        text,
        options,
        correctAnswer,
        explanation: snap.explanation || '',
        explanationEn: snap.explanationEn || '',
        userAnswer: r.lastAnswer != null ? r.lastAnswer : null,
        isCorrect:
          typeof r.isCorrect === 'boolean' ? r.isCorrect : null,
      };
    });

    return {
      success: true,
      data: {
        subjectId,
        questionCount: questions.length,
        questions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

