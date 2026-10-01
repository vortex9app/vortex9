const { getFeedStoreSupabase } = require('./_supabase');

const MERCHANT_EMAIL = String(process.env.PAYPAL_MERCHANT_EMAIL || 'rootslabintl@gmail.com').trim().toLowerCase();
const SITE = String(process.env.MYSTIC9_SITE_URL || 'https://mystic9.net').replace(/\/+$/, '');

const PRODUCTS = {
  academy_harmonic: {
    kind: 'academy_harmonic',
    amount: '22.00',
    itemName: 'Mystic9 Harmonic Resonance DNA Coding',
    itemNumber: 'academy_harmonic'
  },
  academy_master: {
    kind: 'academy_master',
    amount: '77.00',
    itemName: 'Mystic9 Quantum Field Mastery',
    itemNumber: 'academy_master'
  },
    ebook_spiral: {
      kind: 'ebook_spiral',
      amount: '7.77',
      itemName: 'The Living Spiral of Nine',
      itemNumber: 'ebook_spiral'
    },
    ebook_chaos: {
      kind: 'ebook_chaos',
      amount: '8.88',
      itemName: 'The Sovereign Frequency',
      itemNumber: 'ebook_chaos'
    },
    ebook_static: {
      kind: 'ebook_static',
      amount: '11.11',
      itemName: 'The Architecture of Resonance',
      itemNumber: 'ebook_static'
    },
  vortex9_month: {
    kind: 'vortex9_month',
    amount: '8.00',
    itemName: 'Vortex9 Individual Monthly Tier',
    itemNumber: 'vortex9_month'
  },
  vortex9_year: {
    kind: 'vortex9_year',
    amount: '77.00',
    itemName: 'Vortex9 Individual Annual Tier',
    itemNumber: 'vortex9_year'
  },
  vortex9_citadel: {
    kind: 'vortex9_citadel',
    amount: '699.00',
    itemName: 'Vortex9 Sovereign Business Citadel Pack',
    itemNumber: 'vortex9_citadel'
  },
  phreak9_month: {
    kind: 'phreak9_month',
    amount: '4.44',
    itemName: 'Phreak9 Pro monthly',
    itemNumber: 'phreak9_month'
  },
  phreak9_year: {
    kind: 'phreak9_year',
    amount: '44.44',
    itemName: 'Phreak9 Pro yearly',
    itemNumber: 'phreak9_year'
  }
};

const STRIPE_LINK_MAP = {
  '6oU4gyepO2xY48D6Ow8AE02': 'membership_solstice',
  '14AdR895udcCeNh8WE8AE01': 'membership_activator',
  '8x2fZg95u5KadJdegY8AE03': 'vortex9_month',
  '3cIeVcgxW5Ka20v2yg8AE04': 'vortex9_year',
  '5kQ14mdlKb4ufRlc8Q8AE05': 'vortex9_citadel'
};

const STRIPE_AMOUNT_MAP = {
  699: 'membership_solstice',
  1999: 'membership_activator'
};

function paypalVerifyUrl() {
  return String(process.env.PAYPAL_MODE || '').toLowerCase() === 'sandbox'
    ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
    : 'https://ipnpb.paypal.com/cgi-bin/webscr';
}

function parseCustom(custom) {
  const parts = String(custom || '').split('|');
  return {
    kind: parts[0] || '',
    userId: parts[1] || '',
    email: (parts[2] || '').trim().toLowerCase(),
    intent: parts[3] || ''
  };
}

function amountsMatch(expected, received) {
  const a = Number(expected);
  const b = Number(received);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 0.009;
}

async function verifyPaypalIpn(params) {
  const body = new URLSearchParams(params);
  body.set('cmd', '_notify-validate');
  const res = await fetch(paypalVerifyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'mystic9-paypal-ipn' },
    body: body.toString()
  });
  const text = (await res.text()).trim();
  return text === 'VERIFIED';
}

async function grantEntitlement({ kind, userId, email, provider, providerRef, amountGbp, intent }) {
  const { supabase, error } = getFeedStoreSupabase();
  if (!supabase) return { ok: false, error: error || 'no supabase' };
  const safeKind = String(kind || '');
  const row = {
    kind: safeKind,
    user_id: userId || null,
    email: email || null,
    provider,
    provider_ref: providerRef,
    amount_gbp: amountGbp == null ? null : Number(amountGbp),
    intent_token: intent || null,
    status: 'active'
  };
  const { error: upErr } = await supabase.from('commerce_entitlements').upsert(row, { onConflict: 'provider_ref' });
  if (upErr) return { ok: false, error: upErr.message };
  if (safeKind === 'academy_harmonic' || safeKind === 'academy_master') {
    if (provider !== 'paypal') return { ok: true };
    const courseId = safeKind === 'academy_harmonic' ? 'harmonic' : 'master';
    if (userId) {
      await supabase.from('academy_enrollments').upsert({
        user_id: userId,
        course_id: courseId,
        status: 'active',
        source: 'paypal',
        amount_gbp: amountGbp || 0
      }, { onConflict: 'user_id,course_id' });
    }
  }
  return { ok: true };
}

async function entitlementsFor({ userId, email, intent }) {
  const { supabase, error } = getFeedStoreSupabase();
  if (!supabase) return { ok: false, kinds: [], error: error || 'no supabase' };
  const filters = [];
  if (userId) filters.push(`user_id.eq.${userId}`);
  if (email) filters.push(`email.eq."${String(email).replace(/"/g, '')}"`);
  if (intent) filters.push(`intent_token.eq.${intent}`);
  if (!filters.length) return { ok: true, kinds: [] };
  const { data, error: qErr } = await supabase
    .from('commerce_entitlements')
    .select('kind')
    .eq('status', 'active')
    .or(filters.join(','));
  if (qErr) return { ok: false, kinds: [], error: qErr.message };
  const kinds = Array.from(new Set((data || []).map((row) => row.kind)));
  return { ok: true, kinds };
}

function stripeKindFromSession(session) {
  const meta = (session && session.metadata) || {};
  const parentMeta = session && session.parent && session.parent.subscription_details
    ? session.parent.subscription_details.metadata || {}
    : {};
  const kind = meta.kind || parentMeta.kind || '';
  if (kind === 'membership_solstice' || kind === 'membership_activator' || kind === 'vortex9_month' || kind === 'vortex9_year' || kind === 'vortex9_citadel' || kind === 'phreak9_month' || kind === 'phreak9_year') return kind;
  const link = String((session && (session.payment_link || session.payment_link_id)) || '');
  const linkId = link.split('/').pop();
  if (STRIPE_LINK_MAP[linkId]) return STRIPE_LINK_MAP[linkId];
  const amount = Number(session && (session.amount_total != null ? session.amount_total : session.amount_paid));
  if (STRIPE_AMOUNT_MAP[amount]) return STRIPE_AMOUNT_MAP[amount];
  if (amount === 800) return 'vortex9_month';
  if (amount === 7700) return 'vortex9_year';
  if (amount === 69900) return 'vortex9_citadel';
  if (amount === 444) return 'phreak9_month';
  if (amount === 4444) return 'phreak9_year';
  return '';
}

module.exports = {
  MERCHANT_EMAIL,
  SITE,
  PRODUCTS,
  parseCustom,
  amountsMatch,
  verifyPaypalIpn,
  grantEntitlement,
  entitlementsFor,
  stripeKindFromSession
};
