const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 生成邀请用小程序码（无数量限制），上传云存储后返回 fileID
 * 入参：scene（≤32 字符，建议为邀请码），可选 page、width
 */
exports.main = async (event, context) => {
  const scene = event.scene ? String(event.scene).trim().slice(0, 32) : '';
  if (!scene) {
    return { success: false, error: 'scene 不能为空' };
  }

  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page: event.page || 'pages/login/index',
      width: event.width || 280,
    });

    if (!res.buffer) {
      return { success: false, error: '生成小程序码失败' };
    }

    const cloudPath = `wxacode/invite_${scene}_${Date.now()}.png`;
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: res.buffer,
    });

    return {
      success: true,
      data: {
        fileID: uploadRes.fileID,
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
