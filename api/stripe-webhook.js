const crypto = require('crypto');
const { grantEntitlement, stripeKindFromSession } = require('./_commerce');

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

function parseStripeSignature(header) {
  const parts = String(header || '').split(',').map((bit) => bit.trim());
  const map = {};
  parts.forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) map[part.slice(0, idx)] = part.slice(idx + 1);
  });
  return map;
}

function verifyStripe(payload, header, secret) {
  const sig = parseStripeSignature(header);
  if (!sig.t || !sig.v1 || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${sig.t}.${payload}`).digest('hex');
  const a = Buffer.from(sig.v1, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const payload = rawBody(req);
  if (!secret || !verifyStripe(payload, req.headers['stripe-signature'], secret)) {
    res.status(400).json({ ok: false, error: 'invalid signature' });
    return;
  }
  let event;
  try {
    event = typeof req.body === 'object' && req.body.type ? req.body : JSON.parse(payload);
  } catch (err) {
    res.status(400).json({ ok: false, error: 'invalid json' });
    return;
  }
  if (event.type !== 'checkout.session.completed' && event.type !== 'invoice.paid') {
    res.status(200).json({ ok: true, ignored: event.type });
    return;
  }
  const session = event.data && event.data.object ? event.data.object : {};
  const kind = stripeKindFromSession(session);
  if (!kind || String(kind).indexOf('academy_') === 0) {
    res.status(200).json({ ok: true, ignored: kind ? 'academy is paypal only' : 'unknown product' });
    return;
  }
  const email = String(session.customer_email || (session.customer_details && session.customer_details.email) || '').trim().toLowerCase();
  const userId = String(session.client_reference_id || '').trim() || null;
  const amount = session.amount_total != null ? Number(session.amount_total) / 100 : null;
  const granted = await grantEntitlement({
    kind,
    userId,
    email,
    provider: 'stripe',
    providerRef: 'stripe:' + String(session.id || event.id),
    amountGbp: amount,
    intent: ''
  });
  res.status(granted.ok ? 200 : 500).json({ ok: granted.ok, kind });
};
