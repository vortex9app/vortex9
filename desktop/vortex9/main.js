'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, ipcMain, clipboard, net, protocol, safeStorage, session, shell, systemPreferences } = require('electron');
const { emptyHousehold, inspectHost, normalizeHousehold, scanText } = require('./shield/guardian');
const { requestJson } = require('./shield/https');
const { acceptLicense } = require('./shield/license-check');
const { fingerprint, sameFingerprint } = require('./shield/machine');
const { debuggerAttached, sameDigest, textDigest, zeroFill } = require('./shield/runtime');
const { createLimiter } = require('./shield/limits');
const proxy = require('./shield/proxy');
const systemProxy = require('./shield/system-proxy');
const { isSealed, open: openVault, seal } = require('./shield/vault');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } }
]);
app.enableSandbox();

const LICENSE_URL = 'https://mystic9.net/api/vortex9-license';
const SUBSCRIBE_URL = 'https://mystic9.net/vortex9#tiers';
const FEED_URL = 'https://mystic9.net/vortex9/threat-feed.json';
const CACHE_MS = 36 * 60 * 60 * 1000;
const FEED_SYNC_MS = 6 * 60 * 60 * 1000;
const GRANT_MS = 2 * 60 * 1000;
const CONFIRM_LOCK_MS = 15 * 60 * 1000;
const PAUSE = 'That action was paused because it was repeated too quickly.';
const allow = createLimiter();

let win = null;
let server = null;
let route = null;
let watchTimer = null;
let lastClip = '';
let guardianGrant = null;
let grantExpires = 0;
let feedTimer = null;
let vaultKey = null;
let confirmFails = 0;
let confirmLockedUntil = 0;
let lockedDown = false;
let sessionKey = crypto.randomBytes(32);
let clipDigest = Buffer.alloc(32);
let guardTimer = null;

const state = {
  shield: 'idle',
  tier: 'free',
  plan: null,
  email: '',
  receipt: '',
  renewsAt: '',
  scrapersBlocked: 0,
  telemetryNeutralized: 0,
  proxyListening: false,
  systemProxy: false,
  guardianWatch: false,
  guardianFlags: 0,
  guardianCategory: '',
  threatFeed: false,
  feedHosts: [],
  household: emptyHousehold(),
  householdOpen: false,
  creatorAdmin: false,
  message: 'Shield idle. Telemetry blocking turns on with the 9.'
};

function licensePath() {
  return path.join(app.getPath('userData'), 'vortex9-license.json');
}

function operatorPath() {
  return path.join(app.getPath('userData'), 'vortex9-operator.json');
}

function prefsPath() {
  return path.join(app.getPath('userData'), 'vortex9-guardian.json');
}

function householdPath() {
  return path.join(app.getPath('userData'), 'vortex9-household.bin');
}

function feedCachePath() {
  return path.join(app.getPath('userData'), 'vortex9-threat-feed.json');
}

function vaultKeyPath() {
  return path.join(app.getPath('userData'), 'vortex9-vault.key');
}

function loadVaultKey() {
  if (vaultKey) return vaultKey;
  if (!safeStorage.isEncryptionAvailable()) return null;
  const file = vaultKeyPath();
  if (fs.existsSync(file)) {
    try {
      const raw = Buffer.from(safeStorage.decryptString(fs.readFileSync(file)), 'base64');
      if (raw.length !== 32) return null;
      vaultKey = raw;
      return vaultKey;
    } catch (err) {
      return null;
    }
  }
  const fresh = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, safeStorage.encryptString(fresh.toString('base64')));
  vaultKey = fresh;
  return vaultKey;
}

function writeJsonFile(file, value) {
  const key = loadVaultKey();
  if (!key) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, seal(JSON.stringify(value), key));
  return true;
}

