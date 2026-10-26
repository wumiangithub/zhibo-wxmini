const { getAccessToken } = require('../../utils/auth');
const { filterLearning } = require('../../utils/mockLearning');
const {
  listWatchActivities,
  watchStateLabel,
  isLivingState,
} = require('../../api/live/watch');

/** 每页条数 */
const PAGE_SIZE = 20;
/** 无封面占位 */
const DEFAULT_COVER = '/images/cover-live-1.png';

/**
 * 我的学习：直播 Tab 拉 GET /watch/activities，点进 web-view 嵌 live-web `/watch/:id`；
 * 课程 Tab 暂 mock。
 */
Page({
  data: {
    activeTab: 'live',
    keyword: '',
    list: [],
    loading: false,
    noMore: false,
    page: 1,
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.refreshList();
  },

  onPullDownRefresh() {
    this.refreshList().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.activeTab !== 'live') return;
    if (this.data.loading || this.data.noMore) return;
    this._loadMoreLive();
  },

  refreshList() {
    if (this.data.activeTab === 'live') {
      return this._reloadLive();
    }
    const list = filterLearning('course', this.data.keyword).map((item) =>
      Object.assign({}, item, { kind: 'course' })
    );
    this.setData({ list: list, loading: false, noMore: true, page: 1 });
    return Promise.resolve();
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;
    this.setData({ activeTab: tab }, () => this.refreshList());
  },

  onKeywordInput(e) {
    this.setData({ keyword: (e.detail && e.detail.value) || '' });
  },

  onSearch() {
    this.refreshList();
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    const kind = e.currentTarget.dataset.kind;
    if (kind === 'course') {
      wx.showToast({ title: '课程详情待接入', icon: 'none' });
      return;
    }
    if (!id) {
      wx.showToast({ title: '缺少直播 id', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/webview/watch?id=' + encodeURIComponent(id),
    });
  },

  _reloadLive() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetchLive(1, true);
  },

  _loadMoreLive() {
    return this._fetchLive(this.data.page + 1, false);
  },

  /**
   * @param {number} page
   * @param {boolean} replace
   */
  _fetchLive(page, replace) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    return listWatchActivities({ page: page, pageSize: PAGE_SIZE })
      .then((data) => {
        const kw = (this.data.keyword || '').trim();
        let rows = ((data && data.list) || []).map((item) => this._toLiveView(item));
        if (kw) {
          rows = rows.filter(function (item) {
            return (item.title || '').indexOf(kw) !== -1;
          });
        }
        const list = replace ? rows : this.data.list.concat(rows);
        const rawLen = ((data && data.list) || []).length;
        const noMore = rawLen < PAGE_SIZE;
        this.setData({
          list: list,
          page: page,
          noMore: noMore,
        });
      })
      .catch(() => {
        /* toast 已在 request */
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  /**
   * @param {object} item
   * @returns {object}
   */
  _toLiveView(item) {
    const living = isLivingState(item.state);
    return {
      id: item.id,
      kind: 'live',
      title: item.title || '直播',
      cover: item.coverUrl || DEFAULT_COVER,
      coverTag: '直播',
      status: living ? 'living' : 'ended',
      statusText: watchStateLabel(item.state) || '已结束',
      time: item.startTime || '',
    };
  },
});
