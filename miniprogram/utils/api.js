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
export const getUserInfo = () => callCloud('user/getUserInfo');

/**
 * 更新用户信息
 * @param {object} profile 用户资料 { nickname, avatar }
 */
export const updateUserProfile = (profile) => callCloud('user/updateUserProfile', { profile });

// ============ 考试模块 ============

/**
 * 获取试卷列表
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 * @param {string} category 分类筛选
 */
export const getPaperList = (page = 1, pageSize = 10, category = '') => 
  callCloud('exam/getPaperList', { page, pageSize, category });

/**
 * 获取试卷详情
 * @param {string} paperId 试卷ID
 */
export const getPaperDetail = (paperId) =>
  callCloud('exam/getPaperDetail', { paperId });

/**
 * 获取答题记录列表
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 */
export const getRecordList = (page = 1, pageSize = 10) =>
  callCloud('exam/getRecordList', { page, pageSize });

/**
 * 提交答题
 * @param {string} paperId 试卷ID
 * @param {array} answers 用户答案数组
 * @param {number} timeSpent 用时（秒）
 */
export const submitAnswer = (paperId, answers, timeSpent) =>
  callCloud('exam/submitAnswer', { paperId, answers, timeSpent });

/**
 * 获取答题报告
 * @param {string} recordId 记录ID
 */
export const getReport = (recordId) =>
  callCloud('exam/getReport', { recordId });

// ============ 团队模块 ============

/**
 * 获取团队列表
 */
export const getTeamList = (page = 1, pageSize = 10) => 
  callCloud('team/getTeamList', { page, pageSize });

/**
 * 创建团队
 * @param {object} teamInfo 团队信息 { name, description, avatar }
 */
export const createTeam = (teamInfo) => 
  callCloud('team/createTeam', teamInfo);

/**
 * 加入团队
 * @param {string} teamId 团队ID
 */
export const joinTeam = (teamId) => 
  callCloud('team/joinTeam', { teamId });

/**
 * 获取团队详情
 * @param {string} teamId 团队ID
 */
export const getTeamDetail = (teamId) => 
  callCloud('team/getTeamDetail', { teamId });

// ============ 复习模块 ============

/**
 * 获取复习列表
 */
export const getReviewList = () => 
  callCloud('review/getReviewList');

/**
 * 添加错题到复习
 * @param {string} paperId 试卷ID
 * @param {array} incorrectQuestions 错题列表
 */
export const addToReview = (paperId, incorrectQuestions) => 
  callCloud('review/addToReview', { paperId, incorrectQuestions });

/**
 * 更新复习进度
 * @param {string} reviewId 复习ID
 */
export const updateReviewProgress = (reviewId) => 
  callCloud('review/updateReviewProgress', { reviewId });

// ============ 文件上传 ============

/**
 * 初始化数据库（仅管理员使用）
 * @param {string} action init_collections | init_sample_papers | init_all
 */
export const initDB = (action = 'init_all') =>
  callCloud('admin/initDB', { action });

/**
 * 上传文件到云存储
 * @param {string} filePath 文件临时路径
 * @param {string} cloudPath 云存储路径
 */
export const uploadFile = (filePath, cloudPath) => {
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
export const uploadImage = (filePath, prefix = 'images') => {
  const timestamp = Date.now();
  const cloudPath = `${prefix}/${timestamp}.${filePath.split('.').pop()}`;
  return uploadFile(filePath, cloudPath);
};
