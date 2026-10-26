/**
 * live-service 上传：直传凭证，以及与直传结果同形的中转。
 */
const { getBaseURL } = require('../../config/env');
const { request } = require('../../utils/request');

/**
 * 直传临时凭证。只取凭证与 cdnUrl；对象键前缀由前端 ViewerObjectKeyPrefix 定义。
 * @param {number} [biz] 1 头像 / 2 意见反馈截图
 * @returns {Promise<object>}
 */
function getTosSts(biz) {
  const useBiz = biz == null ? 1 : biz;
  return request({
    url: '/viewer/uploads/tos-sts?biz=' + useBiz,
    method: 'GET',
    service: 'live',
  });
}

/**
 * 中转上传完整 URL。wx.uploadFile 使用，不走 JSON request。
 * @param {number} biz
 * @returns {string}
 */
function fileUploadUrl(biz) {
  return getBaseURL('live') + '/viewer/uploads/file?biz=' + biz;
}

module.exports = {
  getTosSts,
  fileUploadUrl,
};