function readJsonFile(file) {
  let blob;
  try {
    blob = fs.readFileSync(file);
  } catch (err) {
    return null;
  }
  const key = loadVaultKey();
  if (isSealed(blob)) {
    if (!key) return null;
    try {
      const text = openVault(blob, key);
      return text ? JSON.parse(text) : null;
    } catch (err) {
      return null;
    }
  }
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const parsed = JSON.parse(safeStorage.decryptString(blob));
      if (key) writeJsonFile(file, parsed);
      return parsed;
    } catch (err) {
      /* Older copies were plain JSON. */
    }
  }
  try {
    const parsed = JSON.parse(blob.toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    if (key) writeJsonFile(file, parsed);
    return parsed;
  } catch (err) {
    return null;
  }
}

function readOperator() {
  const saved = readJsonFile(operatorPath());
  if (!saved || saved.v !== 1 || !saved.salt || !saved.hash) return null;
  return saved;
}

function writeOperator(passphrase) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(passphrase, salt, 32);
  if (!writeJsonFile(operatorPath(), {
    v: 1,
    salt: salt.toString('hex'),
    hash: hash.toString('hex')
  })) throw new Error('operator record was not encrypted');
}

function verifyPassphrase(passphrase) {
  const saved = readOperator();
  if (!saved) return false;
  const actual = crypto.scryptSync(passphrase, Buffer.from(saved.salt, 'hex'), 32);
  const expected = Buffer.from(saved.hash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function issueGrant() {
  guardianGrant = crypto.randomBytes(32);
  grantExpires = Date.now() + GRANT_MS;
  return guardianGrant.toString('hex');
}

function takeGrant(presented) {
  const current = guardianGrant;
  const expires = grantExpires;
  guardianGrant = null;
  grantExpires = 0;
  if (!current || Date.now() > expires) return false;
  let given;
  try {
    given = Buffer.from(String(presented || ''), 'hex');
  } catch (err) {
    return false;
  }
  if (given.length !== current.length) return false;
  return crypto.timingSafeEqual(given, current);
}

function biometricAvailable() {
  return process.platform === 'darwin' && systemPreferences.canPromptTouchID();
}

function pushFeed(kind, text) {
  if (win && !win.isDestroyed()) win.webContents.send('vortex9:feed', { kind, text });
}

function readCache() {
  const saved = readJsonFile(licensePath());
  return saved && typeof saved === 'object' ? saved : null;
}

function writeCache(extra) {
  if (state.plan === 'creator') return true;
  const machine = fingerprint();
  if (state.tier === 'paid' && !machine) return false;
  return writeJsonFile(licensePath(), {
    tier: state.tier,
    plan: state.plan,
    email: state.email,
    receipt: state.receipt || '',
    renewsAt: state.renewsAt,
    machine: machine,
    checkedAt: Date.now(),
    ...extra
  });
}

function applyCache(cache) {
  if (!cache || cache.tier !== 'paid') return false;
  const email = String(cache.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (cache.plan !== 'month' && cache.plan !== 'year' && cache.plan !== 'citadel') return false;
  if (!cache.checkedAt || Date.now() - cache.checkedAt > CACHE_MS) return false;
  const renews = Date.parse(cache.renewsAt || '');
  if (!Number.isFinite(renews) || renews <= Date.now()) return false;
  if (!sameFingerprint(cache.machine, fingerprint())) return false;
  state.tier = 'paid';
  state.plan = cache.plan;
  state.email = email;
  state.receipt = String(cache.receipt || '').slice(0, 128);
  state.renewsAt = cache.renewsAt;
  return true;
}

function integrity() {
  if (state.shield !== 'active' || !state.proxyListening) return state.shield === 'active' ? 35 : 0;
  if (state.tier === 'paid' && state.systemProxy) return 100;
  if (state.tier === 'paid') return 82;
  if (state.systemProxy) return 70;
  return 58;
}

function publicState() {
  return {
    shield: state.shield,
    tier: state.tier,
    plan: state.plan,
    email: state.email,
    renewsAt: state.renewsAt,
    scrapersBlocked: state.scrapersBlocked,
    telemetryNeutralized: state.telemetryNeutralized,
    integrity: integrity(),
    proxyListening: state.proxyListening,
    systemProxy: state.systemProxy,
    guardianLocked: state.tier !== 'paid',
    guardianWatch: state.guardianWatch && state.tier === 'paid',
    guardianFlags: state.guardianFlags,
    guardianCategory: state.guardianCategory,
    threatFeed: state.threatFeed && state.tier === 'paid',
    householdOpen: state.householdOpen && state.tier === 'paid',
    creatorAdmin: state.creatorAdmin === true && state.tier === 'paid' && !lockedDown,
    message: state.message
  };
}

function publish() {
  if (win && !win.isDestroyed()) win.webContents.send('vortex9:state', publicState());
}

function noteBlock(decision) {
  if (!decision || !decision.blocked) return;
  if (decision.metric === 'telemetry') state.telemetryNeutralized += 1;
  else if (decision.metric === 'scraper' || decision.metric === 'leak') state.scrapersBlocked += 1;
  let text = 'telemetry ping neutralized';
  if (decision.metric === 'leak') {
    state.message = 'Outbound leak path refused.';
    text = 'outbound leak path refused';
  } else if (decision.metric === 'scraper') {
    state.message = 'Scraper collection host refused.';
    text = 'scraper collection host refused';
  } else if (decision.metric === 'guardian') {
    state.guardianFlags += 1;
    state.guardianCategory = decision.category || 'Guardian rule';
    state.message = 'Guardian Protocol blocked a ' + state.guardianCategory.toLowerCase() + '. The address was not stored.';
    text = state.guardianCategory.toLowerCase() + ' blocked';
  } else {
    state.message = 'Telemetry ping neutralized.';
  }
  pushFeed('REFUSE', text);
  publish();
}

async function startProxy() {
  server = proxy.createShieldProxy((host) => {
    const decision = inspectHost(host, state.tier, {
      household: state.household,
      feedEnabled: state.threatFeed && state.tier === 'paid',
      feedHosts: state.feedHosts
    });
    if (decision.blocked) noteBlock(decision);
    return decision;
  });
  const port = await proxy.listen(server);
  state.proxyListening = true;
  route = await systemProxy.enable(port);
  state.systemProxy = !!(route && route.ok);
  state.message = state.systemProxy
    ? 'Shield active. Known collection hosts are refused before a tunnel opens.'
    : 'Shield active on this machine. System proxy was not changed, so only apps pointed at Vortex9 are covered.';
}

async function stopProxy() {
  state.guardianWatch = false;
  stopWatch();
  if (route) {
    await systemProxy.restore(route);
    route = null;
  }
  await proxy.close(server);
  server = null;
  state.proxyListening = false;
  state.systemProxy = false;
  state.shield = 'idle';
  state.message = 'Shield disengaged - monitoring paused';
}

let shieldChain = Promise.resolve();

function queueShield(active) {
  const job = shieldChain.then(() => setShield(active));
  shieldChain = job.then(() => undefined, () => undefined);
  return job;
}

function wipeSession() {
  zeroFill(sessionKey);
  sessionKey = crypto.randomBytes(32);
  zeroFill(clipDigest);
  clipDigest = Buffer.alloc(32);
  lastClip = '';
}

function probeDebugger() {
  let inspectorUrl = '';
  try {
    inspectorUrl = require('inspector').url() || '';
  } catch (err) {
    inspectorUrl = '';
  }
  return debuggerAttached(process.execArgv.concat(process.argv), process.env, inspectorUrl);
}

function lockdown() {
  if (lockedDown) return;
  lockedDown = true;
  state.creatorAdmin = false;
  state.tier = 'free';
  state.plan = null;
  state.renewsAt = '';
  state.guardianWatch = false;
  state.householdOpen = false;
  state.feedHosts = [];
  state.message = 'Safety lockdown. A debugger is attached, so paid features are closed and the shield is disengaged.';
  stopWatch();
  scheduleFeed();
  wipeSession();
  publish();
  queueShield(false);
}

function creatorDevAccess() {
  if (app.isPackaged) return null;
  try {
    const gate = require('./shield/dev-creator');
    return gate && typeof gate.enabled === 'function' ? gate.enabled() : null;
  } catch (err) {
    return null;
  }
}

function applyCreatorDev() {
  if (lockedDown) return false;
  const access = creatorDevAccess();
  if (!access) return false;
  state.creatorAdmin = true;
  if (state.tier !== 'paid') {
    state.tier = 'paid';
    state.plan = 'creator';
    state.renewsAt = '';
    state.email = access.email;
    state.message = 'Sovereign creator admin. Guardian Protocol and the threat feed are open in this local session.';
  } else if (!state.email) {
    state.email = access.email;
  }
  return true;
}

function watchDebugger() {
  if (guardTimer) clearInterval(guardTimer);
  guardTimer = setInterval(() => {
    if (probeDebugger()) lockdown();
  }, 3000);
}

async function setShield(active) {
  if (active && lockedDown) {
    state.message = 'Safety lockdown. A debugger is attached, so the shield stays disengaged.';
    publish();
    return publicState();
  }
  if (active && state.shield !== 'active') {
    state.shield = 'active';
    try {
      await startProxy();
    } catch (err) {
      state.proxyListening = false;
      state.message = 'The shield could not listen locally.';
    }
  } else if (!active && (state.shield === 'active' || server || route)) {
    await stopProxy();
  }
  publish();
  return publicState();
}

async function activate(email, licenseKey) {
  if (lockedDown) {
    state.tier = 'free';
    state.message = 'Safety lockdown. A debugger is attached, so paid features stay closed.';
    publish();
    return publicState();
  }
  const asked = String(email || '').trim().toLowerCase();
  const reference = String(licenseKey || '').trim().slice(0, 128);
  if (!asked && !reference) {
    state.message = 'Enter the account email or receipt reference. Paid features stay locked until mystic9.net verifies them.';
    publish();
    return publicState();
  }
  if (asked && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asked)) {
    state.message = 'Enter the account email used at checkout.';
    publish();
    return publicState();
  }
  const body = {};
  if (asked) body.email = asked;
  if (reference) body.licenseKey = reference;
  try {
    const res = await requestJson(LICENSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res || res.status !== 200 || !res.json || res.json.ok !== true) throw new Error('license status');
    const accepted = acceptLicense(res.json, asked, reference);
    state.email = accepted.email || asked || state.email;
    state.receipt = reference;
    state.tier = accepted.tier;
    state.plan = accepted.plan;
    state.renewsAt = accepted.renewsAt;
    if (!writeCache() && state.tier === 'paid') {
      state.message = 'Subscription checked, but this device could not encrypt the local record.';
    } else {
      state.message = state.tier === 'paid'
        ? 'Paid shield unlocked through ' + (state.renewsAt ? state.renewsAt.slice(0, 10) : 'the active term') + '.'
        : 'That email or receipt is not an active Vortex9 subscription. Paid features stay locked.';
    }
  } catch (err) {
    applyCache(readCache());
    state.message = state.tier === 'paid'
      ? 'License server unreachable. Using the last confirmed subscription.'
      : 'License server unreachable. The app stays on the free shield.';
  }
  if (state.tier !== 'paid' && applyCreatorDev()) {
    publish();
    return publicState();
  }
  if (state.tier !== 'paid') {
    state.guardianWatch = false;
    state.householdOpen = false;
    state.feedHosts = [];
    stopWatch();
    scheduleFeed();
  } else if (state.threatFeed) {
    syncThreatFeed().finally(scheduleFeed);
  }
  publish();
  return publicState();
}

function readPrefs() {
  const saved = readJsonFile(prefsPath());
  return saved && typeof saved === 'object' ? saved : {};
}

function writePrefs() {
  return writeJsonFile(prefsPath(), { threatFeed: !!state.threatFeed });
}

function loadHousehold() {
  const saved = readJsonFile(householdPath());
  return normalizeHousehold(saved || {});
}

function writeHousehold(list) {
  const rules = normalizeHousehold(list);
  if (!writeJsonFile(householdPath(), rules)) return false;
  state.household = rules;
  return true;
}

function normalizeFeedHosts(list) {
  const hosts = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((item) => {
    const host = String(item || '').trim().toLowerCase().replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || seen.has(host)) return;
    seen.add(host);
    hosts.push(host);
  });
  return hosts.slice(0, 400);
}

function readFeedCache() {
  const saved = readJsonFile(feedCachePath());
  return normalizeFeedHosts(saved && saved.hosts);
}

function packagedFeedHosts() {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'shield', 'threat-feed.json'), 'utf8'));
    return normalizeFeedHosts(saved && saved.hosts);
  } catch (err) {
    return [];
  }
}

