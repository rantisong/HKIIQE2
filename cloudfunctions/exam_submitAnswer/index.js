const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 提交答题
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { paperId, answers, timeSpent } = event;

  try {
    // 获取试卷信息（真题在 real_papers，模拟答题不落库故仅查真题）
    const paperRes = await db.collection('real_papers').doc(paperId).get();
    const paper = paperRes.data;
    if (!paper || !paper.questions) {
      return { success: false, error: '试卷不存在或非真题' };
    }

    // 计算得分
    let correctCount = 0;
    const results = paper.questions.map((question, index) => {
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

    const score = Math.round((correctCount / paper.questions.length) * 100);

    // 保存答题记录
    const record = {
      _openid: openid,
      paperId,
      paperTitle: paper.title,
      answers,
      results,
      score,
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
        score,
        correctCount,
        totalCount: paper.questions.length,
        results,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
