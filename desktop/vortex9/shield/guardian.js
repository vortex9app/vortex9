'use strict';

const { decide, TELEMETRY } = require('./blocklists');

const RULES = Object.freeze([
  { id: 'secrecy', label: 'Secrecy pressure', pattern: /(?:do not|don'?t) tell (?:your )?(?:mum|mom|parents|dad|guardian)/i },
  { id: 'age-ask', label: 'Age solicitation', pattern: /\b(how old are you|are you home alone|what grade are you in)\b/i },
  { id: 'explicit', label: 'Age-inappropriate sexual language', pattern: /\b(porn|nudes?|sext(?:ing)?|xxx|nsfw|onlyfans)\b/i },
  { id: 'offplatform', label: 'Off-platform secrecy lure', pattern: /\b(snap(?:chat)?|kik|telegram|whatsapp|discord)\b[\s\S]{0,48}\b(secret|delete (?:this|the) (?:chat|message)|don'?t tell)\b/i }
]);

const ADULT_HOSTS = Object.freeze([
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'onlyfans.com'
]);

const PREDATORY_HOSTS = Object.freeze([
  'chatroulette.com',
  'omegle.com'
]);

const BASELINE = Object.freeze({
  text: RULES,
  tracking: Object.freeze(TELEMETRY.slice()),
  adultHosts: ADULT_HOSTS,
  predatoryHosts: PREDATORY_HOSTS
});

function hostOf(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function listed(host, domains) {
  return domains.some((domain) => host === domain || host.endsWith('.' + domain));
}

function emptyHousehold() {
  return { keywords: [], urls: [] };
}

function normalizeHousehold(input) {
  const keywords = [];
  const urls = [];
  const seenWords = new Set();
  const seenHosts = new Set();
  const source = input || {};
  const words = Array.isArray(source.keywords) ? source.keywords : [];
  const addresses = Array.isArray(source.urls) ? source.urls : [];
  words.forEach((item) => {
    const word = String(item || '').trim().replace(/\s+/g, ' ');
    const key = word.toLowerCase();
    if (word.length < 4 || word.length > 64) return;
    if (/[\r\n]/.test(word) || seenWords.has(key)) return;
    seenWords.add(key);
    keywords.push(word);
  });
  addresses.forEach((item) => {
    const host = hostFromRule(item);
    if (!host || seenHosts.has(host)) return;
    seenHosts.add(host);
    urls.push(host);
  });
  return {
    keywords: keywords.slice(0, 100),
    urls: urls.slice(0, 100)
  };
}

function hostFromRule(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw.length > 200) return '';
  if (raw.startsWith('javascript:') || raw.startsWith('data:')) return '';
  let host = raw;
  try {
    host = new URL(raw.includes('://') ? raw : 'https://' + raw).hostname;
  } catch (err) {
    host = raw.split('/')[0];
  }
  host = hostOf(host).replace(/:\d+$/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return '';
  if (host === 'localhost' || host.endsWith('.localhost')) return '';
  return host;
}

function literalHit(sample, raw) {
  const word = String(raw || '').trim();
  if (word.length < 4 || word.length > 64) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = word.includes(' ') ? new RegExp(escaped, 'i') : new RegExp('\\b' + escaped + '\\b', 'i');
  return pattern.test(sample);
}

function scanText(text, household) {
  const sample = String(text || '');
  if (!sample.trim()) return { flagged: false, category: '' };
  for (const rule of BASELINE.text) {
    if (rule.pattern.test(sample)) return { flagged: true, category: rule.label };
  }
  const rules = normalizeHousehold(household);
  for (const word of rules.keywords) {
    if (literalHit(sample, word)) return { flagged: true, category: 'Household keyword' };
  }
  const lower = sample.toLowerCase();
  for (const host of rules.urls) {
    if (lower.includes(host)) return { flagged: true, category: 'Household URL' };
  }
  return { flagged: false, category: '' };
}

function matchHost(host, options) {
  const name = hostOf(host);
  const settings = options || {};
  if (!name) return { blocked: false, category: '' };
  if (listed(name, BASELINE.adultHosts)) return { blocked: true, category: 'Adult content host' };
  if (listed(name, BASELINE.predatoryHosts)) return { blocked: true, category: 'Predatory host' };
  if (settings.feedEnabled && listed(name, settings.feedHosts || [])) {
    return { blocked: true, category: 'Threat feed host' };
  }
  const rules = normalizeHousehold(settings.household);
  if (listed(name, rules.urls)) return { blocked: true, category: 'Household URL' };
  return { blocked: false, category: '' };
}

function inspectHost(host, tier, options) {
  const network = decide(host, tier);
  if (network.blocked) return network;
  if (tier !== 'paid') return { blocked: false, metric: null, category: '' };
  const hit = matchHost(host, options);
  if (!hit.blocked) return { blocked: false, metric: null, category: '' };
  return { blocked: true, metric: 'guardian', category: hit.category };
}

module.exports = {
  BASELINE,
  emptyHousehold,
  normalizeHousehold,
  scanText,
  matchHost,
  inspectHost
};
