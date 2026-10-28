/**
 * 我的学习（需观众登录）。
 * GET /viewer/learning/lives — 仅返回用户运营中 entitlement_status=1 的场次。
 */
const { request } = require('../../utils/request');
const { normalizeWatchItem } = require('./watch');

/**
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @param {number} [opts.state]
 * @returns {Promise<{total: number, list: object[]}>}
 */
function listLearningLives(opts) {
  const o = opts || {};
  const data = {
    page: o.page == null ? 1 : o.page,
    pageSize: o.pageSize == null ? 20 : o.pageSize,
  };
  if (o.state != null) data.state = o.state;
  return request({
    url: '/viewer/learning/lives',
    method: 'GET',
    data: data,
    auth: true,
  }).then((raw) => {
    const r = raw || {};
    const list = Array.isArray(r.list) ? r.list : [];
    return {
      total: r.total != null ? Number(r.total) : list.length,
      list: list.map(normalizeWatchItem),
    };
  });
}

module.exports = {
  listLearningLives,
};
