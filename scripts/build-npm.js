/**
 * 把 @volcengine/tos-sdk 的 miniprogram_dist 拷到 miniprogram_npm，
 * 等价于开发者工具「构建 npm」（本仓只依赖这一包）。
 * 用法：npm run build:npm（须先 npm ci）
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(
  root,
  'node_modules',
  '@volcengine',
  'tos-sdk',
  'miniprogram_dist'
);
const srcIndex = path.join(srcDir, 'index.js');
const dstDir = path.join(root, 'miniprogram_npm', '@volcengine', 'tos-sdk');
const pkgSrc = path.join(root, 'node_modules', '@volcengine', 'tos-sdk', 'package.json');

if (!fs.existsSync(srcIndex)) {
  console.error('缺少 node_modules/@volcengine/tos-sdk，请先 npm ci');
  process.exit(1);
}

fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(srcIndex, path.join(dstDir, 'index.js'));

const pkg = JSON.parse(fs.readFileSync(pkgSrc, 'utf8'));
const slim = {
  name: pkg.name,
  version: pkg.version,
  license: pkg.license,
  main: 'index.js',
  miniprogram: '.',
};
fs.writeFileSync(
  path.join(dstDir, 'package.json'),
  JSON.stringify(slim, null, 2) + '\n'
);
console.log('built miniprogram_npm/@volcengine/tos-sdk@' + pkg.version);
