/**
 * 统一提示工具
 * 提供各类常用提示的快捷调用
 */

/**
 * 显示错误/警告提示
 * @param {string} title 提示内容
 * @param {number} [duration=2000] 显示时长(ms)
 */
const showError = (title, duration = 2000) => {
  wx.showToast({
    title: title || '操作失败',
    icon: 'none',
    duration,
  });
};

/**
 * 显示成功提示
 * @param {string} title 提示内容
 * @param {number} [duration=1500] 显示时长(ms)
 */
const showSuccess = (title, duration = 1500) => {
  wx.showToast({
    title: title || '操作成功',
    icon: 'success',
    duration,
  });
};

/**
 * 显示加载中提示
 * @param {string} [title='加载中'] 提示内容
 * @param {boolean} [mask=true] 是否显示透明蒙层
 */
const showLoading = (title = '加载中', mask = true) => {
  wx.showLoading({ title, mask });
};

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示确认对话框
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 用户点击确认返回 true，取消返回 false
 */
const showConfirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
};

/**
 * 显示操作菜单
 * @param {string[]} itemList 项目列表
 * @returns {Promise<number>} 用户点击返回索引，取消返回 -1
 */
const showActionSheet = (itemList) => {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: (res) => {
        resolve(res.tapIndex);
      },
      fail: () => {
        resolve(-1);
      },
    });
  });
};

module.exports = {
  showError,
  showSuccess,
  showLoading,
  hideLoading,
  showConfirm,
  showActionSheet,
};
