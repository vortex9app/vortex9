const { grantEntitlement, stripeKindFromSession } = require('./_commerce');

const PLANS = {
  month: {
    kind: 'vortex9_month',
    amount: '800',
    interval: 'month',
    name: 'Vortex9 Individual Monthly Tier'
  },
  year: {
    kind: 'vortex9_year',
    amount: '7700',
    interval: 'year',
    name: 'Vortex9 Individual Annual Tier'
  },
  citadel: {
    kind: 'vortex9_citadel',
    amount: '69900',
    interval: 'year',
    name: 'Vortex9 Sovereign Business Citadel Pack'
  }
};

const LINK_ENV = {
  vortex9_month: 'STRIPE_VORTEX9_MONTH_LINK',
  vortex9_year: 'STRIPE_VORTEX9_YEAR_LINK',
  vortex9_citadel: 'STRIPE_VORTEX9_CITADEL_LINK'
};

const LIVE_LINKS = {
  vortex9_month: 'https://buy.stripe.com/8x2fZg95u5KadJdegY8AE03',
  vortex9_year: 'https://buy.stripe.com/3cIeVcgxW5Ka20v2yg8AE04',
  vortex9_citadel: 'https://buy.stripe.com/5kQ14mdlKb4ufRlc8Q8AE05'
};

const PLAN_FROM_KIND = {
  vortex9_month: 'month',
  vortex9_year: 'year',
  vortex9_citadel: 'citadel'
};

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) { return {}; }
}

function siteUrl() {
  return String(process.env.MYSTIC9_SITE_URL || 'https://mystic9.net').replace(/\/+$/, '');
}

function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || '').trim();
}

function paymentLink(kind) {
  const link = String(process.env[LINK_ENV[kind]] || LIVE_LINKS[kind] || '').trim();
  if (link.indexOf('https://buy.stripe.com/') === 0 || link.indexOf('https://checkout.stripe.com/') === 0) return link;
  return '';
}

function httpsUrl(value) {
  return typeof value === 'string' && value.indexOf('https://') === 0 ? value : '';
}

function queryPlan(req) {
  if (req.query && req.query.plan != null) return String(req.query.plan);
  const raw = String(req.url || '');
  const q = raw.indexOf('?');
  if (q === -1) return '';
  return new URLSearchParams(raw.slice(q + 1)).get('plan') || '';
}

function sendHtml(res, status, message) {
  const text = typeof message === 'string' && message.trim() ? message.trim() : 'Stripe checkout is not available yet.';
  const safe = text.replace(/[&<>]/g, function (char) {
    return char === '&' ? '&amp;' : char === '<' ? '&lt;' : '&gt;';
  });
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('<!DOCTYPE html><html lang="en"><meta charset="utf-8"><title>Vortex9</title><p>' + safe + '</p></html>');
}

function sendRedirect(res, target) {
  const url = httpsUrl(target);
  if (!url) {
    sendHtml(res, 502, 'Stripe did not return a checkout address.');
    return;
  }
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

async function checkoutUrl(plan) {
  const link = paymentLink(plan.kind);
  if (link) return { status: 200, url: link };
  const key = stripeKey();
  if (!key) return { status: 503, error: 'Stripe checkout is not configured yet.' };
  const site = siteUrl();
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('locale', 'en-GB');
  form.set('success_url', site + '/vortex9?paid=1&session_id={CHECKOUT_SESSION_ID}#tiers');
  form.set('cancel_url', site + '/vortex9?checkout=cancelled#tiers');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'gbp');
  form.set('line_items[0][price_data][unit_amount]', plan.amount);
  form.set('line_items[0][price_data][recurring][interval]', plan.interval);
  form.set('line_items[0][price_data][product_data][name]', plan.name);
  form.set('metadata[kind]', plan.kind);
  form.set('subscription_data[metadata][kind]', plan.kind);
  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const json = await stripeRes.json();
  const url = httpsUrl(json && json.url);
  if (!stripeRes.ok || !url) {
    const message = json && json.error && typeof json.error.message === 'string'
      ? json.error.message
      : 'Stripe could not open checkout.';
    return { status: 502, error: message };
  }
  return { status: 200, url: url };
}

async function confirmSession(sessionId) {
  if (!/^cs_[A-Za-z0-9]+$/.test(sessionId)) {
    return { status: 400, body: { ok: false, tier: 'free', active: false, error: 'That checkout session is not valid.' } };
  }
  const key = stripeKey();
  if (!key) {
    return { status: 503, body: { ok: false, tier: 'free', active: false, error: 'Stripe checkout is not configured yet.' } };
  }
  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId), {
    headers: { Authorization: 'Bearer ' + key }
  });
  const json = await stripeRes.json();
  if (!stripeRes.ok) {
    return { status: 502, body: { ok: false, tier: 'free', active: false, error: 'Stripe could not confirm this checkout.' } };
  }
  if (json.payment_status !== 'paid') {
    return { status: 200, body: { ok: true, tier: 'free', active: false, error: 'Stripe has not confirmed this payment. The free tier stays in place.' } };
  }
  const kind = stripeKindFromSession(json);
  const plan = PLAN_FROM_KIND[kind];
  const email = String(json.customer_email || (json.customer_details && json.customer_details.email) || '').trim().toLowerCase();
  if (!plan || !email) {
    return { status: 200, body: { ok: true, tier: 'free', active: false, error: 'This payment is not a Vortex9 subscription.' } };
  }
  const amount = json.amount_total != null ? Number(json.amount_total) / 100 : null;
  const granted = await grantEntitlement({
    kind,
    userId: null,
    email,
    provider: 'stripe',
    providerRef: 'stripe:' + String(json.id),
    amountGbp: amount,
    intent: ''
  });
  if (!granted.ok) {
    return { status: 200, body: { ok: false, tier: 'free', active: false, error: 'Stripe confirmed the payment, but the licence record could not be saved yet.' } };
  }
  return { status: 200, body: { ok: true, tier: 'paid', plan, active: true, email } };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method === 'GET') {
    const plan = PLANS[queryPlan(req)];
    if (!plan) {
      sendHtml(res, 400, 'Choose the monthly, annual, or business pack.');
      return;
    }
    const opened = await checkoutUrl(plan);
    if (opened.url) {
      sendRedirect(res, opened.url);
      return;
    }
    sendHtml(res, opened.status || 503, opened.error);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const body = readBody(req);
  const sessionId = String(body.sessionId || '').trim();
  if (sessionId) {
    const confirmed = await confirmSession(sessionId);
    res.status(confirmed.status).json(confirmed.body);
    return;
  }

  const plan = PLANS[String(body.plan || '')];
  if (!plan) {
    res.status(400).json({ ok: false, error: 'Choose the monthly, annual, or business pack.' });
    return;
  }

  const opened = await checkoutUrl(plan);
  if (opened.url) {
    res.status(200).json({ ok: true, url: opened.url });
    return;
  }
  res.status(opened.status || 503).json({ ok: false, error: typeof opened.error === 'string' ? opened.error : 'Stripe checkout is not available yet.' });
};
