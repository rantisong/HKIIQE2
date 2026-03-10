const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 生成邀请用小程序码（无数量限制），上传云存储后返回 fileID
 * 入参：inviteCode（必填，邀请码），可选 page、width。仅用 inviteCode 写入 scene，避免被运行时场景值覆盖
 */
exports.main = async (event, context) => {
  const inviteCode = (event.inviteCode != null && event.inviteCode !== '')
    ? String(event.inviteCode).trim().replace(/\s+/g, '').slice(0, 32)
    : '';
  if (!inviteCode) {
    return { success: false, error: '邀请码不能为空' };
  }
  if (!/^[0-9A-Za-z]+$/.test(inviteCode)) {
    return { success: false, error: '邀请码仅支持数字与英文字母' };
  }

  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene: inviteCode,
      page: event.page || 'pages/login/index',
      width: event.width || 280,
    });

    if (!res.buffer) {
      return { success: false, error: '生成小程序码失败' };
    }

    const cloudPath = `wxacode/invite_${inviteCode}_${Date.now()}.png`;
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: res.buffer,
    });

    return {
      success: true,
      data: {
        fileID: uploadRes.fileID,
        /** 本次写入小程序码的 scene，扫码后应在登录页带出 */
        scene: inviteCode,
        page: event.page || 'pages/login/index',
      },
    };
  } catch (e) {
    const msg = e.message || String(e);
    return {
      success: false,
      error: msg,
    };
  }
};
