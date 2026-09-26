'use strict';

const crypto = require('crypto');

const MAGIC = Buffer.from('V9E1');

function seal(plaintext, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('vault key must be 32 bytes');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, body]);
}

function open(blob, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('vault key must be 32 bytes');
  const data = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (data.length < MAGIC.length + 12 + 16 || !data.subarray(0, MAGIC.length).equals(MAGIC)) return null;
  const iv = data.subarray(4, 16);
  const tag = data.subarray(16, 32);
  const body = data.subarray(32);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  } catch (err) {
    return null;
  }
}

function isSealed(blob) {
  const data = Buffer.isBuffer(blob) ? blob : Buffer.from(blob || []);
  return data.length >= MAGIC.length && data.subarray(0, MAGIC.length).equals(MAGIC);
}

module.exports = { seal, open, isSealed };
