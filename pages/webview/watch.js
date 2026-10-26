const { getLiveWebBaseURL } = require('../../config/env');

/**
 * 嵌套观众端 H5（live-web）观看页：`{liveWebBaseURL}/watch/{id}`。
 * 业务域名须在公众平台配置；local 开发者工具勾选不校验合法域名。
 */
Page({
  data: {
    src: '',
  },

  onLoad(query) {
    const id = query && query.id ? String(query.id).trim() : '';
    if (!id) {
      wx.showToast({ title: '缺少直播 id', icon: 'none' });
      return;
    }
    const base = getLiveWebBaseURL();
    if (!base) {
      wx.showToast({ title: '未配置观众端地址', icon: 'none' });
      return;
    }
    const src = base + '/watch/' + encodeURIComponent(id);
    this.setData({ src: src });
    wx.setNavigationBarTitle({ title: '观看直播' });
  },
});
