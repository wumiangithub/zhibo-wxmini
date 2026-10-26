/**
 * live-service 上传：直传凭证，以及与直传结果同形的中转。
 * STS 缓存策略对齐管理端 materials.ensureTosConfig：有效则复用，剩余不足 10 分钟再拉。
 */
const { getBaseURL } = require('../../config/env');
const { request } = require('../../utils/request');

/** 剩余有效期不足此时长则视为不可用（与管理端 TOS_MIN_REMAINING_MS 一致） */
const TOS_MIN_REMAINING_MS = 10 * 60 * 1000;

/** @type {object|null} 内存缓存的 tos-sts data */
let cachedTosSts = null;

/**
 * 直传临时凭证（每次打接口，不读缓存）。与管理端 tos-sts 同形，无 biz。
 * @returns {Promise<object>}
 */
function getTosSts() {
  return request({
    url: '/viewer/uploads/tos-sts',
    method: 'GET',
    service: 'live',
  });
}

/**
 * 缓存的 STS 是否仍可用（字段齐全且距 expiredTime 超过阈值）。
 * @param {object|null|undefined} sts
 * @returns {boolean}
 */
function isTosStsValid(sts) {
  if (!sts || !sts.accessKeyId || !sts.secretAccessKey || !sts.sessionToken) {
    return false;
  }
  if (!sts.expiredTime) return false;
  const expiredAt = Date.parse(sts.expiredTime);
  if (Number.isNaN(expiredAt)) return false;
  return expiredAt - Date.now() > TOS_MIN_REMAINING_MS;
}

/**
 * 上传前调用：有缓存且未快过期则复用，否则重新 GET tos-sts。
 * 对齐管理端 ensureTosConfig。
 * @returns {Promise<object>}
 */
function ensureTosSts() {
  if (isTosStsValid(cachedTosSts)) {
    return Promise.resolve(cachedTosSts);
  }
  return getTosSts().then((sts) => {
    cachedTosSts = sts || null;
    return cachedTosSts;
  });
}

/**
 * 中转上传完整 URL。wx.uploadFile 使用，不走 JSON request。
 * @param {number} biz
 * @returns {string}
 */
function fileUploadUrl(biz) {
  return getBaseURL('live') + '/viewer/uploads/file?biz=' + biz;
}

module.exports = {
  TOS_MIN_REMAINING_MS,
  getTosSts,
  ensureTosSts,
  isTosStsValid,
  fileUploadUrl,
};
