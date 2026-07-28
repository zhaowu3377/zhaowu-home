// 零依赖个人主页后端：静态托管 + 内容 API + 后台管理
// 运行：node server.js   （端口可用 PORT 环境变量覆盖，默认 3000）
// 后台：http://localhost:3000/admin   管理令牌：环境变量 ADMIN_TOKEN，默认 zhaowu2026
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'zhaowu2026';
const CONTENT_FILE = path.join(ROOT, 'content.json');
const MEDIA_DIR = path.join(ROOT, 'media');

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
function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'forbidden');
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
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(obj, null, 2));
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
      fs.writeFileSync(path.join(MEDIA_DIR, safe), Buffer.from(b64, 'base64'));
      return sendJSON(res, 200, { url: 'media/' + safe });
    } catch (e) { return sendJSON(res, 400, { error: String(e) }); }
  }

  // 后台页
  if (req.method === 'GET' && pathname === '/admin') {
    return serveStatic(res, '/admin.html');
  }

  // 其余静态文件
  return serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log('站点运行：    http://localhost:' + PORT);
  console.log('后台管理：    http://localhost:' + PORT + '/admin');
  console.log('管理令牌：    ' + ADMIN_TOKEN);
});
