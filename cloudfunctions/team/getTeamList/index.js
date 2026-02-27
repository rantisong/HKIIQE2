const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 获取团队列表
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { page = 1, pageSize = 10 } = event;

  try {
    // 获取用户所在的团队
    const userTeamRes = await db.collection('team_members')
      .where({
        _openid: openid,
      })
      .get();

    const teamIds = userTeamRes.data.map(item => item.teamId);

    if (teamIds.length === 0) {
      return {
        success: true,
        data: {
          list: [],
          total: 0,
          page,
          pageSize,
        },
      };
    }

    // 查询团队信息
    const teamsRes = await db.collection('teams')
      .where({
        _id: _.in(teamIds),
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get();

    return {
      success: true,
      data: {
        list: teamsRes.data,
        total: teamIds.length,
        page,
        pageSize,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
