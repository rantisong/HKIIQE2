const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 团队主页三个数：团队（下属总人数）、合资格、全牌照
 * 优化：直接从用户冗余字段读取，不再递归计算
 */
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: true, data: { team: 0, qualified: 0, fullLicense: 0 } };
    const myCode = (me.inviteCode || '').trim().toUpperCase();
    if (!myCode) return { success: true, data: { team: 0, qualified: 0, fullLicense: 0 } };

    // 直接从冗余字段读取统计信息（O(1) 查询）
    // 注意：冗余字段会在以下情况自动更新：
    // 1. 用户更新考试记录时 (user_updateIiqeRecords)
    // 2. 团队结构变化时
    return {
      success: true,
      data: {
        team: me.totalMemberCount || 0,
        qualified: me.qualifiedCount || 0,
        fullLicense: me.fullLicenseCount || 0,
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
