/**
 * 本站 live-service 字典只读。
 * GET /dicts/data/{dictDm} 公开，无需观众 JWT。
 */
const { request } = require('../../utils/request');

/**
 * @param {string} dictDm 如 pay_channel / pay_way
 * @returns {Promise<{dictDm: string, dictName: string, list: {label: string, value: number}[]}>}
 */
function getDictData(dictDm) {
  const dm = String(dictDm || '').trim();
  if (!dm) {
    return Promise.reject({ msg: '字典代码无效' });
  }
  return request({
    url: '/dicts/data/' + encodeURIComponent(dm),
    method: 'GET',
    auth: false,
    silent: true,
  });
}

/**
 * label → value；同 label 后者覆盖。
 * @param {{list?: {label?: string, value?: number}[]}|null|undefined} data
 * @returns {Record<string, number>}
 */
function dictLabelValueMap(data) {
  const out = {};
  const list = data && Array.isArray(data.list) ? data.list : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] || {};
    const label = String(row.label || '').trim();
    const value = Number(row.value);
    if (!label || !Number.isInteger(value)) continue;
    out[label] = value;
  }
  return out;
}

module.exports = {
  getDictData,
  dictLabelValueMap,
};
