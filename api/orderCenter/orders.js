/**
 * 订单中心观众端订单接口。
 * 路径 / 鉴权见 zhibo-shared/docs/订单中心对接.md。
 */
const { orderCenterPost } = require('../../utils/orderCenterRequest');
const { getMiniOpenid } = require('../../utils/auth');

/** 订单状态：待支付（对方 order_stats） */
const ORDER_STATUS_UNPAID = 1010;
/** 订单状态：已支付 / 已付款 */
const ORDER_STATUS_PAID = 1030;

/** prepay payMethod：单笔 */
const PREPAY_METHOD_SINGLE = 1;
/** pay_channel 兜底：wx_lite（与本库 sys_dict 快照一致） */
const PAY_CHANNEL_WX_LITE = 6;
/** pay_channel 兜底：alipay_wap */
const PAY_CHANNEL_ALIPAY_WAP = 2;
/** pay_way 兜底：微信支付 */
const PAY_WAY_WECHAT = 41;
/** pay_way 兜底：支付宝（勿用 42 微信公众号） */
const PAY_WAY_ALIPAY = 2;

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

/**
 * 支付页订单详情。
 * POST …/order-center/api/live/viewer/order/paid-detail
 * @param {string|number} orderId 订单主键
 * @returns {Promise<{
 *   orderNo: string,
 *   createTime: string,
 *   productName: string,
 *   orderMoney: string,
 *   customerRiskLevel: string,
 * }>}
 */
function getPaidDetail(orderId) {
  const id = String(orderId == null ? '' : orderId).trim();
  if (!id) {
    return Promise.reject({ msg: '订单无效' });
  }
  return orderCenterPost({
    path: '/order-center/api/live/viewer/order/paid-detail',
    data: { id: id },
    silent: true,
  }).then((data) => {
    const r = data || {};
    return {
      orderNo: r.orderNo != null ? String(r.orderNo) : '',
      createTime: typeof r.createTime === 'string' ? r.createTime : '',
      productName:
        typeof r.productName === 'string' ? r.productName.trim() : '',
      orderMoney: r.orderMoney != null ? String(r.orderMoney) : '',
      customerRiskLevel:
        typeof r.customerRiskLevel === 'string' ? r.customerRiskLevel : '',
    };
  });
}

/**
 * 规范化支付金额（元，两位小数）。
 * @param {string} raw
 * @returns {string}
 */
function normalizePayMoneyYuan(raw) {
  const t = String(raw == null ? '' : raw)
    .trim()
    .replace(/^¥\s*/, '');
  if (!t) {
    const err = { msg: '订单金额无效' };
    throw err;
  }
  const n = Number(t);
  if (Number.isFinite(n) && n > 0) return n.toFixed(2);
  if (/^\d+(\.\d{1,2})?$/.test(t)) return t;
  const err = { msg: '订单金额无效' };
  throw err;
}

/**
 * UI 微信 / 支付宝 → prepay payChannel + payway（字典优先，常量兜底）。
 * @param {'wechat'|'alipay'} uiChannel
 * @param {Record<string, number>|null|undefined} payChannelDict
 * @param {Record<string, number>|null|undefined} payWayDict
 * @returns {{ payChannel: number, payway: number }}
 */
function resolvePrepayParams(uiChannel, payChannelDict, payWayDict) {
  const channelDict = payChannelDict || {};
  const wayDict = payWayDict || {};
  if (uiChannel === 'alipay') {
    return {
      payChannel:
        channelDict.alipay_wap != null && Number.isInteger(channelDict.alipay_wap)
          ? channelDict.alipay_wap
          : PAY_CHANNEL_ALIPAY_WAP,
      payway:
        wayDict['支付宝'] != null && Number.isInteger(wayDict['支付宝'])
          ? wayDict['支付宝']
          : PAY_WAY_ALIPAY,
    };
  }
  return {
    payChannel:
      channelDict.wx_lite != null && Number.isInteger(channelDict.wx_lite)
        ? channelDict.wx_lite
        : PAY_CHANNEL_WX_LITE,
    payway:
      wayDict['微信支付'] != null && Number.isInteger(wayDict['微信支付'])
        ? wayDict['微信支付']
        : PAY_WAY_WECHAT,
  };
}

