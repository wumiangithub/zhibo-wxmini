/**
 * 小程序入口 App 实例。
 */
const { getAccessToken } = require('./utils/auth');

App({
  /**
   * 小程序初始化完成时触发（全局只触发一次）。
   */
  onLaunch() {},

  /**
   * 冷启动与从后台回前台：已登录则上报最近访问（服务端 5 分钟节流）。
   */
  onShow() {
    if (!getAccessToken()) return;
    try {
      require('./api/live/presence')
        .ping('miniapp')
        .catch(function () {
          /* silent */
        });
    } catch (e) {
      /* ignore */
    }
  },
});
