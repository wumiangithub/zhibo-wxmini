const { getAccessToken } = require('../../utils/auth');
const {
  listMyOrders,
  orderStatusLabel,
  isPaidOrder,
  ORDER_STATUS_PAID,
} = require('../../api/orderCenter/orders');

/** 每页条数（对方 pageSize 1～100） */
const PAGE_SIZE = 20;
/** 无封面时的占位图；对方列表暂无 coverImg */
const DEFAULT_COVER = '/images/cover-course-1.png';
/** 连续空页（过滤后无已付款）最多再拉几页，避免死循环 */
const MAX_SKIP_EMPTY = 5;

/**
 * 全部订单：直连订单中心观众端列表（§5.6）。
 * 仅展示 orderStatus=1030；详情接口待换，点进先 toast。
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
    const paid = e.currentTarget.dataset.paid;
    const orderNo = e.currentTarget.dataset.orderno;
    if (!paid) {
      wx.showToast({ title: '仅已付款订单可查看详情', icon: 'none' });
      return;
    }
    if (!orderNo) return;
    // 详情接口待换；先占位
    wx.showToast({ title: '订单详情待接入', icon: 'none' });
  },

  _reload() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetch(1, true, 0);
  },

  _loadMore() {
    return this._fetch(this.data.page + 1, false, 0);
  },

  /**
   * @param {number} page
   * @param {boolean} replace
   * @param {number} emptySkips 本轮已跳过的「过滤后为空」页数
   */
  _fetch(page, replace, emptySkips) {
    if (this.data.loading && emptySkips === 0) return Promise.resolve();
    this.setData({ loading: true });
    return listMyOrders({ page: page, pageSize: PAGE_SIZE })
      .then((data) => {
        const rawList = (data && data.list) || [];
        const rows = rawList
          .filter((item) => isPaidOrder(item.orderStatus))
          .map((item) => this._toView(item));
        const rawLen = rawList.length;
        const remoteNoMore = rawLen < PAGE_SIZE;

        // 本页无已付款但仍有下一页：继续拉，避免误显「暂无」
        if (rows.length === 0 && !remoteNoMore && emptySkips < MAX_SKIP_EMPTY) {
          this.setData({ page: page });
          return this._fetch(page + 1, replace, emptySkips + 1);
        }

        const list = replace ? rows : this.data.list.concat(rows);
        this.setData({
          list: list,
          page: page,
          noMore: remoteNoMore || emptySkips >= MAX_SKIP_EMPTY,
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
      orderNo: item.orderNo,
      productName: item.productName,
      orderMoney: item.orderMoney || '0.00',
      coverImg: item.coverImg || '',
      statusLabel: orderStatusLabel(item.orderStatus) || '已付款',
      paid: item.orderStatus === ORDER_STATUS_PAID,
      validityText: validityText,
    };
  },
});
