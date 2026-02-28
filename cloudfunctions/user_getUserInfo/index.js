const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取用户信息
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({
      _openid: openid,
    }).get();

    if (userRes.data.length > 0) {
      return {
        success: true,
        data: userRes.data[0],
      };
    } else {
      // 创建新用户
      const newUser = {
        _openid: openid,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          nickname: '',
          avatar: '',
        },
      };
      
      const addRes = await db.collection('users').add({
        data: newUser,
      });
      
      return {
        success: true,
        data: {
          _id: addRes._id,
          ...newUser,
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
