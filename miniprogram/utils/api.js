/**
 * 云函数调用封装
 * @param {string} functionName 云函数名称
 * @param {object} data 传递给云函数的参数
 * @returns {Promise}
 */
const callCloud = (functionName, data = {}) => {
  return wx.cloud.callFunction({
    name: functionName,
    data,
  });
};

// ============ 用户模块 ============

/**
 * 获取用户信息
 */
// 云函数名不能含斜杠，使用 模块_方法 格式（如 exam_getPaperList）
const getUserInfo = () => callCloud('user_getUserInfo');

/**
 * 更新用户信息
 * @param {object} profile 用户资料 { nickname, avatar }
 */
const updateUserProfile = (profile) => callCloud('user_updateUserProfile', { profile });

// ============ 考试模块 ============

/**
 * 获取试卷列表
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 * @param {string} category 分类筛选
 * @param {string} paperType mock|real
 * @param {string} subjectId 科目ID（01~05，仅 mock 时有效）
 */
const getPaperList = (page = 1, pageSize = 10, category = '', paperType = '', subjectId = '') =>
  callCloud('exam_getPaperList', { page, pageSize, category, paperType, subjectId });

/**
 * 获取试卷详情（含完整题目）
 * @param {string} paperId 试卷ID
 * @param {string} paperType 'mock'|'real' 不传则先查真题再查模拟
 */
const getPaperDetail = (paperId, paperType = '') =>
  callCloud('exam_getPaperDetail', { paperId, paperType });

/**
 * 从指定科目的模拟题库中随机抽取题目（云端抽题，仅返回指定数量，避免大包）
 * @param {string} subjectId 科目 01～05
 * @param {number} count 抽取数量，默认 75
 */
const getMockRandomQuestions = (subjectId, count = 75) =>
  callCloud('exam_getMockRandomQuestions', { subjectId, count });

/**
 * 从 JSON 导入试卷（fileId 或 content）
 * @param {string} fileId 云存储文件 ID
 * @param {object} content 试卷 JSON 内容
 */
const importPaperFromJson = (fileId = '', content = null) =>
  callCloud('paper_importFromJson', { fileId: fileId || undefined, content: content || undefined });

/**
 * 获取答题记录列表
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 */
const getRecordList = (page = 1, pageSize = 10) =>
  callCloud('exam_getRecordList', { page, pageSize });

/**
 * 提交答题
 * @param {string} paperId 试卷ID
 * @param {array} answers 用户答案数组
 * @param {number} timeSpent 用时（秒）
 */
const submitAnswer = (paperId, answers, timeSpent) =>
  callCloud('exam_submitAnswer', { paperId, answers, timeSpent });

/**
 * 获取答题报告
 * @param {string} recordId 记录ID
 */
const getReport = (recordId) =>
  callCloud('exam_getReport', { recordId });

// ============ 团队模块 ============

/**
 * 获取团队列表
 */
const getTeamList = (page = 1, pageSize = 10) =>
  callCloud('team_getTeamList', { page, pageSize });

/**
 * 创建团队
 * @param {object} teamInfo 团队信息 { name, description, avatar }
 */
const createTeam = (teamInfo) =>
  callCloud('team_createTeam', teamInfo);

/**
 * 加入团队
 * @param {string} teamId 团队ID
 */
const joinTeam = (teamId) =>
  callCloud('team_joinTeam', { teamId });

/**
 * 获取团队详情
 * @param {string} teamId 团队ID
 */
const getTeamDetail = (teamId) =>
  callCloud('team_getTeamDetail', { teamId });

// ============ 复习模块 ============

/**
 * 获取复习列表
 */
const getReviewList = () =>
  callCloud('review_getReviewList');

/**
 * 添加错题到复习
 * @param {string} paperId 试卷ID
 * @param {array} incorrectQuestions 错题列表
 */
const addToReview = (paperId, incorrectQuestions) =>
  callCloud('review_addToReview', { paperId, incorrectQuestions });

/**
 * 更新复习进度
 * @param {string} reviewId 复习ID
 */
const updateReviewProgress = (reviewId) =>
  callCloud('review_updateReviewProgress', { reviewId });

// ============ 文件上传 ============

/**
 * 初始化数据库（仅管理员使用）
 * @param {string} action init_collections | init_sample_papers | init_all
 */
const initDB = (action = 'init_all') =>
  callCloud('admin_initDB', { action });

/**
 * 上传文件到云存储
 * @param {string} filePath 文件临时路径
 * @param {string} cloudPath 云存储路径
 */
const uploadFile = (filePath, cloudPath) => {
  return wx.cloud.uploadFile({
    cloudPath,
    filePath,
  });
};

/**
 * 上传图片
 * @param {string} filePath 图片临时路径
 * @param {string} prefix 路径前缀
 */
const uploadImage = (filePath, prefix = 'images') => {
  const timestamp = Date.now();
  const cloudPath = `${prefix}/${timestamp}.${filePath.split('.').pop()}`;
  return uploadFile(filePath, cloudPath);
};

// 使用 module.exports 以支持各页面的 require() 引用
module.exports = {
  getUserInfo,
  updateUserProfile,
  getPaperList,
  getPaperDetail,
  getMockRandomQuestions,
  importPaperFromJson,
  getRecordList,
  submitAnswer,
  getReport,
  getTeamList,
  createTeam,
  joinTeam,
  getTeamDetail,
  getReviewList,
  addToReview,
  updateReviewProgress,
  initDB,
  uploadFile,
  uploadImage,
};
