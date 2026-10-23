/**
 * 统一请求。baseURL 来自 config/env.js 的 getBaseURL(service)：
 * 环境由 FORCE_ENV 或微信 envVersion 解析为 CURRENT_ENV（local|test|prod），勿在本文件硬编码域名。
 * T35.2 行为：Bearer access；HTTP200+code===0；401 单次 refresh 重放；失败 Toast。
 */
const { getBaseURL } = require('../config/env');
const {
  getAccessToken,
  getRefreshToken,
  saveSession,
  clearSessionAndGoLogin,
} = require('./auth');

/** 进行中的 refresh Promise；并发 401 共用同一次刷新 */
let refreshPromise = null;

/**
 * 用 refreshToken 换新会话；并发调用复用同一 Promise。
 * @returns {Promise<object>} 刷新成功后的会话 data
 */
function doRefresh() {
  if (refreshPromise) {
    return refreshPromise;
  }
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
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
      header: {
        'Content-Type': 'application/json',
      },
      success(res) {
        const body = res.data || {};
        if (res.statusCode === 200 && body.code === 0 && body.data) {
          saveSession(body.data);
          resolve(body.data);
          return;
        }
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

/**
 * 发起业务请求；成功 resolve body.data，失败 reject 并可选 Toast。
 * 业务 code===401 且需鉴权时，先 doRefresh 再带 _retry 重放一次。
 * @param {object} options
 * @param {string} options.url 路径，如 /api/v1/viewer/auth/me
 * @param {string} [options.method]
 * @param {object} [options.data]
 * @param {string} [options.service=live] 服务名，选 baseURL
 * @param {boolean} [options.auth=true] 是否带 Bearer access
 * @param {boolean} [options.silent=false] 失败时不 Toast
 * @param {boolean} [_retry] 内部：已重放过
 * @returns {Promise<*>}
 */
function request(options) {
  const opts = options || {};
  const method = (opts.method || 'GET').toUpperCase();
  const service = opts.service || 'live';
  const auth = opts.auth !== false;
  const silent = !!opts.silent;
  const retry = !!opts._retry;
  const baseURL = getBaseURL(service);
  const header = Object.assign(
    { 'Content-Type': 'application/json' },
    opts.header || {}
  );
  if (auth) {
    const token = getAccessToken();
    if (token) {
      header.Authorization = 'Bearer ' + token;
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseURL + opts.url,
      method: method,
      data: opts.data,
      header: header,
      success(res) {
        if (res.statusCode !== 200) {
          if (!silent) {
            wx.showToast({ title: '网络异常', icon: 'none' });
          }
          reject(res);
          return;
        }
        const body = res.data || {};
        if (body.code === 0) {
          resolve(body.data);
          return;
        }
        if (body.code === 401 && auth && !retry) {
          doRefresh()
            .then(() =>
              request(
                Object.assign({}, opts, {
                  _retry: true,
                })
              )
            )
            .then(resolve)
            .catch((err) => {
              clearSessionAndGoLogin();
              reject(err);
            });
          return;
        }
        if (!silent) {
          wx.showToast({
            title: body.msg || '请求失败',
            icon: 'none',
          });
        }
        reject(body);
      },
      fail(err) {
        if (!silent) {
          wx.showToast({ title: '网络异常', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

module.exports = {
  request,
  doRefresh,
};
