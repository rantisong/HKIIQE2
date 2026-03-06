const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 获取某 inviteCode 下所有下属的 openid 列表（多层级）
 */
async function getSubordinateOpenids(usersCol, inviteCode) {
  const openids = [];
  let currentCodes = [inviteCode];
  const IN_MAX = 20;
  while (currentCodes.length > 0) {
    const chunk = currentCodes.splice(0, IN_MAX);
    const res = await usersCol.where({ invitedBy: _.in(chunk) }).get();
    for (const u of res.data || []) {
      openids.push(u._openid);
      const code = (u.inviteCode || '').trim().toUpperCase();
      if (code) currentCodes.push(code);
    }
  }
  return openids;
}

/**
 * 从 user_iiqe_records 判断：合资格=01+03 通过，全牌照=01～05 全通过
 */
function getQualifiedAndFullLicense(records) {
  const arr = Array.isArray(records) ? records : [];
  const passedSet = new Set(
    arr.filter((r) => r && r.passed === true && r.subjectId).map((r) => String(r.subjectId).padStart(2, '0'))
  );
  const qualified = passedSet.has('01') && passedSet.has('03');
  const fullLicense = ['01', '02', '03', '04', '05'].every((s) => passedSet.has(s));
  return { qualified, fullLicense };
}

/**
 * 团队主页三个数：团队（下属总人数）、合资格、全牌照
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

    const openids = await getSubordinateOpenids(usersCol, myCode);
    if (openids.length === 0) {
      return { success: true, data: { team: 0, qualified: 0, fullLicense: 0 } };
    }

    let qualifiedCount = 0;
    let fullLicenseCount = 0;
    const BATCH = 20;
    for (let i = 0; i < openids.length; i += BATCH) {
      const batch = openids.slice(i, i + BATCH);
      const res = await usersCol.where({ _openid: _.in(batch) }).field({ user_iiqe_records: true }).get();
      for (const u of res.data || []) {
        const { qualified, fullLicense } = getQualifiedAndFullLicense(u.user_iiqe_records);
        if (qualified) qualifiedCount += 1;
        if (fullLicense) fullLicenseCount += 1;
      }
    }

    return {
      success: true,
      data: {
        team: openids.length,
        qualified: qualifiedCount,
        fullLicense: fullLicenseCount,
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
