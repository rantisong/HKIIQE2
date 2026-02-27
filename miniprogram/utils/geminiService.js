// Gemini API 服务 - 需配置后端代理，小程序无法直接调用（域名需备案）
// 可在云开发或自建后端实现
function getSmartAnalysis(questionText, userAnswer, correctAnswer) {
  return new Promise((resolve, reject) => {
    // 小程序需通过 wx.request 调用自己的后端，由后端转发到 Gemini API
    // 此处返回 null 表示暂未配置，使用题目内置解析
    wx.getStorage({
      key: 'GEMINI_API_PROXY',
      fail: () => resolve(null)
    });
    resolve(null);
  });
}

module.exports = {
  getSmartAnalysis
};
