const { getAccessToken } = require('../../utils/auth');
const { filterLearning } = require('../../utils/mockLearning');

/**
 * 我的学习：直播 / 课程列表（仅权益内容，样式 mock）。
 */
Page({
  data: {
    activeTab: 'live',
    keyword: '',
    list: [],
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.refreshList();
  },

  refreshList() {
    const list = filterLearning(this.data.activeTab, this.data.keyword);
    this.setData({ list: list });
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

  onTapItem() {
    wx.showToast({ title: '详情待接入', icon: 'none' });
  },
});
