const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 提交答题（模拟 + 真题均落库）
 * 入参：paperType 'mock'|'real'（默认 'real'）
 * - real: paperId, answers, timeSpent；从 real_papers 取卷算分并写入 records，带 paperType: 'real'
 * - mock: subjectId, paperTitle, answers, results, score, timeSpent；直接写入 records，带 paperType: 'mock'
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const {
    paperType = 'real',
    paperId,
    answers,
    timeSpent,
    subjectId,
    paperTitle,
    results,
    score,
  } = event;

  try {
    if (paperType === 'mock') {
      // 模拟：直接落库，不查试卷
      if (!Array.isArray(answers) || !Array.isArray(results)) {
        return { success: false, error: '模拟提交需传 answers 与 results 数组' };
      }
      const totalCount = results.length;
      const correctCount = results.filter((r) => r && r.isCorrect === true).length;
      const record = {
        _openid: openid,
        paperType: 'mock',
        paperId: null,
        paperTitle: paperTitle || '模拟练习',
        subjectId: subjectId || null,
        answers,
        results,
        score: typeof score === 'number' ? score : Math.round((correctCount / totalCount) * 100),
        timeSpent: typeof timeSpent === 'number' ? timeSpent : 0,
        createdAt: new Date(),
      };
      const addRes = await db.collection('records').add({ data: record });
      return {
        success: true,
        data: {
          recordId: addRes._id,
          score: record.score,
          correctCount,
          totalCount,
          results,
        },
      };
    }

    // 真题：原有逻辑
    const paperRes = await db.collection('real_papers').doc(paperId).get();
    const paper = paperRes.data;
    if (!paper || !paper.questions) {
      return { success: false, error: '试卷不存在或非真题' };
    }

    let correctCount = 0;
    const computedResults = paper.questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: question._id || question.id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const computedScore = Math.round((correctCount / paper.questions.length) * 100);

    const record = {
      _openid: openid,
      paperType: 'real',
      paperId,
      paperTitle: paper.title,
      answers,
      results: computedResults,
      score: computedScore,
      timeSpent,
      createdAt: new Date(),
    };

    const addRes = await db.collection('records').add({
      data: record,
    });

    return {
      success: true,
      data: {
        recordId: addRes._id,
        score: computedScore,
        correctCount,
        totalCount: paper.questions.length,
        results: computedResults,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
