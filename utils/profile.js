/** 本地观众昵称缓存键 */
const NICK_KEY = 'viewerNickname';
/** 本地观众头像 URL 缓存键 */
const AVATAR_KEY = 'viewerAvatarUrl';
/** 默认头像 */
const DEFAULT_AVATAR = '/images/avatar-default.png';
/** 昵称业务上限（对齐约定 16） */
const NICK_MAX = 16;

/**
 * 读取本地昵称与头像缓存。
 * @returns {{nickname: string, avatarUrl: string}}
 */
function getProfile() {
  return {
    nickname: wx.getStorageSync(NICK_KEY) || '',
    avatarUrl: wx.getStorageSync(AVATAR_KEY) || DEFAULT_AVATAR,
  };
}

/**
 * 写入本地昵称 / 头像缓存（接口成功后再写，作展示兜底）。
 * @param {{nickname?: string, avatarUrl?: string}} data
 */
function saveProfile(data) {
  const d = data || {};
  if (typeof d.nickname === 'string') {
    wx.setStorageSync(NICK_KEY, d.nickname);
  }
  if (typeof d.avatarUrl === 'string' && d.avatarUrl) {
    wx.setStorageSync(AVATAR_KEY, d.avatarUrl);
  }
}

/**
 * 退出登录时清本地资料缓存。
 */
function clearProfile() {
  wx.removeStorageSync(NICK_KEY);
  wx.removeStorageSync(AVATAR_KEY);
}

/**
 * 用接口 user 生成展示用资料（缺省回落默认头像）。
 * @param {object} [user]
 * @returns {{nickname: string, avatarUrl: string}}
 */
function fromUser(user) {
  const u = user || {};
  return {
    nickname: typeof u.nickname === 'string' ? u.nickname : '',
    avatarUrl:
      typeof u.avatarUrl === 'string' && u.avatarUrl ? u.avatarUrl : DEFAULT_AVATAR,
  };
}

module.exports = {
  NICK_KEY,
  AVATAR_KEY,
  DEFAULT_AVATAR,
  NICK_MAX,
  getProfile,
  saveProfile,
  clearProfile,
  fromUser,
};
