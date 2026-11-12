/**
 * 微信小程序 JSAPI 支付（wx.requestPayment）字段解析与唤起。
 * 供 pages/pay/request/request（H5 已 prepay 后带凭证跳转）与 pages/pay/checkout/checkout（本页 prepay）共用。
 */

/**
 * @param {object|null|undefined} obj
 * @param {string[]} keys
 * @returns {string}
 */
function pickStr(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (let i = 0; i < keys.length; i++) {
    const v = obj[keys[i]];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

/**
 * 从对象取 requestPayment 所需字段（兼容 Ping++ 嵌套 / 扁平）。
 * @param {object|null|undefined} raw
 * @returns {{ timeStamp: string, nonceStr: string, package: string, signType: string, paySign: string } | null}
 */
function pickPayParams(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const candidates = [raw];
  const nestedKeys = ['wx_lite', 'wx', 'wx_pub', 'credential'];
  for (let i = 0; i < nestedKeys.length; i++) {
    const n = raw[nestedKeys[i]];
    if (n && typeof n === 'object' && !Array.isArray(n)) {
      candidates.push(n);
      const deeper = n[nestedKeys[i]];
      if (deeper && typeof deeper === 'object' && !Array.isArray(deeper)) {
        candidates.push(deeper);
      }
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    const o = candidates[i];
    const timeStamp = pickStr(o, ['timeStamp', 'timestamp']);
    const nonceStr = pickStr(o, ['nonceStr', 'noncestr']);
    const pkg = pickStr(o, ['package']);
    const signType = pickStr(o, ['signType', 'signtype']) || 'MD5';
    const paySign = pickStr(o, ['paySign', 'paysign']);
    if (timeStamp && nonceStr && pkg && paySign) {
      return { timeStamp, nonceStr, package: pkg, signType, paySign };
    }
  }
  return null;
}

/**
 * 解析 prepay credential JSON 字符串 → requestPayment 参数。
 * @param {string} credentialJson
 * @returns {{ timeStamp: string, nonceStr: string, package: string, signType: string, paySign: string } | null}
 */
function pickPayParamsFromCredential(credentialJson) {
  const raw = String(credentialJson || '').trim();
  if (!raw) return null;
  try {
    return pickPayParams(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

const REDIRECT_KEYS = [
  'mweb_url',
  'h5_url',
  'payUrl',
  'pay_url',
  'url',
  'redirectUrl',
  'redirect_url',
];

/**
 * @param {string} v
 * @returns {boolean}
 */
function isHttpUrl(v) {
  return /^https?:\/\//i.test(v);
}

/**
 * 从扁平对象取 WAP 跳转 URL。
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
function pickFlatRedirectUrl(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (let i = 0; i < REDIRECT_KEYS.length; i++) {
    const v = obj[REDIRECT_KEYS[i]];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * 从 prepay credential 对象取 WAP 跳转 URL。
 * 对齐 live-web `pickViewerPayRedirectUrl`：Ping++ 嵌套
 * `{ "alipay_wap": { "object": "credential", "alipay_wap": "https://…" } }`
 * 与扁平 `mweb_url` / `url` 等。
 * @param {Record<string, unknown>} cred
 * @param {string} [channel]
 * @returns {string}
 */
function pickRedirectUrl(cred, channel) {
  if (!cred || typeof cred !== 'object') return '';
  const ch = String(channel || '').trim();
  if (ch) {
    const nested = cred[ch];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const nestObj = nested;
      const byChannelKey = nestObj[ch];
      if (typeof byChannelKey === 'string' && byChannelKey.trim()) {
        return byChannelKey.trim();
      }
      const fromNestedFlat = pickFlatRedirectUrl(nestObj);
      if (fromNestedFlat) return fromNestedFlat;
      const vals = Object.keys(nestObj);
      for (let i = 0; i < vals.length; i++) {
        const v = nestObj[vals[i]];
        if (typeof v === 'string' && v.trim() && isHttpUrl(v.trim())) {
          return v.trim();
        }
      }
    }
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }
  return pickFlatRedirectUrl(cred);
}

/**
 * 解析 prepay credential JSON → WAP / 支付宝跳转链接。
 * @param {string} credentialJson
 * @param {string} [channel] prepay 返回的 channel（如 alipay_wap）
 * @returns {string}
 */
function pickRedirectUrlFromCredential(credentialJson, channel) {
  const raw = String(credentialJson || '').trim();
  if (!raw) return '';
  try {
    return pickRedirectUrl(JSON.parse(raw), channel);
  } catch (_) {
    if (isHttpUrl(raw)) return raw;
    return '';
  }
}

/**
 * 调起微信支付。
 * @param {{ timeStamp: string, nonceStr: string, package: string, signType: string, paySign: string }} params
 * @returns {Promise<'success'|'cancel'|'fail'>}
 */
function requestPayment(params) {
  return new Promise((resolve) => {
    wx.requestPayment({
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType || 'MD5',
      paySign: params.paySign,
      success() {
        resolve('success');
      },
      fail(err) {
        const msg = (err && err.errMsg) || '';
        resolve(/cancel/i.test(msg) ? 'cancel' : 'fail');
      },
    });
  });
}

module.exports = {
  pickStr,
  pickPayParams,
  pickPayParamsFromCredential,
  pickRedirectUrl,
  pickRedirectUrlFromCredential,
  requestPayment,
};
