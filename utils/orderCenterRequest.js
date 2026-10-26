/**
 * 订单中心观众端直连请求（不走本站 live-service）。
 * 鉴权头必须是 Authorization-Live-Viewers（见 zhibo-shared/docs/订单中心对接.md）。
 */
const { getOrderCenterBaseURL } = require('../config/env');
const { getAccessToken, clearSessionAndGoLogin } = require('./auth');

/**
 * 对方业务成功码：0 或偶发 200。
 * @param {unknown} code
 * @returns {boolean}
 */
function isOrderCenterSuccess(code) {
  if (code == null || code === '') return false;
  const n = typeof code === 'number' ? code : Number(code);
  if (Number.isNaN(n)) return false;
  return n === 0 || n === 200;
}

/**
 * POST 订单中心观众端接口。
 * @param {object} options
 * @param {string} options.path 如 /order-center/api/live/viewer/order/list
 * @param {object} [options.data] JSON body
 * @param {boolean} [options.silent]
 * @param {boolean} [_retry]
 * @returns {Promise<*>} resolve data
 */
function orderCenterPost(options, _retry) {
  const opts = options || {};
  const base = getOrderCenterBaseURL();
  const silent = !!opts.silent;
  const retry = !!_retry;
  const token = getAccessToken();
  const header = {
    'Content-Type': 'application/json',
    'Authorization-Live-Viewers': token ? 'Bearer ' + token : '',
  };

  return new Promise((resolve, reject) => {
    if (!base) {
      const err = { msg: '未配置订单中心地址' };
      if (!silent) wx.showToast({ title: err.msg, icon: 'none' });
      reject(err);
      return;
    }
    wx.request({
      url: base + opts.path,
      method: 'POST',
      data: opts.data || {},
      header: header,
      success(res) {
        if (res.statusCode === 401) {
          if (!retry) {
            require('../api/live/auth')
              .refresh()
              .then(() => orderCenterPost(opts, true))
              .then(resolve)
              .catch((e) => {
                clearSessionAndGoLogin();
                reject(e);
              });
            return;
          }
          clearSessionAndGoLogin();
          reject(res);
          return;
        }
        if (res.statusCode !== 200) {
          if (!silent) wx.showToast({ title: '网络异常', icon: 'none' });
          reject(res);
          return;
        }
        const body = res.data || {};
        if (isOrderCenterSuccess(body.code)) {
          resolve(body.data);
          return;
        }
        if ((body.code === 401 || body.code === '401') && !retry) {
          require('../api/live/auth')
            .refresh()
            .then(() => orderCenterPost(opts, true))
            .then(resolve)
            .catch((e) => {
              clearSessionAndGoLogin();
              reject(e);
            });
          return;
        }
        const msg = body.message || body.msg || '请求失败';
        if (!silent) wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
        reject(body);
      },
      fail(err) {
        if (!silent) wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

module.exports = {
  orderCenterPost,
  isOrderCenterSuccess,
};
