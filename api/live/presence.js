/**
 * 观众访问心跳（D79）。
 */
const { request } = require('../../utils/request');

/**
 * 上报最近访问。已登录时由 App.onShow 调用；失败由 request silent 吞掉。
 * @param {'miniapp'|'live'} [scene]
 * @returns {Promise<{lastVisitTime:string}>}
 */
function ping(scene) {
  return request({
    url: '/viewer/presence/ping',
    method: 'POST',
    data: scene ? { scene: scene } : {},
    silent: true,
  });
}

module.exports = {
  ping,
};
