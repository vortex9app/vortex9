const PLANS = {
  month: {
    kind: 'phreak9_month',
    amount: '444',
    interval: 'month',
    name: 'Phreak9 Pro monthly'
  },
  year: {
    kind: 'phreak9_year',
    amount: '4444',
    interval: 'year',
    name: 'Phreak9 Pro yearly'
  }
};

const LINK_ENV = {
  phreak9_month: 'STRIPE_PHREAK9_MONTH_LINK',
  phreak9_year: 'STRIPE_PHREAK9_YEAR_LINK'
};

function siteUrl() {
  return String(process.env.MYSTIC9_SITE_URL || 'https://mystic9.net').replace(/\/+$/, '');
}

function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || '').trim();
}

function paymentLink(kind) {
  const link = String(process.env[LINK_ENV[kind]] || '').trim();
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
  res.end('<!DOCTYPE html><html lang="en"><meta charset="utf-8"><title>Phreak9</title><p>' + safe + '</p><p><a href="/phreak9#tiers">Return to Phreak9</a></p></html>');
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
  if (!key) return { status: 503, error: 'Stripe checkout is not configured yet. Community scanning stays free on the device.' };
  const site = siteUrl();
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('locale', 'en-GB');
  form.set('success_url', site + '/phreak9?paid=1&session_id={CHECKOUT_SESSION_ID}#tiers');
  form.set('cancel_url', site + '/phreak9?checkout=cancelled#tiers');
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

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }
  const plan = PLANS[queryPlan(req)];
  if (!plan) {
    sendHtml(res, 400, 'Choose Phreak9 Pro monthly or yearly.');
    return;
  }
  const opened = await checkoutUrl(plan);
  if (opened.url) {
    sendRedirect(res, opened.url);
    return;
  }
  sendHtml(res, opened.status || 503, opened.error);
};
