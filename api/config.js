module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  const url = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const lines = [];

  if (url) {
    lines.push(`window.VITE_SUPABASE_URL = ${JSON.stringify(url)};`);
    lines.push('window.MYSTIC9_SUPABASE_URL = window.VITE_SUPABASE_URL;');
  }
  if (key) {
    lines.push(`window.VITE_SUPABASE_ANON_KEY = ${JSON.stringify(key)};`);
    lines.push('window.MYSTIC9_SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY;');
  }

  res.status(200).send(lines.join('\n') + (lines.length ? '\n' : '/* no supabase env overrides */\n'));
};
