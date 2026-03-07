const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const INVITE_CODE_REG = /^[0-9A-Z]{6}$/;
const SYSTEM_INVITE_CODE = '52IIQE';

/**
 * 仅校验邀请码是否有效，不创建用户。用于「我的」页游客卡点击「注册/登录」前拦截错误邀请码。
 * 入参：event.inviteCode（6 位，会转大写校验）
 * 返回：{ success: true, valid: true } 或 { success: true, valid: false, error: '...' }
 */
exports.main = async (event) => {
  const inviteCodeInput = typeof event.inviteCode === 'string'
    ? event.inviteCode.trim().toUpperCase()
    : '';
  if (!inviteCodeInput || !INVITE_CODE_REG.test(inviteCodeInput)) {
    return {
      success: true,
      valid: false,
      error: '邀请码为6位数字和字母组合，请重新输入',
    };
  }
  if (inviteCodeInput === SYSTEM_INVITE_CODE) {
    return { success: true, valid: true };
  }
  try {
    const usersCol = db.collection('users');
    const openid = cloud.getWXContext().OPENID;
    const res = await usersCol.where({ inviteCode: inviteCodeInput }).limit(1).get();
    if (!res.data || res.data.length === 0) {
      return { success: true, valid: false, error: '邀请码不正确，请重新输入' };
    }
    const inviter = res.data[0];
    if (inviter._openid === openid) {
      return { success: true, valid: false, error: '不能使用自己的邀请码' };
    }
    return { success: true, valid: true };
  } catch (e) {
    return {
      success: false,
      valid: false,
      error: e.message || '校验失败，请重试',
    };
  }
};
