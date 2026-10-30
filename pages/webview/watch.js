const { getAccessToken, getViewerId } = require('../../utils/auth');
const { displayNickname } = require('../../utils/displayNickname');
const { getLiveWebBaseURL } = require('../../config/env');

/**
 * 嵌套观众端 H5（live-web）观看页：
 * `{liveWebBaseURL}/watch/{id}?viewerId=…&nickname=…&viewerAccessToken=…`（及既有 invite `c=` 等）。
 * 身份 / JWT / 展示昵称靠 query 传给 H5（不 postMessage；H5 落 localStorage 后可调 replay/start）。
 * 业务域名须在公众平台配置；local 开发者工具勾选不校验合法域名。
 */
Page({
  data: {
    src: '',
  },

  onLoad(query) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
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

    const pairs = [];
    Object.keys(query || {}).forEach((key) => {
      if (
        key === 'id' ||
        key === 'viewerId' ||
        key === 'nickname' ||
        key === 'viewerAccessToken' ||
        key === 'accessToken'
      ) {
        return;
      }
      const raw = query[key];
      if (raw == null || raw === '') return;
      pairs.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(String(raw))
      );
    });

    const viewerId = getViewerId();
    const n = Number(viewerId);
    if (Number.isInteger(n) && n > 0) {
      pairs.push('viewerId=' + encodeURIComponent(String(n)));
      const nick = displayNickname();
      if (nick) {
        pairs.push('nickname=' + encodeURIComponent(nick));
      }
    }
    // H5 与小程序 storage 隔离；回放统计等需 Authorization 的接口依赖此注入
    pairs.push(
      'viewerAccessToken=' + encodeURIComponent(String(accessToken))
    );

    let src = base + '/watch/' + encodeURIComponent(id);
    if (pairs.length) {
      src += '?' + pairs.join('&');
    }
    this.setData({ src: src });
    wx.setNavigationBarTitle({ title: '观看直播' });
  },
});
