const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getFeedStoreSupabase, readJsonBody } = require('./_supabase');
const { SITE_URL, extractLibraryArticles, excerpt, escapeXml } = require('./_syndication');

const FEED_DIR = path.join(process.cwd(), 'content', 'user-feeds');
const TOKEN_RE = /^[a-f0-9]{48,96}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,47}$/;

function isAllowedOrigin(origin) {
  return /^https:\/\/([a-z0-9-]+\.)?mystic9\.net$/i.test(origin)
    || /^http:\/\/localhost(?::\d+)?$/i.test(origin)
    || /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function hashesMatch(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readQuery(req) {
  try {
    return new URL(req.url, SITE_URL).searchParams;
  } catch (err) {
    return new URLSearchParams();
  }
}

function clampText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeLink(raw) {
  const value = String(raw || '').trim();
  if (!value) return `${SITE_URL}/`;
  if (value.startsWith('/')) return `${SITE_URL}${value}`;
  try {
    const parsed = new URL(value);
    if (!/^(www\.)?mystic9\.net$/i.test(parsed.hostname)) return `${SITE_URL}/`;
    return parsed.toString();
  } catch (err) {
    return `${SITE_URL}/`;
  }
}

function sanitizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const title = clampText(item.title, 180);
  if (!title) return null;
  return {
    guid: clampText(item.guid, 160) || hashToken(title).slice(0, 16),
    title,
    description: clampText(String(item.description || '').replace(/<[^>]+>/g, ' '), 500),
    link: safeLink(item.link),
    date: item.date && !Number.isNaN(Date.parse(item.date)) ? new Date(item.date).toISOString() : new Date().toISOString(),
    category: clampText(item.category, 80) || 'Sanctuary',
    visibility: item.visibility === 'public' ? 'public' : 'private'
  };
}

function sanitizePayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(source.items) ? source.items.map(sanitizeItem).filter(Boolean).slice(0, 40) : [];
  return {
    displayName: clampText(source.displayName, 48) || 'Seeker',
    level: Math.min(9, Math.max(1, Number(source.level) || 1)),
    path: clampText(source.path, 24) || 'free',
    updatedAt: new Date().toISOString(),
    items
  };
}

function filePathFor(slug) {
  return path.join(FEED_DIR, `${slug}.json`);
}

function readFileStore(slug) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePathFor(slug), 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch (err) {
    return null;
  }
}

function writeFileStore(slug, record) {
  fs.mkdirSync(FEED_DIR, { recursive: true });
  fs.writeFileSync(filePathFor(slug), JSON.stringify(record));
}

async function readStore(slug, token) {
  const file = readFileStore(slug);
  const { supabase } = getFeedStoreSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.rpc('read_user_feed', {
        p_slug: slug,
        p_token: token || ''
      });
      if (data && typeof data === 'object') {
        return {
          tokenHash: data.tokenHash || data.token_hash || '',
          isPublic: !!(data.isPublic || data.is_public),
          payload: data.payload || {},
          updatedAt: data.updatedAt || data.updated_at,
          tokenOk: !!data.tokenOk
        };
      }
    } catch (err) { /* RPC optional */ }
    try {
      const { data } = await supabase.from('user_feeds').select('token_hash, payload, is_public, updated_at').eq('user_slug', slug).maybeSingle();
      if (data) {
        return {
          tokenHash: data.token_hash,
          isPublic: !!data.is_public,
          payload: data.payload || {},
          updatedAt: data.updated_at
        };
      }
    } catch (err) { /* table optional */ }
  }
  return file;
}

async function writeStore(slug, record) {
  try {
    writeFileStore(slug, record);
  } catch (err) { /* Vercel filesystem may be read-only */ }
  const { supabase } = getFeedStoreSupabase();
  if (!supabase) return;
  try {
    await supabase.rpc('publish_user_feed', {
      p_slug: slug,
      p_token_hash: record.tokenHash,
      p_payload: record.payload,
      p_public: !!record.isPublic
    });
  } catch (err) { /* RPC optional */ }
  try {
    await supabase.from('user_feeds').upsert({
      user_slug: slug,
      token_hash: record.tokenHash,
      payload: record.payload,
      is_public: !!record.isPublic,
      updated_at: record.updatedAt || new Date().toISOString()
    }, { onConflict: 'user_slug' });
  } catch (err) { /* table optional until SQL is applied */ }
}

