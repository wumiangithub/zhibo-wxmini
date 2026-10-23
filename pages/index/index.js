const { getAccessToken, getPhoneMasked, clearSession } = require('../../utils/auth');

/**
 * 首页：登录后展示观众信息，支持退出登录。
 */
Page({
  data: {
    /** 页面展示名（优先脱敏手机号，否则「微信用户」） */
    displayName: '微信用户',
  },

  /**
   * 页面显示：无 token 则回登录页；有则刷新展示名。
   */
  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const phone = getPhoneMasked();
    this.setData({
      displayName: phone || '微信用户',
    });
  },

  /**
   * 退出登录：清会话并跳转登录页。
   */
  onLogout() {
    clearSession();
    wx.reLaunch({ url: '/pages/login/login' });
  },
});
