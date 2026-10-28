const { devPhoneLogin } = require('../../api/live/auth');
const { CURRENT_ENV } = require('../../config/env');
const { saveSession } = require('../../utils/auth');

/**
 * 仅 local：明文手机号登录 / 自动注册（开发造号）。
 * test / prod 进入本页会立刻退回登录页。
 */
Page({
  data: {
    phone: '',
    loading: false,
  },

  onShow() {
    if (CURRENT_ENV !== 'local') {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },

  /**
   * @param {WechatMiniprogram.Input} e
   */
  onPhoneInput(e) {
    const phone = String((e.detail && e.detail.value) || '')
      .replace(/\D/g, '')
      .slice(0, 11);
    this.setData({ phone });
  },

  onLogin() {
    if (this.data.loading) {
      return;
    }
    if (CURRENT_ENV !== 'local') {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const phone = this.data.phone;
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    wx.showLoading({ title: '登录中', mask: true });
    devPhoneLogin({ phone: phone, agreed: true })
      .then((data) => {
        saveSession(data);
        wx.reLaunch({ url: '/pages/index/index' });
      })
      .catch(() => {})
      .then(() => {
        wx.hideLoading();
        this.setData({ loading: false });
      });
  },
});
