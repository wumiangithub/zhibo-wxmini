/**
 * 环境与服务 baseURL。
 *
 * 选择逻辑（resolveEnv）：
 * 1. FORCE_ENV 非空时优先：'local' | 'test' | 'prod'（联调可手动覆盖）
 * 2. 否则读 wx.getAccountInfoSync().miniProgram.envVersion：
 *    - release → prod
 *    - trial（体验版）→ test
 *    - develop（开发版/工具）→ local
 * 3. 读不到 wx / 未知版本 → local
 *
 * 域名校验说明：
 * - local：开发者工具需勾选不校验合法域名（含 request / uploadFile / web-view / TLS）
 * - test / prod：须在微信公众平台配置 request 合法域名，且使用 HTTPS；
 *   不要填 127.0.0.1，也不要依赖「不校验合法域名」
 *
 * 对齐 shared《观众端登录》：开发工具 baseURL 为 http://127.0.0.1:8082。
 * 多服务时可在此扩展；test/prod 的 live 用空字符串占位，上线前填真值。
 * 若 live 仍为空，release（prod）下请求会失败，属预期——须先写入正式 HTTPS 域名。
 *
 * T36.2：avatarUploadMode = 'proxy' | 'direct'
 * - proxy（默认）：wx.uploadFile → api/live/profile.avatarUploadUrl（后端写库）
 * - direct：api/live/uploads.getTosSts → 直传 TOS → updateProfile 带 avatarUrl
 */

/** @type {null | 'local' | 'test' | 'prod'} 有值时覆盖微信 envVersion */
const FORCE_ENV = null;

/**
 * 各环境配置。services 可按服务名扩展；当前 live = live-service。
 * test/prod 域名未下发前保持空；真机或正式版须在上线前填好。
 */
const ENV_CONFIG = {
  /** 本地开发环境 */
  local: {
    /** 是否调试（更细日志）；当前联调以 T35/T36 为主 */
    debug: true,
    /**
     * true 表示本环境预期在开发者工具勾选不校验合法域名；
     * 仅作说明开关，不强制控制请求，避免散落硬编码注释。
     */
    expectSkipDomainCheck: true,
    /**
     * 头像上传模式：proxy=经后端 multipart；direct=STS 直传 TOS。
     * @type {'proxy' | 'direct'}
     */
    avatarUploadMode: 'proxy',
    /** 各后端服务 baseURL */
    services: {
      /** live-service 根地址 */
      live: 'http://127.0.0.1:8082',
    },
  },
  /** 体验版 / 测试环境 */
  test: {
    /** 是否调试 */
    debug: true,
    /** 测试环境须配合法域名，勿跳过校验 */
    expectSkipDomainCheck: false,
    /** @type {'proxy' | 'direct'} */
    avatarUploadMode: 'proxy',
    services: {
      // PLACEHOLDER：测试环境 HTTPS 合法域名，运维/文档下发后填写
      live: '',
    },
  },
  /** 正式版 / 生产环境 */
  prod: {
    /** 生产关闭调试 */
    debug: false,
    /** 生产须配合法域名，勿跳过校验 */
    expectSkipDomainCheck: false,
    /** @type {'proxy' | 'direct'} */
    avatarUploadMode: 'proxy',
    services: {
      // PLACEHOLDER：生产 HTTPS 正式域名，上线前填好；否则 release 下 getBaseURL 为空、请求失败属预期
      live: '',
    },
  },
};

/**
 * 将微信 miniProgram.envVersion 映射为仓库内环境名。
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
    // 开发者工具异常时按本地联调处理 → local
  }
  return 'local';
}

/** @type {'local' | 'test' | 'prod'} 模块加载时锁定一次 */
const CURRENT_ENV = resolveEnv();

/**
 * 取当前环境的配置对象；未知则回落 local。
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
 * 当前环境是否打开调试开关。
 * @returns {boolean}
 */
function isDebug() {
  return !!getEnvConfig().debug;
}

/**
 * 头像上传模式：proxy | direct，非法值回落 proxy。
 * @returns {'proxy' | 'direct'}
 */
function getAvatarUploadMode() {
  const mode = getEnvConfig().avatarUploadMode;
  return mode === 'direct' ? 'direct' : 'proxy';
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
  getAvatarUploadMode,
};
