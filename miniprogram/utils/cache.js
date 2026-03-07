/**
 * 本地缓存工具
 * 用于缓存不常变化的数据，减少网络请求
 * @module cache
 */

// 缓存 key 前缀
const PREFIX = 'hkiiqe_cache_';

/**
 * 获取缓存数据
 * @param {string} key - 缓存 key（会自动添加前缀）
 * @returns {*} 缓存的数据，若不存在或过期返回 null
 * @example
 * const data = cache.get('user_info');
 */
const get = (key) => {
  try {
    const fullKey = PREFIX + key;
    const cached = wx.getStorageSync(fullKey);
    if (!cached) return null;

    const { data, timestamp, expiry } = cached;
    // 无过期时间则永久有效
    if (!expiry) return data;

    // 检查是否过期
    if (Date.now() - timestamp > expiry) {
      wx.removeStorageSync(fullKey);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[Cache] get failed:', e);
    return null;
  }
};

/**
 * 设置缓存数据
 * @param {string} key 缓存 key（会自动添加前缀）
 * @param {*} data 要缓存的数据
 * @param {number} [expiry] 过期时间(ms)，不传则永久有效
 * @returns {boolean} 是否设置成功
 */
const set = (key, data, expiry) => {
  try {
    const fullKey = PREFIX + key;
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    wx.setStorageSync(fullKey, cacheData);
    return true;
  } catch (e) {
    console.warn('[Cache] set failed:', e);
    return false;
  }
};

/**
 * 移除指定缓存
 * @param {string} key 缓存 key
 */
const remove = (key) => {
  try {
    wx.removeStorageSync(PREFIX + key);
  } catch (e) {
    console.warn('[Cache] remove failed:', e);
  }
};

/**
 * 清空所有缓存
 */
const clear = () => {
  try {
    const info = wx.getStorageInfoSync();
    info.keys.forEach((key) => {
      if (key.startsWith(PREFIX)) {
        wx.removeStorageSync(key);
      }
    });
  } catch (e) {
    console.warn('[Cache] clear failed:', e);
  }
};

/**
 * 带缓存的异步数据获取
 * 若缓存存在且未过期则返回缓存，否则调用 getter 获取数据并缓存
 * @param {string} key 缓存 key
 * @param {Function} getter 获取数据的异步函数
 * @param {number} [expiry] 过期时间(ms)
 * @returns {Promise<*>} 数据
 */
const getOrFetch = async (key, getter, expiry) => {
  const cached = get(key);
  if (cached !== null) {
    return cached;
  }

  const data = await getter();
  if (data !== null && data !== undefined) {
    set(key, data, expiry);
  }
  return data;
};

// 预定义的缓存 key
const CACHE_KEYS = {
  TEAM_STATS: 'team_stats',
  USER_STATS: 'user_stats',
  SUBJECT_INFO: 'subject_info',
  PAPER_LIST: 'paper_list',
};

// 预定义的缓存时间（默认5分钟）
const DEFAULT_EXPIRY = 5 * 60 * 1000;

module.exports = {
  get,
  set,
  remove,
  clear,
  getOrFetch,
  CACHE_KEYS,
  DEFAULT_EXPIRY,
};
