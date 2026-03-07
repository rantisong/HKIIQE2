// 试卷数据（按 IIQE 官方规格：题目数量、考试时长、合格线 70%）
const PAPERS = [
  { id: '1', name: '卷一', fullName: '保险原理及实务', questionCount: 75, durationMinutes: 120, completedCount: 12, passRate: 85 },
  { id: '2', name: '卷二', fullName: '一般保险', questionCount: 80, durationMinutes: 120, completedCount: 5, passRate: 60 },
  { id: '3', name: '卷三', fullName: '长期保险', questionCount: 50, durationMinutes: 75, completedCount: 0, passRate: 0 },
  { id: '4', name: '卷四', fullName: '强制性公积金计划', questionCount: 80, durationMinutes: 120, completedCount: 8, passRate: 72 },
  { id: '5', name: '卷五', fullName: '投资相连长期保险', questionCount: 80, durationMinutes: 120, completedCount: 2, passRate: 40 },
];

// 科目信息（与 PAPERS 对应）
const SUBJECTS = {
  '01': { id: '01', name: '保险原理及实务', nameShort: '卷一', questionCount: 75, duration: 120 },
  '02': { id: '02', name: '一般保险', nameShort: '卷二', questionCount: 80, duration: 120 },
  '03': { id: '03', name: '长期保险', nameShort: '卷三', questionCount: 50, duration: 75 },
  '04': { id: '04', name: '强制性公积金计划', nameShort: '卷四', questionCount: 80, duration: 120 },
  '05': { id: '05', name: '投资相连长期保险', nameShort: '卷五', questionCount: 80, duration: 120 },
};

// 科目中文数字映射
const SUBJECT_LABELS = {
  '01': '一', '02': '二', '03': '三', '04': '四', '05': '五',
};

// 合格线：正确率 ≥ 70%
const PASS_RATE_THRESHOLD = 0.7;

// 默认头像
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user';

// ============ 表单验证正则 ============
const VALIDATORS = {
  // 邀请码：6位数字或字母组合
  INVITE_CODE: /^[0-9A-Z]{6}$/,
  // 昵称：1-20个字符
  NICKNAME: /^.{1,20}$/,
  // 手机号（香港）
  PHONE_HK: /^[569]\d{7}$/,
  // 邮箱
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// ============ 消息文案 ============
const MESSAGES = {
  // 通用
  LOAD_FAILED: '加载失败，请稍后重试',
  NETWORK_ERROR: '网络异常，请检查网络',
  PLEASE_TRY_AGAIN: '请稍后重试',

  // 登录/注册
  PLEASE_LOGIN: '请先登录',
  INVITE_CODE_INVALID: '邀请码为6位数字和字母组合，请重新输入',
  INVITE_CODE_ERROR: '邀请码不正确，请重新输入',
  PLEASE_FILL_NICKNAME: '请先填写昵称',
  PLEASE_CHOOSE_AVATAR: '请先选择头像',

  // 考试
  NO_QUESTIONS: '暂无题目',
  PAPER_LOAD_FAILED: '加载试卷详情失败',
  TIME_UP: '时间到，自动提交',
  SUBMIT_FAILED: '提交失败，请重试',
  CANNOT_FAVORITE: '题目信息不完整，无法收藏',

  // 团队
  NO_MEMBERS: '暂无直属成员',

  // 设置
  SAVE_FAILED: '保存失败',
  SAVE_SUCCESS: '保存成功',
  LOGOUT_SUCCESS: '已退出登录',
};

// 模拟题目
const MOCK_QUESTIONS = [
  {
    id: 1,
    text: "在保险代理合同中，赋予代理人权力代表保险人收取保费并签发临时保单。这种权力通常被称为：",
    options: {
      A: "默示权限 (Implied Authority)",
      B: "明示权限 (Express Authority)",
      C: "表见权限 (Apparent Authority)",
      D: "追认权限 (Ratification)"
    },
    correctAnswer: "B",
    explanation: "明示权限是指由授权书或代理合约明确授予的权力。本题描述的收取保费和签发保单即为合同中明确列出的授权范畴。",
    explanationEn: "Express authority is the authority explicitly granted by the principal to the agent in the agency agreement."
  },
  {
    id: 2,
    text: "根据《保险业条例》，授权保险人在香港经营业务的法定权力归属于：",
    options: {
      A: "香港金融管理局 (HKMA)",
      B: "香港证监会 (SFC)",
      C: "保险业监管局 (IA)",
      D: "公司注册处"
    },
    correctAnswer: "C",
    explanation: "保险业监管局 (Insurance Authority) 是香港保险业的独立监管机构。根据《保险业条例》，授权保险公司在香港经营保险业务均属于其核心职能。",
    explanationEn: "The Insurance Authority (IA) is the primary regulator responsible for the authorization and supervision of insurers."
  },
  {
    id: 3,
    text: "以下哪项或哪些是保险的基本功能？（可多选）",
    options: {
      A: "风险转移",
      B: "为损失作财务补偿",
      C: "增加就业机会",
      D: "储蓄与投资"
    },
    correctAnswer: "A,B",
    explanation: "风险转移及为损失作财务补偿是保险的基本功能，储蓄与投资属于辅助功能。",
    explanationEn: "Risk transfer and financial compensation for loss are the basic functions of insurance."
  }
];

// 团队成员
const MOCK_TEAM_MEMBERS = [
  { id: '1', name: 'Marcus Wong', progress: [1, 2, 3, 4], status: 'online', todayPasses: 8, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', teamSize: 5 },
  { id: '2', name: 'Sarah Leung', progress: [1], status: 'offline', todayPasses: 6, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', teamSize: 8 },
  { id: '3', name: 'Felix Chen', progress: [1, 2, 3, 4, 5], status: 'offline', todayPasses: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', teamSize: 2 }
];

module.exports = {
  PAPERS,
  SUBJECTS,
  SUBJECT_LABELS,
  PASS_RATE_THRESHOLD,
  DEFAULT_AVATAR,
  VALIDATORS,
  MESSAGES,
  MOCK_QUESTIONS,
  MOCK_TEAM_MEMBERS,
};
