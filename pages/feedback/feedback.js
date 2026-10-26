const { getAccessToken, getViewerId } = require('../../utils/auth');
const { submitFeedback } = require('../../api/live/feedback');
const { uploadAvatar, MAX_BYTES } = require('../../utils/avatarUpload');
const { CATEGORIES } = require('../../utils/feedbackCategories');

/** 意见描述字数上限（对齐契约） */
const CONTENT_MAX = 200;
/** 相关截图最多张数 */
const IMAGES_MAX = 4;

/**
 * 意见反馈页：选分类、写描述、最多 4 张截图（保存时再上传）、选填手机号。
 * 首屏 view 固定 100vh；其下「历史提交记录」需滚动才见。
 */
Page({
  data: {
    categories: CATEGORIES,
    category: 1,
    content: '',
    contentLen: 0,
    contentMax: CONTENT_MAX,
    images: [],
    imagesMax: IMAGES_MAX,
    contactPhone: '',
    submitting: false,
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },

  /** 进入历史提交记录列表 */
  onTapHistory() {
    wx.navigateTo({ url: '/pages/feedback/list' });
  },

  onPickCategory(e) {
    const value = Number(e.currentTarget.dataset.value);
    if (!value) return;
    this.setData({ category: value });
  },

  onContentInput(e) {
    let content = (e.detail && e.detail.value) || '';
    if (content.length > CONTENT_MAX) content = content.slice(0, CONTENT_MAX);
    this.setData({ content: content, contentLen: content.length });
  },

  onPhoneInput(e) {
    let phone = (e.detail && e.detail.value) || '';
    phone = phone.replace(/\D/g, '').slice(0, 11);
    this.setData({ contactPhone: phone });
  },

  onAddImage() {
    const remain = IMAGES_MAX - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const files = (res && res.tempFiles) || [];
        const next = this.data.images.slice();
        for (let i = 0; i < files.length; i++) {
          if (next.length >= IMAGES_MAX) break;
          const f = files[i];
          if (!f || !f.tempFilePath) continue;
          if (typeof f.size === 'number' && f.size > MAX_BYTES) {
            wx.showToast({ title: '单张图片不能超过2MB', icon: 'none' });
            continue;
          }
          next.push({ path: f.tempFilePath, size: f.size || 0 });
        }
        this.setData({ images: next });
      },
    });
  },

  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const next = this.data.images.slice();
    next.splice(index, 1);
    this.setData({ images: next });
  },

  onSubmit() {
    if (this.data.submitting) return;
    const content = (this.data.content || '').trim();
    if (!this.data.category) {
      wx.showToast({ title: '请选择意见类型', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '请描述你的问题或建议', icon: 'none' });
      return;
    }
    if (content.length > CONTENT_MAX) {
      wx.showToast({ title: '描述最多' + CONTENT_MAX + '字', icon: 'none' });
      return;
    }
    const phone = (this.data.contactPhone || '').trim();
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    const viewerId = getViewerId();
    const locals = this.data.images.slice();
    this.setData({ submitting: true });

    this._uploadAll(locals, viewerId)
      .then((images) =>
        submitFeedback({
          category: this.data.category,
          content: content,
          contactPhone: phone || undefined,
          images: images,
        })
      )
      .then(() => {
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({
            fail: () => wx.redirectTo({ url: '/pages/feedback/list' }),
          });
        }, 500);
      })
      .catch((err) => {
        const msg = (err && err.msg) || (err && err.message) || '提交失败';
        wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  /**
   * 串行上传本地截图；失败整单中止。
   * @param {Array<{path: string, size: number}>} locals
   * @param {number|string} viewerId
   * @returns {Promise<Array<{url: string, objectKey: string}>>}
   */
  _uploadAll(locals, viewerId) {
    if (!locals || !locals.length) {
      return Promise.resolve([]);
    }
    const out = [];
    let chain = Promise.resolve();
    locals.forEach((item) => {
      chain = chain.then(() =>
        uploadAvatar({
          filePath: item.path,
          fileSize: item.size,
          viewerId: viewerId,
          biz: 2,
        }).then((r) => {
          out.push({ url: r.url, objectKey: r.objectKey });
        })
      );
    });
    return chain.then(() => out);
  },
});
