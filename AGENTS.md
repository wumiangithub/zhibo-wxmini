# 接手必读（小程序 agent）

本仓库只写 **微信小程序**（`zhibo-wxmini`）。读者是 **小程序（Cursor，D49）** 与 **小程序（Grok，D70）**。每次开工先看：

1. `../zhibo-shared/docs/工单.md`
2. 本仓 `docs/开发规范.md`（注释、环境、请求、登录、上传等约定；改代码前必读）

Cursor 做派给「小程序」的待办；Grok bot 做派给「小程序（Grok）」的待办。同一条工单同一时间只一人改。架构、命名、API 在 `../zhibo-shared/docs/`，经常读，日常不要改。

总控 / 副总控可以改你的代码。**不要**改 `zhibo-backend`、`zhibo-frontend`、`zhibo-shared`，不要打开父目录 `zhibo` 当工作区。本窗口不是副总控，禁止使用 `[lead-grok]`。

进度写在本仓 `docs/进度.md`（没有就新建）。缺接口记在进度的阻塞项，由总控补契约或下给后端，不要自己改别的仓。

提交前缀：Cursor `[wxmini]`，Grok bot `[wxmini-grok]`，禁止混用。改了本仓，只在本仓 `git commit`。须用户明确要求才提交。

## 工作区安全（D64，红线）

- **禁止**用 `git checkout HEAD --` / `git restore` / `git reset --hard` / `git clean -fd` 覆盖或删除未提交 WIP。
- 危险操作前先 commit（用户授权）或 `git stash push -u`。
- 细则：`../zhibo-shared/docs/工作区与Git安全.md`。

## API 路径（D63 对齐）

`config/env.js` 里各服务 **baseURL 含 `/api/v1`**（如 `http://127.0.0.1:8082/api/v1`）。`api/` 只写 `/viewer/...`，禁止再拼 `/api/v1`。以后升 v2 只改 env 一处。

## 主键 / 外键类型（D56，强制）

类型跟库走：库列 `INT`/`BIGINT`（含 `rs_mainkey_id`）用 number，**禁止**改成十进制 string；UUID / `VARCHAR` 主键继续用 string。例外见 `../zhibo-shared/docs/API约定.md`「通则 · 主键 / 外键类型」。

## 图片 / 文件上传（D60）

观众图片上传：对象键前缀与管理端一样由前端定义（`utils/avatarUpload.js` 的 `ViewerObjectKeyPrefix`，对齐 API约定目录表）。`proxy`（默认）拼 `objectKey` 后 `POST .../uploads/file`；`direct` 再 `GET .../tos-sts` 拿凭证，按火山官方小程序文档走 `@volcengine/tos-sdk` 的 `calculatePostSignature` + `wx.uploadFile`（PostObject）。两条都返回 `objectKey`、`url`、`location`。头像 `biz=1`，反馈 `biz=2`。`PUT .../profile/update` 同时交 `avatarUrl` 和 `avatarObjectKey`。**禁止**微吼上传，也禁止再为单个功能加专用上传接口。改依赖后须 `npm ci` 再 `npm run build:npm`（生成并提交 `miniprogram_npm/`）。

## 依赖版本（D36，强制）

本仓一旦使用 `package.json`：

- **禁止** `^`、`~`、`*`、`latest`，版本写到补丁号。
- 必须提交 lock；装依赖优先 `npm ci`。
- 升级第三方库须改文件并在进度里写原因，禁止顺手漂版本。

## 代码评审

技术总监只做 code review，结论在 `../zhibo-shared/docs/代码评审.md`，他不改你的代码。有派给「小程序」或「小程序（Grok）」的条目就修，修完把状态改成 `已修` 并留一句怎么改的；不认同可以填 `不修` + 原因，别默默跳过。
