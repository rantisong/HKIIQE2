/**
 * 云函数调用封装
 * @param {string} functionName 云函数名称
 * @param {Object} [data={}] 传递给云函数的参数
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
 * @param {string} [inviteCode] 可选，邀请码（仅新用户注册时生效）
 */
const getUserInfo = (profile, inviteCode) => {
  const data = {};
  if (profile) data.profile = { nickname: profile.nickName, avatar: profile.avatarUrl };
  if (inviteCode !== undefined && inviteCode !== null) {
    data.inviteCode = String(inviteCode).trim().toUpperCase();
  }
  return callCloud('user_getUserInfo', data);
};

/**
 * 仅根据 openid 查询用户（不创建），用于登录页预填
 */
const getProfile = () => callCloud('user_getProfile', {});

/**
 * 仅校验邀请码是否有效（不创建用户），用于「我的」页点击注册/登录前拦截错误邀请码
 * @param {string} inviteCode 6 位邀请码
 * @returns {Promise<{ result: { success, valid, error? } }>}
 */
const validateInviteCode = (inviteCode) =>
  callCloud('user_validateInviteCode', { inviteCode: String(inviteCode || '').trim().toUpperCase() });

/** 更新当前用户资料：常驻城市、香港身份获取时间 */
const updateProfile = (opts) =>
  callCloud('user_updateProfile', { city: opts.city, hkIdentityAcquiredAt: opts.hkIdentityAcquiredAt });

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
 * 提交答题（模拟+真题均落库）
 * @param {string} [paperId] 试卷ID（真题必填）
 * @param {array} answers 用户答案数组
 * @param {number} timeSpent 用时（秒）
 * @param {string} [paperType] 'real'|'mock'，默认 'real'
 * @param {object} [mockPayload] 模拟时必传：{ subjectId, paperTitle, results, score }
 */
const submitAnswer = (paperId, answers, timeSpent, paperType = 'real', mockPayload) => {
  const data = { answers, timeSpent, paperType };
  if (paperType === 'mock' && mockPayload) {
    data.subjectId = mockPayload.subjectId;
    data.paperTitle = mockPayload.paperTitle;
    data.results = mockPayload.results;
    data.score = mockPayload.score;
  } else {
    data.paperId = paperId;
  }
  return callCloud('exam_submitAnswer', data);
};

/**
 * 题目维度统计（供「我的」页：刷题总数、平均正确率）
 */
const getAnswerStats = () => callCloud('exam_getAnswerStats', {});

/**
 * 按科目统计累计通过次数（模拟+真题，正确率≥70%）
 * @returns {{ subjects: Record<string, number> }} 01～05 的 passCount
 */
const getSubjectStats = () => callCloud('exam_getSubjectStats', {});

/**
 * 获取答题报告
 * @param {string} recordId 记录ID
 */
const getReport = (recordId) =>
  callCloud('exam_getReport', { recordId });

// ============ 团队模块 ============

/** 团队主页三个数：团队、合资格、全牌照 */
const getTeamMyStats = () => callCloud('team_getMyStats', {});

/** 邀请我的团队长（无上级时 hasLeader: false） */
const getTeamMyLeader = () => callCloud('team_getMyLeader', {});

/** 所属团队列表：团队长 + 当前用户 + 同门 */
const getTeamMyLeaderTeam = () => callCloud('team_getMyLeaderTeam', {});

/** 直属下属列表 */
const getTeamMyDirectMembers = () => callCloud('team_getMyDirectMembers', {});

/** 某成员的团队页数据（inviteCode 或 openid） */
const getTeamMemberTeam = (opts) => callCloud('team_getMemberTeam', opts);

/** 生成邀请用小程序码（scene 为邀请码；page 仅能传路径不能带参数，扫码后邀请码需从弹窗/保存图手动输入） */
const getInviteWxacode = (inviteCode) => {
  const code = String(inviteCode || '').trim().slice(0, 32);
  return callCloud('tool_getWxacode', { inviteCode: code, page: 'pages/login/index' });
};

/** 修改被邀请码（加入新团队） */
const updateInvitedBy = (inviteCode) =>
  callCloud('user_updateInvitedBy', { inviteCode });

/** 更新当前用户 IIQE 考试记录 */
const updateIiqeRecords = (records) =>
  callCloud('user_updateIiqeRecords', { records });

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
  validateInviteCode,
  getPaperList,
  getPaperDetail,
  getMockRandomQuestions,
  importPaperFromJson,
  getRecordList,
  submitAnswer,
  getAnswerStats,
  getSubjectStats,
  getReport,
  updateProfile,
  getTeamMyStats,
  getTeamMyLeader,
  getTeamMyLeaderTeam,
  getTeamMyDirectMembers,
  getTeamMemberTeam,
  getInviteWxacode,
  updateInvitedBy,
  updateIiqeRecords,
  getReviewList,
  getReviewQuestions,
  toggleReviewFavorite,
  initDB,
  uploadFile,
  uploadImage,
};
