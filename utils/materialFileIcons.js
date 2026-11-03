/**
 * 文档类型图标（对齐 live-web materialFileIcons / admin folderIco）。
 * 本地 SVG：/images/folderIco/*.svg
 */

var FOLDER_ICO = '/images/folderIco/';

var EXT_ICON = {
  pdf: FOLDER_ICO + 'pdf.svg',
  doc: FOLDER_ICO + 'doc.svg',
  docx: FOLDER_ICO + 'doc.svg',
  xls: FOLDER_ICO + 'xls.svg',
  xlsx: FOLDER_ICO + 'xls.svg',
  xlsm: FOLDER_ICO + 'xls.svg',
  csv: FOLDER_ICO + 'text.svg',
  txt: FOLDER_ICO + 'text.svg',
  vtt: FOLDER_ICO + 'text.svg',
  ppt: FOLDER_ICO + 'ppt.svg',
  pptx: FOLDER_ICO + 'ppt.svg',
  zip: FOLDER_ICO + 'zip.svg',
  text: FOLDER_ICO + 'text.svg',
  folder: FOLDER_ICO + 'folder.svg',
  /** 富文本文章素材（非文件扩展名；调用 getMaterialFileIcon('article')） */
  article: FOLDER_ICO + 'article.svg',
};

var FOLDER_FALLBACK = EXT_ICON.folder;

/**
 * 按文件名扩展名取本地图标路径；也支持裸名键（如 `article`）；未知回落 folder。
 * @param {string} filename
 * @returns {string}
 */
function getMaterialFileIcon(filename) {
  var key = String(filename || '')
    .trim()
    .toLowerCase()
    .split('?')[0]
    .split('#')[0];
  if (EXT_ICON[key]) return EXT_ICON[key];
  var i = key.lastIndexOf('.');
  var ext = i >= 0 ? key.slice(i + 1) : '';
  return EXT_ICON[ext] || FOLDER_FALLBACK;
}

module.exports = {
  getMaterialFileIcon,
};
