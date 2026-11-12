const { getAccessToken } = require('../../utils/auth');
const {
  listMyOrders,
  orderStatusLabel,
  ORDER_STATUS_UNPAID,
} = require('../../api/orderCenter/orders');

/** 每页条数（对方 pageSize 1～100） */
const PAGE_SIZE = 20;
/** 无封面时的占位图；对方列表暂无 coverImg */
const DEFAULT_COVER = '/images/cover-course-1.png';

/**
 * 全部订单：直连订单中心观众端列表（§5.6）。
 * 全部状态都展示；非待支付点卡片用 orderId 进详情 paid-info；
 * 待支付后续接继续支付。
 */
Page({
  data: {
    list: [],
    loading: false,
    noMore: false,
    page: 1,
    defaultCover: DEFAULT_COVER,
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this._reload();
  },

  onPullDownRefresh() {
    this._reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.loading || this.data.noMore) return;
    this._loadMore();
  },

  onTapItem(e) {
    const orderId = e.currentTarget.dataset.orderid;
    const status = Number(e.currentTarget.dataset.status);
    if (!orderId) {
      wx.showToast({ title: '订单无效', icon: 'none' });
      return;
    }
    if (status === ORDER_STATUS_UNPAID) {
      wx.showToast({ title: '待支付订单支付流程待接入', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/orders/detail?orderId=' + encodeURIComponent(String(orderId)),
    });
  },

  _reload() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetch(1, true);
  },

  _loadMore() {
    return this._fetch(this.data.page + 1, false);
  },

  /**
   * @param {number} page
   * @param {boolean} replace
   */
  _fetch(page, replace) {
    if (this.data.loading && replace) return Promise.resolve();
    this.setData({ loading: true });
    return listMyOrders({ page: page, pageSize: PAGE_SIZE })
      .then((data) => {
        const rawList = (data && data.list) || [];
        const rows = rawList.map((item) => this._toView(item));
        const list = replace ? rows : this.data.list.concat(rows);
        this.setData({
          list: list,
          page: page,
          noMore: rawList.length < PAGE_SIZE,
        });
      })
      .catch(() => {
        /* toast 已在 orderCenterRequest */
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  /**
   * @param {object} item
   * @returns {object}
   */
  _toView(item) {
    let validityText = '';
    if (item.validityLabel) {
      validityText = item.validityLabel;
    } else if (item.serviceDay != null && item.serviceDay !== '') {
      validityText = '有效期：' + item.serviceDay + '天';
    } else if (item.createTime) {
      validityText = item.createTime;
    }
    return {
      orderId: item.orderId || '',
      orderNo: item.orderNo,
      productName: item.productName,
      orderMoney: item.orderMoney || '0.00',
      coverImg: item.coverImg || '',
      statusLabel: orderStatusLabel(item.orderStatus) || '已支付',
      orderStatus: item.orderStatus,
      validityText: validityText,
    };
  },
});
