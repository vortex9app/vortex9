'use strict';

const TELEMETRY = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'googleadservices.com',
  'scorecardresearch.com',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'segment.com',
  'sentry.io',
  'hotjar.com',
  'fullstory.com',
  'mouseflow.com',
  'crazyegg.com',
  'ads.twitter.com',
  'analytics.tiktok.com',
  'app-measurement.com'
];

const SCRAPERS = [
  'diffbot.com',
  'scrapingbee.com',
  'brightdata.com',
  'oxylabs.io',
  'zyte.com',
  'crawlbase.com',
  'scraperapi.com',
  'dataforseo.com',
  'similarweb.com',
  'ahrefs.com'
];

const LEAKS = [
  'pastebin.com',
  'transfer.sh',
  'file.io',
  'anonfiles.com',
  'gofile.io'
];

Object.freeze(TELEMETRY);
Object.freeze(SCRAPERS);
Object.freeze(LEAKS);

function hostOf(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function listed(host, domains) {
  return domains.some((domain) => host === domain || host.endsWith('.' + domain));
}

function decide(host, tier) {
  const name = hostOf(host);
  if (!name) return { blocked: false, metric: null };
  if (listed(name, TELEMETRY)) return { blocked: true, metric: 'telemetry' };
  if (tier === 'paid' && listed(name, SCRAPERS)) return { blocked: true, metric: 'scraper' };
  if (tier === 'paid' && listed(name, LEAKS)) return { blocked: true, metric: 'leak' };
  return { blocked: false, metric: null };
}

module.exports = { decide, TELEMETRY, SCRAPERS, LEAKS };
