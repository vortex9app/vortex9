'use strict';

function acceptLicense(json, requestedEmail, receipt) {
  const asked = String(requestedEmail || '').trim().toLowerCase();
  const closed = { tier: 'free', plan: null, email: asked, renewsAt: '' };
  if (!json || json.ok !== true) return closed;
  const sent = String(receipt || '').trim();
  if (sent && json.receiptMatched !== true) return closed;
  const email = String(json.email || asked).trim().toLowerCase();
  if (asked && email && email !== asked) return closed;
  const renews = Date.parse(json.renewsAt || '');
  const paid = json.tier === 'paid'
    && json.active === true
    && (json.plan === 'month' || json.plan === 'year' || json.plan === 'citadel')
    && Number.isFinite(renews)
    && renews > Date.now();
  if (!paid) return { tier: 'free', plan: null, email: email || asked, renewsAt: '' };
  return {
    tier: 'paid',
    plan: json.plan,
    email: email || asked,
    renewsAt: new Date(renews).toISOString()
  };
}

module.exports = { acceptLicense };
