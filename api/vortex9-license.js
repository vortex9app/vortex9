const { getFeedStoreSupabase } = require('./_supabase');

const PAID_KINDS = {
  vortex9_month: 32 * 24 * 60 * 60 * 1000,
  vortex9_year: 370 * 24 * 60 * 60 * 1000,
  vortex9_citadel: 370 * 24 * 60 * 60 * 1000
};

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) { return {}; }
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function planFromKind(kind) {
  if (kind === 'vortex9_month') return 'month';
  if (kind === 'vortex9_year') return 'year';
  if (kind === 'vortex9_citadel') return 'citadel';
  return null;
}

function receiptCandidates(value) {
  const raw = String(value || '').trim().slice(0, 128);
  if (!raw || /[\u0000-\u001f\s]/.test(raw)) return [];
  const lower = raw.toLowerCase();
  if (lower.indexOf('stripe:') === 0) return ['stripe:' + raw.slice(7)];
  if (lower.indexOf('paypal:') === 0) return ['paypal:' + raw.slice(7)];
  return [raw, 'stripe:' + raw, 'paypal:' + raw];
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, tier: 'free' });
    return;
  }

  const body = readBody(req);
  const email = cleanEmail(body.email);
  const refs = receiptCandidates(body.licenseKey || body.key);
  if (!email && !refs.length) {
    res.status(200).json({ ok: true, tier: 'free', plan: null, active: false, receiptMatched: false });
    return;
  }

  const { supabase, error } = getFeedStoreSupabase();
  if (!supabase) {
    res.status(200).json({ ok: false, tier: 'free', plan: null, active: false, error: error || 'license store unavailable' });
    return;
  }

  let query = supabase
    .from('commerce_entitlements')
    .select('kind, email, provider_ref, created_at, status')
    .eq('status', 'active')
    .in('kind', Object.keys(PAID_KINDS));

  if (email) query = query.eq('email', email);
  if (refs.length) query = query.in('provider_ref', refs);

  const { data, error: qErr } = await query;
  if (qErr) {
    res.status(200).json({ ok: false, tier: 'free', plan: null, active: false, error: qErr.message });
    return;
  }

  const now = Date.now();
  const live = (data || []).filter((row) => {
    const windowMs = PAID_KINDS[row.kind];
    const created = Date.parse(row.created_at || '');
    if (!windowMs || !Number.isFinite(created)) return false;
    return now - created < windowMs;
  }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const current = live[0];
  if (!current || (refs.length && refs.indexOf(current.provider_ref) === -1)) {
    res.status(200).json({ ok: true, tier: 'free', plan: null, active: false, receiptMatched: false });
    return;
  }

  const created = Date.parse(current.created_at);
  res.status(200).json({
    ok: true,
    tier: 'paid',
    plan: planFromKind(current.kind),
    active: true,
    email: current.email || email || '',
    renewsAt: new Date(created + PAID_KINDS[current.kind]).toISOString(),
    receiptMatched: refs.length > 0
  });
};

module.exports.receiptCandidates = receiptCandidates;
