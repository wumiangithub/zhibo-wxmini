const { getAccessToken } = require('../../../utils/auth');
const { getLessonOpenMode } = require('../../../config/env');
const {
  getLearningCourseDetail,
  NODE_CHAPTER,
  NODE_LESSON,
} = require('../../../api/live/learning');

/** 无封面占位 */
const DEFAULT_COVER = '/images/cover-live-1.png';
/** 子课程卡片外宽（rpx），含选中边框，与 wxss `.sub-card-wrap` 一致 */
const SUB_CARD_RPX = 528;
/** 子课程卡片间距（rpx） */
const SUB_GAP_RPX = 24;
/** 子课轨道左右内边距（rpx），与 wxss `.sub-track` 一致 */
const SUB_PAD_RPX = 56;

/**
 * 我的学习 · 课程详情：封面 / 目录 / 介绍。
 * 小节入口由 config/env `lessonOpenByKind` 按 contentKind 决定：native 原生页 / webview 嵌 H5。
 */
Page({
  data: {
    loading: true,
    loadError: '',
    activeTab: 'catalog',
    cover: DEFAULT_COVER,
    title: '',
    validityLabel: '',
    introduction: '',
    detailHtml: '',
    subCourses: [],
    selectedSubId: 0,
    hasSubCourses: false,
    catalogBlocks: [],
    collapsedChapterIds: {},
    subScrollLeft: 0,
    canScrollLeft: false,
    canScrollRight: false,
  },

  onLoad(query) {
    this._courseId = (query && query.id) || '';
    this._subScrollIndex = 0;
    this._subStepPx = rpxToPx(SUB_CARD_RPX + SUB_GAP_RPX);
    this._subCardPx = rpxToPx(SUB_CARD_RPX);
    this._subPadPx = rpxToPx(SUB_PAD_RPX);
    this._subViewportPx = 0;
  },

  onShow() {
    if (!getAccessToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (!this._courseId) {
      this.setData({ loading: false, loadError: '缺少课程 id' });
      return;
    }
    this._load();
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
  },

  onSelectSub(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    const index = (this.data.subCourses || []).findIndex(function (s) {
      return Number(s.id) === id;
    });
    if (index < 0) return;
    if (id !== this.data.selectedSubId) {
      const blocks = this._buildCatalogBlocks(
        this._nodes || [],
        id,
        this.data.collapsedChapterIds
      );
      this.setData({ selectedSubId: id, catalogBlocks: blocks });
    }
    this._scrollSubToIndex(index);
  },

  onSubScroll(e) {
    const left = (e.detail && e.detail.scrollLeft) || 0;
    this._subScrollIndex = this._indexFromScrollLeft(left);
    this._updateSubArrows(left);
  },

  onSubArrowLeft() {
    this._scrollSubBy(-1);
  },

  onSubArrowRight() {
    this._scrollSubBy(1);
  },

  /**
   * @param {number} delta 卡片步数，负左正右
   */
  _scrollSubBy(delta) {
    const count = (this.data.subCourses || []).length;
    if (count <= 1) return;
    let next = (this._subScrollIndex || 0) + delta;
    if (next < 0) next = 0;
    if (next > count - 1) next = count - 1;
    if (next === this._subScrollIndex) return;
    this._scrollSubToIndex(next);
  },

  /**
   * 把第 index 张子课卡片滚到视口中间。
   * @param {number} index
   */
  _scrollSubToIndex(index) {
    const count = (this.data.subCourses || []).length;
    if (count <= 0 || index < 0 || index >= count) return;
    const apply = () => {
      const left = this._centerScrollLeft(index);
      this._subScrollIndex = index;
      // 微信 scroll-left 同值不触发时，先微扰再设
      const cur = this.data.subScrollLeft || 0;
      if (Math.abs(cur - left) < 0.5) {
        this.setData({ subScrollLeft: left + 0.01 }, () => {
          this.setData({ subScrollLeft: left });
        });
      } else {
        this.setData({ subScrollLeft: left });
      }
      this._updateSubArrows(left);
    };
    if (this._subViewportPx > 0) {
      apply();
      return;
    }
    this._measureSubViewport(apply);
  },

  /**
   * @param {number} index
   * @returns {number}
   */
  _centerScrollLeft(index) {
    const count = (this.data.subCourses || []).length;
    const step = this._subStepPx || rpxToPx(SUB_CARD_RPX + SUB_GAP_RPX);
    const cardW = this._subCardPx || rpxToPx(SUB_CARD_RPX);
    const pad = this._subPadPx || rpxToPx(SUB_PAD_RPX);
    const viewport = this._subViewportPx || windowWidthPx();
    const cardCenter = pad + index * step + cardW / 2;
    let left = cardCenter - viewport / 2;
    const maxLeft = this._maxSubScrollLeft();
    if (left < 0) left = 0;
    if (left > maxLeft) left = maxLeft;
    return Math.round(left);
  },

  /** @returns {number} */
  _maxSubScrollLeft() {
    const count = (this.data.subCourses || []).length;
    if (count <= 0) return 0;
    const step = this._subStepPx || rpxToPx(SUB_CARD_RPX + SUB_GAP_RPX);
    const cardW = this._subCardPx || rpxToPx(SUB_CARD_RPX);
    const pad = this._subPadPx || rpxToPx(SUB_PAD_RPX);
    const viewport = this._subViewportPx || windowWidthPx();
    const contentW = pad * 2 + count * cardW + Math.max(0, count - 1) * (step - cardW);
    return Math.max(0, contentW - viewport);
  },

  /**
   * @param {number} left
   * @returns {number}
   */
  _indexFromScrollLeft(left) {
    const count = (this.data.subCourses || []).length;
    if (count <= 1) return 0;
    const step = this._subStepPx || 1;
    const cardW = this._subCardPx || rpxToPx(SUB_CARD_RPX);
    const pad = this._subPadPx || rpxToPx(SUB_PAD_RPX);
    const viewport = this._subViewportPx || windowWidthPx();
    const center = left + viewport / 2;
    let idx = Math.round((center - pad - cardW / 2) / step);
    if (idx < 0) idx = 0;
    if (idx > count - 1) idx = count - 1;
    return idx;
  },

  /**
   * @param {function} [done]
   */
  _measureSubViewport(done) {
    const query = wx.createSelectorQuery();
    query.select('.sub-scroll').boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (rect && rect.width) {
        this._subViewportPx = rect.width;
      } else {
        this._subViewportPx = windowWidthPx();
      }
      if (typeof done === 'function') done();
    });
  },

  /**
   * @param {number} left
   */
  _updateSubArrows(left) {
    const count = (this.data.subCourses || []).length;
    const maxLeft = this._maxSubScrollLeft();
    const x = left != null ? left : this.data.subScrollLeft || 0;
    this.setData({
      canScrollLeft: x > 2,
      canScrollRight: count > 1 && x < maxLeft - 2,
    });
  },

  onToggleChapter(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    const collapsed = Object.assign({}, this.data.collapsedChapterIds);
    collapsed[id] = !collapsed[id];
    const blocks = this._buildCatalogBlocks(
      this._nodes || [],
      this.data.selectedSubId,
      collapsed
    );
    this.setData({ collapsedChapterIds: collapsed, catalogBlocks: blocks });
  },

  onTapLesson(e) {
    const lessonId = e.currentTarget.dataset.id;
    if (!lessonId || !this._courseId) {
      wx.showToast({ title: '缺少小节信息', icon: 'none' });
      return;
    }
    const q =
      'courseId=' +
      encodeURIComponent(this._courseId) +
      '&lessonNodeId=' +
      encodeURIComponent(String(lessonId));
    const mode = getLessonOpenMode(e.currentTarget.dataset.kind);
    const path =
      mode === 'webview'
        ? '/pages/webview/course-lesson/course-lesson?'
        : '/pages/course/lesson/lesson?';
    wx.navigateTo({ url: path + q });
  },

  _load() {
    this.setData({ loading: true, loadError: '' });
    return getLearningCourseDetail(this._courseId)
      .then((detail) => {
        this._nodes = detail.nodes || [];
        const subs = detail.subCourses || [];
        const selectedSubId = subs.length ? Number(subs[0].id) : 0;
        const collapsed = {};
        const blocks = this._buildCatalogBlocks(this._nodes, selectedSubId, collapsed);
        this._subScrollIndex = 0;
        this.setData({
          loading: false,
          loadError: '',
          cover: detail.coverUrl || DEFAULT_COVER,
          title: detail.title || '课程',
          validityLabel: detail.validityLabel || '',
          introduction: detail.introduction || '',
          detailHtml: detail.detailHtml || '',
          subCourses: subs,
          hasSubCourses: subs.length > 0,
          selectedSubId: selectedSubId,
          collapsedChapterIds: collapsed,
          catalogBlocks: blocks,
          subScrollLeft: 0,
          canScrollLeft: false,
          canScrollRight: false,
        });
        if (detail.title) {
          wx.setNavigationBarTitle({ title: detail.title });
        }
        if (subs.length > 1) {
          setTimeout(() => {
            this._measureSubViewport(() => {
              this._updateSubArrows(0);
            });
          }, 50);
        }
      })
      .catch((err) => {
        const msg = (err && err.msg) || '加载失败';
        this.setData({
          loading: false,
          loadError: String(msg),
          catalogBlocks: [],
          canScrollLeft: false,
          canScrollRight: false,
        });
      });
  },

  /**
   * 按当前子课（或根 parentId=0）拼章节 + 小节展示块；章节默认展开。
   * @param {object[]} nodes
   * @param {number} parentContextId
   * @param {object} collapsedMap
   * @returns {object[]}
   */
  _buildCatalogBlocks(nodes, parentContextId, collapsedMap) {
    const list = Array.isArray(nodes) ? nodes : [];
    const children = list.filter(function (n) {
      return Number(n.parentId) === Number(parentContextId);
    });
    const blocks = [];
    let lessonSeq = 0;
    children.forEach(function (n) {
      if (n.nodeType === NODE_CHAPTER) {
        const chapterId = Number(n.id);
        const lessons = list
          .filter(function (c) {
            return (
              Number(c.parentId) === chapterId && c.nodeType === NODE_LESSON
            );
          })
          .map(function (lesson) {
            lessonSeq += 1;
            return formatLessonRow(lesson, lessonSeq);
          });
        blocks.push({
          type: 'chapter',
          id: chapterId,
          title: n.title || '章节',
          lessonCount: n.lessonCount != null ? Number(n.lessonCount) : lessons.length,
          expanded: !collapsedMap[chapterId],
          lessons: lessons,
        });
        return;
      }
      if (n.nodeType === NODE_LESSON) {
        lessonSeq += 1;
        blocks.push(
          Object.assign({ type: 'lesson' }, formatLessonRow(n, lessonSeq))
        );
      }
    });
    return blocks;
  },
});

/**
 * @param {number} rpx
 * @returns {number}
 */
function rpxToPx(rpx) {
  return (Number(rpx) * windowWidthPx()) / 750;
}

/** @returns {number} */
function windowWidthPx() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  return (info && info.windowWidth) || 375;
}

/**
 * @param {object} lesson
 * @param {number} seq
 * @returns {object}
 */
function formatLessonRow(lesson, seq) {
  const indexLabel = seq < 10 ? '0' + seq : String(seq);
  const kindLabel = lesson.contentKindLabel || '小节';
  const meta = lesson.metaLabel || '';
  const statusLabel = lesson.statusLabel || '未开始';
  const metaLine = meta
    ? kindLabel + ' | ' + meta + ' · ' + statusLabel
    : kindLabel + ' · ' + statusLabel;
  return {
    id: Number(lesson.id),
    indexLabel: indexLabel,
    title: lesson.title || '小节',
    contentKind: lesson.contentKind,
    contentId: lesson.contentId || '',
    participateStatus: lesson.participateStatus != null ? Number(lesson.participateStatus) : 0,
    statusLabel: statusLabel,
    metaLine: metaLine,
  };
}
