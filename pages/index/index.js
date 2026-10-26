const { getAccessToken } = require('../../utils/auth');
const { MOCK } = require('../../utils/mockNews');

/**
 * 资讯首页（原型样式 mock，接口未接）。
 */
Page({
  data: {
    tabs: [
      { key: 'live', label: '7X24' },
      { key: 'hot', label: '热点' },
      { key: 'market', label: '大盘' },
      { key: 'industry', label: '行业' },
    ],
    activeTab: 'live',
    liveDate: MOCK.liveDate,
    liveList: MOCK.live,
    cardList: MOCK.hot,
    /** 7X24 已展开条目 id -> true */
    expandedMap: {},
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
  },

  onSwitchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (!key || key === this.data.activeTab) return;
    const map = {
      live: MOCK.live,
      hot: MOCK.hot,
      market: MOCK.market,
      industry: MOCK.industry,
    };
    this.setData({
      activeTab: key,
      cardList: key === 'live' ? [] : map[key] || [],
      liveList: key === 'live' ? MOCK.live : this.data.liveList,
    });
  },

  /**
   * 7X24 卡片点击：折叠三行 / 完全展开 切换。
   * @param {WechatMiniprogram.TouchEvent} e
   */
  onToggleLive(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const expandedMap = Object.assign({}, this.data.expandedMap);
    expandedMap[id] = !expandedMap[id];
    this.setData({ expandedMap: expandedMap });
  },

  /**
   * 热点 / 大盘 / 行业卡片进入详情。
   * @param {WechatMiniprogram.TouchEvent} e
   */
  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + encodeURIComponent(id),
    });
  },
});
