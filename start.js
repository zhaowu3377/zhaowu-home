// 本地一键启动：读取同目录下的 .env 注入环境变量，再启动 server.js
// 用法：把本文件与 server.js 放在仓库根目录，复制 .env.example 为 .env 并填好，
//       然后执行 `node start.js`（或在文件管理器里双击，若 .js 已关联 Node）。
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  });
  console.log('已读取环境变量：', file);
}

loadEnv(path.join(__dirname, '.env'));

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => process.exit(code === null ? 1 : code));
