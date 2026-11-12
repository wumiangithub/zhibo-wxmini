const { getAccessToken } = require('../../utils/auth');
const { listLearningLives, listLearningCourses } = require('../../api/live/learning');
const { watchStateLabel, isLivingState } = require('../../api/live/watch');

/** 每页条数 */
const PAGE_SIZE = 20;
/** 无封面占位 */
const DEFAULT_COVER = '/images/cover-live-1.png';

/**
 * 我的学习：直播 / 课程 Tab 分别拉 learning/lives、learning/courses（仅有权益）。
 * 直播点进 web-view 嵌 live-web `/watch/:id`；课程进 course/detail。
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
    if (this.data.loading || this.data.noMore) return;
    if (this.data.activeTab === 'live') {
      this._loadMoreLive();
      return;
    }
    this._loadMoreCourse();
  },

  refreshList() {
    if (this.data.activeTab === 'course') {
      return this._reloadCourse();
    }
    return this._reloadLive();
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
    if (!id) {
      wx.showToast({
        title: kind === 'course' ? '缺少课程 id' : '缺少直播 id',
        icon: 'none',
      });
      return;
    }
    if (kind === 'course') {
      wx.navigateTo({
        url: '/pages/course/detail/detail?id=' + encodeURIComponent(id),
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/webview/watch/watch?id=' + encodeURIComponent(id),
    });
  },

  _reloadLive() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetchLive(1, true);
  },

  _loadMoreLive() {
    return this._fetchLive(this.data.page + 1, false);
  },

  _reloadCourse() {
    this.setData({ page: 1, noMore: false, list: [] });
    return this._fetchCourse(1, true);
  },

  _loadMoreCourse() {
    return this._fetchCourse(this.data.page + 1, false);
  },

  /**
   * @param {number} page
   * @param {boolean} replace
   */
  _fetchLive(page, replace) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    return listLearningLives({ page: page, pageSize: PAGE_SIZE })
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
        this.setData({
          list: list,
          page: page,
          noMore: rawLen < PAGE_SIZE,
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
   * @param {number} page
   * @param {boolean} replace
   */
  _fetchCourse(page, replace) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });
    return listLearningCourses({ page: page, pageSize: PAGE_SIZE })
      .then((data) => {
        const kw = (this.data.keyword || '').trim();
        let rows = ((data && data.list) || []).map((item) => this._toCourseView(item));
        if (kw) {
          rows = rows.filter(function (item) {
            return (item.title || '').indexOf(kw) !== -1;
          });
        }
        const list = replace ? rows : this.data.list.concat(rows);
        const rawLen = ((data && data.list) || []).length;
        this.setData({
          list: list,
          page: page,
          noMore: rawLen < PAGE_SIZE,
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

  /**
   * @param {object} item
   * @returns {object}
   */
  _toCourseView(item) {
    const sub = item.subCourseCount != null ? Number(item.subCourseCount) : 0;
    const lessons = item.lessonCount != null ? Number(item.lessonCount) : 0;
    return {
      id: item.id,
      kind: 'course',
      title: item.title || '课程',
      cover: item.coverUrl || DEFAULT_COVER,
      coverTag: '课程',
      subTitle: sub + '个子课程 ' + lessons + '小节',
      time: this._shortTime(item.acquiredTime),
    };
  },

  /**
   * @param {string} raw
   * @returns {string}
   */
  _shortTime(raw) {
    const s = raw != null ? String(raw).trim() : '';
    if (!s) return '';
    return s.length >= 16 ? s.slice(0, 16) : s;
  },
});
