/**
 * 原生订单收银台（完整 UI）。
 * H5 小程序 web-view 到支付步时 navigateTo 本页，勿再叠 H5 OrderPayOverlay。
 *
 * query（二选一）：
 * - c  base64url(JSON)：{ orderId, activityId?, coverImg?, riskGrade?, riskGradeName? }
 * - 或扁平：orderId / activityId / coverImg / riskGrade / riskGradeName
 *
 * 确认支付：
 * - 微信：本站字典兜底 → 订单中心 prepay(wx_lite) → wx.requestPayment
 * - 支付宝：prepay(alipay_wap) → 解析 credential 跳转 URL → 复制链接弹窗（微信内不直接拉起支付宝）
 */

const {
  getAccessToken,
  getMiniOpenid,
  applyUser,
} = require('../../../utils/auth');
const { getUserInfo } = require('../../../api/live/auth');
const { getDictData, dictLabelValueMap } = require('../../../api/live/dict');
const {
  getPaidDetail,
  prepayOrder,
  orderCenterErrorMessage,
} = require('../../../api/orderCenter/orders');
const {
  pickPayParamsFromCredential,
  pickRedirectUrlFromCredential,
  requestPayment,
} = require('../../../utils/wxPay');

/** base64url → UTF-8 字符串 */
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

function decodeQueryValue(v) {
  if (v == null || v === '') return '';
  try {
    return decodeURIComponent(String(v));
  } catch (_) {
    return String(v);
  }
}

/**
 * @param {Record<string, string>} query
 * @returns {{ orderId: string, activityId: string, coverImg: string, riskGrade: string, riskGradeName: string }}
 */
function parseEntryQuery(query) {
  const q = query || {};
  let raw = {};
  if (q.c) {
    const decoded = decodeBase64Url(decodeQueryValue(q.c));
    if (decoded) {
      try {
        raw = JSON.parse(decoded) || {};
      } catch (_) {
        raw = {};
      }
    }
  } else {
    raw = {
      orderId: decodeQueryValue(q.orderId),
      activityId: decodeQueryValue(q.activityId),
      coverImg: decodeQueryValue(q.coverImg),
      riskGrade: decodeQueryValue(q.riskGrade),
      riskGradeName: decodeQueryValue(q.riskGradeName),
    };
  }
  return {
    orderId: String(raw.orderId || '').trim(),
    activityId: String(raw.activityId || '').trim(),
    coverImg: String(raw.coverImg || '').trim(),
    riskGrade: String(raw.riskGrade || '').trim(),
    riskGradeName: String(raw.riskGradeName || '').trim(),
  };
}

function formatMoneyParts(orderMoney) {
  const raw = String(orderMoney || '').trim();
  let t = raw.startsWith('¥') ? raw.slice(1).trim() : raw;
  if (!t) t = '0.00';
  const n = Number(t);
  if (Number.isFinite(n)) t = n.toFixed(2);
  const parts = t.split('.');
  return {
    moneyInt: parts[0] || '0',
    moneyDec: parts[1] != null ? String(parts[1]).padEnd(2, '0').slice(0, 2) : '00',
  };
}

function buildRiskBanner(riskGrade, riskGradeName, customerRiskLevel) {
  const grade = (riskGrade || customerRiskLevel || '').trim();
  const name = (riskGradeName || '').trim();
  const label = `${grade}${name}`;
  if (label) return `已完成风险测评，测评结果为${label}`;
  return '已完成风险测评';
}

