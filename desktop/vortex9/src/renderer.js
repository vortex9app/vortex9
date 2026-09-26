'use strict';

const shield = document.getElementById('shield-toggle');
const caption = document.getElementById('shield-caption');
const status = document.getElementById('status');
const tier = document.getElementById('tier');
const badge = document.getElementById('tier-badge');
const upgrade = document.getElementById('upgrade');
const guardian = document.getElementById('guardian');
const guardianToggle = document.getElementById('guardian-toggle');
const guardianCaption = document.getElementById('guardian-caption');
const guardianLock = document.getElementById('guardian-lock');
const guardianUpgrade = document.getElementById('guardian-upgrade');
const guardianTools = document.getElementById('guardian-tools');
const guardianResult = document.getElementById('guardian-result');
const feedToggle = document.getElementById('feed-toggle');
const startupToggle = document.getElementById('startup-toggle');
const startupCaption = document.getElementById('startup-caption');
const feedCaption = document.getElementById('feed-caption');
const householdPanel = document.getElementById('household-panel');
const householdList = document.getElementById('household-list');
const householdInput = document.getElementById('household-input');
const householdKind = document.getElementById('household-kind');
const householdError = document.getElementById('household-error');
const householdAdd = document.getElementById('household-add');
const feed = document.getElementById('feed');
const modal = document.getElementById('confirm-modal');
const confirmForm = document.getElementById('confirm-form');
const confirmTitle = document.getElementById('confirm-title');
const confirmCopy = document.getElementById('confirm-copy');
const confirmPass = document.getElementById('confirm-pass');
const confirmError = document.getElementById('confirm-error');
const confirmBio = document.getElementById('confirm-bio');

let last = null;
let monitorTimer = null;
let previewStep = 0;
let pendingOn = false;
let pendingPurpose = 'watch';
let householdRules = { keywords: [], urls: [] };
let editing = null;

function pushLine(kind, text) {
  const row = document.createElement('div');
  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const label = document.createElement('span');
  label.className = 'kind' + (kind === 'REFUSE' ? ' refuse' : '');
  label.textContent = kind;
  const message = document.createElement('span');
  message.textContent = text;
  row.append(time, label, message);
  feed.appendChild(row);
  while (feed.children.length > 40) feed.removeChild(feed.firstChild);
  feed.scrollTop = feed.scrollHeight;
}

function previewLine(step, next) {
  const paid = next && next.tier === 'paid';
  const listening = !!(next && next.proxyListening);
  const lines = [
    ['DETECT', 'preview telemetry beacon matched the watch list'],
    ['PACKET', listening ? 'preview tunnel open, packet held for the rule check' : 'preview tunnel gate idle'],
    ['DETECT', paid ? 'preview scraper signature standing by' : 'preview scraper watch locked on free tier'],
    ['PACKET', 'preview sweep complete, counters unchanged'],
    ['DETECT', paid ? 'preview leak path standing by' : 'preview leak defence locked on free tier']
  ];
  return lines[step % lines.length];
}

function syncMonitor(next) {
  if (next.shield === 'active' && !monitorTimer) {
    pushLine('MONITOR', 'packet monitoring resumed');
    monitorTimer = setInterval(() => {
      const line = previewLine(previewStep, last);
      previewStep += 1;
      pushLine(line[0], line[1]);
    }, 3200);
  }
  if (next.shield !== 'active' && monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
    pushLine('MONITOR', 'Shield disengaged - monitoring paused');
  }
}

function paintShield(next) {
  const on = next.shield === 'active';
  const app = document.querySelector('.app');
  shield.setAttribute('aria-pressed', on ? 'true' : 'false');
  caption.textContent = on ? 'On' : 'Off';
  if (app) {
    app.classList.toggle('is-active', on);
    app.classList.toggle('is-idle', !on);
  }
  badge.classList.toggle('live', on);
  badge.classList.toggle('paused', !on);
}

