/**
 * live-service viewer 资料相关接口。
 */
const { request } = require('../../utils/request');

const UPDATE_PATH = '/viewer/profile/update';

/**
 * 更新昵称，或把头像的访问地址和对象键一起写入。
 * @param {object} payload
 * @param {string} payload.nickname
 * @param {string} [payload.avatarUrl] 与 avatarObjectKey 成对
 * @param {string} [payload.avatarObjectKey] TOS 对象键
 * @returns {Promise<object>} user
 */
function updateProfile(payload) {
  const p = payload || {};
  const data = { nickname: p.nickname };
  if (p.avatarUrl != null) {
    data.avatarUrl = p.avatarUrl;
  }
  if (p.avatarObjectKey != null) {
    data.avatarObjectKey = p.avatarObjectKey;
  }
  return request({
    url: UPDATE_PATH,
    method: 'PUT',
    service: 'live',
    data: data,
  });
}

module.exports = {
  updateProfile,
};