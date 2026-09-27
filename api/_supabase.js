const { createClient } = require('@supabase/supabase-js');

function supabaseUrl() {
  return String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ixxmwkkwghqckewwzyem.supabase.co')
    .replace(/[\[\]<>]/g, '')
    .replace(/\/+$/, '');
}

function makeClient(key) {
  const url = supabaseUrl();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function getServerSupabase() {
  const key = String(
    process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.MYSTIC9_SUPABASE_ANON_KEY
    || ''
  ).trim();
  const supabase = makeClient(key);
  if (!supabase) {
    return { supabase: null, error: 'Supabase URL or anon key is not set on the server' };
  }
  return { supabase };
}

function getFeedStoreSupabase() {
  const service = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MYSTIC9_SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (service) {
    const supabase = makeClient(service);
    if (supabase) return { supabase, mode: 'service' };
  }
  const anon = getServerSupabase();
  return { supabase: anon.supabase, mode: anon.supabase ? 'anon' : '', error: anon.error };
}

function readJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) { body = {}; }
  }
  return body && typeof body === 'object' ? body : {};
}

module.exports = { getServerSupabase, getFeedStoreSupabase, readJsonBody };