function render(next) {
  last = next;
  paintShield(next);
  document.getElementById('scrapers').textContent = String(next.scrapersBlocked);
  document.getElementById('telemetry').textContent = String(next.telemetryNeutralized);
  document.getElementById('integrity').textContent = next.integrity + '%';
  status.textContent = next.message;
  const paid = next.tier === 'paid';
  const plan = next.plan === 'citadel' ? '£699.00/year' : next.plan === 'year' ? '£77.00/year' : next.plan === 'month' ? '£8.00/month' : '';
  badge.textContent = next.creatorAdmin ? '[SOVEREIGN CREATOR ADMIN]' : (paid ? '[SOVEREIGN FULL ACCESS]' : '[FREE TIER]');
  badge.classList.toggle('paid', paid);
  upgrade.hidden = paid;
  tier.textContent = next.creatorAdmin
    ? 'Sovereign creator admin. Guardian Protocol and the threat feed are open in this local session.'
    : paid
    ? 'Sovereign shield' + (plan ? ' (' + plan + ')' : '') + (next.email ? ' · ' + next.email : '')
    : 'Free tier. Core telemetry blocks only.';
  guardian.classList.toggle('locked', next.guardianLocked);
  guardianToggle.disabled = next.guardianLocked;
  guardianToggle.setAttribute('aria-pressed', next.guardianWatch ? 'true' : 'false');
  guardianCaption.textContent = next.guardianWatch ? 'On' : 'Off';
  guardianLock.hidden = !next.guardianLocked;
  guardianUpgrade.hidden = !next.guardianLocked;
  guardianTools.hidden = next.guardianLocked;
  if (!next.guardianLocked) {
    if (next.guardianCategory) {
      guardianResult.textContent = next.guardianFlags + ' flagged. Last category: ' + next.guardianCategory + '.';
    } else {
      guardianResult.textContent = 'Guardian Protocol is open. Flagged text is counted and not stored.';
    }
  }
  const startupOn = !!next.openAtLogin;
  startupToggle.setAttribute('aria-pressed', startupOn ? 'true' : 'false');
  startupCaption.textContent = startupOn ? 'On' : 'Off';
  const feedOn = !!next.threatFeed;
  feedToggle.setAttribute('aria-pressed', feedOn ? 'true' : 'false');
  feedCaption.textContent = feedOn ? 'On' : 'Off';
  feedToggle.disabled = !!next.guardianLocked;
  householdPanel.hidden = !next.householdOpen;
  syncMonitor(next);
}

function paintHousehold() {
  householdList.replaceChildren();
  const rows = [];
  householdRules.keywords.forEach((value, index) => rows.push({ kind: 'keyword', value, index }));
  householdRules.urls.forEach((value, index) => rows.push({ kind: 'url', value, index }));
  if (!rows.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No household rules yet. The baseline still applies.';
    householdList.appendChild(empty);
    return;
  }
  rows.forEach((row) => {
    const item = document.createElement('li');
    item.className = 'rule-row';
    const label = document.createElement('span');
    label.textContent = (row.kind === 'url' ? 'URL · ' : 'Keyword · ') + row.value;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ghost';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      editing = { kind: row.kind, index: row.index };
      householdKind.value = row.kind;
      householdInput.value = row.value;
      householdAdd.textContent = 'Save';
      householdInput.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ghost';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      const next = {
        keywords: householdRules.keywords.slice(),
        urls: householdRules.urls.slice()
      };
      next[row.kind === 'url' ? 'urls' : 'keywords'].splice(row.index, 1);
      saveHousehold(next);
    });
    item.append(label, edit, remove);
    householdList.appendChild(item);
  });
}