function applyFeedHosts(hosts, note) {
  state.feedHosts = hosts;
  if (note) pushFeed('GUARDIAN', note);
}

async function syncThreatFeed() {
  if (!state.threatFeed || state.tier !== 'paid') {
    state.feedHosts = [];
    return;
  }
  try {
    const response = await requestJson(FEED_URL, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response || response.status !== 200) throw new Error('feed unavailable');
    const hosts = normalizeFeedHosts(response.json && response.json.hosts);
    if (!hosts.length) throw new Error('feed empty');
    if (!writeJsonFile(feedCachePath(), { hosts, fetchedAt: Date.now() })) throw new Error('feed not encrypted');
    applyFeedHosts(hosts, 'threat feed updated locally. ' + hosts.length + ' hosts.');
  } catch (err) {
    const cached = readFeedCache();
    if (cached.length) {
      applyFeedHosts(cached, 'threat feed kept the last local list.');
      return;
    }
    const packaged = packagedFeedHosts();
    applyFeedHosts(packaged, packaged.length
      ? 'threat feed used the copy shipped with this app.'
      : 'threat feed could not update. Baseline rules remain.');
  }
}

function scheduleFeed() {
  if (feedTimer) clearInterval(feedTimer);
  feedTimer = null;
  if (!state.threatFeed || state.tier !== 'paid') return;
  feedTimer = setInterval(() => { syncThreatFeed(); }, FEED_SYNC_MS);
}

