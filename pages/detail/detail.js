const { getAccessToken } = require('../../utils/auth');
const { getDetailById } = require('../../utils/mockNews');

/**
 * 资讯详情（热点 / 大盘 / 行业卡片进入，样式 mock）。
 */
Page({
  data: {
    title: '',
    source: '',
    time: '',
    body: '',
  },

  /**
   * @param {object} options 路由参数，需含 id
   */
  onLoad(options) {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const id = (options && options.id) || '';
    const detail = getDetailById(id);
    if (!detail) {
      wx.showToast({ title: '内容不存在', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
      }, 500);
      return;
    }
    this.setData({
      title: detail.title,
      source: detail.source,
      time: detail.time,
      body: detail.body,
    });
  },
});
