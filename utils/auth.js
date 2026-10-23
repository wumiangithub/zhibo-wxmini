/** 本地存储键：观众 accessToken */
const ACCESS_KEY = 'viewerAccessToken';
/** 本地存储键：观众 refreshToken */
const REFRESH_KEY = 'viewerRefreshToken';
/** 本地存储键：脱敏手机号展示用 */
const PHONE_KEY = 'viewerPhoneMasked';

/**
 * 读取本地 accessToken。
 * @returns {string}
 */
function getAccessToken() {
  return wx.getStorageSync(ACCESS_KEY) || '';
}

/**
 * 读取本地 refreshToken。
 * @returns {string}
 */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_KEY) || '';
}

/**
 * 读取本地脱敏手机号。
 * @returns {string}
 */
function getPhoneMasked() {
  return wx.getStorageSync(PHONE_KEY) || '';
}

/**
 * 将登录/刷新接口返回的会话写入本地存储。
 * @param {object} data 含 accessToken、refreshToken、user.phoneMasked 等
 */
function saveSession(data) {
  if (!data) return;
  if (data.accessToken) {
    wx.setStorageSync(ACCESS_KEY, data.accessToken);
  }
  if (data.refreshToken) {
    wx.setStorageSync(REFRESH_KEY, data.refreshToken);
  }
  const user = data.user || {};
  if (user.phoneMasked) {
    wx.setStorageSync(PHONE_KEY, user.phoneMasked);
  } else {
    wx.removeStorageSync(PHONE_KEY);
  }
}

/**
 * 清除本地会话（access / refresh / 脱敏手机号）。
 */
function clearSession() {
  wx.removeStorageSync(ACCESS_KEY);
  wx.removeStorageSync(REFRESH_KEY);
  wx.removeStorageSync(PHONE_KEY);
}

/**
 * 清会话并跳转登录页；若当前已在登录页则不再 reLaunch。
 */
function clearSessionAndGoLogin() {
  clearSession();
  const pages = getCurrentPages();
  const cur = pages && pages.length ? pages[pages.length - 1] : null;
  const route = cur && cur.route ? '/' + cur.route : '';
  if (route !== '/pages/login/login') {
    wx.reLaunch({ url: '/pages/login/login' });
  }
}

module.exports = {
  ACCESS_KEY,
  REFRESH_KEY,
  PHONE_KEY,
  getAccessToken,
  getRefreshToken,
  getPhoneMasked,
  saveSession,
  clearSession,
  clearSessionAndGoLogin,
};
