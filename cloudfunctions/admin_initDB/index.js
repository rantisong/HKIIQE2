const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 初始化数据库集合
const initCollections = async () => {
  const collections = ['users', 'papers', 'records', 'teams', 'team_members', 'reviews'];
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

// 初始化示例试卷数据
const initSamplePapers = async () => {
  const papersCollection = db.collection('papers');
  
  // 检查是否已有数据
  const existing = await papersCollection.count();
  if (existing.total > 0) {
    return { status: 'skipped', message: 'Papers already exist' };
  }

  const samplePapers = [
    {
      title: 'HKIIQE 模拟测试卷 A',
      category: 'HKIIQE',
      description: 'HKIIQE 考试模拟测试题',
      totalScore: 100,
      timeLimit: 60,
      questions: [
        {
          id: 'q1',
          type: 'single',
          content: '以下哪项是香港保险中介人资格考试的科目？',
          options: ['证券从业资格考试', '保险中介人资格考试', '期货从业资格考试', '基金从业资格考试'],
          correctAnswer: 'B',
          explanation: 'HKIIQE 是香港保险中介人资格考试的英文缩写。',
          score: 10
        },
        {
          id: 'q2',
          type: 'single',
          content: '香港保险业监管局的缩写是？',
          options: ['IA', 'HKIA', 'OCI', 'HKMA'],
          correctAnswer: 'B',
          explanation: 'HKIA 即 Hong Kong Insurance Authority。',
          score: 10
        },
        {
          id: 'q3',
          type: 'single',
          content: '以下哪种保险产品具有投资和保障双重功能？',
          options: ['定期寿险', '终身寿险', '万能寿险', '医疗保险'],
          correctAnswer: 'C',
          explanation: '万能寿险具有投资账户和保障功能。',
          score: 10
        },
        {
          id: 'q4',
          type: 'single',
          content: '香港保险投诉局的缩写是？',
          options: ['ICAC', 'ICBC', 'ICO', 'ICCB'],
          correctAnswer: 'A',
          explanation: 'ICAC 即 Insurance Complaints Bureau。',
          score: 10
        },
        {
          id: 'q5',
          type: 'single',
          content: '保险经纪人在香港需要持有什么牌照？',
          options: ['一类牌照', '二类牌照', '三类牌照', '四类牌照'],
          correctAnswer: 'C',
          explanation: '保险经纪人需要三类牌照（Insurance Broker Company）。',
          score: 10
        },
        {
          id: 'q6',
          type: 'single',
          content: '以下哪个是香港的主要保险监管机构？',
          options: ['保监局', '证监会', '金管局', '税务局'],
          correctAnswer: 'A',
          explanation: '香港保险业监管局（IA）负责监管保险业。',
          score: 10
        },
        {
          id: 'q7',
          type: 'single',
          content: '保险产品的冷静期一般为多少天？',
          options: ['7天', '14天', '21天', '30天'],
          correctAnswer: 'C',
          explanation: '香港保险产品的冷静期一般为21天。',
          score: 10
        },
        {
          id: 'q8',
          type: 'single',
          content: '以下哪种情况需要披露重要事实？',
          options: ['感冒发烧', '家族病史', '普通体检', '轻微擦伤'],
          correctAnswer: 'B',
          explanation: '家族病史属于重要事实，必须披露。',
          score: 10
        },
        {
          id: 'q9',
          type: 'single',
          content: '香港保险业联会简称是？',
          options: ['HKEU', 'HKIA', 'HKFI', 'HKTU'],
          correctAnswer: 'C',
          explanation: 'HKFI 即 Hong Kong Federation of Insurers。',
          score: 10
        },
        {
          id: 'q10',
          type: 'single',
          content: '保险单的回溯期是指？',
          options: ['保单生效前的期间', '保单终止后的期间', '续保的宽限期', '理赔的等待期'],
          correctAnswer: 'A',
          explanation: '回溯期是指保单生效前的一段时间，用于计算年龄。',
          score: 10
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'HKIIQE 模拟测试卷 B',
      category: 'HKIIQE',
      description: 'HKIIQE 考试模拟测试题（二）',
      totalScore: 100,
      timeLimit: 60,
      questions: [
        {
          id: 'q1',
          type: 'single',
          content: '以下哪项不是保险的基本原则？',
          options: ['最大诚信原则', '可保利益原则', '损失补偿原则', '投机取巧原则'],
          correctAnswer: 'D',
          explanation: '保险基本原则包括最大诚信、可保利益、损失补偿、近因原则。',
          score: 10
        },
        {
          id: 'q2',
          type: 'single',
          content: '保险代理人的佣金通常由谁支付？',
          options: ['投保人', '保险公司', '监管机构', '第三方机构'],
          correctAnswer: 'B',
          explanation: '保险代理人从保险公司获取佣金。',
          score: 10
        },
        {
          id: 'q3',
          type: 'single',
          content: '什么是一次性付清保费？',
          options: ['分期付款', '趸缴', '月缴', '季缴'],
          correctAnswer: 'B',
          explanation: '趸缴是指一次性付清全部保费。',
          score: 10
        },
        {
          id: 'q4',
          type: 'single',
          content: '以下哪个是长期保险产品的特点？',
          options: ['保障期一年', '具有现金价值', '不可续保', '无储蓄成分'],
          correctAnswer: 'B',
          explanation: '长期保险产品通常具有现金价值和储蓄成分。',
          score: 10
        },
        {
          id: 'q5',
          type: 'single',
          content: '保险经纪人与保险代理人的主要区别是？',
          options: ['代表保险公司', '代表客户利益', '无需持牌', '不能提供咨询'],
          correctAnswer: 'B',
          explanation: '保险经纪人代表客户利益，为客户寻找合适产品。',
          score: 10
        },
        {
          id: 'q6',
          type: 'single',
          content: '什么是不保事项？',
          options: ['必赔项目', '保险公司不承担责任的事项', '额外保障', '免费服务'],
          correctAnswer: 'B',
          explanation: '不保事项是指保险公司不承担责任的情况。',
          score: 10
        },
        {
          id: 'q7',
          type: 'single',
          content: '保单的现金价值是指？',
          options: ['已缴保费总额', '退保时可拿回的金额', '保额', '投资收益'],
          correctAnswer: 'B',
          explanation: '现金价值是退保时保单持有人可获得的金额。',
          score: 10
        },
        {
          id: 'q8',
          type: 'single',
          content: '以下哪个是医疗险的特点？',
          options: ['确诊即赔', '实报实销', '定额给付', '返还保费'],
          correctAnswer: 'B',
          explanation: '医疗险通常采用实报实销方式理赔。',
          score: 10
        },
        {
          id: 'q9',
          type: 'single',
          content: '什么是等待期？',
          options: ['犹豫期', '保单生效后一定时间内不理赔', '续保宽限期', '缴费宽限期'],
          correctAnswer: 'B',
          explanation: '等待期内发生保险事故，保险公司不承担责任。',
          score: 10
        },
        {
          id: 'q10',
          type: 'single',
          content: '保险建议书应该由谁提供？',
          options: ['客户', '保险代理人或经纪人', '监管机构', '医院'],
          correctAnswer: 'B',
          explanation: '保险代理人或经纪人根据客户需求提供建议书。',
          score: 10
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const paper of samplePapers) {
    await papersCollection.add({ data: paper });
  }

  return { status: 'created', count: samplePapers.length };
};

// 清空指定集合内所有文档（用于清理脏数据）
const clearCollection = async (collectionName) => {
  const col = db.collection(collectionName);
  let totalDeleted = 0;
  const batchSize = 20;
  while (true) {
    const res = await col.limit(batchSize).get();
    if (!res.data || res.data.length === 0) break;
    for (const doc of res.data) {
      await col.doc(doc._id).remove();
      totalDeleted += 1;
    }
  }
  return totalDeleted;
};

// 清理脏数据：清空已废弃的 papers 集合（模拟题/真题已改用 mock_bank、real_papers）
const cleanDirtyData = async (event) => {
  const { onlyPapers = true } = event;
  const results = {};
  try {
    results.papers = await clearCollection('papers');
    if (!onlyPapers) {
      results.mock_bank = await clearCollection('mock_bank');
      results.real_papers = await clearCollection('real_papers');
    }
    return {
      success: true,
      message: onlyPapers
        ? '已清空废弃的 papers 集合（mock_bank、real_papers 未动）'
        : '已清空 papers、mock_bank、real_papers',
      deleted: results,
    };
  } catch (e) {
    return { success: false, error: e.message, deleted: results };
  }
};

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'init_collections':
        return await initCollections();
      case 'init_sample_papers':
        return await initSamplePapers();
      case 'init_all':
        const collections = await initCollections();
        const papers = await initSamplePapers();
        return { collections, papers };
      case 'clean_dirty':
        return await cleanDirtyData(event);
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
