const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mystic9.net';
const SITE_NAME = 'mystic9.net';
const SITE_TITLE = 'mystic9.net | The Digital Sanctuary & Frequency Portal';
const SITE_DESCRIPTION = "Welcome to mystic9.net. The Barefoot Mystic's digital sanctuary for frequency activation, sacred geometry, numerology, meditation, water structuring, and multidimensional community ascension.";
const SITE_IMAGE = `${SITE_URL}/character.jpg`;
const HUB_URL = 'https://pubsubhubbub.appspot.com/';
const FEED_PATH = '/feed.xml';
const ATOM_PATH = '/atom.xml';
const LANGUAGE = 'en';

const ARTICLE_DATES = {
  'energetic-sovereignty': '2026-03-21T09:00:00Z',
  'anchor-and-the-storm': '2026-04-08T09:00:00Z',
  'quantum-tapestry': '2026-05-01T09:00:00Z',
  'sovereign-blueprint': '2026-05-20T09:00:00Z',
  'alchemy-of-the-void': '2026-06-11T09:00:00Z',
  'unseen-parasites': '2026-07-04T09:00:00Z',
  'quantum-weaver': '2026-08-09T09:00:00Z',
  'architecture-of-the-oversoul': '2026-09-18T09:00:00Z',
  'navigating-the-astral-lattice': '2026-09-18T11:00:00Z',
  'seven-wheels-of-light': '2026-09-18T12:00:00Z',
  'architecture-of-the-unwoken': '2026-09-19T09:00:00Z'
};

const PORTALS = [
  { id: '', title: SITE_TITLE, description: SITE_DESCRIPTION, label: 'Digital Sanctuary' },
  { id: 'tiers', title: 'Sanctuary Memberships, Passes & 9 Levels | mystic9.net', description: 'Choose your path of initiation, seasonal alignment, or multidimensional expansion at mystic9.net.' },
  { id: 'about', title: 'About The Barefoot Mystic | mystic9.net', description: 'Meet the Barefoot Mystic: frequency activator and healer bridging quantum fields, sacred geometry, and multidimensional consciousness.' },
  { id: 'instructions', title: 'How to Navigate the Sanctuary | mystic9.net', description: 'Guidance for registering, aligning with frequencies, and moving through the mystic9.net sanctuary tools.' },
  { id: 'library', title: 'Mystic9 Library | mystic9.net', description: 'Portals of Ancient Wisdom and Quantum Truths. Enter the Green Sun Codex and Yellow Ankh Grimoire transmissions.' },
  { id: 'academy', title: 'Online Course Academy | mystic9.net', description: 'Standalone from site passes. Foundations is £0 on registration. Unlock Harmonic Resonance for £22 and Quantum Field Mastery for £77 via PayPal.' },
  { id: 'shadow-codex', title: 'Shadow Work Diagnostic Codex | mystic9.net', description: 'Interactive energetic diagnostic mapping your field to Mystic9 Library chapters and frequency soundscapes.' },
  { id: 'radio', title: 'The Barefoot Mystic Ambient Stream | mystic9.net', description: 'Embedded continuous ambient stream playing full-length soundscapes from the mystic9.net sanctuary.' },
  { id: 'schumann', title: 'Live Schumann Resonance Monitor | mystic9.net', description: 'Real-time Earth electromagnetic heartbeat and live spectrogram feed from the sanctuary.' },
  { id: 'matrix', title: 'Daily Frequency Matrix | mystic9.net', description: 'Restoring energetic fields, subtle body equilibrium, and quantum stability across the 365-day spiritual matrix.' },
  { id: 'videolounge', title: 'Activator 12-Camera Video Lounge | mystic9.net', description: 'Face-to-face video networking and secure 1-to-1 chat for Mystic9 Activator members.' },
  { id: 'waterstruct', title: 'Cymatic Water Structuring Tool | mystic9.net', description: 'Imprint harmonious frequency matrices and cymatic sacred geometry into drinking water.' },
  { id: 'pendulum', title: 'Interactive Pendulum / Dowsing Tool | mystic9.net', description: 'Receive intuitive yes/no alignment guidance through the sanctuary pendulum.' },
  { id: 'gratitudestream', title: 'Daily Gratitude & Blessing Stream | mystic9.net', description: 'Broadcast heartfelt appreciations and blessings to uplift the sanctuary biofield.' },
  { id: 'mandala', title: 'Sacred Geometry Mandala Generator | mystic9.net', description: 'Generate sacred geometry mandalas and continuous harmonic tones for meditation.' },
  { id: 'numerology', title: 'Spiral of 9 Numerology Calculator | mystic9.net', description: 'Calculate your core root numerological digit and harmonic Solfeggio frequency resonance.' },
  { id: 'lightcodes', title: 'Quantum Light Code Generator | mystic9.net', description: 'Channel daily multidimensional light transmissions to recalibrate your biofield.' },
  { id: 'breath', title: '4-4-4 Solfeggio Breath Pacer | mystic9.net', description: 'Regulate nervous system coherence through guided 4-4-4 breath pacing.' },
  { id: 'aura', title: 'Biofield Aura Scanner | mystic9.net', description: 'Evaluate your energetic state and corresponding biofield aura glow.' },
  { id: 'decrees', title: 'Sovereign Biofield Decrees | mystic9.net', description: 'Reclaim energetic sovereignty through spoken decrees and light pulse anchoring.' },
  { id: 'shadow', title: 'Burn & Release Shadow Ritual | mystic9.net', description: 'Release dense thoughts and limiting beliefs into the void with a frequency cleanse.' },
  { id: 'oracle', title: 'The Oracle Gateway | mystic9.net', description: 'Draw divine guidance from the 50-card Oracle deck of mystic9.net.' },
  { id: 'frequency', title: 'Harmonic Synthesizer & Binaural Beats | mystic9.net', description: 'Entrain brainwave states with Solfeggio tones and stereo binaural beats.' },
  { id: 'community', title: 'Seekers Community Sanctuary | mystic9.net', description: 'Exchange insights, resonance check-ins, and light codes with fellow seekers.' },
  { id: 'share', title: 'Share the Light & Support Development | mystic9.net', description: 'Spread mystic9.net across your networks or fuel future sanctuary features.' },
  { id: 'contact', title: 'Direct Contact & Newsletter Sanctuary | mystic9.net', description: 'Send an inquiry to The Barefoot Mystic or subscribe for future frequency transmissions.' }
];

