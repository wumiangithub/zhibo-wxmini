/**
 * 火山 TOS 小程序直传（对齐官方文档：Post 表单预签名 + wx.uploadFile）。
 * 文档：https://docs.volcengine.com/docs/TorchObjectStorage/UploadingdatafromWeChatMiniProgramstoTOS
 * 依赖 @volcengine/tos-sdk（≥2.6.10）；须存在 miniprogram_npm（npm run build:npm）。
 */
const { TosClient } = require('@volcengine/tos-sdk');

/**
 * 用 STS 凭证创建 TOS 客户端（只算 Post 签名，不经 SDK 发 Put）。
 * @param {object} sts tos-sts 下发的凭证字段
 * @returns {object} TosClient 实例
 */
function createTosClient(sts) {
  return new TosClient({
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.secretAccessKey,
    stsToken: sts.sessionToken,
    region: sts.region,
    endpoint: sts.endpoint,
    bucket: sts.bucketName,
  });
}

/**
 * PostObject 直传：calculatePostSignature → wx.uploadFile（name 固定 file）。
 * 成功状态码一般为 204。
 * @param {object} opts
 * @param {string} opts.region
 * @param {string} opts.endpoint 如 tos-cn-shanghai.volces.com
 * @param {string} opts.bucketName
 * @param {string} opts.accessKeyId
 * @param {string} opts.secretAccessKey
 * @param {string} opts.sessionToken
 * @param {string} opts.objectKey 对象键
 * @param {string} opts.filePath 本地临时路径
 * @param {string} [opts.contentType] 写入表单 Content-Type
 * @param {number} [opts.expiresIn=3600] 签名有效秒数
 * @returns {Promise<void>}
 */
function postObject(opts) {
  const client = createTosClient(opts);
  const expiresIn =
    typeof opts.expiresIn === 'number' && opts.expiresIn > 0
      ? opts.expiresIn
      : 3600;
  const fields = {};
  if (opts.contentType) {
    fields['Content-Type'] = opts.contentType;
  }

  return client
    .calculatePostSignature({
      bucket: opts.bucketName,
      key: opts.objectKey,
      expiresIn: expiresIn,
      fields: fields,
    })
    .then((formData) => {
      const bucketHost = opts.bucketName + '.' + opts.endpoint;
      const url =
        'https://' + bucketHost + '/' + encodeURI(opts.objectKey);

      /** @type {Record<string, string>} wx.uploadFile 要求表单值为 string */
      const form = {};
      Object.keys(formData || {}).forEach((k) => {
        const v = formData[k];
        if (v == null) return;
        form[k] = typeof v === 'string' ? v : String(v);
      });

      return new Promise((resolve, reject) => {
        wx.uploadFile({
          filePath: opts.filePath,
          name: 'file',
          url: url,
          formData: form,
          success(res) {
            if (res.statusCode === 204 || (res.statusCode >= 200 && res.statusCode < 300)) {
              resolve();
              return;
            }
            let detail = '';
            try {
              const raw = res.data;
              const obj =
                typeof raw === 'string'
                  ? JSON.parse(raw)
                  : raw && typeof raw === 'object'
                    ? raw
                    : null;
              if (obj && (obj.Message || obj.Code)) {
                detail = (obj.Code || '') + ' ' + (obj.Message || '');
              } else if (typeof raw === 'string') {
                detail = raw.slice(0, 120);
              }
            } catch (e) {
              /* ignore */
            }
            reject({
              msg: (
                '直传 TOS 失败(' +
                res.statusCode +
                ')' +
                (detail ? ' ' + detail : '')
              ).trim(),
              statusCode: res.statusCode,
              data: res.data,
            });
          },
          fail(err) {
            reject(err || { msg: '直传 TOS 网络异常' });
          },
        });
      });
    });
}

/**
 * 可访问 URL：有 CDN 拼 CDN + objectKey，否则拼原生桶域名。
 * @param {string} [cdnUrl]
 * @param {string} objectKey
 * @param {string} bucketName
 * @param {string} endpoint
 * @returns {string}
 */
function buildAccessUrl(cdnUrl, objectKey, bucketName, endpoint) {
  const key = String(objectKey || '').replace(/^\//, '');
  const cdn = String(cdnUrl || '').replace(/\/$/, '');
  if (cdn) return cdn + '/' + key;
  return 'https://' + bucketName + '.' + endpoint + '/' + key;
}

module.exports = {
  createTosClient,
  postObject,
  buildAccessUrl,
};
