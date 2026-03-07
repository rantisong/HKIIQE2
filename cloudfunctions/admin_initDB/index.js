const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 初始化数据库集合
const initCollections = async () => {
  const collections = ['users', 'records', 'reviews'];
  const results = [];

  for (const name of collections) {
    try {
      await db.createCollection(name);
      results.push({ name, status: 'created' });
    } catch (e) {
      results.push({ name, status: 'exists', error: e.message });
    }
  }

  return results;
};

const INVITE_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVITE_CODE_MAX_RETRY = 20;

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

async function getUniqueInviteCode(usersCol, existingCodes) {
  for (let retry = 0; retry < INVITE_CODE_MAX_RETRY; retry++) {
    const code = generateInviteCode();
    if (existingCodes.has(code)) continue;
    const { total } = await usersCol.where({ inviteCode: code }).count();
    if (total === 0) return code;
    existingCodes.add(code);
  }
  throw new Error('邀请码生成失败');
}

const backfillInviteCode = async () => {
  const usersCol = db.collection('users');
  const res = await usersCol.get();
  const users = res.data || [];
  const existingCodes = new Set(users.map((u) => (u.inviteCode || '').trim().toUpperCase()).filter(Boolean));
  let added = 0;
  let normalized = 0;
  let iiqeInited = 0;
  const defaultIiqe = JSON.parse(JSON.stringify(DEFAULT_IIQE_RECORDS));
  for (const u of users) {
    const updates = {};
    if (!(u.inviteCode && u.inviteCode.trim())) {
      const code = await getUniqueInviteCode(usersCol, existingCodes);
      existingCodes.add(code);
      updates.inviteCode = code;
      added += 1;
    }
    if (u.invitedBy && typeof u.invitedBy === 'string') {
      const norm = u.invitedBy.trim().toUpperCase();
      if (norm !== u.invitedBy) {
        updates.invitedBy = norm;
        normalized += 1;
      }
    }
    const needIiqe = !Array.isArray(u.user_iiqe_records) || u.user_iiqe_records.length === 0;
    if (needIiqe) {
      updates.user_iiqe_records = defaultIiqe;
      iiqeInited += 1;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await usersCol.doc(u._id).update({ data: updates });
    }
  }
  return {
    success: true,
    message: '已回填邀请码、统一大小写并初始化 user_iiqe_records',
    added,
    normalized,
    iiqeInited,
    total: users.length,
  };
};

// 创建数据库索引（提升查询性能）
const createIndexes = async () => {
  const usersCol = db.collection('users');
  const results = [];

  // 索引：invitedBy（查询下属时使用）
  try {
    await usersCol.createIndex({
      name: 'idx_invitedBy',
      fields: [{ fieldName: 'invitedBy', order: 'asc' }],
    });
    results.push({ index: 'idx_invitedBy', status: 'created' });
  } catch (e) {
    results.push({ index: 'idx_invitedBy', status: 'error', message: e.message });
  }

  // 索引：inviteCode（查询特定邀请码时使用）
  try {
    await usersCol.createIndex({
      name: 'idx_inviteCode',
      fields: [{ fieldName: 'inviteCode', order: 'asc' }],
    });
    results.push({ index: 'idx_inviteCode', status: 'created' });
  } catch (e) {
    results.push({ index: 'idx_inviteCode', status: 'error', message: e.message });
  }

  // 索引：_openid（查询当前用户时使用，默认已存在但确保有）
  try {
    await usersCol.createIndex({
      name: 'idx_openid',
      fields: [{ fieldName: '_openid', order: 'asc' }],
    });
    results.push({ index: 'idx_openid', status: 'created' });
  } catch (e) {
    results.push({ index: 'idx_openid', status: 'error', message: e.message });
  }

  return { success: true, results };
};

