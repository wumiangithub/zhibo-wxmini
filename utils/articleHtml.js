/**
 * 小程序 <rich-text> 几乎不吃外层 wxss；编辑器写入的固定宽高 img/table
 * 会撑破屏宽被裁切。绑定前做轻量 HTML 改写（无新依赖）。
 */

var IMG_FIT_STYLE = 'max-width:100%;height:auto;display:block;';
var TABLE_FIT_STYLE = 'max-width:100%;overflow:auto;display:block;';

/**
 * @param {string} style
 * @param {string[]} dropProps 要去掉的 CSS 属性名（小写）
 * @returns {string}
 */
function stripStyleProps(style, dropProps) {
  var parts = String(style || '').split(';');
  var kept = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (!part) continue;
    var colon = part.indexOf(':');
    var prop = (colon >= 0 ? part.slice(0, colon) : part).trim().toLowerCase();
    var drop = false;
    for (var j = 0; j < dropProps.length; j++) {
      if (prop === dropProps[j]) {
        drop = true;
        break;
      }
    }
    if (!drop) kept.push(part);
  }
  return kept.join(';');
}

/**
 * @param {string} tag 完整开标签
 * @param {string} fitStyle 要注入的适配样式
 * @param {string[]} dropStyleProps
 * @returns {string}
 */
function injectFitStyle(tag, fitStyle, dropStyleProps) {
  var out = tag;
  if (/\sstyle\s*=/i.test(out)) {
    out = out.replace(/\sstyle\s*=\s*(['"])([\s\S]*?)\1/i, function (_m, q, style) {
      var cleaned = stripStyleProps(style, dropStyleProps);
      var merged = fitStyle + (cleaned ? cleaned + (/;$/.test(cleaned) ? '' : ';') : '');
      return ' style=' + q + merged + q;
    });
  } else {
    out = out.replace(/\s*\/?>$/i, function (close) {
      return ' style="' + fitStyle + '"' + close;
    });
  }
  return out;
}

/**
 * 去掉标签上的 width / height 属性（保留其它属性）。
 * @param {string} tag
 * @returns {string}
 */
function stripWidthHeightAttrs(tag) {
  return tag
    .replace(/\s+width\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
    .replace(/\s+height\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');
}

/**
 * 规范化文章 HTML，使宽图/表格在小程序 rich-text 内可适配屏宽。
 * @param {string} html
 * @returns {string}
 */
function normalizeArticleHtml(html) {
  if (html == null) return '';
  var out = String(html);
  if (!out) return '';

  out = out.replace(/<img\b[^>]*>/gi, function (tag) {
    var t = stripWidthHeightAttrs(tag);
    return injectFitStyle(t, IMG_FIT_STYLE, [
      'width',
      'height',
      'max-width',
      'min-width',
    ]);
  });

  out = out.replace(/<table\b[^>]*>/gi, function (tag) {
    var t = stripWidthHeightAttrs(tag);
    return injectFitStyle(t, TABLE_FIT_STYLE, [
      'width',
      'max-width',
      'min-width',
    ]);
  });

  return out;
}

module.exports = {
  normalizeArticleHtml: normalizeArticleHtml,
};
