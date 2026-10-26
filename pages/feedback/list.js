const { getAccessToken } = require('../../utils/auth');
const { listFeedback } = require('../../api/live/feedback');

/** 每页条数 */
const PAGE_SIZE = 20;

/**
 * 意见反馈提交记录列表；底部可去写新反馈。
 */
Page({
  data: {
    list: [],
    loading: false,
    noMore: false,
    page: 1,
    total: 0,
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this._reload();
  },

  onPullDownRefresh() {
    this._reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.loading || this.data.noMore) return;
    this._loadMore();
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null) return;
    wx.navigateTo({ url: '/pages/feedback/detail?id=' + id });
  },

  _reload() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetch(1, true);
  },

  _loadMore() {
    const next = this.data.page + 1;
    return this._fetch(next, false);
  },

  /**
   * @param {number} page
   * @param {boolean} replace
   */
  _fetch(page, replace) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    return listFeedback({ page: page, pageSize: PAGE_SIZE })
      .then((data) => {
        const rows = (data && data.list) || [];
        const total = (data && data.total) || 0;
        const list = replace ? rows : this.data.list.concat(rows);
        const noMore = list.length >= total || rows.length < PAGE_SIZE;
        this.setData({
          list: list,
          page: page,
          total: total,
          noMore: noMore,
        });
      })
      .catch((err) => {
        const msg = (err && err.msg) || '加载失败';
        wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
});
