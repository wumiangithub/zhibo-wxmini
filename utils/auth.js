/** 本地存储键：观众 accessToken */
const ACCESS_KEY = 'viewerAccessToken';
/** 本地存储键：观众 refreshToken */
const REFRESH_KEY = 'viewerRefreshToken';
/** 本地存储键：脱敏手机号展示用 */
const PHONE_KEY = 'viewerPhoneMasked';
/** 本地存储键：观众用户中心 uid（拼 TOS objectKey、web-view 传参） */
const VIEWER_UID_KEY = 'viewerUid';
/** 本地存储键：微信小程序 openid（wx_lite prepay 的 openId） */
const MINI_OPENID_KEY = 'viewerMiniOpenid';
/** @deprecated 仅读兼容；写入只用 viewerUid */
const VIEWER_ID_KEY_LEGACY = 'viewerId';

/**
 * 获取本地 accessToken。
 * @returns {string}
 */
function getAccessToken() {
  return wx.getStorageSync(ACCESS_KEY) || '';
}

/**
 * 获取本地 refreshToken。
 * @returns {string}
 */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_KEY) || '';
}

/**
 * 获取本地脱敏手机号。
 * @returns {string}
 */
function getPhoneMasked() {
  return wx.getStorageSync(PHONE_KEY) || '';
}

/**
 * 获取本地观众用户中心 uid。
 * @returns {number|string}
 */
function getViewerUid() {
  const uid = wx.getStorageSync(VIEWER_UID_KEY);
  if (uid != null && uid !== '') return uid;
  return wx.getStorageSync(VIEWER_ID_KEY_LEGACY) || '';
}

/**
 * 获取本地微信小程序 openid（登录 / user-info 写入；供 wx_lite prepay）。
 * @returns {string}
 */
function getMiniOpenid() {
  const v = wx.getStorageSync(MINI_OPENID_KEY);
  return v != null ? String(v).trim() : '';
}

/** @deprecated 使用 getViewerUid */
function getViewerId() {
  return getViewerUid();
}

/**
 * 把登录/刷新/资料接口返回的会话写入本地。
 * @param {object} data 含 accessToken、refreshToken、user 等
 */
function saveSession(data) {
  if (!data) return;
  if (data.accessToken) {
    wx.setStorageSync(ACCESS_KEY, data.accessToken);
  }
  if (data.refreshToken) {
    wx.setStorageSync(REFRESH_KEY, data.refreshToken);
  }
  applyUser(data.user);
}

/**
 * 单独写入脱敏手机号（绑定手机号页 mock 用）。
 * @param {string} phoneMasked
 */
function setPhoneMasked(phoneMasked) {
  if (phoneMasked) {
    wx.setStorageSync(PHONE_KEY, phoneMasked);
  } else {
    wx.removeStorageSync(PHONE_KEY);
  }
}

/**
 * 将 /user-info 或资料接口返回的 user 同步到本地（手机号 / uid / 昵称头像缓存）。
 * @param {object} [user]
 */
function applyUser(user) {
  if (!user || typeof user !== 'object') return;
  if (user.uid != null && user.uid !== '') {
    wx.setStorageSync(VIEWER_UID_KEY, user.uid);
    wx.removeStorageSync(VIEWER_ID_KEY_LEGACY);
  }
  if (typeof user.miniOpenid === 'string' && user.miniOpenid.trim()) {
    wx.setStorageSync(MINI_OPENID_KEY, user.miniOpenid.trim());
  }
  if (Object.prototype.hasOwnProperty.call(user, 'phoneMasked')) {
    if (user.phoneMasked) {
      wx.setStorageSync(PHONE_KEY, user.phoneMasked);
    } else {
      wx.removeStorageSync(PHONE_KEY);
    }
  }
  try {
    const { saveProfile } = require('./profile');
    const patch = {};
    if (typeof user.nickname === 'string') patch.nickname = user.nickname;
    if (typeof user.avatarUrl === 'string' && user.avatarUrl) {
      patch.avatarUrl = user.avatarUrl;
    }
    if (Object.keys(patch).length) saveProfile(patch);
  } catch (e) {
    // profile 模块异常时不影响登录主流程
  }
}

/**
 * 清空本地会话（access / refresh / 手机号 / uid / miniOpenid）。
 */
function clearSession() {
  wx.removeStorageSync(ACCESS_KEY);
  wx.removeStorageSync(REFRESH_KEY);
  wx.removeStorageSync(PHONE_KEY);
  wx.removeStorageSync(VIEWER_UID_KEY);
  wx.removeStorageSync(VIEWER_ID_KEY_LEGACY);
  wx.removeStorageSync(MINI_OPENID_KEY);
}

/**
 * 清会话并跳转登录页；若当前已在登录页则不 reLaunch。
 */
function clearSessionAndGoLogin() {
  clearSession();
  try {
    const { clearProfile } = require('./profile');
    clearProfile();
  } catch (e) {
    /* ignore */
  }
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
  VIEWER_UID_KEY,
  MINI_OPENID_KEY,
  getAccessToken,
  getRefreshToken,
  getPhoneMasked,
  getViewerUid,
  getMiniOpenid,
  getViewerId,
  setPhoneMasked,
  saveSession,
  applyUser,
  clearSession,
  clearSessionAndGoLogin,
};
