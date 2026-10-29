const { getViewerId, getPhoneMasked } = require('./auth');
const { getProfile } = require('./profile');

/**
 * 观众展示昵称（对齐 API约定「通则 · 观众展示昵称」）：
 * 有昵称→昵称；无昵称有手机→`用户`+尾号 4 位；否则→`用户_`+id。
 * 小程序打开 web-view 观看页时拼进 URL `nickname=`，供 H5 /watch/sdk 使用。
 *
 * @returns {string}
 */
function displayNickname() {
  const profile = getProfile();
  const nick = profile && typeof profile.nickname === 'string' ? profile.nickname.trim() : '';
  if (nick) return nick;

  const masked = (getPhoneMasked() || '').trim();
  if (masked) {
    const digits = masked.replace(/\D/g, '');
    if (digits) {
      const tail = digits.length <= 4 ? digits : digits.slice(-4);
      return '用户' + tail;
    }
  }

  const id = getViewerId();
  const n = Number(id);
  if (Number.isInteger(n) && n > 0) {
    return '用户_' + n;
  }
  return '用户_0';
}

module.exports = {
  displayNickname,
};
