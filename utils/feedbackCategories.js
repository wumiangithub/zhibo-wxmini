/**
 * 意见反馈分类（与后端 ViewerFeedbackCategory / 契约一致）。
 */
const CATEGORIES = [
  { value: 1, label: '课程权益' },
  { value: 2, label: '视频播放' },
  { value: 3, label: '学习体验' },
  { value: 4, label: '其他' },
];

/**
 * @param {number} value
 * @returns {string}
 */
function labelOf(value) {
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].value === value) return CATEGORIES[i].label;
  }
  return '';
}

module.exports = {
  CATEGORIES,
  labelOf,
};