/**
 * 拉起支付（小程序收银台：微信 wx_lite；支付宝 alipay_wap）。
 * POST …/order-center/api/live/viewer/order/prepay
 * wx_lite 必传真实 openId（登录态 miniOpenid）；支付宝 / H5 渠道不要塞假值。
 * @param {object} input
 * @param {string|number} input.orderId
 * @param {string} input.payMoney 应付金额（元）
 * @param {'wechat'|'alipay'} [input.uiChannel='wechat']
 * @param {string} [input.openId] 微信小程序 openid；缺省读本地 getMiniOpenid()
 * @param {Record<string, number>|null} [input.payChannelDict]
 * @param {Record<string, number>|null} [input.payWayDict]
 * @returns {Promise<{chargeId: string, channel: string, orderNo: string, credential: string}>}
 */
function prepayOrder(input) {
  const o = input || {};
  const id = String(o.orderId == null ? '' : o.orderId).trim();
  if (!id) {
    return Promise.reject({ msg: '订单无效' });
  }
  let payMoney;
  try {
    payMoney = normalizePayMoneyYuan(o.payMoney);
  } catch (e) {
    return Promise.reject(e);
  }

  const uiChannel = o.uiChannel === 'alipay' ? 'alipay' : 'wechat';
  const resolved = resolvePrepayParams(
    uiChannel,
    o.payChannelDict,
    o.payWayDict,
  );

  const body = {
    id: id,
    payChannel: resolved.payChannel,
    payMoney: payMoney,
    payway: resolved.payway,
    payMethod: PREPAY_METHOD_SINGLE,
  };

  // 仅微信小程序渠道带 openId；支付宝不传
  if (uiChannel === 'wechat') {
    const openId = String(o.openId != null ? o.openId : getMiniOpenid() || '').trim();
    if (!openId) {
      return Promise.reject({
        msg: '缺少微信 openId，请用微信重新登录后再支付',
      });
    }
    body.openId = openId;
  }

  return orderCenterPost({
    path: '/order-center/api/live/viewer/order/prepay',
    data: body,
    silent: true,
  }).then((data) => {
    const r = data || {};
    const chargeId = r.id != null ? String(r.id) : '';
    if (!chargeId) {
      const err = { msg: '拉起支付成功但未返回支付单号' };
      throw err;
    }
    return {
      chargeId: chargeId,
      channel: typeof r.channel === 'string' ? r.channel : String(r.channel || ''),
      orderNo: r.orderNo != null ? String(r.orderNo) : '',
      credential:
        typeof r.credential === 'string' && r.credential.trim()
          ? r.credential.trim()
          : '',
    };
  });
}

/**
 * 把订单中心 reject body 转成可读文案（含 open_id 500126）。
 * @param {*} err
 * @param {string} [fallback]
 * @returns {string}
 */
function orderCenterErrorMessage(err, fallback) {
  const body = err && typeof err === 'object' ? err : null;
  const code = body ? body.code : null;
  const msg = body
    ? String(body.message || body.msg || '').trim()
    : '';
  if (
    code === 500126 ||
    code === '500126' ||
    /open_id/i.test(msg) ||
    /openId/i.test(msg) ||
    /缺少请求参数open_id/i.test(msg)
  ) {
    return '支付暂不可用：缺少微信 openId，请重新登录后再试';
  }
  if (msg) return msg.slice(0, 60);
  return fallback || '请求失败';
}

module.exports = {
  ORDER_STATUS_UNPAID,
  ORDER_STATUS_PAID,
  PREPAY_METHOD_SINGLE,
  PAY_CHANNEL_WX_LITE,
  PAY_CHANNEL_ALIPAY_WAP,
  PAY_WAY_WECHAT,
  PAY_WAY_ALIPAY,
  listMyOrders,
  orderStatusLabel,
  isPaidOrder,
  normalizeOrderItem,
  getPaidDetail,
  resolvePrepayParams,
  prepayOrder,
  orderCenterErrorMessage,
};
