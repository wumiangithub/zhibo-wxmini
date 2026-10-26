/**
 * 观众头像上传：按 env.avatarUploadMode 走 proxy 或 direct（T36.2）。
 */
const { getAvatarUploadMode } = require('../config/env');
const { getAccessToken, doRefreshMaybe } = require('./authUpload');
const { avatarUploadUrl } = require('../api/live/profile');
const { getTosSts } = require('../api/live/uploads');
const { putObject, buildAccessUrl } = require('./tosPut');

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * @param {string} filePath
 * @returns {string}
 */
function guessExt(filePath) {
  const m = /\.([a-zA-Z0-9]+)(\?|$)/.exec(filePath || '');
  const ext = m ? m[1].toLowerCase() : 'jpg';
  if (ext === 'jpeg' || ext === 'jpg' || ext === 'png' || ext === 'gif' || ext === 'webp') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

/**
 * @param {string} ext
 * @returns {string}
 */
function contentTypeOf(ext) {
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * 校验本地文件大小 ≤ 2MB。
 * @param {string} filePath
 * @param {number} [knownSize]
 * @returns {Promise<number>} size
 */
function assertFileSize(filePath, knownSize) {
  if (typeof knownSize === 'number' && knownSize > 0) {
    if (knownSize > MAX_BYTES) {
      return Promise.reject({ msg: '头像不能超过2MB' });
    }
    return Promise.resolve(knownSize);
  }
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath: filePath,
      success(res) {
        if (res.size > MAX_BYTES) {
          reject({ msg: '头像不能超过2MB' });
          return;
        }
        resolve(res.size);
      },
      fail() {
        reject({ msg: '无法读取头像文件' });
      },
    });
  });
}

/**
 * proxy：wx.uploadFile 打 api/live/profile.avatarUploadUrl（后端代写库）
 * @param {string} filePath
 * @param {boolean} [_retried]
 * @returns {Promise<object>} user
 */
function uploadViaProxy(filePath, _retried) {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: avatarUploadUrl(),
      filePath: filePath,
      name: 'file',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        let body = {};
        try {
          body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data || {};
        } catch (e) {
          reject({ msg: '头像上传响应无效' });
          return;
        }
        if (res.statusCode === 200 && body.code === 0) {
          resolve(body.data || {});
          return;
        }
        if (body.code === 401 && !_retried) {
          doRefreshMaybe()
            .then(() => uploadViaProxy(filePath, true))
            .then(resolve)
            .catch(reject);
          return;
        }
        reject(body.msg ? body : { msg: (body && body.msg) || '头像上传失败' });
      },
      fail(err) {
        reject(err || { msg: '头像上传网络异常' });
      },
    });
  });
}

/**
 * direct：STS → PutObject → 返回可写库的 avatarUrl（不自动写库）
 * @param {string} filePath
 * @param {number|string} viewerId
 * @returns {Promise<string>} avatarUrl
 */
function uploadViaDirect(filePath, viewerId) {
  const ext = guessExt(filePath);
  const contentType = contentTypeOf(ext);
  return getTosSts().then((sts) => {
    const prefix = (sts.keyPrefix || 'viewer/avatar/').replace(/\/*$/, '/');
    const objectKey = prefix + String(viewerId || '0') + '_' + Date.now() + '.' + ext;
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        success(fileRes) {
          const body = fileRes.data;
          putObject({
            region: sts.region,
            endpoint: sts.endpoint,
            bucketName: sts.bucketName,
            accessKeyId: sts.accessKeyId,
            secretAccessKey: sts.secretAccessKey,
            sessionToken: sts.sessionToken,
            objectKey: objectKey,
            body: body,
            contentType: contentType,
          })
            .then(() => {
              resolve(
                buildAccessUrl(sts.cdnUrl, objectKey, sts.bucketName, sts.endpoint)
              );
            })
            .catch(reject);
        },
        fail() {
          reject({ msg: '读取头像失败' });
        },
      });
    });
  });
}

/**
 * 按当前模式上传头像
 * @param {object} opts
 * @param {string} opts.filePath 本地临时路径
 * @param {number} [opts.fileSize]
 * @param {number|string} [opts.viewerId] direct 拼 key 用
 * @returns {Promise<{mode: string, user?: object, avatarUrl?: string}>}
 */
function uploadAvatar(opts) {
  const o = opts || {};
  const filePath = o.filePath;
  if (!filePath) {
    return Promise.reject({ msg: '请选择头像' });
  }
  const mode = getAvatarUploadMode();
  return assertFileSize(filePath, o.fileSize).then(() => {
    if (mode === 'direct') {
      return uploadViaDirect(filePath, o.viewerId).then((avatarUrl) => ({
        mode: 'direct',
        avatarUrl: avatarUrl,
      }));
    }
    return uploadViaProxy(filePath).then((user) => ({
      mode: 'proxy',
      user: user,
      avatarUrl: user && user.avatarUrl,
    }));
  });
}

module.exports = {
  MAX_BYTES,
  uploadAvatar,
  getAvatarUploadMode,
};