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
 * 刷新指定团队长的 team_stats 冗余数据
 * 入参：inviteCode（团队长的邀请码）
 * 可被其他云函数调用，或在读路径未命中时调用
 */
exports.main = async (event) => {
  const inviteCode = typeof event.inviteCode === 'string' ? event.inviteCode.trim().toUpperCase() : '';
  if (!inviteCode) return { success: false, error: '缺少 inviteCode' };

  try {
    const usersCol = db.collection('users');
    const statsCol = db.collection('team_stats');

    const openids = await getSubordinateOpenids(usersCol, inviteCode);
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

    const now = new Date();
    try {
      await statsCol.doc(inviteCode).set({
        data: {
          team: openids.length,
          qualified: qualifiedCount,
          fullLicense: fullLicenseCount,
          updatedAt: now,
        },
      });
    } catch (e) {
      console.warn('team_stats set skip (collection may not exist):', e.message);
    }

    return {
      success: true,
      data: { team: openids.length, qualified: qualifiedCount, fullLicense: fullLicenseCount },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
