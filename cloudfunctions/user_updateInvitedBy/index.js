const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 修改当前用户的被邀请码（加入新团队）
 * 入参：inviteCode（邀请人的邀请码）
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const inviteCode = typeof event.inviteCode === 'string' ? event.inviteCode.trim().toUpperCase() : '';
  if (!inviteCode) return { success: false, error: '请输入邀请码' };

  try {
    const usersCol = db.collection('users');
    const inviterRes = await usersCol.where({ inviteCode }).limit(1).get();
    const inviter = inviterRes.data && inviterRes.data[0];
    if (!inviter) return { success: false, error: '邀请码无效' };
    if (inviter._openid === openid) return { success: false, error: '不能使用自己的邀请码' };

    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: false, error: '用户不存在' };

    const oldInvitedBy = (me.invitedBy && String(me.invitedBy).trim().toUpperCase()) || '';

    await usersCol.doc(me._id).update({
      data: { invitedBy: inviteCode, updatedAt: new Date() },
    });

    try {
      await cloud.callFunction({ name: 'team_refreshStats', data: { inviteCode } });
      if (oldInvitedBy && oldInvitedBy !== inviteCode) {
        await cloud.callFunction({ name: 'team_refreshStats', data: { inviteCode: oldInvitedBy } });
      }
    } catch (e) {
      console.error('team_refreshStats after updateInvitedBy', e);
    }

    return { success: true, data: { invitedBy: inviteCode } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
