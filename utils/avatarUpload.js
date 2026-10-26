/**
 * 观众图片上传。前缀与管理端一样由前端按功能定义（对齐 API约定「对象 key 目录」）。
 * proxy：拼 objectKey → POST uploads/file；direct：tos-sts 拿凭证后 PostObject（SDK 签名 + wx.uploadFile）。
 * 返回 objectKey、url、location。biz：1 头像 / 2 意见反馈截图。
 */
const { getAvatarUploadMode } = require('../config/env');
const { getAccessToken, doRefreshMaybe } = require('./authUpload');
const { ensureTosSts, fileUploadUrl } = require('../api/live/uploads');
const { postObject, buildAccessUrl } = require('./tosUpload');

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * 观众侧对象键前缀（权威表见 API约定 tos-sts「对象 key 目录」）。
 * 新功能须先登记再编码，禁止自创。
 */
const ViewerObjectKeyPrefix = {
  /** biz=1 */
  AVATAR: 'viewer/avatar/',
  /** biz=2 */
  FEEDBACK: 'viewer/feedback/',
};

/**
 * @param {number} biz
 * @returns {string}
 */
function prefixOfBiz(biz) {
  if (biz === 2) return ViewerObjectKeyPrefix.FEEDBACK;
  return ViewerObjectKeyPrefix.AVATAR;
}

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
 * 拼对象键（前缀来自本文件常量，不取自 STS）。
 * 头像（biz=1）：`viewer/avatar/{viewerId}.{ext}`，同用户同格式覆盖，避免 TOS 堆无效图。
 * 反馈（biz=2）：`viewer/feedback/{viewerId}_{timestamp}.{ext}`，可多张，仍带时间戳。
 * @param {number} biz
 * @param {number|string} viewerId
 * @param {string} ext
 * @returns {string}
 */
function buildObjectKey(biz, viewerId, ext) {
  const prefix = prefixOfBiz(biz).replace(/\/*$/, '/');
  const id = String(viewerId || '0');
  if (biz === 1) {
    return prefix + id + '.' + ext;
  }
  return prefix + id + '_' + Date.now() + '.' + ext;
}

/**
 * @param {string} filePath
 * @param {number} [knownSize]
 * @returns {Promise<number>} size
 */
function assertFileSize(filePath, knownSize) {
  if (typeof knownSize === 'number' && knownSize > 0) {
    if (knownSize > MAX_BYTES) {
      return Promise.reject({ msg: '图片不能超过2MB' });
    }
    return Promise.resolve(knownSize);
  }
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath: filePath,
      success(res) {
        if (res.size > MAX_BYTES) {
          reject({ msg: '图片不能超过2MB' });
          return;
        }
        resolve(res.size);
      },
      fail() {
        reject({ msg: '无法读取图片文件' });
      },
    });
  });
}

/**
 * 中转：objectKey + file（+ contentType），与直传 PostObject 入参对齐。
 * @param {string} filePath
 * @param {number} biz
 * @param {string} objectKey
 * @param {string} contentType
 * @param {boolean} [_retried]
 * @returns {Promise<{objectKey: string, url: string, location: string}>}
 */
function uploadViaProxy(filePath, biz, objectKey, contentType, _retried) {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: fileUploadUrl(biz),
      filePath: filePath,
      name: 'file',
      formData: {
        objectKey: objectKey,
        contentType: contentType,
      },
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        let body = {};
        try {
          body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data || {};
        } catch (e) {
          reject({ msg: '上传响应无效' });
          return;
        }
        if (res.statusCode === 200 && body.code === 0 && body.data && body.data.objectKey && body.data.url) {
          resolve({
            objectKey: body.data.objectKey,
            url: body.data.url,
            location: body.data.location || '',
          });
          return;
        }
        if (body.code === 401 && !_retried) {
          doRefreshMaybe()
            .then(() => uploadViaProxy(filePath, biz, objectKey, contentType, true))
            .then(resolve)
            .catch(reject);
          return;
        }
        reject(body.msg ? body : { msg: (body && body.msg) || '上传失败' });
      },
      fail(err) {
        reject(err || { msg: '上传网络异常' });
      },
    });
  });
}

/**
 * 直传 PostObject（官方小程序文档：SDK 算表单签名 + wx.uploadFile）。
 * STS 只提供凭证与 CDN；objectKey 已由前端拼好。
 * @param {object} sts
 * @param {string} filePath
 * @param {string} objectKey
 * @param {string} contentType
 * @returns {Promise<{objectKey: string, url: string, location: string}>}
 */
function uploadViaDirect(sts, filePath, objectKey, contentType) {
  return postObject({
    region: sts.region,
    endpoint: sts.endpoint,
    bucketName: sts.bucketName,
    accessKeyId: sts.accessKeyId,
    secretAccessKey: sts.secretAccessKey,
    sessionToken: sts.sessionToken,
    objectKey: objectKey,
    filePath: filePath,
    contentType: contentType,
  }).then(() => {
    const location =
      'https://' + sts.bucketName + '.' + sts.endpoint + '/' + objectKey;
    return {
      objectKey: objectKey,
      url: buildAccessUrl(sts.cdnUrl, objectKey, sts.bucketName, sts.endpoint),
      location: location,
    };
  });
}

/**
 * @param {object} opts
 * @param {string} opts.filePath
 * @param {number} [opts.fileSize]
 * @param {number|string} [opts.viewerId]
 * @param {number} [opts.biz] 1 头像 / 2 意见反馈截图，默认 1
 * @returns {Promise<{objectKey: string, url: string, location: string}>}
 */
function uploadAvatar(opts) {
  const o = opts || {};
  const filePath = o.filePath;
  const biz = o.biz == null ? 1 : o.biz;
  if (!filePath) {
    return Promise.reject({ msg: '请选择图片' });
  }
  const mode = getAvatarUploadMode();
  const ext = guessExt(filePath);
  const contentType = contentTypeOf(ext);
  const objectKey = buildObjectKey(biz, o.viewerId, ext);

  return assertFileSize(filePath, o.fileSize).then(() => {
    if (mode === 'direct') {
      return ensureTosSts().then((sts) =>
        uploadViaDirect(sts, filePath, objectKey, contentType)
      );
    }
    return uploadViaProxy(filePath, biz, objectKey, contentType);
  });
}

module.exports = {
  MAX_BYTES,
  ViewerObjectKeyPrefix,
  prefixOfBiz,
  buildObjectKey,
  uploadAvatar,
  getAvatarUploadMode,
};
