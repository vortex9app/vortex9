const { createClient } = require('@supabase/supabase-js');
const { getServerSupabase } = require('./_supabase');
const { entitlementsFor } = require('./_commerce');

function bearer(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return '';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }
  const token = bearer(req);
  const intent = String(req.query.intent || '').trim();
  let userId = '';
  let email = '';
  if (token) {
    const { supabase } = getServerSupabase();
    if (supabase) {
      const auth = createClient(
        String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
        String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''),
        { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { data } = await auth.auth.getUser(token);
      if (data && data.user) {
        userId = data.user.id;
        email = String(data.user.email || '').toLowerCase();
      }
    }
  }
  if (!userId && !intent) {
    res.status(200).json({ ok: true, kinds: [] });
    return;
  }
  const result = await entitlementsFor({ userId, email, intent });
  const kinds = result.kinds || [];
  res.status(result.ok ? 200 : 500).json({
    ok: result.ok,
    kinds,
    academy: kinds.filter((kind) => String(kind).indexOf('academy_') === 0),
    membership: kinds.filter((kind) => String(kind).indexOf('membership_') === 0),
    error: result.error || ''
  });
};
