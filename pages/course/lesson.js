const { getAccessToken } = require('../../utils/auth');
const { getMaterialFileIcon } = require('../../utils/materialFileIcons');
const { normalizeArticleHtml } = require('../../utils/articleHtml');
const {
  getLearningLessonContent,
  reportLessonProgress,
  documentExtLabel,
  KIND_LIVE,
  KIND_IMAGE,
  KIND_VIDEO,
  KIND_DOCUMENT,
  KIND_ARTICLE,
} = require('../../api/live/learning');

/**
 * 原生课程小节页（图 / 视频 / 文档 / 文章）。
 * 直播 kind=1 上报 open 后跳转 pages/webview/watch。
 * 与 live-web CourseLessonView 进度口径对齐（D101）。
 */
Page({
  data: {
    loading: true,
    loadError: '',
    title: '',
    contentKind: 0,
    isImage: false,
    isVideo: false,
    isDocument: false,
    isArticle: false,
    materialUrl: '',
    materialName: '',
    docFileName: '',
    docExtLabel: 'FILE',
    docIconSrc: '/images/folderIco/folder.svg',
    articleTitle: '',
    author: '',
    articleHtml: '',
  },

  onLoad(query) {
    this._courseId = query && query.courseId ? String(query.courseId).trim() : '';
    this._lessonNodeId = Number(query && query.lessonNodeId);
    this._scrolledBottom = false;
    this._videoLastSec = 0;
    this._videoReportTimer = null;
    this._heartbeatTimer = null;
    this._openReported = false;
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (!this._courseId || !Number.isFinite(this._lessonNodeId) || this._lessonNodeId <= 0) {
      this.setData({ loading: false, loadError: '小节链接无效' });
      return;
    }
    if (!this._loadedOnce) {
      this._load();
      return;
    }
    // 从文件打开页返回时恢复视频心跳
    if (this.data.isVideo && !this._heartbeatTimer) {
      this._heartbeatTimer = setInterval(() => {
        this._report('heartbeat', { deltaLearnDurationSec: 15 });
      }, 15000);
    }
  },

  onUnload() {
    this._clearTimers();
  },

  onHide() {
    // 离开页停心跳，避免后台空转
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  },

  _clearTimers() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._videoReportTimer) {
      clearTimeout(this._videoReportTimer);
      this._videoReportTimer = null;
    }
  },

  /**
   * @param {'open'|'heartbeat'|'scroll_bottom'|'live_ended'} event
   * @param {object} [extra]
   */
  _report(event, extra) {
    if (!this._courseId || !Number.isFinite(this._lessonNodeId) || this._lessonNodeId <= 0) {
      return Promise.resolve();
    }
    const body = Object.assign(
      {
        lessonNodeId: this._lessonNodeId,
        event: event,
      },
      extra || {}
    );
    return reportLessonProgress(this._courseId, body).catch(function () {
      /* 上报失败不打断阅读 */
    });
  },

  _load() {
    this.setData({ loading: true, loadError: '' });
    this._clearTimers();
    this._scrolledBottom = false;
    this._videoLastSec = 0;
    return getLearningLessonContent(this._courseId, this._lessonNodeId)
      .then((lesson) => {
        this._loadedOnce = true;
        const kind = lesson.contentKind;
        if (kind === KIND_LIVE) {
          const activityId = (lesson.activityId || lesson.contentId || '').trim();
          if (!activityId) {
            this.setData({ loading: false, loadError: '直播未绑定' });
            return;
          }
          return this._report('open').then(() => {
            wx.redirectTo({
              url:
                '/pages/webview/watch?id=' +
                encodeURIComponent(activityId) +
                '&courseId=' +
                encodeURIComponent(this._courseId) +
                '&lessonNodeId=' +
                encodeURIComponent(String(this._lessonNodeId)),
            });
          });
        }

        const docName =
          (lesson.materialName || lesson.title || '文档').trim() || '文档';
        const articleTitle =
          (lesson.materialName || lesson.title || '文章').trim() || '文章';
        const iconSource =
          lesson.materialName || lesson.title || lesson.materialUrl || '';
        this.setData({
          loading: false,
          loadError: '',
          title: lesson.title || '小节',
          contentKind: kind,
          isImage: kind === KIND_IMAGE,
          isVideo: kind === KIND_VIDEO,
          isDocument: kind === KIND_DOCUMENT,
          isArticle: kind === KIND_ARTICLE,
          materialUrl: lesson.materialUrl || '',
          materialName: lesson.materialName || '',
          docFileName: docName,
          docExtLabel: documentExtLabel(docName || lesson.materialUrl),
          docIconSrc: getMaterialFileIcon(iconSource),
          articleTitle: articleTitle,
          author: lesson.author || '',
          // rich-text 不吃外层 wxss；绑定前去掉固定宽高并注入 max-width:100%
          articleHtml: normalizeArticleHtml(lesson.articleHtml || ''),
        });
        wx.setNavigationBarTitle({
          title: kind === KIND_ARTICLE ? articleTitle : lesson.title || '小节',
        });

        return this._report('open').then(() => {
          this._openReported = true;
          if (kind === KIND_VIDEO) {
            this._heartbeatTimer = setInterval(() => {
              this._report('heartbeat', { deltaLearnDurationSec: 15 });
            }, 15000);
          }
          if (kind === KIND_ARTICLE) {
            // 短文首屏已到底时补一次
            setTimeout(() => this._checkArticleBottom(), 300);
          }
        });
      })
      .catch((err) => {
        const msg = (err && err.msg) || '加载失败';
        this.setData({ loading: false, loadError: String(msg) });
      });
  },

  onPreviewImage() {
    const url = this.data.materialUrl;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  onDownloadImage() {
    const url = this.data.materialUrl;
    if (!url) return;
    wx.navigateTo({
      url:
        '/pages/file/open?url=' +
        encodeURIComponent(url) +
        '&name=' +
        encodeURIComponent(this.data.materialName || this.data.title || '图片') +
        '&mode=download',
    });
  },

  onOpenDocument(e) {
    const mode =
      e && e.currentTarget && e.currentTarget.dataset
        ? e.currentTarget.dataset.mode
        : 'preview';
    const url = this.data.materialUrl;
    if (!url) return;
    const openMode = mode === 'download' ? 'download' : 'preview';
    wx.navigateTo({
      url:
        '/pages/file/open?url=' +
        encodeURIComponent(url) +
        '&name=' +
        encodeURIComponent(this.data.docFileName || '文档') +
        '&mode=' +
        encodeURIComponent(openMode),
      success: () => {
        if (openMode === 'preview' && !this._scrolledBottom) {
          this._scrolledBottom = true;
          this._report('scroll_bottom');
        }
      },
    });
  },

  onVideoTimeUpdate(e) {
    const detail = (e && e.detail) || {};
    const currentTime = Number(detail.currentTime) || 0;
    const duration = Number(detail.duration) || 0;
    if (!duration || !Number.isFinite(duration)) return;
    const sec = Math.floor(currentTime);
    const pct = Math.min(100, Math.round((currentTime / duration) * 100));
    const delta = Math.max(0, sec - this._videoLastSec);
    this._videoLastSec = sec;
    if (this._videoReportTimer) return;
    this._videoReportTimer = setTimeout(() => {
      this._videoReportTimer = null;
      this._report('heartbeat', {
        deltaLearnDurationSec: delta || undefined,
        progressBarSec: sec,
        progressPercent: pct,
      });
    }, 2000);
  },

  onVideoEnded(e) {
    const detail = (e && e.detail) || {};
    const duration = Number(detail.duration) || this._videoLastSec || 0;
    const sec = Math.floor(duration);
    this._report('heartbeat', {
      progressBarSec: sec,
      progressPercent: 100,
    });
  },

  onArticleScroll(e) {
    const detail = (e && e.detail) || {};
    const scrollHeight = Number(detail.scrollHeight) || 0;
    const scrollTop = Number(detail.scrollTop) || 0;
    if (!this._articleViewportH) {
      const q = wx.createSelectorQuery().in(this);
      q.select('.article-scroll').boundingClientRect();
      q.exec((res) => {
        const rect = res && res[0];
        if (rect && rect.height) {
          this._articleViewportH = rect.height;
          this._checkScrollBottom(scrollHeight, scrollTop, rect.height);
        }
      });
      return;
    }
    this._checkScrollBottom(scrollHeight, scrollTop, this._articleViewportH);
  },

  _checkArticleBottom() {
    const q = wx.createSelectorQuery().in(this);
    q.select('.article-scroll').boundingClientRect();
    q.select('.article-scroll').scrollOffset();
    q.exec((res) => {
      const rect = res && res[0];
      const offset = res && res[1];
      if (!rect || !offset) return;
      this._articleViewportH = rect.height;
      this._checkScrollBottom(
        offset.scrollHeight,
        offset.scrollTop,
        rect.height
      );
    });
  },

  /**
   * @param {number} scrollHeight
   * @param {number} scrollTop
   * @param {number} clientHeight
   */
  _checkScrollBottom(scrollHeight, scrollTop, clientHeight) {
    if (this._scrolledBottom) return;
    const remain = scrollHeight - scrollTop - clientHeight;
    if (remain <= 48) {
      this._scrolledBottom = true;
      this._report('scroll_bottom');
    }
  },
});
