const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const INVITE_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVITE_CODE_MAX_RETRY = 20;

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

async function getUniqueInviteCode(usersCol) {
  for (let retry = 0; retry < INVITE_CODE_MAX_RETRY; retry++) {
    const code = generateInviteCode();
    const { total } = await usersCol.where({ inviteCode: code }).count();
    if (total === 0) return code;
  }
  throw new Error('邀请码生成失败');
}

/**
 * 仅根据当前 openid 查询用户，不创建。用于判断是否已注册、登录页预填等。
 * 若用户存在但没有 inviteCode，会补写并返回（便于团队上下级关系显示）。
 */
exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: true, data: null };
  try {
    const usersCol = db.collection('users');
    const res = await usersCol.where({ _openid: openid }).get();
    let user = res.data && res.data[0] ? res.data[0] : null;
    if (user && !(user.inviteCode && user.inviteCode.trim())) {
      const code = await getUniqueInviteCode(usersCol);
      await usersCol.doc(user._id).update({
        data: { inviteCode: code, updatedAt: new Date() },
      });
      user = { ...user, inviteCode: code, updatedAt: new Date() };
    }
    return { success: true, data: user };
  } catch (e) {
    return { success: false, error: e.message, data: null };
  }
};
