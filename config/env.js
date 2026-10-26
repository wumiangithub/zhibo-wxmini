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
 * 对齐 D63：各服务 baseURL **含** API 版本前缀（当前 `/api/v1`）。
 * 例：http://127.0.0.1:8082/api/v1 。api 层只写 `/viewer/...`，禁止再拼 `/api/v1`。
 * 升到 v2 时只改本文件 services（改成 .../api/v2），其它路径不用动。
 * test/prod 占位空串，上线前填真值（须带版本前缀）。live 为空则 release 下请求失败属预期。
 *
 * avatarUploadMode = 'proxy' | 'direct'
 * - proxy：前端前缀拼 objectKey → POST {baseURL}/viewer/uploads/file?biz=
 * - direct：同上拼键 → GET tos-sts 拿凭证 → PutObject（前缀不取自 STS）
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
    /** 各后端服务 baseURL（含 /api/v1） */
    services: {
      /** live-service */
      live: 'http://127.0.0.1:8082/api/v1',
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
      // PLACEHOLDER：如 https://live-test.example.com/api/v1
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
      // PLACEHOLDER：如 https://live.example.com/api/v1
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
