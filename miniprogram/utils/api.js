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
 * 获取/创建用户信息（登录/注册）
 * @param {object} [profile] 可选，{ nickName, avatarUrl }，会传给云函数作为 profile
 */
const getUserInfo = (profile) => {
  const data = {};
  if (profile) data.profile = { nickname: profile.nickName, avatar: profile.avatarUrl };
  return callCloud('user_getUserInfo', data);
};

/**
 * 仅根据 openid 查询用户（不创建），用于登录页预填
 */
const getProfile = () => callCloud('user_getProfile', {});

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
 * 获取复习科目汇总（各科收藏数量）
 */
const getReviewList = () =>
  callCloud('review_getReviewList');

/**
 * 获取指定科目的复习题目列表
 * @param {string} subjectId 科目 ID（01～05）
 */
const getReviewQuestions = (subjectId) =>
  callCloud('review_getSubjectQuestions', { subjectId });

/**
 * 切换收藏状态（收藏 / 取消收藏）
 * @param {object} payload
 *  - subjectId: string
 *  - sourceType: 'mock' | 'real'
 *  - paperId?: string | null
 *  - questionId: string
 *  - snapshot?: { content?, text?, options?, correctAnswer?, explanation?, explanationEn?, type?, score?, paperTitle? }
 */
const toggleReviewFavorite = (payload) =>
  callCloud('review_toggleFavorite', payload);

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
 * @param {string} filePath 图片临时路径（支持无扩展名或含 query 的路径）
 * @param {string} prefix 路径前缀
 */
const uploadImage = (filePath, prefix = 'avatars') => {
  const timestamp = Date.now();
  const basePath = (filePath || '').split('?')[0].trim();
  const ext = basePath ? basePath.split('.').pop() : '';
  const safeExt = /^[a-z0-9]{2,5}$/i.test(ext) ? ext : 'jpg';
  const cloudPath = `${prefix}/${timestamp}.${safeExt}`;
  return uploadFile(filePath, cloudPath);
};

// 使用 module.exports 以支持各页面的 require() 引用
module.exports = {
  getUserInfo,
  getProfile,
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
  getReviewQuestions,
  toggleReviewFavorite,
  initDB,
  uploadFile,
  uploadImage,
};
