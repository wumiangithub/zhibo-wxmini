const {
  getAccessToken,
  getPhoneMasked,
  clearSession,
  applyUser,
} = require('../../utils/auth');
const { getUserInfo } = require('../../api/live/auth');
const {
  getProfile,
  clearProfile,
  fromUser,
  DEFAULT_AVATAR,
} = require('../../utils/profile');

/** 客服热线（原型展示；点击可拨打 / 展示） */
const HOTLINE = '4006-822-833';

/**
 * 「我的」页：资料以 getUserInfo 返回的 user 为准。
 */
Page({
  data: {
    displayName: '微信用户',
    phoneMasked: '未绑',
    avatarUrl: DEFAULT_AVATAR,
    hotline: HOTLINE,
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this._fillFromCache();
    this._loadMe();
  },

  _fillFromCache() {
    const phone = getPhoneMasked();
    const profile = getProfile();
    this.setData({
      displayName: profile.nickname || phone || '微信用户',
      phoneMasked: phone || '未绑',
      avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
    });
  },

  _loadMe() {
    getUserInfo({ silent: true })
      .then((user) => {
        applyUser(user);
        const phone = (user && user.phoneMasked) || getPhoneMasked();
        const p = fromUser(user);
        this.setData({
          displayName: p.nickname || phone || '微信用户',
          phoneMasked: phone || '未绑',
          avatarUrl: p.avatarUrl || DEFAULT_AVATAR,
        });
      })
      .catch(() => {
        this._fillFromCache();
      });
  },

  onTapProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  onTapOrders() {
    wx.showToast({ title: '全部订单待接入', icon: 'none' });
  },

  onTapLearning() {
    wx.navigateTo({ url: '/pages/learning/learning' });
  },

  onTapPhone() {
    wx.navigateTo({ url: '/pages/bind-phone/bind-phone' });
  },

  onTapAgreement() {
    wx.navigateTo({ url: '/pages/agreement/list/list' });
  },

  onTapFeedback() {
    wx.showToast({ title: '意见反馈待接入', icon: 'none' });
  },

  onTapHotline() {
    wx.makePhoneCall({
      phoneNumber: HOTLINE.replace(/-/g, ''),
      fail() {
        wx.showToast({ title: HOTLINE, icon: 'none' });
      },
    });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      confirmText: '退出',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
      success(res) {
        if (!res.confirm) {
          return;
        }
        clearSession();
        clearProfile();
        wx.reLaunch({ url: '/pages/login/login' });
      },
    });
  },
});