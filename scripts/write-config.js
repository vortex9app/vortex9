const fs = require('fs');
const path = require('path');

const url = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://ixxmwkkwghqkewwzyem.supabase.co'
).replace(/\/+$/, '');

const key = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_VxIA_5CNwEFRDKp0NYjkKQ_zE0TNbgx'
).trim();

const contents = `// Generated for production (Vercel env) and local fallbacks.
window.VITE_SUPABASE_URL = ${JSON.stringify(url)};
window.VITE_SUPABASE_ANON_KEY = ${JSON.stringify(key)};
window.MYSTIC9_SUPABASE_URL = window.VITE_SUPABASE_URL;
window.MYSTIC9_SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY;
`;

fs.writeFileSync(path.join(__dirname, '..', 'config.js'), contents);
console.log('Wrote config.js for', url);
