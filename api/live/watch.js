/**
 * 观看端活动列表（live-service，无需观众登录）。
 * GET /watch/activities — 见 API约定.md
 */
const { request } = require('../../utils/request');

/** 活动状态文案（与 live-web 一致） */
const STATE_LABEL = {
  1: '直播中',
  2: '预告',
  3: '已结束',
  4: '点播',
  5: '回放',
};

/**
 * 观看端活动列表。
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @param {number} [opts.state] 可选筛选
 * @returns {Promise<{total: number, list: object[]}>}
 */
function listWatchActivities(opts) {
  const o = opts || {};
  const data = {
    page: o.page == null ? 1 : o.page,
    pageSize: o.pageSize == null ? 20 : o.pageSize,
  };
  if (o.state != null) data.state = o.state;
  return request({
    url: '/watch/activities',
    method: 'GET',
    data: data,
    auth: false,
  }).then((raw) => {
    const r = raw || {};
    const list = Array.isArray(r.list) ? r.list : [];
    return {
      total: r.total != null ? Number(r.total) : list.length,
      list: list.map(normalizeWatchItem),
    };
  });
}

/**
 * @param {object} raw
 * @returns {object}
 */
function normalizeWatchItem(raw) {
  const r = raw || {};
  const state = Number(r.state);
  return {
    id: r.id != null ? String(r.id) : '',
    title: r.title != null ? String(r.title) : '',
    state: Number.isFinite(state) ? state : 0,
    startTime: r.startTime != null ? String(r.startTime) : '',
    coverUrl: r.coverUrl != null ? String(r.coverUrl) : '',
  };
}

/**
 * @param {number} state
 * @returns {string}
 */
function watchStateLabel(state) {
  return STATE_LABEL[state] || (state ? '状态' + state : '');
}

/**
 * 是否视为「直播中」（绿点）。
 * @param {number} state
 * @returns {boolean}
 */
function isLivingState(state) {
  return state === 1;
}

module.exports = {
  listWatchActivities,
  normalizeWatchItem,
  watchStateLabel,
  isLivingState,
  STATE_LABEL,
};
