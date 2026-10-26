/**
 * live-service viewer 资料相关接口。
 */
const { getBaseURL } = require('../../config/env');
const { request } = require('../../utils/request');

const UPDATE_PATH = '/api/v1/viewer/profile/update';
const AVATAR_PATH = '/api/v1/viewer/profile/avatar';

/**
 * 更新昵称 / 头像 URL。
 * @param {object} payload
 * @param {string} payload.nickname
 * @param {string} [payload.avatarUrl] 传入时一并提交（direct 上传后）
 * @returns {Promise<object>} user
 */
function updateProfile(payload) {
  const p = payload || {};
  const data = { nickname: p.nickname };
  if (p.avatarUrl != null) {
    data.avatarUrl = p.avatarUrl;
  }
  return request({
    url: UPDATE_PATH,
    method: 'PUT',
    service: 'live',
    data: data,
  });
}

/**
 * 头像 proxy 上传完整 URL（供 wx.uploadFile 使用）。
 * @returns {string}
 */
function avatarUploadUrl() {
  return getBaseURL('live') + AVATAR_PATH;
}

module.exports = {
  updateProfile,
  avatarUploadUrl,
};