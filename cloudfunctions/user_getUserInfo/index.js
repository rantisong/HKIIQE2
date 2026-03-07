const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const INVITE_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVITE_CODE_MAX_RETRY = 20;

// 新用户默认 IIQE 考试记录（科目一～五，未通过、时间为空）
const DEFAULT_IIQE_RECORDS = [
  { subjectId: '01', subjectName: '保险原理及实务', examTime: null, passed: false, passedAt: null },
  { subjectId: '02', subjectName: '一般保险', examTime: null, passed: false, passedAt: null },
  { subjectId: '03', subjectName: '长期保险', examTime: null, passed: false, passedAt: null },
  { subjectId: '04', subjectName: '强制性公积金计划', examTime: null, passed: false, passedAt: null },
  { subjectId: '05', subjectName: '投资相连长期保险', examTime: null, passed: false, passedAt: null },
];

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

// 邀请码格式：6 位数字+字母（大写）
const INVITE_CODE_REG = /^[0-9A-Z]{6}$/;

// 系统内置邀请码：输入此码的用户不属于任何团队，注册为团队根节点
const SYSTEM_INVITE_CODE = '52IIQE';

// 获取用户信息（登录/注册：无则创建用户）
// 新用户必须传有效 event.inviteCode（6 位数字+字母，后台转大写后校验）
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const profileInput = event.profile && typeof event.profile === 'object'
    ? {
        nickname: event.profile.nickname || event.profile.nickName || '',
        avatar: event.profile.avatar || event.profile.avatarUrl || '',
      }
    : null;
  const inviteCodeInput = typeof event.inviteCode === 'string' ? event.inviteCode.trim().toUpperCase() : '';

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
      let user = userRes.data[0];
      if (!(user.inviteCode && user.inviteCode.trim())) {
        const code = await getUniqueInviteCode(usersCol);
        await usersCol.doc(user._id).update({
          data: { inviteCode: code, updatedAt: new Date() },
        });
        user = { ...user, inviteCode: code, updatedAt: new Date() };
      }
      if (profileInput && (profileInput.nickname || profileInput.avatar)) {
        const profile = {
          nickname: profileInput.nickname || (user.profile && user.profile.nickname) || '',
          avatar: profileInput.avatar || (user.profile && user.profile.avatar) || '',
        };
        await usersCol.doc(user._id).update({
          data: { updatedAt: new Date(), profile },
        });
        user.profile = profile;
        user.updatedAt = new Date();
      }
      return { success: true, data: user };
    }

    // 新用户：必须提供有效邀请码
    if (!INVITE_CODE_REG.test(inviteCodeInput)) {
      return {
        success: false,
        error: '邀请码为6位数字和字母组合，请重新输入',
      };
    }

    const isSystemCode = inviteCodeInput === SYSTEM_INVITE_CODE;
    let invitedBy;

    if (isSystemCode) {
      // 系统邀请码：不归属任何团队，注册为团队根节点
      invitedBy = SYSTEM_INVITE_CODE;
    } else {
      const inviterRes = await usersCol.where({ inviteCode: inviteCodeInput }).limit(1).get();
      if (!inviterRes.data || inviterRes.data.length === 0) {
        return {
          success: false,
          error: '邀请码不正确，请重新输入',
        };
      }
      const inviter = inviterRes.data[0];
      if (inviter._openid === openid) {
        return {
          success: false,
          error: '不能使用自己的邀请码',
        };
      }
      invitedBy = inviteCodeInput;
    }

    // 创建新用户（带授权资料则写入），并生成 6 位数字+字母邀请码
    const inviteCode = await getUniqueInviteCode(usersCol);
    const newUser = {
      _openid: openid,
      inviteCode,
      invitedBy,
      user_iiqe_records: JSON.parse(JSON.stringify(DEFAULT_IIQE_RECORDS)),
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: profileInput
        ? { nickname: profileInput.nickname, avatar: profileInput.avatar }
        : { nickname: '', avatar: '' },
    };
    const addRes = await usersCol.add({ data: newUser });
    if (!isSystemCode) {
      try {
        await cloud.callFunction({ name: 'team_refreshStats', data: { inviteCode: invitedBy } });
      } catch (e) {
        console.error('team_refreshStats after create user', e);
      }
    }
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
