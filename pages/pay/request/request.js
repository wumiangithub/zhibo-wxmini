/**
 * 原生微信支付页：解析 H5 navigateTo 传入的凭证后调 wx.requestPayment。
 * 供 live-web 在小程序 web-view 内、已 prepay 拿到 credential 后拉起（勿用 postMessage）。
 * 完整收银台 UI 见 pages/pay/checkout/checkout（支付步优先跳收银台，本页作纯唤起辅助）。
 *
 * query（二选一）：
 * - c  base64url(JSON)：{ timeStamp, nonceStr, package, signType, paySign }
 * - 或拆开：timeStamp / nonceStr / package / signType / paySign（调试用）
 */

const { pickPayParams, requestPayment } = require('../../../utils/wxPay');

function goBackSoon(ms) {
  setTimeout(() => wx.navigateBack({ fail() {} }), ms || 400);
}

/** base64url → UTF-8 字符串（支付字段多为 ASCII）。 */
function decodeBase64Url(input) {
  let b64 = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  try {
    const ab = wx.base64ToArrayBuffer(b64);
    const bytes = new Uint8Array(ab);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes[i]);
    }
    try {
      return decodeURIComponent(escape(out));
    } catch (_) {
      return out;
    }
  } catch (_) {
    return '';
  }
}

function parseQueryPayload(query) {
  const q = query || {};
  if (q.c) {
    const decoded = decodeBase64Url(decodeURIComponent(String(q.c)));
    if (!decoded) return null;
    try {
      return pickPayParams(JSON.parse(decoded));
    } catch (_) {
      return null;
    }
  }
  const flat = {
    timeStamp: q.timeStamp ? decodeURIComponent(String(q.timeStamp)) : '',
    nonceStr: q.nonceStr ? decodeURIComponent(String(q.nonceStr)) : '',
    package: q.package ? decodeURIComponent(String(q.package)) : '',
    signType: q.signType ? decodeURIComponent(String(q.signType)) : 'MD5',
    paySign: q.paySign ? decodeURIComponent(String(q.paySign)) : '',
  };
  return pickPayParams(flat);
}

Page({
  data: {
    tip: '正在拉起支付…',
  },

  onLoad(query) {
    const params = parseQueryPayload(query);
    if (!params) {
      this.setData({ tip: '支付参数无效或缺失' });
      wx.showToast({ title: '支付参数无效', icon: 'none' });
      goBackSoon(1400);
      return;
    }

    this.setData({ tip: '请完成微信支付…' });
    requestPayment(params).then((result) => {
      if (result === 'success') {
        this.setData({ tip: '支付成功' });
        wx.showToast({ title: '支付成功', icon: 'success' });
        goBackSoon(800);
        return;
      }
      if (result === 'cancel') {
        this.setData({ tip: '已取消支付' });
        wx.showToast({ title: '已取消支付', icon: 'none', duration: 2000 });
        goBackSoon(1400);
        return;
      }
      this.setData({ tip: '支付失败' });
      wx.showToast({ title: '支付失败', icon: 'none', duration: 2000 });
      goBackSoon(1400);
    });
  },
});
