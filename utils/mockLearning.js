/**
 * 我的学习假数据：只展示客户有权益的直播/课程（原型注）。
 */
const LIVE_LIST = [
  {
    id: 'lv1',
    title: '【钱坤大学·策略营 Day4】量价趋势研判',
    cover: '/images/cover-live-1.png',
    coverTag: '直播',
    status: 'living',
    statusText: '直播中',
    time: '2026-09-17 19:29:00',
  },
  {
    id: 'lv2',
    title: '【钱坤大学·策略营 Day3】盘面节奏与仓位管理',
    cover: '/images/cover-live-2.png',
    coverTag: '直播',
    status: 'ended',
    statusText: '已结束',
    time: '2026-09-16 19:30:00',
  },
  {
    id: 'lv3',
    title: '【钱坤大学·公开课】宏观节奏与资产配置入门',
    cover: '/images/cover-live-3.png',
    coverTag: '直播',
    status: 'ended',
    statusText: '已结束',
    time: '2026-09-12 20:00:00',
  },
];

const COURSE_LIST = [
  {
    id: 'cs1',
    title: '《AI擒龙主升浪》拓维班',
    cover: '/images/cover-course-1.png',
    coverTag: '直播',
    subTitle: '5个子课程 315小节',
    time: '2026-09-17 19:29',
  },
  {
    id: 'cs2',
    title: '聚焦抱团核心',
    cover: '/images/cover-course-2.png',
    coverTag: '课程',
    subTitle: '4个子课程 15小节',
    time: '2026-09-16 19:29',
  },
];

/**
 * @param {'live'|'course'} tab
 * @param {string} keyword
 */
function filterLearning(tab, keyword) {
  const list = tab === 'course' ? COURSE_LIST : LIVE_LIST;
  const kw = (keyword || '').trim();
  if (!kw) return list.slice();
  return list.filter(function (item) {
    return (item.title || '').indexOf(kw) !== -1;
  });
}

module.exports = {
  LIVE_LIST,
  COURSE_LIST,
  filterLearning,
};
