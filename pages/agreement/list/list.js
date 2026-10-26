/**
 * 协议列表（样式 mock，条目对齐原型）。
 */
Page({
  data: {
    items: [
      { id: 'user', title: '服务协议', url: '/pages/agreement/user/user' },
      { id: 'privacy', title: '个人信息保护政策', url: '/pages/agreement/privacy/privacy' },
      { id: 'privacy-summary', title: '隐私政策摘要', stub: true },
      { id: 'collect', title: '个人信息收集清单', stub: true },
      { id: 'share', title: '个人信息共享清单', stub: true },
    ],
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.items || []).find((x) => x.id === id);
    if (!item) return;
    if (item.stub) {
      wx.navigateTo({
        url: '/pages/agreement/stub/stub?title=' + encodeURIComponent(item.title),
      });
      return;
    }
    wx.navigateTo({ url: item.url });
  },
});