function flagText(result) {
  if (!result || !result.flagged) return;
  state.guardianFlags += 1;
  state.guardianCategory = result.category;
  state.message = 'Guardian Protocol flagged ' + result.category.toLowerCase() + '. The text was not stored.';
  pushFeed('GUARDIAN', result.category.toLowerCase() + ' flagged. Text not stored.');
  publish();
}

function scanEphemeral(text) {
  const plain = Buffer.from(String(text || ''), 'utf8');
  if (plain.length > 8000) {
    zeroFill(plain);
    return { tooLong: true, flagged: false, category: '' };
  }
  const sample = plain.toString('utf8');
  const result = scanText(sample, state.household);
  zeroFill(plain);
  return result;
}

function stopWatch() {
  if (watchTimer) clearInterval(watchTimer);
  watchTimer = null;
  zeroFill(clipDigest);
  clipDigest = Buffer.alloc(32);
  lastClip = '';
}

function startWatch() {
  stopWatch();
  if (state.tier !== 'paid' || state.shield !== 'active' || lockedDown) return;
  clipDigest = textDigest(clipboard.readText());
  watchTimer = setInterval(() => {
    if (lockedDown || state.tier !== 'paid' || state.shield !== 'active' || !state.guardianWatch) return;
    const text = clipboard.readText();
    const digest = textDigest(text);
    if (!text || sameDigest(digest, clipDigest)) {
      zeroFill(digest);
      return;
    }
    zeroFill(clipDigest);
    clipDigest = digest;
    const result = scanEphemeral(text);
    if (!result.flagged) return;
    flagText(result);
  }, 1200);
}

