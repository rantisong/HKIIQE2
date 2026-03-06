const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 同步微信头像、昵称到当前用户 profile
 * 入参：event.profile { nickname/nickName, avatar/avatarUrl }
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const profileInput = event.profile && typeof event.profile === 'object'
    ? {
        nickname: event.profile.nickname || event.profile.nickName || '',
        avatar: event.profile.avatar || event.profile.avatarUrl || '',
      }
    : null;

  if (!profileInput || (!profileInput.nickname && !profileInput.avatar)) {
    return { success: false, error: '请传入 profile（nickname 或 avatar）' };
  }

  try {
    const usersCol = db.collection('users');
    const res = await usersCol.where({ _openid: openid }).limit(1).get();
    const user = res.data && res.data[0];
    if (!user) return { success: false, error: '用户不存在' };

    const profile = {
      nickname: profileInput.nickname || (user.profile && user.profile.nickname) || '',
      avatar: profileInput.avatar || (user.profile && user.profile.avatar) || '',
    };
    await usersCol.doc(user._id).update({
      data: { profile, updatedAt: new Date() },
    });

    return {
      success: true,
      data: { ...user, profile, updatedAt: new Date() },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
