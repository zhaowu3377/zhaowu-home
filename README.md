# zhaowu · 个人主页

动态个人站点：零依赖 Node.js 后端 + 前端动态渲染（CMS 后台可在线改字段与图片）。

## 本地运行
```bash
node server.js
```
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin （管理令牌环境变量 ADMIN_TOKEN，默认 zhaowu2026）

## 部署（Render / Railway / Fly.io 等）
- 连接本仓库，启动命令 `node server.js`，无需构建
- 平台注入 PORT 环境变量（server.js 已支持 `process.env.PORT`）
- 部署后访问后台即可在线编辑，实时同步前台
