/**
 * 头像上传用的鉴权辅助，避免 request ↔ avatarUpload 环依赖。
 */
const {
  getAccessToken,
  getRefreshToken,
  saveSession,
  clearSessionAndGoLogin,
} = require('./auth');
const { getBaseURL } = require('../config/env');

let refreshPromise = null;

/**
 * @returns {string}
 */
function getAccessTokenExport() {
  return getAccessToken();
}

/**
 * 与 request.doRefresh 同逻辑的轻量刷新。
 * @returns {Promise<object>}
 */
function doRefreshMaybe() {
  if (refreshPromise) return refreshPromise;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSessionAndGoLogin();
    return Promise.reject({ code: 401, msg: '未登录' });
  }
  const baseURL = getBaseURL('live');
  refreshPromise = new Promise((resolve, reject) => {
    wx.request({
      url: baseURL + '/api/v1/viewer/auth/refresh',
      method: 'POST',
      data: {
        accessToken: accessToken || '',
        refreshToken: refreshToken,
      },
      header: { 'Content-Type': 'application/json' },
      success(res) {
        const body = res.data || {};
        if (res.statusCode === 200 && body.code === 0 && body.data) {
          saveSession(body.data);
          resolve(body.data);
          return;
        }
        clearSessionAndGoLogin();
        reject(body);
      },
      fail(err) {
        reject(err || { msg: '网络异常' });
      },
    });
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

module.exports = {
  getAccessToken: getAccessTokenExport,
  doRefreshMaybe,
};
