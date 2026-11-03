/**
 * 我的学习（需观众登录）。
 * GET /viewer/learning/lives — 仅 entitlement_status=1 的场次。
 * GET /viewer/learning/courses — 仅 course_user 有效权益的课程。
 * GET /viewer/learning/courses/detail/{courseId} — 有权益课程详情（含小节进度）。
 * GET /viewer/learning/courses/lessons/{courseId}/{lessonNodeId} — 小节内容（原生 / H5 共用）。
 * POST /watch/course/lessons/progress/{courseId} — 小节进度上报（D101）。
 */
const { request } = require('../../utils/request');
const { normalizeWatchItem } = require('./watch');

/** 目录节点：章节 */
const NODE_CHAPTER = 1;
/** 目录节点：子课程 */
const NODE_SUBCOURSE = 2;
/** 目录节点：小节 */
const NODE_LESSON = 3;

/** 小节内容：直播 */
const KIND_LIVE = 1;
/** 小节内容：图片 */
const KIND_IMAGE = 2;
/** 小节内容：视频 */
const KIND_VIDEO = 3;
/** 小节内容：文档 */
const KIND_DOCUMENT = 4;
/** 小节内容：文章 */
const KIND_ARTICLE = 5;

/** 参与状态：未开始 */
const STATUS_NOT_STARTED = 0;
/** 参与状态：进行中 */
const STATUS_IN_PROGRESS = 1;
/** 参与状态：已完成 */
const STATUS_COMPLETED = 2;

/**
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @param {number} [opts.state]
 * @returns {Promise<{total: number, list: object[]}>}
 */
function listLearningLives(opts) {
  const o = opts || {};
  const data = {
    page: o.page == null ? 1 : o.page,
    pageSize: o.pageSize == null ? 20 : o.pageSize,
  };
  if (o.state != null) data.state = o.state;
  return request({
    url: '/viewer/learning/lives',
    method: 'GET',
    data: data,
    auth: true,
  }).then((raw) => {
    const r = raw || {};
    const list = Array.isArray(r.list) ? r.list : [];
    return {
      total: r.total != null ? Number(r.total) : list.length,
      list: list.map(normalizeWatchItem),
    };
  });
}

/**
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @returns {Promise<{total: number, list: object[]}>}
 */
function listLearningCourses(opts) {
  const o = opts || {};
  return request({
    url: '/viewer/learning/courses',
    method: 'GET',
    data: {
      page: o.page == null ? 1 : o.page,
      pageSize: o.pageSize == null ? 20 : o.pageSize,
    },
    auth: true,
  }).then((raw) => {
    const r = raw || {};
    const list = Array.isArray(r.list) ? r.list : [];
    return {
      total: r.total != null ? Number(r.total) : list.length,
      list: list.map(normalizeLearningCourse),
    };
  });
}

/**
 * @param {object} item
 * @returns {object}
 */
function normalizeLearningCourse(item) {
  const r = item || {};
  return {
    id: r.id != null ? String(r.id) : '',
    title: r.title != null ? String(r.title) : '',
    coverUrl: r.coverUrl != null ? String(r.coverUrl) : '',
    subCourseCount: r.subCourseCount != null ? Number(r.subCourseCount) : 0,
    lessonCount: r.lessonCount != null ? Number(r.lessonCount) : 0,
    acquiredTime: r.acquiredTime != null ? String(r.acquiredTime) : '',
  };
}

/**
 * @param {string} courseId
 * @returns {Promise<object>}
 */
function getLearningCourseDetail(courseId) {
  const id = courseId != null ? String(courseId).trim() : '';
  if (!id) {
    return Promise.reject({ msg: '缺少课程 id' });
  }
  return request({
    url: '/viewer/learning/courses/detail/' + encodeURIComponent(id),
    method: 'GET',
    auth: true,
  }).then(normalizeLearningCourseDetail);
}

/**
 * @param {object} raw
 * @returns {object}
 */
function normalizeLearningCourseDetail(raw) {
  const r = raw || {};
  const subCourses = Array.isArray(r.subCourses)
    ? r.subCourses.map(normalizeSubCourse)
    : [];
  const nodes = Array.isArray(r.nodes) ? r.nodes.map(normalizeCatalogNode) : [];
  return {
    id: r.id != null ? String(r.id) : '',
    title: r.title != null ? String(r.title) : '',
    coverUrl: r.coverUrl != null ? String(r.coverUrl) : '',
    introduction: r.introduction != null ? String(r.introduction) : '',
    detailHtml: r.detailHtml != null ? String(r.detailHtml) : '',
    validityLabel: r.validityLabel != null ? String(r.validityLabel) : '',
    subCourses: subCourses,
    nodes: nodes,
  };
}

/**
 * @param {object} item
 * @returns {object}
 */
function normalizeSubCourse(item) {
  const r = item || {};
  return {
    id: r.id != null ? Number(r.id) : 0,
    title: r.title != null ? String(r.title) : '',
    coverUrl: r.coverUrl != null ? String(r.coverUrl) : '',
    lessonCount: r.lessonCount != null ? Number(r.lessonCount) : 0,
  };
}

/**
 * @param {object} item
 * @returns {object}
 */
