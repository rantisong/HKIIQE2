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
  const MAX_DEPTH = 10;
  for (let depth = 0; depth < MAX_DEPTH && currentCodes.length > 0; depth++) {
    const chunk = currentCodes.splice(0, 20);
    const res = await usersCol.where({ invitedBy: _.in(chunk) }).get();
    for (const u of res.data || []) {
      openids.push(u._openid);
      const code = (u.inviteCode || '').trim().toUpperCase();
      if (code && code !== inviteCode) {
        currentCodes.push(code);
      }
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
 * 刷新指定团队长的团队统计数据
 * 1. 更新 team_stats 集合（向后兼容）
 * 2. 更新 users 集合的冗余字段（directMemberCount, totalMemberCount, qualifiedCount, fullLicenseCount）
 * 3. 递归更新所有下属的 totalMemberCount（因为他们的下属可能变化）
 */
exports.main = async (event) => {
  const inviteCode = typeof event.inviteCode === 'string' ? event.inviteCode.trim().toUpperCase() : '';
  if (!inviteCode) return { success: false, error: '缺少 inviteCode' };

  try {
    const usersCol = db.collection('users');
    const statsCol = db.collection('team_stats');

    // 查询团队长信息
    const leaderRes = await usersCol.where({ inviteCode: inviteCode }).limit(1).get();
    const leader = leaderRes.data && leaderRes.data[0];

    // 获取所有下属的 openid
    const openids = await getSubordinateOpenids(usersCol, inviteCode);
    const totalCount = openids.length + 1; // 包含团队长本人

    // 获取直属下属（需要包含 _id 字段用于后续更新）
    const directRes = await usersCol.where({ invitedBy: inviteCode }).field({ _id: true, inviteCode: true }).get();
    const directMembers = directRes.data || [];
    const directCount = directMembers.length;

    // 计算合资格和全牌照人数（先计算下属，再加团队长本人）
    let qualifiedCount = 0;
    let fullLicenseCount = 0;
    const BATCH = 20;
    for (let i = 0; i < openids.length; i += BATCH) {
      const batch = openids.slice(i, i + BATCH);
      const res = await usersCol.where({ _openid: _.in(batch) }).field({ _id: true, user_iiqe_records: true }).get();
      for (const u of res.data || []) {
        const records = u.user_iiqe_records || [];
        const { qualified, fullLicense } = getQualifiedAndFullLicense(records);
        if (qualified) qualifiedCount++;
        if (fullLicense) fullLicenseCount++;
      }
    }

    // 加上团队长本人
    if (leader) {
      const { qualified, fullLicense } = getQualifiedAndFullLicense(leader.user_iiqe_records);
      if (qualified) qualifiedCount++;
      if (fullLicense) fullLicenseCount++;
    }

    const now = new Date();

    // 1. 更新 team_stats 集合（向后兼容）
    try {
      await statsCol.doc(inviteCode).set({
        data: {
          team: totalCount,
          qualified: qualifiedCount,
          fullLicense: fullLicenseCount,
          updatedAt: now,
        },
      });
    } catch (e) {
      console.warn('team_stats set skip:', e.message);
    }

    // 2. 更新团队长的冗余字段
    if (leader && leader._id) {
      await usersCol.doc(leader._id).update({
        data: {
          directMemberCount: directCount,
          totalMemberCount: totalCount,
          qualifiedCount: qualifiedCount,
          fullLicenseCount: fullLicenseCount,
          teamStatsUpdatedAt: now,
        },
      });
    }

    // 3. 递归更新所有下属的 totalMemberCount（因为团队结构可能变化）
    for (const member of directMembers) {
      const memberCode = (member.inviteCode || '').trim().toUpperCase();
      if (!memberCode) continue;

      // 查询该下属的直属下属（只需要数量）
      const memberDirectRes = await usersCol.where({ invitedBy: memberCode }).count();
      const memberDirectCount = memberDirectRes.total || 0;

      // 递归获取所有下属
      const memberSubordinateOpenids = await getSubordinateOpenids(usersCol, memberCode);
      const memberTotalCount = memberSubordinateOpenids.length;

      // 计算该下属团队中的合资格和全牌照人数
      let memberQualified = 0;
      let memberFullLicense = 0;
      for (let i = 0; i < memberSubordinateOpenids.length; i += BATCH) {
        const batch = memberSubordinateOpenids.slice(i, i + BATCH);
        const res = await usersCol.where({ _openid: _.in(batch) }).field({ _id: true, user_iiqe_records: true }).get();
        for (const u of res.data || []) {
          const { qualified, fullLicense } = getQualifiedAndFullLicense(u.user_iiqe_records);
          if (qualified) memberQualified++;
          if (fullLicense) memberFullLicense++;
        }
      }

      // 更新该下属的冗余字段
      if (member && member._id) {
        await usersCol.doc(member._id).update({
          data: {
            directMemberCount: memberDirectCount,
            totalMemberCount: memberTotalCount,
            qualifiedCount: memberQualified,
            fullLicenseCount: memberFullLicense,
            teamStatsUpdatedAt: now,
          },
        });
      }
    }

    return {
      success: true,
      data: {
        team: totalCount,
        qualified: qualifiedCount,
        fullLicense: fullLicenseCount,
        updatedAt: now,
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
