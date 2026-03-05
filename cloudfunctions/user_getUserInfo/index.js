const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

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

/**
 * 生成唯一邀请码：与现有用户表比对，避免与系统内已有 inviteCode 重复
 * @param {Collection} usersCol users 集合
 * @returns {Promise<string>} 6 位数字+字母且未被占用的邀请码
 */
async function getUniqueInviteCode(usersCol) {
  for (let retry = 0; retry < INVITE_CODE_MAX_RETRY; retry++) {
    const code = generateInviteCode();
    const { total } = await usersCol.where({ inviteCode: code }).count();
    if (total === 0) return code;
  }
  throw new Error('邀请码生成失败：多次与现有用户重复，请稍后重试');
}

// 获取用户信息（登录/注册：无则创建用户）
// 支持 event.profile { nickname, avatar }
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const profileInput = event.profile && typeof event.profile === 'object'
    ? {
        nickname: event.profile.nickname || event.profile.nickName || '',
        avatar: event.profile.avatar || event.profile.avatarUrl || '',
      }
    : null;

  if (!openid) {
    return {
      success: false,
      error: '未获取到微信身份。请在真机或开发者工具中完成微信登录后再试。',
    };
  }

  try {
    const usersCol = db.collection('users');
    const userRes = await usersCol.where({ _openid: openid }).get();

    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      // 若本次带了授权资料，更新用户昵称/头像
      if (profileInput && (profileInput.nickname || profileInput.avatar)) {
        const profile = {
          nickname: profileInput.nickname || (user.profile && user.profile.nickname) || '',
          avatar: profileInput.avatar || (user.profile && user.profile.avatar) || '',
        };
        await usersCol.doc(user._id).update({
          data: {
            updatedAt: new Date(),
            profile,
          },
        });
        user.profile = profile;
        user.updatedAt = new Date();
      }
      return { success: true, data: user };
    }

    // 创建新用户（带授权资料则写入），并生成 6 位数字+字母邀请码
    const inviteCode = await getUniqueInviteCode(usersCol);
    const newUser = {
      _openid: openid,
      inviteCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: profileInput
        ? { nickname: profileInput.nickname, avatar: profileInput.avatar }
        : { nickname: '', avatar: '' },
    };
    const addRes = await usersCol.add({ data: newUser });
    return {
      success: true,
      data: { _id: addRes._id, ...newUser },
    };
  } catch (error) {
    const msg = error.message || String(error);
    // 集合不存在时提示先初始化数据库
    if (msg.indexOf('collection') !== -1 || msg.indexOf('集合') !== -1 || msg.indexOf('Collection') !== -1) {
      return {
        success: false,
        error: '数据库未初始化，请先在管理端执行初始化。',
      };
    }
    return {
      success: false,
      error: msg,
    };
  }
};