async function saveHousehold(next, expect) {
  householdError.textContent = '';
  const previousCount = expect === 'url' ? householdRules.urls.length : householdRules.keywords.length;
  const result = await window.vortex9.householdSave(next);
  if (!result || !result.ok) {
    householdError.textContent = (result && result.error) || 'Household rules could not be saved.';
    return;
  }
  const savedCount = expect === 'url' ? result.rules.urls.length : result.rules.keywords.length;
  householdRules = result.rules;
  if (expect && !editing && savedCount <= previousCount) {
    householdError.textContent = expect === 'url'
      ? 'Enter a site name such as example.com.'
      : 'Use at least 4 characters.';
    paintHousehold();
    return;
  }
  editing = null;
  householdInput.value = '';
  householdAdd.textContent = 'Add';
  paintHousehold();
  render(await window.vortex9.getState());
}

async function openConfirm(purpose, desiredOn) {
  if (!last || last.guardianLocked) return;
  if (purpose === 'watch' && desiredOn && last.shield !== 'active') {
    status.textContent = 'Turn the digital defence switch on before Guardian Protocol can watch.';
    return;
  }
  pendingPurpose = purpose;
  pendingOn = !!desiredOn;
  confirmError.textContent = '';
  confirmPass.value = '';
  const operator = await window.vortex9.operatorStatus();
  confirmTitle.textContent = operator.enrolled ? 'Confirm Guardian change' : 'Set operator passphrase';
  if (purpose === 'household') {
    confirmCopy.textContent = operator.enrolled
      ? 'Enter the operator passphrase to open household rules. The baseline list stays locked.'
      : 'Create an operator passphrase. It stays on this device and is not sent to mystic9.';
  } else {
    confirmCopy.textContent = operator.enrolled
      ? 'Enter the operator passphrase before Guardian Protocol can be switched.'
      : 'Create an operator passphrase. It stays on this device and is not sent to mystic9.';
  }
  if (operator.biometric) confirmCopy.textContent += ' Or use device sign-in.';
  confirmBio.hidden = !operator.biometric;
  modal.hidden = false;
  confirmPass.focus();
}

async function finishConfirm(result) {
  confirmPass.value = '';
  if (!result || !result.ok) {
    confirmError.textContent = (result && result.error) || 'Confirmation failed.';
    return;
  }
  if (pendingPurpose === 'household') {
    const opened = await window.vortex9.householdUnlock(result.grant);
    if (!opened || !opened.ok) {
      confirmError.textContent = (opened && opened.error) || 'Household rules stayed locked.';
      return;
    }
    modal.hidden = true;
    householdRules = opened.rules || { keywords: [], urls: [] };
    householdPanel.hidden = false;
    paintHousehold();
    render(await window.vortex9.getState());
    return;
  }
  modal.hidden = true;
  render(await window.vortex9.watch({ on: pendingOn, grant: result.grant }));
}

let pendingShield = null;
let shieldQueue = Promise.resolve();

function localShieldState(on) {
  const base = last || {
    shield: 'idle',
    tier: 'free',
    plan: null,
    email: '',
    scrapersBlocked: 0,
    telemetryNeutralized: 0,
    integrity: 0,
    proxyListening: false,
    guardianLocked: true,
    guardianWatch: false,
    guardianFlags: 0,
    guardianCategory: '',
    message: 'Shield idle.'
  };
  return Object.assign({}, base, {
    shield: on ? 'active' : 'idle',
    proxyListening: on,
    integrity: on ? (base.integrity || 58) : 0,
    guardianWatch: on ? base.guardianWatch : false,
    message: on
      ? 'Shield active. Packet monitoring is running.'
      : 'Shield disengaged - monitoring paused'
  });
}

async function onShieldToggle(event) {
  if (event) event.preventDefault();
  if (!shield) return;
  const turningOn = shield.getAttribute('aria-pressed') !== 'true';
  pendingShield = turningOn;
  render(localShieldState(turningOn));
  if (!window.vortex9 || typeof window.vortex9.toggle !== 'function') return;
  const requested = turningOn;
  shieldQueue = shieldQueue.then(async () => {
    try {
      const next = await window.vortex9.toggle(requested);
      if (pendingShield !== requested) return;
      pendingShield = null;
      render(next);
    } catch (err) {
      if (pendingShield !== requested) return;
      pendingShield = null;
      render(localShieldState(!requested));
      pushLine('MONITOR', 'Shield toggle could not complete.');
    }
  });
}

