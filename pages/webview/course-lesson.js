const { getAccessToken, getViewerId } = require('../../utils/auth');
const { displayNickname } = require('../../utils/displayNickname');
const { getLiveWebBaseURL } = require('../../config/env');

/**
 * 嵌套 live-web 课程小节页：
 * `{liveWebBaseURL}/course/{courseId}/lesson/{lessonNodeId}?viewerId&nickname&viewerAccessToken`
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
    const courseId = query && query.courseId ? String(query.courseId).trim() : '';
    const lessonNodeId =
      query && query.lessonNodeId != null ? String(query.lessonNodeId).trim() : '';
    if (!courseId || !lessonNodeId) {
      wx.showToast({ title: '缺少课程或小节', icon: 'none' });
      return;
    }
    const base = getLiveWebBaseURL();
    if (!base) {
      wx.showToast({ title: '未配置观众端地址', icon: 'none' });
      return;
    }

    const pairs = [];
    const viewerId = getViewerId();
    const n = Number(viewerId);
    if (Number.isInteger(n) && n > 0) {
      pairs.push('viewerId=' + encodeURIComponent(String(n)));
      const nick = displayNickname();
      if (nick) {
        pairs.push('nickname=' + encodeURIComponent(nick));
      }
    }
    pairs.push('viewerAccessToken=' + encodeURIComponent(String(accessToken)));

    let src =
      base +
      '/course/' +
      encodeURIComponent(courseId) +
      '/lesson/' +
      encodeURIComponent(lessonNodeId);
    src += '?' + pairs.join('&');
    this.setData({ src: src });
  },
});