function normalizeCatalogNode(item) {
  const r = item || {};
  const status =
    r.participateStatus != null ? Number(r.participateStatus) : STATUS_NOT_STARTED;
  return {
    id: r.id != null ? Number(r.id) : 0,
    parentId: r.parentId != null ? Number(r.parentId) : 0,
    nodeType: r.nodeType != null ? Number(r.nodeType) : 0,
    title: r.title != null ? String(r.title) : '',
    contentKind: r.contentKind != null ? Number(r.contentKind) : null,
    contentId: r.contentId != null ? String(r.contentId) : '',
    coverUrl: r.coverUrl != null ? String(r.coverUrl) : '',
    lessonCount: r.lessonCount != null ? Number(r.lessonCount) : 0,
    contentKindLabel:
      r.contentKindLabel != null ? String(r.contentKindLabel) : '',
    metaLabel: r.metaLabel != null ? String(r.metaLabel) : '',
    participateStatus: status,
    progressPercent: r.progressPercent != null ? Number(r.progressPercent) : 0,
    statusLabel: participateStatusLabel(status),
  };
}

/**
 * @param {number} status
 * @returns {string}
 */
function participateStatusLabel(status) {
  if (status === STATUS_COMPLETED) return '已完成';
  if (status === STATUS_IN_PROGRESS) return '学习中';
  return '未开始';
}

/**
 * GET /viewer/learning/courses/lessons/{courseId}/{lessonNodeId}
 * @param {string} courseId
 * @param {number|string} lessonNodeId
 * @returns {Promise<object>}
 */
function getLearningLessonContent(courseId, lessonNodeId) {
  const id = courseId != null ? String(courseId).trim() : '';
  const nid = Number(lessonNodeId);
  if (!id) {
    return Promise.reject({ msg: '缺少课程 id' });
  }
  if (!Number.isFinite(nid) || nid <= 0) {
    return Promise.reject({ msg: '缺少小节 id' });
  }
  return request({
    url:
      '/viewer/learning/courses/lessons/' +
      encodeURIComponent(id) +
      '/' +
      encodeURIComponent(String(nid)),
    method: 'GET',
    auth: true,
  }).then(normalizeLessonContent);
}

/**
 * @param {object} raw
 * @returns {object}
 */
function normalizeLessonContent(raw) {
  const r = raw || {};
  return {
    lessonNodeId: r.lessonNodeId != null ? Number(r.lessonNodeId) : 0,
    title: r.title != null ? String(r.title) : '',
    contentKind: r.contentKind != null ? Number(r.contentKind) : 0,
    contentId: r.contentId != null ? String(r.contentId) : '',
    participateStatus:
      r.participateStatus != null ? Number(r.participateStatus) : STATUS_NOT_STARTED,
    progressPercent: r.progressPercent != null ? Number(r.progressPercent) : 0,
    progressBarSec: r.progressBarSec != null ? Number(r.progressBarSec) : null,
    materialUrl: r.materialUrl != null ? String(r.materialUrl) : '',
    mimeType: r.mimeType != null ? String(r.mimeType) : '',
    materialName: r.materialName != null ? String(r.materialName) : '',
    articleHtml: r.articleHtml != null ? String(r.articleHtml) : '',
    author: r.author != null ? String(r.author) : '',
    activityId: r.activityId != null ? String(r.activityId) : '',
  };
}

/**
 * POST /watch/course/lessons/progress/{courseId}
 * @param {string} courseId
 * @param {object} body
 * @param {number} body.lessonNodeId
 * @param {'open'|'heartbeat'|'scroll_bottom'|'live_ended'} body.event
 * @param {number} [body.deltaLearnDurationSec]
 * @param {number} [body.progressBarSec]
 * @param {number} [body.progressPercent]
 * @returns {Promise<object>}
 */
function reportLessonProgress(courseId, body) {
  const id = courseId != null ? String(courseId).trim() : '';
  if (!id) {
    return Promise.reject({ msg: '缺少课程 id' });
  }
  const payload = body || {};
  return request({
    url: '/watch/course/lessons/progress/' + encodeURIComponent(id),
    method: 'POST',
    data: payload,
    auth: true,
    silent: true,
  }).then((raw) => {
    const r = raw || {};
    return {
      lessonNodeId: r.lessonNodeId != null ? Number(r.lessonNodeId) : 0,
      participateStatus:
        r.participateStatus != null ? Number(r.participateStatus) : STATUS_NOT_STARTED,
      learnDurationSec: r.learnDurationSec != null ? Number(r.learnDurationSec) : 0,
      progressBarSec: r.progressBarSec != null ? Number(r.progressBarSec) : null,
      progressPercent: r.progressPercent != null ? Number(r.progressPercent) : 0,
      completed: !!r.completed,
    };
  });
}

/**
 * 从文件名 / URL 取扩展名大写标签。
 * @param {string} fileNameOrUrl
 * @returns {string}
 */
function documentExtLabel(fileNameOrUrl) {
  const raw = String(fileNameOrUrl || '').split('?')[0] || '';
  const m = raw.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
}

module.exports = {
  listLearningLives,
  listLearningCourses,
  getLearningCourseDetail,
  getLearningLessonContent,
  reportLessonProgress,
  normalizeLearningCourse,
  normalizeLearningCourseDetail,
  normalizeLessonContent,
  participateStatusLabel,
  documentExtLabel,
  NODE_CHAPTER,
  NODE_SUBCOURSE,
  NODE_LESSON,
  KIND_LIVE,
  KIND_IMAGE,
  KIND_VIDEO,
  KIND_DOCUMENT,
  KIND_ARTICLE,
  STATUS_NOT_STARTED,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
};