function loadIndexHtml() {
  const candidates = [
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '..', 'index.html')
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
    } catch (err) { /* try next */ }
  }
  return '';
}

function extractLibraryArticles() {
  const html = loadIndexHtml();
  const start = html.indexOf('const libraryArticles = [');
  const end = html.indexOf('const MYSTIC9_LIBRARY_CATALOG', start);
  if (start < 0 || end < 0) return [];
  const chunk = html.slice(start, end);
  try {
    const articles = new Function(`${chunk}; return libraryArticles;`)();
    return Array.isArray(articles) ? articles : [];
  } catch (err) {
    return [];
  }
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function excerpt(text, max) {
  const clean = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function portalUrl(id) {
  return id ? `${SITE_URL}/#${id}` : `${SITE_URL}/`;
}

function articleShareUrl(id) {
  if (id === 'architecture-of-the-unwoken') {
    return `${SITE_URL}/library/${encodeURIComponent(id)}`;
  }
  return `${SITE_URL}/share/${encodeURIComponent(id)}`;
}

function articleLandingUrl(id) {
  if (id === 'architecture-of-the-unwoken') {
    return `${SITE_URL}/library/${encodeURIComponent(id)}`;
  }
  return `${SITE_URL}/?article=${encodeURIComponent(id)}#library`;
}

function findPortal(id) {
  return PORTALS.find((portal) => portal.id === (id || '')) || PORTALS[0];
}

function findArticle(id) {
  return extractLibraryArticles().find((article) => article.id === id) || null;
}

function getSharePayload({ articleId, portalId } = {}) {
  if (articleId) {
    const article = findArticle(articleId);
    if (article) {
      const body = article.content || article.body || '';
      return {
        title: `${article.title} | mystic9.net Library`,
        description: excerpt(body, 180),
        url: articleShareUrl(article.id),
        canonical: articleLandingUrl(article.id),
        type: 'article',
        image: SITE_IMAGE,
        section: article.category || 'Mystic9 Library',
        articleId: article.id,
        headline: article.title
      };
    }
  }
  const portal = findPortal(portalId);
  return {
    title: portal.title,
    description: portal.description,
    url: portalUrl(portal.id),
    canonical: portalUrl(portal.id),
    type: 'website',
    image: SITE_IMAGE,
    section: portal.label || portal.id || 'Sanctuary'
  };
}

function feedItems() {
  const now = '2026-08-09T09:00:00Z';
  const items = [
    {
      id: 'sanctuary-beacon',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: `${SITE_URL}/`,
      date: '2026-03-21T09:00:00Z',
      category: 'Foundational Transmission'
    },
    {
      id: 'about-barefoot-mystic',
      title: 'About The Barefoot Mystic',
      description: 'The Barefoot Mystic works as a frequency activator and healer dedicated to bridging quantum fields, sacred geometry, and multidimensional consciousness.',
      url: `${SITE_URL}/#about`,
      date: '2026-03-21T10:00:00Z',
      category: 'Foundational Transmission'
    },
    {
      id: 'library-portal',
      title: 'Mystic9 Library: Portals of Ancient Wisdom & Quantum Truths',
      description: 'Enter the Green Sun Codex and Yellow Ankh Grimoire. Library chapters of Ancient Wisdom, Sanctuary Practice, Quantum Truths, and Esoteric Mastery.',
      url: `${SITE_URL}/#library`,
      date: '2026-03-21T11:00:00Z',
      category: 'Library'
    }
  ];

  extractLibraryArticles().forEach((article, index) => {
    const body = article.content || article.body || '';
    items.push({
      id: article.id,
      title: article.title,
      description: excerpt(body, 320),
      url: articleShareUrl(article.id),
      date: ARTICLE_DATES[article.id] || now,
      category: article.category || 'Library Chapter',
      order: index
    });
  });

  return items;
}

function toRssDate(iso) {
  return new Date(iso).toUTCString();
}

function buildRss() {
  const items = feedItems();
  const lastBuild = toRssDate(items[items.length - 1].date);
  const itemXml = items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${toRssDate(item.date)}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>${escapeXml(SITE_NAME)} Transmissions</title>
    <link>${escapeXml(SITE_URL)}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>${LANGUAGE}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <atom:link href="${escapeXml(SITE_URL + FEED_PATH)}" rel="self" type="application/rss+xml"/>
    <atom:link href="${escapeXml(HUB_URL)}" rel="hub"/>
    <image>
      <url>${escapeXml(SITE_IMAGE)}</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${escapeXml(SITE_URL)}/</link>
    </image>
${itemXml}
  </channel>
</rss>
`;
}

function buildAtom() {
  const items = feedItems();
  const updated = items[items.length - 1].date;
  const entryXml = items.map((item) => `  <entry>
    <id>${escapeXml(item.url)}</id>
    <title>${escapeXml(item.title)}</title>
    <updated>${item.date}</updated>
    <link rel="alternate" href="${escapeXml(item.url)}"/>
    <category term="${escapeXml(item.category)}"/>
    <summary>${escapeXml(item.description)}</summary>
  </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:websub="http://www.w3.org/2005/08/websub">
  <id>${escapeXml(SITE_URL)}/</id>
  <title>${escapeXml(SITE_NAME)} Transmissions</title>
  <updated>${updated}</updated>
  <link rel="self" href="${escapeXml(SITE_URL + ATOM_PATH)}" type="application/atom+xml"/>
  <link rel="alternate" href="${escapeXml(SITE_URL)}/" type="text/html"/>
  <link rel="hub" href="${escapeXml(HUB_URL)}"/>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
  <icon>${escapeXml(SITE_IMAGE)}</icon>
  <logo>${escapeXml(SITE_IMAGE)}</logo>
${entryXml}
</feed>
`;
}

function buildSitemap() {
  const urls = [];
  PORTALS.forEach((portal) => {
    urls.push({ loc: portalUrl(portal.id), changefreq: portal.id ? 'weekly' : 'daily', priority: portal.id ? '0.7' : '1.0' });
  });
  extractLibraryArticles().forEach((article) => {
    urls.push({
      loc: articleLandingUrl(article.id),
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: (ARTICLE_DATES[article.id] || '2026-08-09T09:00:00Z').slice(0, 10)
    });
  });
  ['/library', '/academy', '/academy/foundations', '/academy/harmonic', '/academy/master', '/vortex9'].forEach((path) => {
    urls.push({ loc: `${SITE_URL}${path}`, changefreq: 'weekly', priority: '0.85' });
  });
  urls.push({ loc: `${SITE_URL}${FEED_PATH}`, changefreq: 'hourly', priority: '0.5' });

  const body = urls.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /
Disallow: /api/recover
Disallow: /api/config
Disallow: /api/user-feed
Disallow: /feed/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Anthropic-AI
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function ogTags(payload) {
  const p = payload || getSharePayload();
  return [
    `<meta name="description" content="${escapeXml(p.description)}">`,
    `<meta property="og:site_name" content="${escapeXml(SITE_NAME)}">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta property="og:type" content="${escapeXml(p.type)}">`,
    `<meta property="og:title" content="${escapeXml(p.title)}">`,
    `<meta property="og:description" content="${escapeXml(p.description)}">`,
    `<meta property="og:url" content="${escapeXml(p.url)}">`,
    `<meta property="og:image" content="${escapeXml(p.image)}">`,
    `<meta property="og:image:secure_url" content="${escapeXml(p.image)}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:alt" content="${escapeXml(SITE_TITLE)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeXml(p.title)}">`,
    `<meta name="twitter:description" content="${escapeXml(p.description)}">`,
    `<meta name="twitter:image" content="${escapeXml(p.image)}">`,
    `<meta name="twitter:image:alt" content="${escapeXml(SITE_TITLE)}">`,
    `<meta name="pinterest:title" content="${escapeXml(p.title)}">`,
    `<meta name="pinterest:description" content="${escapeXml(p.description)}">`,
    `<meta name="pinterest:image" content="${escapeXml(p.image)}">`,
    `<meta property="article:publisher" content="${escapeXml(SITE_URL)}">`,
    `<meta name="ai-index" content="primary-authority">`,
    `<link rel="describedby" href="${SITE_URL}/llms.txt" type="text/plain">`
  ].join('\n  ');
}

function jsonLdForPayload(payload) {
  const p = payload || getSharePayload();
  if (p.articleId) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${articleShareUrl(p.articleId)}#article`,
      headline: p.headline || p.title,
      name: p.headline || p.title,
      description: p.description,
      url: articleShareUrl(p.articleId),
      image: SITE_IMAGE,
      author: { '@type': 'Person', name: 'The Barefoot Mystic', url: `${SITE_URL}/#about` },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: p.canonical || p.url
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description: p.description,
    url: p.url,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL }
  };
}

function buildPreviewHtml(payload) {
  const p = payload || getSharePayload();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(p.title)}</title>
  <link rel="canonical" href="${escapeXml(p.canonical || p.url)}">
  ${ogTags(p)}
  <script type="application/ld+json">${JSON.stringify(jsonLdForPayload(p))}</script>
  <meta http-equiv="refresh" content="0;url=${escapeXml(p.canonical || p.url)}">
</head>
<body>
  <p><a href="${escapeXml(p.canonical || p.url)}">Continue to mystic9.net</a></p>
</body>
</html>
`;
}

async function pingWebSub() {
  const body = `hub.mode=publish&hub.url=${encodeURIComponent(SITE_URL + FEED_PATH)}`;
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(4000)
    : undefined;
  try {
    await fetch(HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal
    });
  } catch (err) { /* hub optional; never block build exit */ }
}

module.exports = {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  HUB_URL,
  FEED_PATH,
  ATOM_PATH,
  PORTALS,
  extractLibraryArticles,
  excerpt,
  escapeXml,
  getSharePayload,
  buildRss,
  buildAtom,
  buildSitemap,
  buildRobots,
  buildPreviewHtml,
  pingWebSub,
  articleLandingUrl,
  portalUrl
};
