'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');

function readWindowsGuid() {
  if (process.platform !== 'win32') return '';
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true
    });
    const match = String(out).match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/);
    return match ? match[1] : '';
  } catch (err) {
    return '';
  }
}

function readMacUuid() {
  if (process.platform !== 'darwin') return '';
  try {
    const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
      encoding: 'utf8',
      timeout: 4000
    });
    const match = String(out).match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    return match ? match[1] : '';
  } catch (err) {
    return '';
  }
}

function fingerprintFromId(id, platform) {
  const raw = String(id || '').trim();
  if (!raw) return '';
  return crypto.createHash('sha256').update(['vortex9', platform || process.platform, raw].join('\n')).digest('hex');
}

function fingerprint() {
  return fingerprintFromId(readWindowsGuid() || readMacUuid(), process.platform);
}

function sameFingerprint(stored, current) {
  let left;
  let right;
  try {
    left = Buffer.from(String(stored || ''), 'hex');
    right = Buffer.from(String(current || ''), 'hex');
  } catch (err) {
    return false;
  }
  if (left.length !== 32 || right.length !== 32) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = { fingerprint, fingerprintFromId, sameFingerprint };
