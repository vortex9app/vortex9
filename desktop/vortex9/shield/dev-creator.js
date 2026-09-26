'use strict';

const fs = require('fs');
const path = require('path');

const CREATOR_EMAIL = 'zen3845@outlook.com';

function readEnvFile(file) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return {};
  }
  const out = {};
  String(text).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return;
    const eq = trimmed.indexOf('=');
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"')
      || (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  });
  return out;
}

function enabledFromEnv(env) {
  const bag = env || {};
  const email = String(bag.V9_DEV_CREATOR_EMAIL || '').trim().toLowerCase();
  const bypass = String(bag.V9_SOVEREIGN_BYPASS || '').trim() === 'true';
  if (email === CREATOR_EMAIL || (bypass && (!email || email === CREATOR_EMAIL))) {
    return { email: CREATOR_EMAIL };
  }
  return null;
}

function enabled() {
  let packaged = true;
  try {
    packaged = !!require('electron').app.isPackaged;
  } catch (err) {
    packaged = true;
  }
  if (packaged) return null;
  const bag = readEnvFile(path.join(__dirname, '..', '.env'));
  if (!bag.V9_DEV_CREATOR_EMAIL && process.env.V9_DEV_CREATOR_EMAIL) {
    bag.V9_DEV_CREATOR_EMAIL = process.env.V9_DEV_CREATOR_EMAIL;
  }
  if (!bag.V9_SOVEREIGN_BYPASS && process.env.V9_SOVEREIGN_BYPASS) {
    bag.V9_SOVEREIGN_BYPASS = process.env.V9_SOVEREIGN_BYPASS;
  }
  return enabledFromEnv(bag);
}

module.exports = { enabled, enabledFromEnv };
