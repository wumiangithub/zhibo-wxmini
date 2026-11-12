const { getAccessToken } = require('../../../utils/auth');
const { getPaidInfo } = require('../../../api/orderCenter/orders');

const DEFAULT_COVER = '/images/cover-course-1.png';

/**
 * 订单详情（已付款）：paid-info，入参列表 orderId。
 */
Page({
  data: {
    loading: true,
    errorText: '',
    detail: null,
    coverSrc: DEFAULT_COVER,
    validityText: '',
    moneyText: '¥0.00',
  },

  onLoad(query) {
    this._orderId = query && query.orderId ? String(query.orderId).trim() : '';
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this._load();
  },

  onRetry() {
    this._load();
  },

  _load() {
    const orderId = this._orderId;
    if (!orderId) {
      this.setData({
        loading: false,
        detail: null,
        errorText: '订单无效',
      });
      return;
    }
    this.setData({ loading: true, errorText: '' });
    getPaidInfo(orderId)
      .then((info) => {
        const days = info && info.totalDays;
        const rawMoney = info && info.orderMoney ? String(info.orderMoney).trim() : '';
        let moneyText = '¥0.00';
        if (rawMoney) {
          moneyText = rawMoney.startsWith('¥') ? rawMoney : '¥' + rawMoney;
        }
        this.setData({
          loading: false,
          detail: info || null,
          coverSrc: (info && info.productImg) || DEFAULT_COVER,
          validityText:
            days != null && days > 0 ? '有效期：' + days + '天' : '',
          moneyText: moneyText,
          errorText: '',
        });
      })
      .catch((err) => {
        const msg = (err && (err.msg || err.message)) || '加载失败';
        const text = String(msg).slice(0, 40);
        this.setData({
          loading: false,
          detail: null,
          errorText: text,
        });
        wx.showToast({ title: text, icon: 'none' });
      });
  },
});