function publicLibraryFallback(displayName) {
  const articles = extractLibraryArticles().slice(0, 6);
  return articles.map((article) => ({
    guid: `lib-${article.id}`,
    title: article.title,
    description: excerpt(article.content || article.body || '', 240),
    link: `${SITE_URL}/library/${encodeURIComponent(article.id)}`,
    date: new Date().toISOString(),
    category: article.category || 'Library',
    visibility: 'public'
  })).concat([{
    guid: 'welcome',
    title: `${displayName} is walking mystic9.net`,
    description: 'This public seeker channel carries sanctuary transmissions. Private pins and Academy notes stay behind a feed token.',
    link: `${SITE_URL}/#library`,
    date: new Date().toISOString(),
    category: 'Profile',
    visibility: 'public'
  }]);
}

function buildUserRss({ slug, payload, selfUrl, privateUnlocked }) {
  const name = payload.displayName || 'Seeker';
  const items = payload.items && payload.items.length
    ? payload.items
    : (privateUnlocked ? [] : publicLibraryFallback(name));
  const last = items[0] && items[0].date ? items[0].date : new Date().toISOString();
  const itemXml = items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(`${slug}:${item.guid}`)}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`).join('\n');

  const subtitle = privateUnlocked
    ? `Private sanctuary feed for ${name}. Library pins, Academy milestones, and profile notes.`
    : `Public sanctuary channel for ${name}. Private items are withheld.`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${name} · mystic9.net`)}</title>
    <link>${escapeXml(`${SITE_URL}/feed/${encodeURIComponent(slug)}`)}</link>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(subtitle)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(last).toUTCString()}</lastBuildDate>
${itemXml}
  </channel>
</rss>
`;
}

function sendXml(res, xml, privateFeed) {
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', privateFeed ? 'private, no-store' : 'public, max-age=180, must-revalidate');
  res.status(200).send(xml);
}

function sendDenied(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(404).json({ message: 'Feed not found' });
}

module.exports = async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST') {
    if (origin && !isAllowedOrigin(origin)) {
      res.status(403).json({ message: 'Origin not allowed' });
      return;
    }
    const body = readJsonBody(req);
    const slug = String(body.slug || body.user || '').trim().toLowerCase();
    const token = String(body.token || '').trim().toLowerCase();
    if (!SLUG_RE.test(slug) || !TOKEN_RE.test(token)) {
      res.status(400).json({ message: 'A valid seeker slug and feed token are required.' });
      return;
    }
    const payload = sanitizePayload(body.payload);
    const record = {
      tokenHash: hashToken(token),
      isPublic: !!body.isPublic,
      payload,
      updatedAt: new Date().toISOString()
    };
    await writeStore(slug, record);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      ok: true,
      slug,
      url: `${SITE_URL}/feed/${encodeURIComponent(slug)}.xml?token=${token}`
    });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const params = readQuery(req);
  const slug = String(params.get('user') || params.get('slug') || '').trim().toLowerCase();
  const token = String(params.get('token') || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    sendDenied(res);
    return;
  }

  const record = await readStore(slug, token);
  if (!record) {
    sendDenied(res);
    return;
  }

  const tokenOk = record.tokenOk === true
    || (TOKEN_RE.test(token) && hashesMatch(hashToken(token), record.tokenHash));
  if (!tokenOk && !record.isPublic) {
    sendDenied(res);
    return;
  }

  const payload = sanitizePayload(record.payload);
  if (!tokenOk) {
    payload.items = payload.items.filter((item) => item.visibility === 'public');
    if (!payload.items.length) payload.items = publicLibraryFallback(payload.displayName);
  }

  const selfUrl = tokenOk
    ? `${SITE_URL}/feed/${encodeURIComponent(slug)}.xml?token=${token}`
    : `${SITE_URL}/feed/${encodeURIComponent(slug)}.xml`;
  sendXml(res, buildUserRss({ slug, payload, selfUrl, privateUnlocked: tokenOk }), tokenOk);
};
