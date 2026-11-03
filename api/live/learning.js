/**
 * 我的学习（需观众登录）。
 * GET /viewer/learning/lives — 仅 entitlement_status=1 的场次。
 * GET /viewer/learning/courses — 仅 course_user 有效权益的课程。
 * GET /viewer/learning/courses/detail/{courseId} — 有权益课程详情（含小节进度）。
 * GET /viewer/learning/courses/lessons/{courseId}/{lessonNodeId} — 小节内容（H5 用）。
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

module.exports = {
  listLearningLives,
  listLearningCourses,
  getLearningCourseDetail,
  normalizeLearningCourse,
  normalizeLearningCourseDetail,
  participateStatusLabel,
  NODE_CHAPTER,
  NODE_SUBCOURSE,
  NODE_LESSON,
  KIND_LIVE,
  STATUS_NOT_STARTED,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
};
