const {
  MERCHANT_EMAIL,
  PRODUCTS,
  parseCustom,
  amountsMatch,
  verifyPaypalIpn,
  grantEntitlement
} = require('./_commerce');

function asParams(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return { ...req.body };
  }
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  return Object.fromEntries(new URLSearchParams(raw));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const params = asParams(req);
  try {
    const verified = await verifyPaypalIpn(params);
    if (!verified) {
      res.status(400).send('INVALID');
      return;
    }
    const status = String(params.payment_status || '');
    if (status !== 'Completed') {
      res.status(200).send('OK');
      return;
    }
    const receiver = String(params.receiver_email || params.business || '').trim().toLowerCase();
    if (receiver !== MERCHANT_EMAIL) {
      res.status(400).send('RECEIVER');
      return;
    }
    const custom = parseCustom(params.custom);
    const itemNo = String(params.item_number || custom.kind || '');
    let product = PRODUCTS[itemNo] || PRODUCTS[custom.kind];
    if (!product && /vortex9/i.test(String(params.item_name || ''))) {
      if (amountsMatch('8.00', params.mc_gross)) product = PRODUCTS.vortex9_month;
      else if (amountsMatch('77.00', params.mc_gross)) product = PRODUCTS.vortex9_year;
      else if (amountsMatch('699.00', params.mc_gross)) product = PRODUCTS.vortex9_citadel;
    }
    if (!product) {
      res.status(200).send('OK');
      return;
    }
    if (String(params.mc_currency || '').toUpperCase() !== 'GBP') {
      res.status(400).send('CURRENCY');
      return;
    }
    if (!amountsMatch(product.amount, params.mc_gross)) {
      res.status(400).send('AMOUNT');
      return;
    }
    const email = custom.email || String(params.payer_email || '').trim().toLowerCase();
    const granted = await grantEntitlement({
      kind: product.kind,
      userId: custom.userId || null,
      email,
      provider: 'paypal',
      providerRef: 'paypal:' + String(params.txn_id || params.ipn_track_id || Date.now()),
      amountGbp: product.amount,
      intent: custom.intent || ''
    });
    if (!granted.ok) {
      res.status(500).send('STORE');
      return;
    }
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('ERROR');
  }
};
