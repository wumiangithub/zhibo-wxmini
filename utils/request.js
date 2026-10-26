/**
 * 统一请求：baseURL 来自 config/env.js（已含 /api/v1）。
 * options.url 只写业务段（如 /viewer/auth/user-info），勿再拼 /api/v1。
 * 环境由 FORCE_ENV 或微信 envVersion 解析；勿在本文件硬编码域名。
 * Bearer access、HTTP200+code===0、401 自动 refresh 重试、失败 Toast。
 */
const { getBaseURL } = require('../config/env');
const {
  getAccessToken,
  clearSessionAndGoLogin,
} = require('./auth');

/**
 * 用 refreshToken 换新会话；委托 api/live/auth.refresh（内部去重）。
 * @returns {Promise<object>} 刷新成功后的会话 data
 */
function doRefresh() {
  return require('../api/live/auth').refresh();
}

/**
 * 发起业务请求；成功 resolve body.data，失败 reject 并可选 Toast。
 * 业务 code===401 且需鉴权时，先 doRefresh 再带 _retry 重试一次。
 * @param {object} options
 * @param {string} options.url 路径，由 api 层传入
 * @param {string} [options.method]
 * @param {object} [options.data]
 * @param {string} [options.service=live] 服务名，选取 baseURL
 * @param {boolean} [options.auth=true] 是否带 Bearer access
 * @param {boolean} [options.silent=false] 失败时不 Toast
 * @param {boolean} [_retry] 内部：是否已重试过
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