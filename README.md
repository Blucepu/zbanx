# zbanx

<p align="center">
  <a href="https://www.npmjs.com/package/zbanx"><img src="https://img.shields.io/npm/v/zbanx" alt="npm version"></a>
  <a href="https://github.com/Blucepu/zbanx"><img src="https://img.shields.io/github/stars/Blucepu/zbanx" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/zbanx" alt="license"></a>
</p>

> 静态站点创建与部署工具 — 基于 snapstatic 模板，一键部署到阿里云 OSS。

## 安装

```bash
bun add -g zbanx         # 全局安装
bun x zbanx <command>    # 或直接运行（免安装）
```

## 快速开始

```bash
# 创建新项目
zbanx init my-site
cd my-site

# 启动开发服务器
bun dev

# 构建并部署
zbanx deploy
```

## 命令

### `init <project-name>`

从 snapstatic 模板脚手架新项目（Vite + React + TypeScript + Tailwind v4 + coss/shadcn + @antv/infographic）。

| 选项 | 说明 |
|------|------|
| `--overwrite` | 目标目录已存在时覆盖写入 |

- 项目名：小写字母、数字、连字符（`my-site`）
- 支持 `.` 在当前目录创建

### `deploy`

构建并部署到阿里云 OSS。

| 选项 | 说明 |
|------|------|
| `--no-build` | 跳过构建，直接上传已有 `dist/` |

## 配置

项目根目录需 `deploy.json`：

```json
{
  "oss": {
    "region": "oss-cn-hangzhou",
    "bucket": "my-bucket",
    "domain": "my-domain.com"
  },
  "build": {
    "command": "bun run build",
    "outputDir": "dist"
  }
}
```

及 `.env`（已 gitignore）：

```env
ALIBABA_CLOUD_ACCESS_KEY_ID=your_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_key_secret
```

## 身份认证

首次部署交互式收集账号密码，登录成功后缓存到 `~/.zbx/session.json`。

```bash
# 清除缓存的登录态
rm -f ~/.zbx/session.json
```

## 常见问题

| 问题 | 原因/解决 |
|------|-----------|
| 部署失败 code 300001 | 密码错误或账号不存在 |
| `bun run build` 失败 | 先 `bun run lint` 检查代码 |
| 部署后页面刷新 404 | 确认项目使用 HashRouter（模板默认） |
