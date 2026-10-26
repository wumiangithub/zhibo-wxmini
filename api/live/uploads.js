/**
 * live-service 上传凭证相关接口。
 */
const { request } = require('../../utils/request');

/**
 * 获取 TOS 临时凭证（direct 头像上传）。
 * @returns {Promise<object>} sts
 */
function getTosSts() {
  return request({
    url: '/api/v1/viewer/uploads/tos-sts',
    method: 'GET',
    service: 'live',
  });
}

module.exports = {
  getTosSts,
};