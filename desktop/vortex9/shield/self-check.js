'use strict';

const net = require('net');
const { decide } = require('./blocklists');
const { BASELINE, inspectHost, normalizeHousehold, scanText } = require('./guardian');
const { assertHttps } = require('./https');
const { acceptLicense } = require('./license-check');
const { fingerprintFromId, sameFingerprint } = require('./machine');
const { enabledFromEnv } = require('./dev-creator');
const { debuggerAttached, sameDigest, textDigest, zeroFill } = require('./runtime');
const { createLimiter } = require('./limits');
const { createShieldProxy, listen, close } = require('./proxy');
const { isSealed, open, seal } = require('./vault');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function connectStatus(port, host) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write('CONNECT ' + host + ':443 HTTP/1.1\r\nHost: ' + host + ':443\r\n\r\n');
    });
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
      if (data.includes('\r\n')) {
        socket.end();
        resolve(data.split('\r\n')[0]);
      }
    });
    socket.on('error', reject);
  });
}

async function main() {
  assert(decide('www.google-analytics.com', 'free').blocked, 'free tier blocks telemetry');
  assert(decide('www.google-analytics.com', 'free').metric === 'telemetry', 'telemetry metric');
  assert(!decide('api.scraperapi.com', 'free').blocked, 'free tier leaves scrapers locked');
  assert(decide('api.scraperapi.com', 'paid').metric === 'scraper', 'paid tier blocks scrapers');
  assert(!decide('pastebin.com', 'free').blocked, 'free tier leaves leak defense locked');
  assert(decide('pastebin.com', 'paid').metric === 'leak', 'paid tier blocks leak hosts');
  assert(!decide('example.com', 'paid').blocked, 'ordinary hosts stay open');

  assert(scanText('please do not tell your parents').flagged, 'guardian flags secrecy pressure');
  assert(scanText('how old are you').category === 'Age solicitation', 'guardian flags age solicitation');
  assert(!scanText('the shield is idle').flagged, 'ordinary text stays clear');
  assert(Object.isFrozen(BASELINE.text), 'baseline text rules are immutable');
  assert(Object.isFrozen(BASELINE.adultHosts), 'baseline adult hosts are immutable');
  assert(Object.isFrozen(BASELINE.predatoryHosts), 'baseline predatory hosts are immutable');
  assert(Object.isFrozen(BASELINE.tracking), 'baseline tracking hosts are immutable');
  assert(inspectHost('www.google-analytics.com', 'free').metric === 'telemetry', 'unified scan keeps telemetry');
  assert(inspectHost('www.pornhub.com', 'paid').category === 'Adult content host', 'baseline adult host');
  assert(!inspectHost('www.pornhub.com', 'free').blocked, 'free tier leaves guardian hosts locked');
  assert(inspectHost('chatroulette.com', 'paid').category === 'Predatory host', 'baseline predatory host');
  assert(inspectHost('cdn.taboola.com', 'paid', { feedEnabled: true, feedHosts: ['taboola.com'] }).category === 'Threat feed host', 'feed host');
  assert(!inspectHost('cdn.taboola.com', 'paid', { feedEnabled: false, feedHosts: ['taboola.com'] }).blocked, 'feed stays off until opted in');
  assert(inspectHost('notes.example.com', 'paid', { household: { urls: ['https://notes.example.com/path'] } }).category === 'Household URL', 'household url');
  assert(scanText('please finish the homework', { keywords: ['homework'] }).category === 'Household keyword', 'household keyword');
  assert(!scanText('the shield is idle', { keywords: ['homework'] }).flagged, 'ordinary text stays clear with household rules');
  const saved = normalizeHousehold({ keywords: ['ab', 'homework', 'homework'], urls: ['javascript:alert(1)', 'https://notes.example.com/a'] });
  assert(saved.keywords.length === 1 && saved.keywords[0] === 'homework', 'short and duplicate keywords drop');
  assert(saved.urls.length === 1 && saved.urls[0] === 'notes.example.com', 'urls store the site name');

  const key = Buffer.alloc(32, 7);
  const sealed = seal(JSON.stringify({ tier: 'paid' }), key);
  assert(isSealed(sealed), 'local records use the vault header');
  assert(JSON.parse(open(sealed, key)).tier === 'paid', 'aes-256-gcm round trip');
  const tampered = Buffer.from(sealed);
  tampered[tampered.length - 1] ^= 1;
  assert(open(tampered, key) === null, 'tampered vault records stay closed');
  assert(open(sealed, Buffer.alloc(32, 9)) === null, 'a different key cannot open the vault');

  const allow = createLimiter();
  assert(allow('confirm', 3, 1000, 1000), 'first attempt allowed');
  assert(allow('confirm', 3, 1000, 1001), 'second attempt allowed');
  assert(allow('confirm', 3, 1000, 1002), 'third attempt allowed');
  assert(!allow('confirm', 3, 1000, 1003), 'fourth attempt is rate limited');
  assert(allow('confirm', 3, 1000, 2500), 'attempts resume after the window');

  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'month', email: 'a@b.co', renewsAt: future }, 'a@b.co').tier === 'paid', 'paid license requires a live term');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'month', email: 'a@b.co', renewsAt: past }, 'a@b.co').tier === 'free', 'expired license stays closed');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'month', email: 'other@b.co', renewsAt: future }, 'a@b.co').tier === 'free', 'license email must match');
  assert(acceptLicense({ ok: false, tier: 'paid', active: true, plan: 'year', renewsAt: future }, 'a@b.co').tier === 'free', 'unconfirmed license stays closed');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'year', email: 'a@b.co', renewsAt: future, receiptMatched: true }, 'a@b.co', 'cs_live_abc').tier === 'paid', 'a matched receipt can unlock');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'year', email: 'a@b.co', renewsAt: future, receiptMatched: false }, 'a@b.co', 'shared').tier === 'free', 'an unmatched receipt stays closed');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'year', email: 'a@b.co', renewsAt: future }, 'a@b.co', 'shared').tier === 'free', 'a receipt without a match flag stays closed');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'citadel', email: 'a@b.co', renewsAt: future }, 'a@b.co').tier === 'paid', 'business pack unlocks the sovereign package');
  assert(acceptLicense({ ok: true, tier: 'paid', active: true, plan: 'citadel', email: 'a@b.co', renewsAt: past }, 'a@b.co').tier === 'free', 'expired business pack stays closed');
  let tlsRejected = false;
  try { assertHttps('http://mystic9.net/api/vortex9-license'); } catch (err) { tlsRejected = true; }
  assert(tlsRejected, 'plain http is refused');
  assert(assertHttps('https://mystic9.net/api/vortex9-license').hostname === 'mystic9.net', 'https license host is accepted');
  const bound = fingerprintFromId('machine-a', 'win32');
  const other = fingerprintFromId('machine-b', 'win32');
  assert(bound.length === 64 && sameFingerprint(bound, bound), 'a license binds to its machine');
  assert(!sameFingerprint(bound, other), 'a copied license does not match another machine');
  assert(fingerprintFromId('', 'win32') === '', 'a missing machine id stays unbound');
  assert(debuggerAttached(['--inspect-brk=9229'], {}, ''), 'an inspect flag is a debugger');
  assert(!debuggerAttached(['electron', '.'], {}, ''), 'a normal launch is not a debugger');
  const secret = Buffer.from('scan text');
  assert(zeroFill(secret) && secret.every((byte) => byte === 0), 'a scan buffer is wiped');
  const digest = textDigest('household note');
  assert(sameDigest(digest, textDigest('household note')), 'clipboard checks compare a digest');
  assert(decide('example.com', 'free').blocked === false, 'local defence still decides with no network');
  assert(enabledFromEnv({ V9_DEV_CREATOR_EMAIL: 'zen3845@outlook.com' }).email === 'zen3845@outlook.com', 'creator email flag opens a local session');
  assert(enabledFromEnv({ V9_SOVEREIGN_BYPASS: 'true' }).email === 'zen3845@outlook.com', 'dev bypass flag opens a local session');
  assert(enabledFromEnv({ V9_DEV_CREATOR_EMAIL: 'other@outlook.com' }) === null, 'another email stays closed');
  assert(enabledFromEnv({}) === null, 'a missing dev flag stays closed');

  const server = createShieldProxy((host) => inspectHost(host, 'paid', {
    feedEnabled: true,
    feedHosts: ['taboola.com']
  }));
  const port = await listen(server);
  const blocked = await connectStatus(port, 'www.google-analytics.com');
  assert(blocked.indexOf('403') !== -1, 'proxy refuses a telemetry tunnel');
  const adult = await connectStatus(port, 'www.pornhub.com');
  assert(adult.indexOf('403') !== -1, 'proxy refuses a baseline adult host');
  const feed = await connectStatus(port, 'cdn.taboola.com');
  assert(feed.indexOf('403') !== -1, 'proxy refuses an opted-in feed host');
  assert(!inspectHost('example.com', 'paid', { feedEnabled: true, feedHosts: ['taboola.com'] }).blocked, 'unified scan leaves an ordinary host open');
  await close(server);
  console.log('vortex9 shield self-check passed');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
