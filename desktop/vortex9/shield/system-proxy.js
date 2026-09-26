'use strict';

const { execFile } = require('child_process');

const WIN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

function run(file, args) {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true, timeout: 8000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err ? err.message : '' });
    });
  });
}

function regValue(stdout, name) {
  const line = String(stdout || '').split(/\r?\n/).find((row) => row.toLowerCase().includes(String(name).toLowerCase()));
  if (!line) return '';
  const bits = line.trim().split(/\s+/);
  return bits[bits.length - 1] || '';
}

async function enableWindows(port) {
  const enable = await run('reg', ['query', WIN_KEY, '/v', 'ProxyEnable']);
  const server = await run('reg', ['query', WIN_KEY, '/v', 'ProxyServer']);
  const bypass = await run('reg', ['query', WIN_KEY, '/v', 'ProxyOverride']);
  const previous = {
    enable: regValue(enable.stdout, 'ProxyEnable') || '0x0',
    server: regValue(server.stdout, 'ProxyServer'),
    override: regValue(bypass.stdout, 'ProxyOverride')
  };
  const on = await run('reg', ['add', WIN_KEY, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '1', '/f']);
  const set = await run('reg', ['add', WIN_KEY, '/v', 'ProxyServer', '/t', 'REG_SZ', '/d', '127.0.0.1:' + port, '/f']);
  const skip = await run('reg', ['add', WIN_KEY, '/v', 'ProxyOverride', '/t', 'REG_SZ', '/d', '<local>;localhost;127.0.0.1', '/f']);
  return { ok: on.ok && set.ok && skip.ok, previous, platform: 'win32' };
}

async function restoreWindows(previous) {
  if (!previous) return { ok: true };
  await run('reg', ['add', WIN_KEY, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', previous.enable === '0x1' || previous.enable === '1' ? '1' : '0', '/f']);
  if (previous.server) await run('reg', ['add', WIN_KEY, '/v', 'ProxyServer', '/t', 'REG_SZ', '/d', previous.server, '/f']);
  else await run('reg', ['delete', WIN_KEY, '/v', 'ProxyServer', '/f']);
  if (previous.override) await run('reg', ['add', WIN_KEY, '/v', 'ProxyOverride', '/t', 'REG_SZ', '/d', previous.override, '/f']);
  return { ok: true };
}

async function macServices() {
  const listed = await run('networksetup', ['-listallnetworkservices']);
  if (!listed.ok) return [];
  return listed.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line, index) => index > 0 && line && line[0] !== '*');
}

async function enableMac(port) {
  const services = await macServices();
  if (!services.length) return { ok: false, previous: null, platform: 'darwin' };
  const previous = [];
  for (const service of services) {
    const web = await run('networksetup', ['-getwebproxy', service]);
    const secure = await run('networksetup', ['-getsecurewebproxy', service]);
    previous.push({ service, web: web.stdout, secure: secure.stdout });
    await run('networksetup', ['-setwebproxy', service, '127.0.0.1', String(port)]);
    await run('networksetup', ['-setsecurewebproxy', service, '127.0.0.1', String(port)]);
  }
  return { ok: true, previous, platform: 'darwin' };
}

function macField(text, label) {
  const line = String(text || '').split(/\r?\n/).find((row) => row.toLowerCase().startsWith(label));
  return line ? line.split(':').slice(1).join(':').trim() : '';
}

async function restoreMac(previous) {
  if (!Array.isArray(previous)) return { ok: true };
  for (const item of previous) {
    const webOn = macField(item.web, 'enabled').toLowerCase() === 'yes';
    const secureOn = macField(item.secure, 'enabled').toLowerCase() === 'yes';
    if (webOn) await run('networksetup', ['-setwebproxy', item.service, macField(item.web, 'server') || '127.0.0.1', macField(item.web, 'port') || '80']);
    else await run('networksetup', ['-setwebproxystate', item.service, 'off']);
    if (secureOn) await run('networksetup', ['-setsecurewebproxy', item.service, macField(item.secure, 'server') || '127.0.0.1', macField(item.secure, 'port') || '443']);
    else await run('networksetup', ['-setsecurewebproxystate', item.service, 'off']);
  }
  return { ok: true };
}

async function enable(port) {
  if (process.platform === 'win32') return enableWindows(port);
  if (process.platform === 'darwin') return enableMac(port);
  return { ok: false, previous: null, platform: process.platform };
}

async function restore(snapshot) {
  if (!snapshot) return { ok: true };
  if (snapshot.platform === 'win32') return restoreWindows(snapshot.previous);
  if (snapshot.platform === 'darwin') return restoreMac(snapshot.previous);
  return { ok: true };
}

module.exports = { enable, restore };
