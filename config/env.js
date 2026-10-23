/**
 * 环境与多服务 baseURL。
 *
 * 选择逻辑（resolveEnv）：
 * 1. FORCE_ENV 非空时优先：'local' | 'test' | 'prod'（本机调试手动覆盖）
 * 2. 否则用 wx.getAccountInfoSync().miniProgram.envVersion：
 *    - release → prod
 *    - trial（体验版）→ test
 *    - develop（开发版/工具）→ local
 * 3. 拿不到 wx / 未知版本 → local
 *
 * 域名校验说明：
 * - local：开发者工具请勾选「不校验合法域名、web-view、TLS」。
 * - test / prod：须在微信公众平台配置 request 合法域名，使用 HTTPS；
 *   真机不可用 127.0.0.1，且不要依赖「不校验合法域名」。
 *
 * 依据 shared《观众登录》：开发者工具 baseURL 为 http://127.0.0.1:8082；
 * 生产域名本轮不写死 → test/prod 的 live 用空字符串占位，上线前再填。
 * 若 live 仍为空，release（prod）下请求会失败，属预期——请填写正式 HTTPS 域名。
 */

/** @type {null | 'local' | 'test' | 'prod'} 有值时优先于微信 envVersion */
const FORCE_ENV = null;

/**
 * 各环境配置。services 可按服务名扩展（至少 live = live-service）。
 * test/prod 勿编造未文档化的真实域名；正式域名填好前 release 请求会失败。
 */
const ENV_CONFIG = {
  /** 本地开发环境 */
  local: {
    /** 是否调试（如更详细日志；当前请求层仍按 T35.2 行为） */
    debug: true,
    /**
     * true 表示本环境预期在开发者工具勾选「不校验合法域名…」；
     * 非强制开关，仅集中说明，避免散落硬编码注释。
     */
    expectSkipDomainCheck: true,
    /** 各后端服务 baseURL */
    services: {
      /** live-service 本机地址 */
      live: 'http://127.0.0.1:8082',
    },
  },
  /** 体验版 / 测试环境 */
  test: {
    /** 是否调试 */
    debug: true,
    /** 测试环境须配置合法域名，不跳过校验 */
    expectSkipDomainCheck: false,
    services: {
      // PLACEHOLDER：测试环境 HTTPS 合法域名待运维/文档下发后填写
      live: '',
    },
  },
  /** 正式版 / 生产环境 */
  prod: {
    /** 生产关闭调试 */
    debug: false,
    /** 生产须配置合法域名，不跳过校验 */
    expectSkipDomainCheck: false,
    services: {
      // PLACEHOLDER：生产 HTTPS 正式域名上线前必填；空则 release 下 getBaseURL 为空、请求失败属预期
      live: '',
    },
  },
};

/**
 * 将微信 miniProgram.envVersion 映射为本项目环境名。
 * @param {string} [envVersion] miniProgram.envVersion
 * @returns {'local' | 'test' | 'prod'}
 */
function mapEnvVersion(envVersion) {
  if (envVersion === 'release') return 'prod';
  if (envVersion === 'trial') return 'test';
  if (envVersion === 'develop') return 'local';
  return 'local';
}

/**
 * 解析当前环境：FORCE_ENV > 微信 envVersion > local
 * @returns {'local' | 'test' | 'prod'}
 */
function resolveEnv() {
  if (FORCE_ENV === 'local' || FORCE_ENV === 'test' || FORCE_ENV === 'prod') {
    return FORCE_ENV;
  }
  try {
    if (typeof wx !== 'undefined' && typeof wx.getAccountInfoSync === 'function') {
      const info = wx.getAccountInfoSync();
      const envVersion =
        info && info.miniProgram && info.miniProgram.envVersion
          ? info.miniProgram.envVersion
          : '';
      return mapEnvVersion(envVersion);
    }
  } catch (e) {
    // 开发者工具外或极早时机可能抛错，回落 local
  }
  return 'local';
}

/** @type {'local' | 'test' | 'prod'} 模块加载时解析一次 */
const CURRENT_ENV = resolveEnv();

/**
 * 取当前环境完整配置对象；未知环境回落 local。
 * @returns {object}
 */
function getEnvConfig() {
  return ENV_CONFIG[CURRENT_ENV] || ENV_CONFIG.local;
}

/**
 * 按当前环境 + 服务名取 baseURL。
 * @param {string} [service=live]
 * @returns {string}
 */
function getBaseURL(service) {
  const cfg = getEnvConfig();
  const name = service || 'live';
  const services = cfg.services || {};
  if (services[name]) {
    return services[name];
  }
  return services.live || '';
}

/**
 * 当前环境是否开启调试开关。
 * @returns {boolean}
 */
function isDebug() {
  return !!getEnvConfig().debug;
}

module.exports = {
  FORCE_ENV,
  CURRENT_ENV,
  ENV_CONFIG,
  resolveEnv,
  mapEnvVersion,
  getEnvConfig,
  getBaseURL,
  isDebug,
};
