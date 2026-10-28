/**
 * live-service viewer 鉴权接口。
 * refresh 使用 wx.request，避免与 utils/request 循环依赖；
 * 其它接口经 request 走统一 Bearer / 401 刷新。
 */
const { getBaseURL } = require('../../config/env');
const {
  getAccessToken,
  getRefreshToken,
  saveSession,
} = require('../../utils/auth');

const REFRESH_PATH = '/viewer/auth/refresh';

/** 进行中的 refresh Promise，并发 401 共用同一次刷新 */
let refreshPromise = null;

/**
 * 懒加载 request，避免与 utils/request 顶层循环依赖。
 * @returns {function}
 */
function getRequest() {
  return require('../../utils/request').request;
}

/**
 * 当前登录用户信息。
 * @param {object} [options]
 * @param {boolean} [options.silent]
 * @returns {Promise<object>}
 */
function getUserInfo(options) {
  const opts = options || {};
  return getRequest()({
    url: '/viewer/auth/user-info',
    method: 'GET',
    service: 'live',
    silent: !!opts.silent,
  });
}

/**
 * 手机号授权登录。
 * @param {object} payload
 * @param {string} payload.loginCode wx.login code
 * @param {string} payload.phoneCode getPhoneNumber code
 * @param {boolean} [payload.agreed]
 * @returns {Promise<object>} 会话 data
 */
function phoneLogin(payload) {
  const p = payload || {};
  return getRequest()({
    url: '/viewer/auth/phone-login',
    method: 'POST',
    service: 'live',
    auth: false,
    data: {
      loginCode: p.loginCode,
      phoneCode: p.phoneCode,
      agreed: !!p.agreed,
    },
  });
}

/**
 * 微信登录（仅 code）。
 * @param {object} payload
 * @param {string} payload.code wx.login code
 * @param {boolean} [payload.agreed]
 * @returns {Promise<object>} 会话 data
 */
function wechatLogin(payload) {
  const p = payload || {};
  return getRequest()({
    url: '/viewer/auth/wechat-login',
    method: 'POST',
    service: 'live',
    auth: false,
    data: {
      code: p.code,
      agreed: !!p.agreed,
    },
  });
}

/**
 * 仅 local：明文手机号登录 / 自动注册（开发造号）。
 * @param {object} payload
 * @param {string} payload.phone 1 开头 11 位
 * @param {boolean} [payload.agreed]
 * @returns {Promise<object>} 会话 data
 */
function devPhoneLogin(payload) {
  const p = payload || {};
  return getRequest()({
    url: '/viewer/auth/dev-phone-login',
    method: 'POST',
    service: 'live',
    auth: false,
    data: {
      phone: p.phone,
      agreed: !!p.agreed,
    },
  });
}

/**
 * 刷新会话。直接 wx.request，成功后 saveSession。
 * 可传 accessToken / refreshToken，缺省读本地 storage。
 * @param {object} [options]
 * @param {string} [options.accessToken]
 * @param {string} [options.refreshToken]
 * @returns {Promise<object>} 刷新后的会话 data
 */
function refresh(options) {
  if (refreshPromise) {
    return refreshPromise;
  }
  const opts = options || {};
  const accessToken =
    opts.accessToken != null ? opts.accessToken : getAccessToken() || '';
  const refreshToken =
    opts.refreshToken != null ? opts.refreshToken : getRefreshToken();
  if (!refreshToken) {
    return Promise.reject({ code: 401, msg: '未登录' });
  }
  const baseURL = getBaseURL('live');
  refreshPromise = new Promise((resolve, reject) => {
    wx.request({
      url: baseURL + REFRESH_PATH,
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

module.exports = {
  getUserInfo,
  phoneLogin,
  wechatLogin,
  devPhoneLogin,
  refresh,
};