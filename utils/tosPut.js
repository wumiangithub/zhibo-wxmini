/**
 * 火山 TOS PutObject（AWS SigV4），供头像 direct 直传。
 * 小文件整对象 PUT，不走分片。
 */
const { sha256, hmacSha256, utf8Encode, toHex } = require('./sha256');

/**
 * @param {Date} d
 * @returns {{amzDate: string, dateStamp: string}}
 */
function amzDates(d) {
  const iso = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

/**
 * @param {Uint8Array} key
 * @param {string} msg
 * @returns {Uint8Array}
 */
function hmac(key, msg) {
  return hmacSha256(key, msg);
}

/**
 * @param {string} key
 * @param {string} dateStamp
 * @param {string} region
 * @param {string} service
 * @returns {Uint8Array}
 */
function getSigningKey(key, dateStamp, region, service) {
  const kDate = hmac(utf8Encode('AWS4' + key), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/**
 * 直传 PutObject。
 * @param {object} opts
 * @param {string} opts.region
 * @param {string} opts.endpoint 如 tos-cn-shanghai.volces.com
 * @param {string} opts.bucketName
 * @param {string} opts.accessKeyId
 * @param {string} opts.secretAccessKey
 * @param {string} opts.sessionToken
 * @param {string} opts.objectKey viewer/avatar/...
 * @param {ArrayBuffer|Uint8Array} opts.body
 * @param {string} opts.contentType
 * @returns {Promise<void>}
 */
function putObject(opts) {
  const body =
    opts.body instanceof Uint8Array
      ? opts.body
      : new Uint8Array(opts.body);
  const host = opts.bucketName + '.' + opts.endpoint;
  const url = 'https://' + host + '/' + opts.objectKey.split('/').map(encodeURIComponent).join('/');
  const { amzDate, dateStamp } = amzDates(new Date());
  const payloadHash = toHex(sha256(body));
  const contentType = opts.contentType || 'application/octet-stream';
  const canonicalHeaders =
    'content-type:' +
    contentType +
    '\n' +
    'host:' +
    host +
    '\n' +
    'x-amz-content-sha256:' +
    payloadHash +
    '\n' +
    'x-amz-date:' +
    amzDate +
    '\n' +
    'x-amz-security-token:' +
    opts.sessionToken +
    '\n';
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token';
  const canonicalRequest = [
    'PUT',
    '/' + opts.objectKey.split('/').map(encodeURIComponent).join('/'),
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = dateStamp + '/' + opts.region + '/tos/aws4_request';
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    toHex(sha256(utf8Encode(canonicalRequest))),
  ].join('\n');
  const signingKey = getSigningKey(opts.secretAccessKey, dateStamp, opts.region, 'tos');
  const signature = toHex(hmac(signingKey, stringToSign));
  const authorization =
    'AWS4-HMAC-SHA256 Credential=' +
    opts.accessKeyId +
    '/' +
    credentialScope +
    ', SignedHeaders=' +
    signedHeaders +
    ', Signature=' +
    signature;

  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: 'PUT',
      header: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'x-amz-security-token': opts.sessionToken,
        Authorization: authorization,
      },
      data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject({
          msg: '直传 TOS 失败(' + res.statusCode + ')',
          statusCode: res.statusCode,
          data: res.data,
        });
      },
      fail(err) {
        reject(err || { msg: '直传 TOS 网络异常' });
      },
    });
  });
}

/**
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
  putObject,
  buildAccessUrl,
};
