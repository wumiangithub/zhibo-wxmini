const { getAccessToken, getViewerId, applyUser } = require('../../utils/auth');
const { request } = require('../../utils/request');
const { uploadAvatar, getAvatarUploadMode } = require('../../utils/avatarUpload');
const {
  getProfile,
  saveProfile,
  fromUser,
  DEFAULT_AVATAR,
  NICK_MAX,
} = require('../../utils/profile');

/**
 * 个人信息：接 T36 昵称 / 头像接口；头像按 env.avatarUploadMode 双通道。
 */
Page({
  data: {
    avatarUrl: DEFAULT_AVATAR,
    nickname: '',
    nickLen: 0,
    maxLen: NICK_MAX,
    saving: false,
    /** 新选本地头像临时路径；空表示未改头像 */
    pendingPath: '',
    pendingSize: 0,
    viewerId: '',
    uploadMode: 'proxy',
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ uploadMode: getAvatarUploadMode() });
    this._loadMe();
  },

  /**
   * 拉取 /me，以服务端 user 为准回填。
   */
  _loadMe() {
    const cached = getProfile();
    this.setData({
      avatarUrl: cached.avatarUrl || DEFAULT_AVATAR,
      nickname: cached.nickname || '',
      nickLen: (cached.nickname || '').length,
      viewerId: getViewerId() || '',
      pendingPath: '',
      pendingSize: 0,
    });
    request({
      url: '/api/v1/viewer/auth/me',
      method: 'GET',
      silent: true,
    })
      .then((user) => {
        applyUser(user);
        const p = fromUser(user);
        this.setData({
          avatarUrl: p.avatarUrl,
          nickname: p.nickname,
          nickLen: p.nickname.length,
          viewerId: (user && user.id) || getViewerId() || '',
        });
      })
      .catch(() => {
        /* 用本地缓存展示即可 */
      });
  },

  onNickInput(e) {
    let nickname = (e.detail && e.detail.value) || '';
    if (nickname.length > NICK_MAX) nickname = nickname.slice(0, NICK_MAX);
    this.setData({ nickname: nickname, nickLen: nickname.length });
  },

  onNickBlur(e) {
    let nickname = ((e.detail && e.detail.value) || '').trim();
    if (nickname.length > NICK_MAX) nickname = nickname.slice(0, NICK_MAX);
    this.setData({ nickname: nickname, nickLen: nickname.length });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        const path = file && file.tempFilePath;
        if (!path) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }
        this.setData({
          avatarUrl: path,
          pendingPath: path,
          pendingSize: (file && file.size) || 0,
        });
      },
      fail: () => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
            const path = res.tempFilePaths && res.tempFilePaths[0];
            if (!path) return;
            this.setData({
              avatarUrl: path,
              pendingPath: path,
              pendingSize: 0,
            });
          },
        });
      },
    });
  },

  onSave() {
    if (this.data.saving) return;
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (nickname.length > NICK_MAX) {
      wx.showToast({ title: '昵称最多' + NICK_MAX + '字', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    const pendingPath = this.data.pendingPath;
    const mode = getAvatarUploadMode();

    const afterOk = (user) => {
      if (user) applyUser(user);
      else saveProfile({ nickname: nickname });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/mine/mine' }),
        });
      }, 400);
    };

    const fail = (err) => {
      const msg = (err && (err.msg || err.errMsg)) || '保存失败';
      wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
    };

    const finish = () => this.setData({ saving: false });

    // 未改头像：只更新昵称
    if (!pendingPath) {
      request({
        url: '/api/v1/viewer/profile/update',
        method: 'PUT',
        data: { nickname: nickname },
      })
        .then(afterOk)
        .catch(fail)
        .then(finish);
      return;
    }

    // 改了头像
    uploadAvatar({
      filePath: pendingPath,
      fileSize: this.data.pendingSize,
      viewerId: this.data.viewerId || getViewerId(),
    })
      .then((up) => {
        if (mode === 'proxy' || up.mode === 'proxy') {
          // proxy 已写库头像；保存时只提交昵称
          return request({
            url: '/api/v1/viewer/profile/update',
            method: 'PUT',
            data: { nickname: nickname },
          }).then((user) => {
            // 若 update 未带回 avatar，用 upload 返回的
            if (user && !user.avatarUrl && up.avatarUrl) {
              user.avatarUrl = up.avatarUrl;
            }
            if (up.user) applyUser(up.user);
            return user || up.user;
          });
        }
        // direct：必须带 avatarUrl
        return request({
          url: '/api/v1/viewer/profile/update',
          method: 'PUT',
          data: {
            nickname: nickname,
            avatarUrl: up.avatarUrl,
          },
        });
      })
      .then(afterOk)
      .catch(fail)
      .then(finish);
  },
});
