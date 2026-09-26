'use strict';

const http = require('http');
const net = require('net');

function localAddress(socket) {
  const addr = String(socket.remoteAddress || '');
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function createShieldProxy(isBlocked) {
  const server = http.createServer((req, res) => {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Vortex9 tunnels HTTPS only.');
  });

  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    if (!localAddress(socket)) socket.destroy();
  });
  server.vortexSockets = sockets;

  server.on('connect', (req, clientSocket) => {
    const parts = String(req.url || '').split(':');
    const host = parts[0];
    const port = Number(parts[1] || 443);
    const decision = isBlocked(host, port) || { blocked: false };
    if (decision.blocked || !host || !Number.isFinite(port) || port < 1 || port > 65535) {
      clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const upstream = net.connect(port, host, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    const drop = () => {
      clientSocket.destroy();
      upstream.destroy();
    };
    upstream.on('error', drop);
    clientSocket.on('error', drop);
  });

  return server;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (server.vortexSockets) {
      for (const socket of server.vortexSockets) socket.destroy();
    }
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    const timer = setTimeout(done, 400);
    server.close(() => {
      clearTimeout(timer);
      done();
    });
  });
}

module.exports = { createShieldProxy, listen, close };