function appStaticFile(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch (err) {
    return '';
  }
  if (url.protocol !== 'app:' || url.hostname !== 'vortex9') return '';
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!rel || rel.includes('\0')) return '';
  const root = path.resolve(__dirname, 'src');
  const file = path.resolve(root, rel);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return '';
  if (relative !== 'index.html' && relative !== 'styles.css' && relative !== 'renderer.js') return '';
  return file;
}

function hardenContents(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, target) => {
    if (!String(target || '').startsWith('app://vortex9/')) event.preventDefault();
  });
  contents.on('will-redirect', (event) => event.preventDefault());
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

function trustedSender(event) {
  if (!win || !event || event.sender !== win.webContents) return false;
  return String(event.sender.getURL() || '').startsWith('app://vortex9/');
}

function paused(name, limit, windowMs) {
  if (allow(name, limit, windowMs)) return '';
  state.message = PAUSE;
  publish();
  return PAUSE;
}

function createWindow() {
  win = new BrowserWindow({
    width: 740,
    height: 980,
    minWidth: 680,
    minHeight: 820,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    title: 'Vortex9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      navigateOnDragDrop: false
    }
  });
  hardenContents(win.webContents);
  win.loadURL('app://vortex9/index.html');
  win.on('closed', () => { win = null; });
}