shield.addEventListener('click', onShieldToggle);
document.getElementById('min-btn').addEventListener('click', () => window.vortex9.windowAction('minimize'));
document.getElementById('close-btn').addEventListener('click', () => window.vortex9.windowAction('close'));
upgrade.addEventListener('click', () => window.vortex9.subscribe());
guardianUpgrade.addEventListener('click', () => window.vortex9.subscribe());
document.getElementById('license-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  render(await window.vortex9.activate(
    document.getElementById('email').value,
    document.getElementById('license-key').value
  ));
});
document.getElementById('scan').addEventListener('click', async () => {
  const result = await window.vortex9.scan(document.getElementById('sample').value);
  document.getElementById('sample').value = '';
  if (result.locked) return;
  render(await window.vortex9.getState());
});
guardianToggle.addEventListener('click', () => {
  const nextOn = guardianToggle.getAttribute('aria-pressed') !== 'true';
  openConfirm('watch', nextOn);
});
startupToggle.addEventListener('click', async () => {
  const turningOn = startupToggle.getAttribute('aria-pressed') !== 'true';
  startupToggle.setAttribute('aria-pressed', turningOn ? 'true' : 'false');
  startupCaption.textContent = turningOn ? 'On' : 'Off';
  render(await window.vortex9.startup(turningOn));
});
feedToggle.addEventListener('click', async () => {
  if (!last || last.guardianLocked) return;
  const turningOn = feedToggle.getAttribute('aria-pressed') !== 'true';
  feedToggle.setAttribute('aria-pressed', turningOn ? 'true' : 'false');
  feedCaption.textContent = turningOn ? 'On' : 'Off';
  render(await window.vortex9.threatFeed(turningOn));
});
document.getElementById('household-open').addEventListener('click', () => openConfirm('household', false));
document.getElementById('household-lock').addEventListener('click', async () => {
  editing = null;
  householdInput.value = '';
  householdAdd.textContent = 'Add';
  householdPanel.hidden = true;
  render(await window.vortex9.householdLock());
});
householdAdd.addEventListener('click', () => {
  const value = householdInput.value.trim();
  const kind = householdKind.value === 'url' ? 'url' : 'keyword';
  if (kind === 'keyword' && value.length < 4) {
    householdError.textContent = 'Use at least 4 characters.';
    return;
  }
  let stored = value;
  if (kind === 'url') {
    try {
      stored = new URL(value.includes('://') ? value : 'https://' + value).hostname;
    } catch (err) {
      stored = '';
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(stored)) {
      householdError.textContent = 'Enter a site name such as example.com.';
      return;
    }
  }
  const next = {
    keywords: householdRules.keywords.slice(),
    urls: householdRules.urls.slice()
  };
  const bucket = kind === 'url' ? next.urls : next.keywords;
  if (editing && editing.kind === kind) bucket[editing.index] = stored;
  else if (editing) {
    const previous = editing.kind === 'url' ? next.urls : next.keywords;
    previous.splice(editing.index, 1);
    bucket.push(stored);
  } else bucket.push(stored);
  saveHousehold(next, editing ? '' : kind);
});
confirmForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  finishConfirm(await window.vortex9.confirm({ passphrase: confirmPass.value }));
});
confirmBio.addEventListener('click', async () => {
  finishConfirm(await window.vortex9.confirm({ biometric: true }));
});
document.getElementById('confirm-cancel').addEventListener('click', () => {
  confirmPass.value = '';
  modal.hidden = true;
  guardianToggle.focus();
});

pushLine('MONITOR', 'feed ready. turn the shield on to start the monitor.');
if (window.vortex9) {
  window.vortex9.onFeed((line) => pushLine(line.kind, line.text));
  window.vortex9.onState((next) => {
    if (pendingShield !== null) return;
    render(next);
  });
  window.vortex9.getState().then((next) => {
    if (pendingShield !== null) return;
    render(next);
  });
}
