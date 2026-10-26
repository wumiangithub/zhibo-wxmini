const { getAccessToken, getViewerId, applyUser } = require('../../utils/auth');
const { getUserInfo } = require('../../api/live/auth');
const { updateProfile } = require('../../api/live/profile');
const { uploadAvatar } = require('../../utils/avatarUpload');
const {
  getProfile,
  saveProfile,
  fromUser,
  DEFAULT_AVATAR,
  NICK_MAX,
} = require('../../utils/profile');

/**
 * 选图只本地预览；点保存再 loading：先上传头像，再调资料接口。
 * 相册返回会再进 onShow，有待保存本地图时不要 _loadMe 冲掉预览。
 */
Page({
  data: {
    avatarUrl: DEFAULT_AVATAR,
    nickname: '',
    nickLen: 0,
    maxLen: NICK_MAX,
    saving: false,
  },

  onShow() {
    const access = getAccessToken();
    if (!access) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (this._pickingAvatar || this._pendingPath) {
      return;
    }
    this._loadMe();
  },

  _loadMe() {
    const cached = getProfile();
    this.setData({
      avatarUrl: cached.avatarUrl || DEFAULT_AVATAR,
      nickname: cached.nickname || '',
      nickLen: (cached.nickname || '').length,
    });
    this._viewerId = getViewerId() || '';
    this._pendingPath = '';
    this._pendingSize = 0;
    getUserInfo({ silent: true })
      .then((user) => {
        if (this._pickingAvatar || this._pendingPath) {
          return;
        }
        applyUser(user);
        const p = fromUser(user);
        const next = {
          nickname: p.nickname,
          nickLen: p.nickname.length,
        };
        if (p.avatarUrl && p.avatarUrl !== this.data.avatarUrl) {
          next.avatarUrl = p.avatarUrl;
        }
        this.setData(next);
        this._viewerId = (user && user.id) || getViewerId() || '';
      })
      .catch(() => {});
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
    if (this.data.saving) return;
    this._pickingAvatar = true;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this._pickingAvatar = false;
        const file = res.tempFiles && res.tempFiles[0];
        const path = file && file.tempFilePath;
        if (!path) return;
        this._pendingPath = path;
        this._pendingSize = (file && file.size) || 0;
        this.setData({ avatarUrl: path });
      },
      fail: () => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
            this._pickingAvatar = false;
            const path = res.tempFilePaths && res.tempFilePaths[0];
            if (!path) return;
            this._pendingPath = path;
            this._pendingSize = 0;
            this.setData({ avatarUrl: path });
          },
          fail: () => {
            this._pickingAvatar = false;
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
    wx.showLoading({ title: '保存中', mask: true });

    const afterOk = (user) => {
      if (user) applyUser(user);
      else saveProfile({ nickname: nickname });
      this._pendingPath = '';
      this._pendingSize = 0;
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

    const finish = () => {
      wx.hideLoading();
      this.setData({ saving: false });
    };

    const saveProfileOnly = () =>
      updateProfile({ nickname: nickname }).then(afterOk);

    const pendingPath = this._pendingPath;
    if (!pendingPath) {
      saveProfileOnly().catch(fail).then(finish);
      return;
    }

    // 先上传，成功再落库
    uploadAvatar({
      filePath: pendingPath,
      fileSize: this._pendingSize,
      viewerId: this._viewerId || getViewerId(),
      biz: 1,
    })
      .then((up) =>
        updateProfile({
          nickname: nickname,
          avatarUrl: up.url,
          avatarObjectKey: up.objectKey,
        })
      )
      .then(afterOk)
      .catch(fail)
      .then(finish);
  },
});
