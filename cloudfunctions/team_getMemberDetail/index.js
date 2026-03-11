const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getTempUrlForAvatar(cloudApi, avatar) {
  if (!avatar || !String(avatar).trim().startsWith('cloud://')) return avatar || '';
  try {
    const res = await cloudApi.getTempFileURL({ fileList: [avatar] });
    const item = (res.fileList && res.fileList[0]) ? res.fileList[0] : null;
    return (item && item.tempFileURL) ? item.tempFileURL : avatar;
  } catch (e) {
    return avatar;
  }
}

/**
 * 获取直属成员的详情（仅当前用户邀请的直接下属）
 * 入参: inviteCode
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const inviteCode = (event.inviteCode || '').trim().toUpperCase();
  if (!inviteCode) return { success: false, error: '缺少邀请码' };

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: false, error: '用户不存在' };
    const myCode = (me.inviteCode || '').trim().toUpperCase();
    if (!myCode) return { success: false, error: '无邀请码' };

    const res = await usersCol
      .where({ invitedBy: myCode, inviteCode })
      .limit(1)
      .get();
    const row = res.data && res.data[0];
    if (!row) return { success: false, error: '非直属成员或不存在' };

    const p = row.profile || {};
    const rawAvatar = p.avatar || '';
    const avatar = rawAvatar ? await getTempUrlForAvatar(cloud, rawAvatar) : '';

    const records = row.user_iiqe_records || [];
    const examList = ['01', '02', '03', '04', '05'].map((sid) => {
      const r = records.find((rec) => rec && String(rec.subjectId || '').padStart(2, '0') === sid);
      return {
        subjectId: sid,
        subjectName: r && r.subjectName ? r.subjectName : getSubjectName(sid),
        examTime: (r && r.examTime) ? r.examTime : '',
        passed: !!(r && r.passed),
        passedAt: (r && r.passedAt) ? r.passedAt : '',
      };
    });

    const createdAt = row.createdAt;
    let entryDate = '';
    if (createdAt) {
      const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
      entryDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    return {
      success: true,
      data: {
        _openid: row._openid,
        inviteCode: row.inviteCode,
        nickname: p.nickname || '微信用户',
        avatar,
        city: row.city || '',
        createdAt: row.createdAt,
        entryDate,
        hkIdentityAcquiredAt: row.hkIdentityAcquiredAt || '',
        phone: row.phone || '',
        examRecords: examList,
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

function getSubjectName(sid) {
  const names = { '01': '保险原理及实务', '02': '一般保险', '03': '长期保险', '04': '强制性公积金计划', '05': '投资相连长期保险' };
  return names[sid] || '';
}
