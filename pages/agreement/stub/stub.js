/**
 * 协议占位详情：标题由 query.title 传入。
 */
Page({
  onLoad(query) {
    const title = (query && query.title) ? decodeURIComponent(query.title) : '协议';
    wx.setNavigationBarTitle({ title });
  },
});
