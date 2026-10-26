/**
 * 头像上传用的鉴权辅助，避免 request 与 avatarUpload 互相牵制。
 * refresh 统一走 api/live/auth，不再重复写路径。
 */
const {
  getAccessToken,
  getRefreshToken,
  clearSessionAndGoLogin,
} = require('./auth');

/**
 * @returns {string}
 */
function getAccessTokenExport() {
  return getAccessToken();
}

/**
 * 与 request.doRefresh 同源（api/live/auth.refresh）；失败时清票跳登录。
 * @returns {Promise<object>}
 */
function doRefreshMaybe() {
  if (!getRefreshToken()) {
    clearSessionAndGoLogin();
    return Promise.reject({ code: 401, msg: '未登录' });
  }
  return require('../api/live/auth')
    .refresh()
    .catch((err) => {
      // 业务失败清票；纯网络 fail（带 errMsg）不清，与原逻辑一致
      if (!(err && err.errMsg)) {
        clearSessionAndGoLogin();
      }
      return Promise.reject(err);
    });
}

module.exports = {
  getAccessToken: getAccessTokenExport,
  doRefreshMaybe,
};