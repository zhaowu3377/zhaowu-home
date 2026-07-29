// 零依赖个人主页后端：静态托管 + 内容 API + 后台管理
// 运行：node server.js
//
// 可选环境变量：
//   PORT          端口，默认 3000
//   ADMIN_TOKEN   后台管理令牌，默认 zhaowu2026（建议改掉）
//   DATA_DIR      数据目录（本地仓库 / 持久磁盘），默认仓库目录
//   GITHUB_TOKEN  GitHub Personal Access Token（需 repo 写权限）——配置后“保存即推送到 GitHub”
//   GITHUB_REPO   仓库，如 zhaowu3377/zhaowu-home
//   GITHUB_BRANCH 分支，默认 main
//
// 后台：http://localhost:3000/admin
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || ROOT;
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'zhaowu2026';
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

// ---------- GitHub 自动同步（可选） ----------
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GITHUB_REPO || 'zhaowu3377/zhaowu-home';
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';

function initData() {
  try {
    if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
    if (!fs.existsSync(CONTENT_FILE)) {
      const seed = path.join(ROOT, 'content.json');
      if (fs.existsSync(seed)) fs.copyFileSync(seed, CONTENT_FILE);
      else fs.writeFileSync(CONTENT_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) { console.error('初始化数据目录失败：', e); }
}
initData();

// 把文件推送到 GitHub（未配置 GITHUB_TOKEN 时只写本地，直接返回 false）
async function ghPush(relPath, buf) {
  if (!GH_TOKEN) return false;
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${relPath}`;
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'zhaowu-home',
    'Content-Type': 'application/json',
  };
  let sha;
  try {
    const r = await fetch(`${url}?ref=${GH_BRANCH}`, { headers });
    if (r.ok) { const j = await r.json(); sha = j.sha; }
  } catch (e) { /* 文件不存在，视为新建 */ }
  const body = JSON.stringify({
    message: `update ${relPath} via admin`,
    content: buf.toString('base64'),
    branch: GH_BRANCH,
    ...(sha ? { sha } : {}),
  });
  try {
    const r = await fetch(url, { method: 'PUT', headers, body });
    if (r.ok) { console.log('已推送到 GitHub：', relPath); return true; }
    console.error('GitHub 推送失败：', relPath, r.status);
  } catch (e) { console.error('GitHub 推送异常：', relPath, e.message); }
  return false;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}
function sendJSON(res, status, obj) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 30 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
function serveStatic(res, urlPath, base) {
  base = base || ROOT;
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(base, rel));
  if (!filePath.startsWith(base)) return send(res, 403, 'forbidden');
  fs.readFile(filePath, (err, buf) => {
    if (err) return send(res, 404, 'not found');
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, buf, MIME[ext] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];

  // 获取内容
  if (req.method === 'GET' && pathname === '/api/content') {
    return fs.readFile(CONTENT_FILE, 'utf8', (err, data) => {
      if (err) return sendJSON(res, 500, { error: 'no content' });
      send(res, 200, data, 'application/json; charset=utf-8');
    });
  }

  // 保存内容（后台，需令牌）
  if (req.method === 'POST' && pathname === '/api/admin/content') {
    if ((req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) return sendJSON(res, 401, { error: 'unauthorized' });
    try {
      const obj = JSON.parse(await readBody(req));
      const text = JSON.stringify(obj, null, 2);
      fs.writeFileSync(CONTENT_FILE, text);
      await ghPush('content.json', Buffer.from(text)); // 已配令牌则自动推到 GitHub
      return sendJSON(res, 200, { ok: true });
    } catch (e) { return sendJSON(res, 400, { error: String(e) }); }
  }

  // 上传图片（后台，需令牌）body: { name, data(base64) }
  if (req.method === 'POST' && pathname === '/api/admin/image') {
    if ((req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) return sendJSON(res, 401, { error: 'unauthorized' });
    try {
      const { name, data } = JSON.parse(await readBody(req));
      if (!name || !data) return sendJSON(res, 400, { error: 'need name & data' });
      const safe = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
      const b64 = String(data).includes(',') ? String(data).split(',')[1] : data;
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(path.join(MEDIA_DIR, safe), buf);
      await ghPush(`media/${safe}`, buf);
      return sendJSON(res, 200, { url: 'media/' + safe });
    } catch (e) { return sendJSON(res, 400, { error: String(e) }); }
  }

  // 后台页
  if (req.method === 'GET' && pathname === '/admin') {
    return serveStatic(res, '/admin.html');
  }

  // 媒体资源：优先仓库内置，其次本地数据目录（后台上传的内容）
  if (pathname.startsWith('/media/')) {
    const repoPath = path.normalize(path.join(ROOT, pathname));
    if (fs.existsSync(repoPath)) return serveStatic(res, pathname, ROOT);
    return serveStatic(res, pathname, MEDIA_DIR);
  }

  // 其余静态文件
  return serveStatic(res, pathname, ROOT);
});

server.listen(PORT, () => {
  console.log('站点运行：    http://localhost:' + PORT);
  console.log('后台管理：    http://localhost:' + PORT + '/admin');
  console.log('管理令牌：    ' + ADMIN_TOKEN);
  console.log('数据目录：    ' + DATA_DIR);
  console.log('GitHub 自动推送： ' + (GH_TOKEN ? '已启用 (' + GH_REPO + ')' : '未启用（仅本地保存，可手动 git push）'));
});
