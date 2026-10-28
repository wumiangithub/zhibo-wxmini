const { getUserInfo, phoneLogin, wechatLogin } = require('../../api/live/auth');
const { CURRENT_ENV } = require('../../config/env');
const {
  getAccessToken,
  getPhoneMasked,
  saveSession,
} = require('../../utils/auth');

/**
 * 登录页：协议勾选、手机号授权登录、微信登录；已登录则跳转首页。
 * local 额外展示「其他登录方式」→ 明文手机号造号页。
 */
Page({
  data: {
    /** 是否已勾选用户协议与隐私协议 */
    agreed: false,
    /** 登录请求进行中，防止重复点击 */
    loading: false,
    /** 本地缓存的脱敏手机号（展示用） */
    phoneMasked: '',
    /** 是否展示开发用「其他登录方式」（仅 local） */
    showDevLogin: CURRENT_ENV === 'local',
  },

  /**
   * 页面显示：同步脱敏手机号；若有 access 则调 getUserInfo 校验，成功则进首页。
   */
  onShow() {
    const phoneMasked = getPhoneMasked();
    this.setData({
      phoneMasked: phoneMasked || '',
      showDevLogin: CURRENT_ENV === 'local',
    });

    const access = getAccessToken();
    if (!access) {
      return;
    }
    getUserInfo({ silent: true })
      .then(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      })
      .catch(() => {
        /* 401 刷新失败会清票并留在/回到登录页 */
      });
  },

  /**
   * 切换「已阅读并同意协议」勾选状态。
   */
  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  /**
   * 打开协议页；data-type 为 privacy 进隐私协议，否则进用户协议。
   * @param {WechatMiniprogram.TouchEvent} e
   */
  onOpenAgreement(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'privacy') {
      wx.navigateTo({ url: '/pages/agreement/privacy/privacy' });
      return;
    }
    wx.navigateTo({ url: '/pages/agreement/user/user' });
  },

  /**
   * 未勾选协议时点击登录的提示。
   */
  onTapNeedAgree() {
    wx.showToast({
      title: '请先阅读并同意用户协议和隐私协议',
      icon: 'none',
    });
  },

  /**
   * 其他登录方式（仅 local）：须已勾选协议，再进明文手机号页。
   */
  onOtherLogin() {
    if (CURRENT_ENV !== 'local') {
      return;
    }
    if (!this.data.agreed) {
      this.onTapNeedAgree();
      return;
    }
    wx.navigateTo({ url: '/pages/dev-phone-login/dev-phone-login' });
  },

  /**
   * 手机号快速验证回调：拿 phoneCode + wx.login code 调 phoneLogin。
   * @param {WechatMiniprogram.ButtonGetPhoneNumber} e
   */
  onGetPhoneNumber(e) {
    if (this.data.loading) {
      return;
    }
    if (!this.data.agreed) {
      this.onTapNeedAgree();
      return;
    }
    const detail = (e && e.detail) || {};
    const errMsg = detail.errMsg || '';
    if (!detail.code || errMsg.indexOf('ok') === -1) {
      wx.showToast({
        title: '需要授权手机号才能登录',
        icon: 'none',
      });
      return;
    }
    this.setData({ loading: true });
    wx.showLoading({ title: "登录中", mask: true });
    this._wxLogin()
      .then((loginCode) =>
        phoneLogin({
          loginCode: loginCode,
          phoneCode: detail.code,
          agreed: true,
        })
      )
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

  /**
   * 微信登录（仅 code，不强制手机号）：调 wechatLogin 后进首页。
   */
  onWechatLogin() {
    if (this.data.loading) {
      return;
    }
    if (!this.data.agreed) {
      this.onTapNeedAgree();
      return;
    }
    this.setData({ loading: true });
    wx.showLoading({ title: "登录中", mask: true });
    this._wxLogin()
      .then((code) =>
        wechatLogin({
          code: code,
          agreed: true,
        })
      )
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

  /**
   * 封装 wx.login，成功 resolve code，失败 Toast 并 reject。
   * @returns {Promise<string>}
   */
  _wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success(res) {
          if (res && res.code) {
            resolve(res.code);
            return;
          }
          wx.showToast({
            title: '微信授权失败，请重试',
            icon: 'none',
          });
          reject(new Error('wx.login empty code'));
        },
        fail() {
          wx.showToast({
            title: '微信授权失败，请重试',
            icon: 'none',
          });
          reject(new Error('wx.login fail'));
        },
      });
    });
  },
});