// 初始化团队统计冗余字段（直接读取下属的冗余字段计算）
const initTeamStatsRedundantFields = async () => {
  const usersCol = db.collection('users');
  const BATCH = 20;

  // 获取所有有邀请码的用户
  let allUsers = [];
  let hasMore = true;
  let lastId = null;

  while (hasMore) {
    let query = usersCol.where({
      inviteCode: db.command.exists(true),
    });
    if (lastId) {
      query = query.skip(allUsers.length);
    }
    const res = await query.limit(BATCH).get();
    allUsers = allUsers.concat(res.data || []);
    hasMore = res.data && res.data.length === BATCH;
    if (res.data && res.data.length > 0) {
      lastId = res.data[res.data.length - 1]._id;
    }
  }

  let processed = 0;
  let updated = 0;

  for (const user of allUsers) {
    const code = (user.inviteCode || '').trim().toUpperCase();
    if (!code) continue;

    processed++;

    // 查询直属下属
    const directRes = await usersCol.where({ invitedBy: code }).get();
    const directMembers = directRes.data || [];
    const directCount = directMembers.length;

    // 查询全部下属（递归）
    let allSubordinateOpenids = [];
    let currentCodes = [code];
    const MAX_DEPTH = 10;

    for (let depth = 0; depth < MAX_DEPTH && currentCodes.length > 0; depth++) {
      const chunk = currentCodes.splice(0, 20);
      const res = await usersCol.where({ invitedBy: db.command.in(chunk) }).get();
      for (const u of res.data || []) {
        allSubordinateOpenids.push(u._openid);
        const uCode = (u.inviteCode || '').trim().toUpperCase();
        if (uCode && uCode !== code) {
          currentCodes.push(uCode);
        }
      }
    }

    const totalCount = allSubordinateOpenids.length + 1; // 包含团队长本人

    // 计算合资格和全牌照人数（先计算下属，再加团队长本人）
    let qualifiedCount = 0;
    let fullLicenseCount = 0;

    const getQualifiedAndFullLicense = (records) => {
      const arr = Array.isArray(records) ? records : [];
      const passedSet = new Set(
        arr.filter((r) => r && r.passed === true && r.subjectId).map((r) => String(r.subjectId).padStart(2, '0'))
      );
      const qualified = passedSet.has('01') && passedSet.has('03');
      const fullLicense = ['01', '02', '03', '04', '05'].every((s) => passedSet.has(s));
      return { qualified, fullLicense };
    };

    if (allSubordinateOpenids.length > 0) {
      for (let i = 0; i < allSubordinateOpenids.length; i += BATCH) {
        const batch = allSubordinateOpenids.slice(i, i + BATCH);
        const res = await usersCol.where({
          _openid: db.command.in(batch),
        }).field({ user_iiqe_records: true }).get();

        for (const u of res.data || []) {
          const records = u.user_iiqe_records || [];
          const passedSet = new Set(
            records
              .filter((r) => r && r.passed === true && r.subjectId)
              .map((r) => String(r.subjectId).padStart(2, '0'))
          );
          if (passedSet.has('01') && passedSet.has('03')) qualifiedCount++;
          if (['01', '02', '03', '04', '05'].every((s) => passedSet.has(s))) fullLicenseCount++;
        }
      }
    }

    // 加上团队长本人
    const { qualified, fullLicense } = getQualifiedAndFullLicense(user.user_iiqe_records);
    if (qualified) qualifiedCount++;
    if (fullLicense) fullLicenseCount++;

    // 更新当前用户的冗余字段
    await usersCol.doc(user._id).update({
      data: {
        directMemberCount: directCount,
        totalMemberCount: totalCount,
        qualifiedCount: qualifiedCount,
        fullLicenseCount: fullLicenseCount,
        teamStatsUpdatedAt: new Date(),
      },
    });
    updated++;
  }

  return {
    success: true,
    message: '团队统计冗余字段初始化完成',
    processed,
    updated,
  };
};

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'init_collections':
        return await initCollections();
      case 'backfill_invite_code':
        return await backfillInviteCode();
      case 'create_indexes':
        return await createIndexes();
      case 'init_team_stats':
        return await initTeamStatsRedundantFields();
      default:
        return { message: 'No action specified' };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
