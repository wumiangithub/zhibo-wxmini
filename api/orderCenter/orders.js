/**
 * 订单中心观众端订单接口。
 * 路径 / 鉴权见 zhibo-shared/docs/订单中心对接.md。
 */
const { orderCenterPost } = require('../../utils/orderCenterRequest');

/** 订单状态：待支付（对方 order_stats） */
const ORDER_STATUS_UNPAID = 1010;
/** 订单状态：已支付 / 已付款 */
const ORDER_STATUS_PAID = 1030;

/**
 * 我的订单列表。
 * POST …/order-center/api/live/viewer/order/list
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @returns {Promise<{page: number, size: number, total: number, list: object[]}>}
 */
function listMyOrders(opts) {
  const o = opts || {};
  const page = o.page == null ? 1 : o.page;
  const pageSize = o.pageSize == null ? 20 : o.pageSize;
  return orderCenterPost({
    path: '/order-center/api/live/viewer/order/list',
    data: { page: page, pageSize: pageSize },
  }).then((data) => {
    const raw = data || {};
    const list = Array.isArray(raw.list) ? raw.list : [];
    return {
      page: raw.page != null ? Number(raw.page) : page,
      size: raw.size != null ? Number(raw.size) : pageSize,
      total: raw.total != null ? Number(raw.total) : list.length,
      list: list.map(normalizeOrderItem),
    };
  });
}

/**
 * 规范化列表项；大整数订单号保持字符串。
 * @param {object} raw
 * @returns {object}
 */
function normalizeOrderItem(raw) {
  const r = raw || {};
  const status = Number(r.orderStatus);
  return {
    orderNo: r.orderNo != null ? String(r.orderNo) : '',
    productName: r.productName != null ? String(r.productName) : '',
    customerAccount: r.customerAccount != null ? String(r.customerAccount) : '',
    customerName: r.customerName != null ? String(r.customerName) : '',
    orderStatus: Number.isFinite(status) ? status : 0,
    orderMoney: r.orderMoney != null ? String(r.orderMoney) : '',
    createTime: r.createTime != null ? String(r.createTime) : '',
    /** 对方列表暂无封面；有则透传 */
    coverImg: r.coverImg != null ? String(r.coverImg) : '',
    /** 有效期天数等；有则透传 */
    serviceDay: r.serviceDay != null ? r.serviceDay : null,
    validityLabel: r.validityLabel != null ? String(r.validityLabel) : '',
  };
}

/**
 * 订单状态文案。
 * @param {number} status
 * @returns {string}
 */
function orderStatusLabel(status) {
  if (status === ORDER_STATUS_PAID) return '已付款';
  if (status === ORDER_STATUS_UNPAID) return '待支付';
  return status ? '状态' + status : '';
}

/**
 * 是否已支付（可进详情）。
 * @param {number} status
 * @returns {boolean}
 */
function isPaidOrder(status) {
  return status === ORDER_STATUS_PAID;
}

module.exports = {
  ORDER_STATUS_UNPAID,
  ORDER_STATUS_PAID,
  listMyOrders,
  orderStatusLabel,
  isPaidOrder,
  normalizeOrderItem,
};
