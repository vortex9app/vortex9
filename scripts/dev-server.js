'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..', 'web');
const port = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function safePath(urlPath) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  } catch (err) {
    return null;
  }
  const full = path.resolve(root, decoded.replace(/^\/+/, ''));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }
  const target = safePath(req.url);
  if (!target) {
    send(res, 403, 'Forbidden');
    return;
  }
  let file = target;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    send(res, 404, 'Not found');
    return;
  }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

if (!fs.existsSync(root)) {
  console.error('web/ is missing. Run npm run build first.');
  process.exit(1);
}

server.listen(port, '127.0.0.1', () => {
  console.log('mystic9.net preview at http://127.0.0.1:' + port);
  console.log('Vortex9 page: http://127.0.0.1:' + port + '/vortex9');
  console.log('Desktop app: npm run desktop');
});