Page({
  data: {
    loading: true,
    error: '',
    detail: null,
    coverImg: '',
    riskBannerText: '已完成风险测评',
    moneyInt: '0',
    moneyDec: '00',
    payChannel: 'wechat',
    agreed: false,
    prepaying: false,
    alipayModalVisible: false,
  },

  _orderId: '',
  _activityId: '',
  _riskGrade: '',
  _riskGradeName: '',
  _payChannelDict: null,
  _payWayDict: null,
  _alipayPayUrl: '',

  onLoad(query) {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const entry = parseEntryQuery(query);
    if (!entry.orderId) {
      this.setData({
        loading: false,
        error: '订单无效',
        detail: null,
      });
      return;
    }
    this._orderId = entry.orderId;
    this._activityId = entry.activityId;
    this._riskGrade = entry.riskGrade;
    this._riskGradeName = entry.riskGradeName;
    this.setData({
      coverImg: entry.coverImg,
      riskBannerText: buildRiskBanner(
        entry.riskGrade,
        entry.riskGradeName,
        '',
      ),
    });
    this._loadPage();
  },

  onRetry() {
    this._loadPage();
  },

  onSelectWechat() {
    this.setData({ payChannel: 'wechat' });
  },

  onSelectAlipay() {
    this.setData({ payChannel: 'alipay' });
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed, error: '' });
  },

  onOpenAgreement(e) {
    const kind = (e.currentTarget.dataset.kind || '').trim();
    if (kind === 'user') {
      wx.navigateTo({ url: '/pages/agreement/user/user' });
      return;
    }
    if (kind === 'privacy') {
      wx.navigateTo({ url: '/pages/agreement/privacy/privacy' });
      return;
    }
    wx.navigateTo({
      url:
        '/pages/agreement/stub/stub?title=' +
        encodeURIComponent('风险提示书'),
    });
  },

  preventTouchMove() {},

  onCloseAlipayModal() {
    this._alipayPayUrl = '';
    this.setData({ alipayModalVisible: false });
  },

  onCopyAlipayLink() {
    const url = String(this._alipayPayUrl || '').trim();
    if (!url) {
      wx.showToast({ title: '支付链接无效', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: url,
      success: () => {
        this._alipayPayUrl = '';
        this.setData({ alipayModalVisible: false });
        // setClipboardData 成功后系统会 toast「内容已复制」；稍后再盖成设计文案
        setTimeout(() => {
          wx.showToast({
            title: '链接已复制，请在浏览器中打开链接地址。',
            icon: 'none',
            duration: 2500,
          });
        }, 350);
      },
      fail: () => {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      },
    });
  },

  _loadPage() {
    const orderId = this._orderId;
    if (!orderId) return;
    this.setData({ loading: true, error: '', detail: null });

    const dictChannel = getDictData('pay_channel')
      .then((d) => {
        this._payChannelDict = dictLabelValueMap(d);
      })
      .catch(() => {
        this._payChannelDict = null;
      });
    const dictWay = getDictData('pay_way')
      .then((d) => {
        this._payWayDict = dictLabelValueMap(d);
      })
      .catch(() => {
        this._payWayDict = null;
      });

    Promise.all([
      dictChannel,
      dictWay,
      getPaidDetail(orderId),
    ])
      .then((results) => {
        const paid = results[2];
        const money = formatMoneyParts(paid.orderMoney);
        this.setData({
          loading: false,
          detail: paid,
          moneyInt: money.moneyInt,
          moneyDec: money.moneyDec,
          riskBannerText: buildRiskBanner(
            this._riskGrade,
            this._riskGradeName,
            paid.customerRiskLevel,
          ),
          error: '',
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          detail: null,
          error: orderCenterErrorMessage(err, '加载订单失败'),
        });
      });
  },

  _ensureDicts() {
    const ensureDicts = [];
    if (!this._payChannelDict) {
      ensureDicts.push(
        getDictData('pay_channel')
          .then((d) => {
            this._payChannelDict = dictLabelValueMap(d);
          })
          .catch(() => {}),
      );
    }
    if (!this._payWayDict) {
      ensureDicts.push(
        getDictData('pay_way')
          .then((d) => {
            this._payWayDict = dictLabelValueMap(d);
          })
          .catch(() => {}),
      );
    }
    return Promise.all(ensureDicts);
  },

  /**
   * 取真实小程序 openId：本地登录态优先；缺则拉 user-info 补写。
   * @returns {Promise<string>}
   */
  _resolveOpenId() {
    const cached = getMiniOpenid();
    if (cached) return Promise.resolve(cached);
    return getUserInfo({ silent: true }).then((user) => {
      applyUser(user);
      const openId = getMiniOpenid();
      if (!openId) {
        const err = {
          msg: '缺少微信 openId，请用微信重新登录后再支付',
        };
        throw err;
      }
      return openId;
    });
  },

  _confirmWechatPay() {
    return this._ensureDicts()
      .then(() => this._resolveOpenId())
      .then((openId) =>
        prepayOrder({
          orderId: this._orderId,
          payMoney: this.data.detail.orderMoney,
          uiChannel: 'wechat',
          openId: openId,
          payChannelDict: this._payChannelDict,
          payWayDict: this._payWayDict,
        }),
      )
      .then((prepay) => {
        const params = pickPayParamsFromCredential(prepay.credential);
        if (!params) {
          const err = { msg: '支付凭证缺少微信小程序支付参数' };
          throw err;
        }
        return requestPayment(params);
      })
      .then((result) => {
        this.setData({ prepaying: false });
        if (result === 'success') {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(() => wx.navigateBack({ fail() {} }), 800);
          return;
        }
        if (result === 'cancel') {
          wx.showToast({ title: '已取消支付', icon: 'none' });
          return;
        }
        wx.showToast({ title: '支付失败', icon: 'none' });
      });
  },

  _confirmAlipayPay() {
    return this._ensureDicts()
      .then(() =>
        prepayOrder({
          orderId: this._orderId,
          payMoney: this.data.detail.orderMoney,
          uiChannel: 'alipay',
          payChannelDict: this._payChannelDict,
          payWayDict: this._payWayDict,
        }),
      )
      .then((prepay) => {
        const url = pickRedirectUrlFromCredential(
          prepay.credential,
          prepay.channel || 'alipay_wap',
        );
        if (!url) {
          const err = { msg: '支付凭证缺少支付宝跳转链接' };
          throw err;
        }
        this._alipayPayUrl = url;
        this.setData({
          prepaying: false,
          alipayModalVisible: true,
        });
      });
  },

  onConfirmPay() {
    if (this.data.prepaying || !this.data.detail || !this._orderId) return;
    if (!this.data.agreed) {
      this.setData({ error: '请先阅读并同意相关协议' });
      return;
    }
    this.setData({ error: '', prepaying: true });

    const flow =
      this.data.payChannel === 'alipay'
        ? this._confirmAlipayPay()
        : this._confirmWechatPay();

    flow.catch((err) => {
      this.setData({
        prepaying: false,
        error: orderCenterErrorMessage(err, '拉起支付失败'),
      });
    });
  },
});
