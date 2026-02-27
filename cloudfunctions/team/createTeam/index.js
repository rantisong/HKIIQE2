const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 创建团队
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { name, description, avatar } = event;

  if (!name) {
    return {
      success: false,
      error: '团队名称不能为空',
    };
  }

  try {
    const team = {
      name,
      description: description || '',
      avatar: avatar || '',
      owner: openid,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('teams').add({
      data: team,
    });

    // 自动添加创建者为成员
    await db.collection('team_members').add({
      data: {
        _openid: openid,
        teamId: res._id,
        role: 'owner',
        joinedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        teamId: res._id,
        ...team,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
