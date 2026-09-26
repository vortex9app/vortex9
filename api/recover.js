const { getServerSupabase, readJsonBody } = require('./_supabase');

function isAllowedOrigin(origin) {
  return /^https:\/\/([a-z0-9-]+\.)?mystic9\.net$/i.test(origin)
    || /^http:\/\/localhost(?::\d+)?$/i.test(origin);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  const origin = String(req.headers.origin || '');
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = readJsonBody(req);
  const email = String(body.email || '').trim();
  const requestOrigin = String(req.headers.origin || '').replace(/\/+$/, '');

  function normalizeRedirect(raw) {
    const fallback = 'https://mystic9.net/auth/callback';
    try {
      const parsed = new URL(String(raw || fallback).trim() || fallback);
      const hostOk = /^(www\.)?mystic9\.net$/i.test(parsed.hostname)
        || parsed.hostname === 'localhost'
        || parsed.hostname === '127.0.0.1';
      if (!hostOk) return fallback;
      const allowed = ['/', '/auth/callback', '/update-password'];
      let path = parsed.pathname || '/';
      if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
      if (allowed.indexOf(path) === -1) path = '/auth/callback';
      return path === '/' ? `${parsed.origin}/` : `${parsed.origin}${path}`;
    } catch (err) {
      return fallback;
    }
  }

  let redirectTo = normalizeRedirect(body.redirectTo || (requestOrigin ? `${requestOrigin}/auth/callback` : ''));
  if (!email) {
    res.status(400).json({ message: 'Email required' });
    return;
  }

  const { supabase, error: envError } = getServerSupabase();
  if (!supabase) {
    res.status(500).json({ message: envError });
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error && /redirect/i.test(String(error.message || ''))) {
    const retryOrigin = new URL(redirectTo).origin;
    const retry = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${retryOrigin}/` });
    if (!retry.error) {
      res.status(200).json({ ok: true, redirectTo: `${retryOrigin}/` });
      return;
    }
    res.status(400).json({ message: retry.error.message || error.message });
    return;
  }
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.status(200).json({ ok: true, redirectTo });
};
