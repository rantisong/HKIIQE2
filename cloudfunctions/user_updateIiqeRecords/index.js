const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const SUBJECT_IDS = ['01', '02', '03', '04', '05'];
const SUBJECT_NAMES = {
  '01': '保险原理及实务',
  '02': '一般保险',
  '03': '长期保险',
  '04': '强制性公积金计划',
  '05': '投资相连长期保险',
};

/**
 * 更新当前用户的 user_iiqe_records
 * 入参：records 数组，每项 { subjectId, subjectName?, examTime?, passed, passedAt? }
 * 若只传部分科目，会与现有记录按 subjectId 合并（同 subjectId 用新值覆盖）
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { success: false, error: '未登录' };

  const input = event.records;
  if (!Array.isArray(input) || input.length === 0) {
    return { success: false, error: '请传入 records 数组' };
  }

  try {
    const usersCol = db.collection('users');
    const meRes = await usersCol.where({ _openid: openid }).limit(1).get();
    const me = meRes.data && meRes.data[0];
    if (!me) return { success: false, error: '用户不存在' };

    let current = Array.isArray(me.user_iiqe_records) ? me.user_iiqe_records : [];
    if (current.length === 0) {
      current = SUBJECT_IDS.map((sid) => ({
        subjectId: sid,
        subjectName: SUBJECT_NAMES[sid] || '',
        examTime: null,
        passed: false,
        passedAt: null,
      }));
    }

    const bySubject = new Map(current.map((r) => [String(r.subjectId || '').padStart(2, '0'), { ...r }]));
    for (const r of input) {
      const sid = String(r.subjectId || '').padStart(2, '0');
      if (!/^0[1-5]$/.test(sid)) continue;
      const name = r.subjectName != null ? r.subjectName : SUBJECT_NAMES[sid];
      bySubject.set(sid, {
        subjectId: sid,
        subjectName: name,
        examTime: r.examTime != null ? r.examTime : (bySubject.get(sid) || {}).examTime,
        passed: Boolean(r.passed),
        passedAt: r.passedAt != null ? r.passedAt : (bySubject.get(sid) || {}).passedAt,
      });
    }

    const nextRecords = SUBJECT_IDS.map((sid) => bySubject.get(sid) || {
      subjectId: sid,
      subjectName: SUBJECT_NAMES[sid],
      examTime: null,
      passed: false,
      passedAt: null,
    });

    await usersCol.doc(me._id).update({
      data: { user_iiqe_records: nextRecords, updatedAt: new Date() },
    });

    return { success: true, data: { user_iiqe_records: nextRecords } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
