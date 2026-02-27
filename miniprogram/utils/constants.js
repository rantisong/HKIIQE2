// 试卷数据（按 IIQE 官方规格：题目数量、考试时长、合格线 70%）
const PAPERS = [
  { id: '1', name: '卷一', fullName: '保险原理及实务', questionCount: 75, durationMinutes: 120, completedCount: 12, passRate: 85 },
  { id: '2', name: '卷二', fullName: '一般保险', questionCount: 80, durationMinutes: 120, completedCount: 5, passRate: 60 },
  { id: '3', name: '卷三', fullName: '长期保险', questionCount: 50, durationMinutes: 75, completedCount: 0, passRate: 0 },
  { id: '4', name: '卷四', fullName: '强制性公积金计划', questionCount: 80, durationMinutes: 120, completedCount: 8, passRate: 72 },
  { id: '5', name: '卷五', fullName: '投资相连长期保险', questionCount: 80, durationMinutes: 120, completedCount: 2, passRate: 40 },
];

// 合格线：正确率 ≥ 70%
const PASS_RATE_THRESHOLD = 0.7;

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
  MOCK_QUESTIONS,
  MOCK_TEAM_MEMBERS,
  PASS_RATE_THRESHOLD
};
