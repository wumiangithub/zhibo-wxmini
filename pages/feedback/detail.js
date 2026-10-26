const { getAccessToken } = require('../../utils/auth');
const { getFeedbackDetail } = require('../../api/live/feedback');

/**
 * 意见反馈详情（只读）。
 */
Page({
  data: {
    detail: null,
    loading: true,
  },

  onLoad(query) {
    const id = query && query.id;
    this._id = id;
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (!this._id) {
      this.setData({ loading: false, detail: null });
      return;
    }
    this._load();
  },

  _load() {
    this.setData({ loading: true });
    getFeedbackDetail(this._id)
      .then((detail) => {
        this.setData({ detail: detail || null, loading: false });
      })
      .catch((err) => {
        this.setData({ detail: null, loading: false });
        const msg = (err && err.msg) || '加载失败';
        wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
      });
  },

  onPreview(e) {
    const url = e.currentTarget.dataset.url;
    const detail = this.data.detail;
    const urls = ((detail && detail.images) || []).map((i) => i.url).filter(Boolean);
    if (!url || !urls.length) return;
    wx.previewImage({ current: url, urls: urls });
  },
});
