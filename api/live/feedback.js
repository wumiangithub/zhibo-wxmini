/**
 * live-service 意见反馈。
 */
const { request } = require('../../utils/request');

/**
 * 提交意见反馈。截图须先上传拿到 url + objectKey。
 * @param {object} payload
 * @param {number} payload.category 1～4
 * @param {string} payload.content
 * @param {string} [payload.contactPhone]
 * @param {Array<{url: string, objectKey: string}>} [payload.images]
 * @returns {Promise<{id: number}>}
 */
function submitFeedback(payload) {
  const p = payload || {};
  const data = {
    category: p.category,
    content: p.content,
  };
  if (p.contactPhone != null && String(p.contactPhone).trim() !== '') {
    data.contactPhone = String(p.contactPhone).trim();
  }
  if (p.images && p.images.length) {
    data.images = p.images;
  }
  return request({
    url: '/viewer/feedback/submit',
    method: 'POST',
    service: 'live',
    data: data,
  });
}

/**
 * 我的反馈列表。
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @returns {Promise<{total: number, page: number, pageSize: number, list: object[]}>}
 */
function listFeedback(opts) {
  const o = opts || {};
  return request({
    url: '/viewer/feedback/list',
    method: 'GET',
    service: 'live',
    data: {
      page: o.page == null ? 1 : o.page,
      pageSize: o.pageSize == null ? 20 : o.pageSize,
    },
  });
}

/**
 * 反馈详情（仅本人）。
 * @param {number|string} id
 * @returns {Promise<object>}
 */
function getFeedbackDetail(id) {
  return request({
    url: '/viewer/feedback/detail/' + id,
    method: 'GET',
    service: 'live',
  });
}

module.exports = {
  submitFeedback,
  listFeedback,
  getFeedbackDetail,
};
