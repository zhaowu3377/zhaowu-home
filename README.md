# zhaowu · 个人主页

动态个人站点：零依赖 Node.js 后端 + 前端动态渲染（CMS 后台可在线改字段与图片）。

## 本地运行
```bash
# 推荐：一键启动（自动读取同目录 .env 注入环境变量）
node start.js

# 或手动指定环境变量后启动
node server.js
```
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin （管理令牌环境变量 ADMIN_TOKEN，默认 zhaowu2026）

## 环境变量（.env）
复制 `.env.example` 为 `.env` 并填写。`.env` 已被 `.gitignore` 忽略，不会上传。

| 变量 | 说明 |
|---|---|
| `GITHUB_TOKEN` | GitHub 精细令牌，仅需本仓库 `Contents: Read and write`。配置后后台点保存即自动推送到 GitHub |
| `GITHUB_REPO` / `GITHUB_BRANCH` | 目标仓库与分支，默认 `zhaowu3377/zhaowu-home` / `main` |
| `ADMIN_TOKEN` | 后台管理令牌，请改成自己的强密码 |
| `PORT` | 服务端口，默认 3000 |

## 部署（Render / Railway / Fly.io 等）
- 连接本仓库，启动命令 `node server.js`，无需构建
- 平台注入 PORT 环境变量（server.js 已支持 `process.env.PORT`）
- 部署后访问后台即可在线编辑，实时同步前台
