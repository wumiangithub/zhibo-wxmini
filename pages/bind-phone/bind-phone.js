const { setPhoneMasked, getAccessToken } = require('../../utils/auth');

/**
 * 绑定手机号（样式 mock：本地校验 + 写入脱敏手机号）。
 */
Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    loading: false,
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },

  onUnload() {
    this._clearTimer();
  },

  onPhoneInput(e) {
    const phone = String((e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 11);
    this.setData({ phone });
  },

  onCodeInput(e) {
    const code = String((e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ code });
  },

  onGetCode() {
    if (this.data.countdown > 0) return;
    const phone = this.data.phone;
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    wx.showToast({ title: '验证码已发送', icon: 'none' });
    this.setData({ countdown: 60 });
    this._clearTimer();
    this._timer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        this._clearTimer();
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: next });
    }, 1000);
  },

  onBind() {
    if (this.data.loading) return;
    const { phone, code } = this.data;
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (!/^\d{4,6}$/.test(code)) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    const masked = phone.slice(0, 3) + '****' + phone.slice(7);
    setPhoneMasked(masked);
    setTimeout(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 400);
    }, 300);
  },

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },
});
