const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 切换当前用户与某题目的收藏状态（收藏 / 取消收藏）
 *
 * 入参：
 * - subjectId: string 科目 ID（01～05）
 * - sourceType: 'mock' | 'real'
 * - paperId: string | null  当 sourceType='real' 时为试卷 ID；mock 时传 null 或不传
 * - questionId: string 题目 ID（如 q1）
 * - lastAnswer?: string | string[]
 * - correctAnswer?: string | string[]
 * - isCorrect?: boolean
 * - snapshot?: {
 *     content?: string,
 *     text?: string,
 *     options?: Record<string, string>,
 *     correctAnswer?: string | string[],
 *     explanation?: string,
 *     explanationEn?: string,
 *     type?: string,
 *     score?: number,
 *     paperTitle?: string
 *   }
 *
 * 逻辑：
 * - 若记录不存在：创建一条 status='favorited' 的记录。
 * - 若记录存在且 status='favorited'：更新为 'unfavorited'。
 * - 若记录存在且 status='unfavorited'：更新为 'favorited'。
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

  const {
    subjectId: rawSubjectId,
    sourceType,
    paperId = null,
    questionId,
    lastAnswer,
    correctAnswer,
    isCorrect,
    snapshot,
  } = event || {};

  const subjectId = typeof rawSubjectId === 'string'
    ? rawSubjectId.trim()
    : String(rawSubjectId || '').trim();

  if (!subjectId || !/^\d{2}$/.test(subjectId)) {
    return {
      success: false,
      error: '缺少或无效的 subjectId，应为 01～05。',
    };
  }

  if (!sourceType || (sourceType !== 'mock' && sourceType !== 'real')) {
    return {
      success: false,
      error: '缺少或无效的 sourceType，应为 mock 或 real。',
    };
  }

  if (!questionId) {
    return {
      success: false,
      error: '缺少 questionId。',
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

    const where = {
      userId,
      subjectId,
      sourceType,
      paperId: sourceType === 'real' ? (paperId || null) : null,
      questionId,
    };

    const existingRes = await reviewsCol.where(where).limit(1).get();
    const now = new Date();

    const hasAnswerPayload =
      lastAnswer != null ||
      correctAnswer != null ||
      typeof isCorrect === 'boolean';

    // 不存在则创建收藏记录
    if (!existingRes.data || existingRes.data.length === 0) {
      const doc = {
        ...where,
        status: 'favorited',
        createdAt: now,
        updatedAt: now,
        lastAnswer: hasAnswerPayload ? lastAnswer : null,
        correctAnswer:
          correctAnswer != null
            ? correctAnswer
            : snapshot && snapshot.correctAnswer != null
            ? snapshot.correctAnswer
            : null,
        isCorrect: hasAnswerPayload
          ? (typeof isCorrect === 'boolean' ? isCorrect : null)
          : null,
        lastAnsweredAt: hasAnswerPayload ? now : null,
        questionSnapshot: snapshot
          ? {
              content: snapshot.content || snapshot.text || '',
              text: snapshot.text || snapshot.content || '',
              options: snapshot.options || {},
              correctAnswer: snapshot.correctAnswer != null ? snapshot.correctAnswer : null,
              explanation: snapshot.explanation || '',
              explanationEn: snapshot.explanationEn || '',
              type: snapshot.type || 'single',
              score:
                typeof snapshot.score === 'number'
                  ? snapshot.score
                  : 10,
            }
          : null,
        paperTitle: snapshot && snapshot.paperTitle ? snapshot.paperTitle : null,
      };

      const addRes = await reviewsCol.add({ data: doc });
      return {
        success: true,
        data: {
          action: 'favorited',
          reviewId: addRes._id,
        },
      };
    }

    // 已存在则切换状态
    const existing = existingRes.data[0];

    // 当前已存在记录视为“已收藏”，再次点击视为“取消收藏”：直接删除该记录
    await reviewsCol.doc(existing._id).remove();

    return {
      success: true,
      data: {
        action: 'unfavorited',
        reviewId: existing._id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