app.on('web-contents-created', (_event, contents) => hardenContents(contents));

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const file = appStaticFile(request.url);
    if (!file) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  if (probeDebugger()) lockdown();
  else applyCache(readCache());
  if (!lockedDown) applyCreatorDev();
  watchDebugger();
  state.household = loadHousehold();
  state.threatFeed = !!readPrefs().threatFeed;
  if (state.tier === 'paid' && state.threatFeed) state.feedHosts = readFeedCache();
  createWindow();
  const cached = readCache();
  if (cached && cached.email) activate(cached.email, cached.receipt || '');
  else if (state.tier === 'paid' && state.threatFeed) {
    syncThreatFeed().finally(scheduleFeed);
  }
});

let quitting = false;
app.on('before-quit', (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  if (guardTimer) clearInterval(guardTimer);
  wipeSession();
  setShield(false).finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('vortex9:state', (event) => trustedSender(event) ? publicState() : null);
ipcMain.handle('vortex9:toggle', (event, desired) => {
  if (!trustedSender(event)) return null;
  if (paused('toggle', 30, 60000)) return publicState();
  const active = typeof desired === 'boolean' ? desired : state.shield !== 'active';
  return queueShield(active);
});
ipcMain.handle('vortex9:activate', (event, payload) => {
  if (!trustedSender(event)) return null;
  if (paused('activate', 6, 10 * 60000)) return publicState();
  return activate(payload && payload.email, payload && payload.licenseKey);
});
ipcMain.handle('vortex9:scan', (event, text) => {
  if (!trustedSender(event)) return { locked: true, flagged: false, category: '' };
  if (paused('scan', 20, 60000)) return { locked: false, flagged: false, category: '' };
  if (lockedDown || state.tier !== 'paid') return { locked: true, flagged: false, category: '' };
  const result = scanEphemeral(text);
  if (result.tooLong) {
    state.message = 'That text is too long to scan.';
    publish();
    return { locked: false, flagged: false, category: '' };
  }
  if (result.flagged) flagText(result);
  return { locked: false, flagged: result.flagged, category: result.category };
});
ipcMain.handle('vortex9:threat-feed', async (event, enabled) => {
  if (!trustedSender(event)) return null;
  if (paused('threat-feed', 6, 10 * 60000)) return publicState();
  if (state.tier !== 'paid') return publicState();
  state.threatFeed = !!enabled;
  if (!writePrefs()) {
    state.threatFeed = false;
    state.message = 'This device could not encrypt Guardian settings.';
    publish();
    return publicState();
  }
  if (state.threatFeed) {
    await syncThreatFeed();
    scheduleFeed();
  } else {
    state.feedHosts = [];
    scheduleFeed();
    pushFeed('GUARDIAN', 'threat feed off. Baseline rules remain.');
  }
  publish();
  return publicState();
});
ipcMain.handle('vortex9:household-unlock', (event, payload) => {
  if (!trustedSender(event)) return { ok: false, error: 'Confirmation expired.' };
  if (paused('household-unlock', 8, 60000)) return { ok: false, error: PAUSE };
  if (!takeGrant(payload && payload.grant)) return { ok: false, error: 'Confirmation expired.' };
  if (state.tier !== 'paid') return { ok: false, error: 'Guardian Protocol is locked on this tier.' };
  state.household = loadHousehold();
  state.householdOpen = true;
  publish();
  return { ok: true, rules: state.household };
});
ipcMain.handle('vortex9:household-lock', (event) => {
  if (!trustedSender(event)) return publicState();
  state.householdOpen = false;
  publish();
  return publicState();
});
ipcMain.handle('vortex9:household-save', (event, payload) => {
  if (!trustedSender(event)) return { ok: false, error: 'Unlock household rules first.' };
  if (paused('household-save', 20, 60000)) return { ok: false, error: PAUSE };
  if (state.tier !== 'paid' || !state.householdOpen) {
    return { ok: false, error: 'Unlock household rules first.' };
  }
  if (!writeHousehold(payload || {})) {
    return { ok: false, error: 'This device cannot encrypt household rules.' };
  }
  pushFeed('GUARDIAN', 'household rules updated locally.');
  publish();
  return { ok: true, rules: state.household };
});
ipcMain.handle('vortex9:operator-status', (event) => {
  if (!trustedSender(event)) return { enrolled: false, biometric: false };
  return {
    enrolled: !!readOperator(),
    biometric: biometricAvailable()
  };
});
ipcMain.handle('vortex9:confirm', async (event, payload) => {
  if (!trustedSender(event)) return { ok: false, error: 'Confirmation expired.' };
  if (Date.now() < confirmLockedUntil) {
    return { ok: false, error: 'Too many attempts. Wait 15 minutes and try again.' };
  }
  if (paused('confirm', 8, 60000)) return { ok: false, error: PAUSE };
  payload = payload || {};
  if (payload.biometric === true) {
    if (!biometricAvailable()) {
      return { ok: false, error: 'Device sign-in is not available. Use the operator passphrase.' };
    }
    try {
      await systemPreferences.promptTouchID('Confirm Guardian Protocol');
    } catch (err) {
      return { ok: false, error: 'Device sign-in was cancelled.' };
    }
    confirmFails = 0;
    return { ok: true, grant: issueGrant() };
  }
  const passphrase = String(payload.passphrase || '');
  if (passphrase.length < 8) return { ok: false, error: 'Use at least 8 characters.' };
  if (passphrase.length > 128) return { ok: false, error: 'Passphrase is too long.' };
  try {
    if (!readOperator()) {
      writeOperator(passphrase);
      confirmFails = 0;
      return { ok: true, grant: issueGrant() };
    }
    if (!verifyPassphrase(passphrase)) {
      confirmFails += 1;
      if (confirmFails >= 5) {
        confirmFails = 0;
        confirmLockedUntil = Date.now() + CONFIRM_LOCK_MS;
        return { ok: false, error: 'Too many attempts. Wait 15 minutes and try again.' };
      }
      return { ok: false, error: 'Passphrase does not match.' };
    }
  } catch (err) {
    return { ok: false, error: 'Passphrase could not be checked.' };
  }
  confirmFails = 0;
  return { ok: true, grant: issueGrant() };
});
ipcMain.handle('vortex9:watch', (event, payload) => {
  if (!trustedSender(event)) return null;
  if (paused('watch', 8, 60000)) return publicState();
  if (!takeGrant(payload && payload.grant)) return publicState();
  if (state.tier !== 'paid') {
    state.guardianWatch = false;
    stopWatch();
    publish();
    return publicState();
  }
  if (payload.on && state.shield !== 'active') {
    state.message = 'Turn the digital defence switch on before Guardian Protocol can watch.';
    publish();
    return publicState();
  }
  state.guardianWatch = !!payload.on;
  if (state.guardianWatch) {
    startWatch();
    state.message = 'Guardian Protocol is watching the clipboard. Flagged text is counted and not stored.';
    pushFeed('GUARDIAN', 'clipboard watch on');
  } else {
    stopWatch();
    state.message = 'Guardian Protocol watch is off.';
    pushFeed('GUARDIAN', 'clipboard watch off');
  }
  publish();
  return publicState();
});
ipcMain.handle('vortex9:subscribe', (event) => {
  if (!trustedSender(event)) return;
  if (paused('subscribe', 6, 60000)) return;
  const url = new URL(SUBSCRIBE_URL);
  if (url.protocol !== 'https:' || url.hostname !== 'mystic9.net') return;
  return shell.openExternal(url.toString());
});
ipcMain.handle('vortex9:window', (event, action) => {
  if (!trustedSender(event) || !win) return;
  if (paused('window', 30, 60000)) return;
  if (action === 'close') win.close();
  if (action === 'minimize') win.minimize();
});
