'use strict';

const crypto = require('crypto');

function debuggerAttached(argv, env, inspectorUrl) {
  const flags = [].concat(argv || []).join(' ');
  if (/--inspect|--inspect-brk|--debug|--remote-debugging-port/i.test(flags)) return true;
  const options = String((env && env.NODE_OPTIONS) || '');
  if (/--inspect|--debug/i.test(options)) return true;
  return !!inspectorUrl;
}

function zeroFill(value) {
  if (!Buffer.isBuffer(value) || value.length === 0) return false;
  value.fill(0);
  return true;
}

function textDigest(text) {
  return crypto.createHash('sha256').update(Buffer.from(String(text || ''), 'utf8')).digest();
}

function sameDigest(left, right) {
  if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = { debuggerAttached, zeroFill, textDigest, sameDigest };
