// Initialize Supabase Client (project URL + public anon / publishable key)
const SUPABASE_URL = String(
  window.MYSTIC9_SUPABASE_URL ||
  window.VITE_SUPABASE_URL ||
  'https://ixxmwkkwghqkewwzyem.supabase.co'
)
  .replace(/[\[\]<>]/g, '')
  .replace(/\/+$/, '');
const SUPABASE_ANON_KEY = String(
  window.MYSTIC9_SUPABASE_ANON_KEY ||
  window.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_KEY = SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) {
  console.error('Supabase anon key is missing. Paste the publishable/anon key for ixxmwkkwghqkewwzyem into config.js and .env');
}

const RECOVERY_FLAG_KEY = 'mystic9_password_recovery';
const RESET_REQUEST_KEY = 'mystic9_password_reset_requested';
const CANONICAL_SITE_URL = 'https://mystic9.net';
const AUTH_CALLBACK_PATH = '/auth/callback';

let pendingPasswordRecovery = false;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    markPasswordRecovery(true);
    showPasswordResetForm();
    return;
  }
  if (event === 'SIGNED_OUT') {
    if (!isPasswordRecoveryUrl() && !readSessionFlag(RECOVERY_FLAG_KEY)) markPasswordRecovery(false);
    return;
  }
  if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
    if (
      isPasswordRecoveryUrl()
      || pendingPasswordRecovery
      || readSessionFlag(RECOVERY_FLAG_KEY)
      || (readSessionFlag(RESET_REQUEST_KEY) && isAuthCallbackUrl())
    ) {
      markPasswordRecovery(true);
      showPasswordResetForm();
      return;
    }
    if (event === 'SIGNED_IN' && !readSessionFlag(RESET_REQUEST_KEY)) markPasswordRecovery(false);
  }
});

function readSessionFlag(key) {
  try { return sessionStorage.getItem(key) === '1'; } catch (err) { return false; }
}

function writeSessionFlag(key, on) {
  try {
    if (on) sessionStorage.setItem(key, '1');
    else sessionStorage.removeItem(key);
  } catch (err) { /* private mode */ }
}

function markPasswordRecovery(active) {
  pendingPasswordRecovery = !!active;
  writeSessionFlag(RECOVERY_FLAG_KEY, active);
  if (!active) writeSessionFlag(RESET_REQUEST_KEY, false);
}

function isPasswordRecoveryUrl() {
  const { search, hash } = parseAuthParams();
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

function parseAuthParams() {
  const search = new URLSearchParams(window.location.search || '');
  const rawHash = String(window.location.hash || '').replace(/^#\/?/, '');
  const hash = rawHash.includes('=') ? new URLSearchParams(rawHash) : new URLSearchParams();
  return { search, hash };
}

function isAuthCallbackUrl() {
  const { search, hash } = parseAuthParams();
  return window.location.pathname === AUTH_CALLBACK_PATH
    || window.location.pathname === '/update-password'
    || search.has('code')
    || search.has('token_hash')
    || hash.has('token_hash')
    || hash.has('access_token')
    || hash.has('refresh_token');
}

function hasPasswordRecoveryIntent() {
  return isPasswordRecoveryUrl()
    || (pendingPasswordRecovery && isAuthCallbackUrl())
    || (readSessionFlag(RECOVERY_FLAG_KEY) && (isPasswordRecoveryUrl() || isAuthCallbackUrl()));
}

const MASTER_ADMIN_EMAIL = 'zen3845@outlook.com';
const ADMIN_ALERT_ENDPOINT = 'https://formsubmit.co/ajax/zen3845@outlook.com';

let profilePersistTimer = null;

function statsStorageKey(email) {
  return `mystic9_stats_${String(email || '').trim().toLowerCase()}`;
}

function looksLikeEmail(value) {
  return /@/.test(String(value || ''));
}

function isValidCustomUsername(raw) {
  const cleaned = String(raw || '').trim().replace(/\s+/g, ' ');
  return cleaned.length >= 3 && cleaned.length <= 32 && !looksLikeEmail(cleaned);
}

function normalizeChosenUsername(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 32);
}

function sanitizeUsername(raw, email) {
  const cleaned = normalizeChosenUsername(raw);
  if (isValidCustomUsername(cleaned)) return cleaned;
  return 'Seeker';
}

function readLocalStats(email) {
  try {
    const raw = localStorage.getItem(statsStorageKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Could not read local sanctuary stats:', err);
    return null;
  }
}

function writeLocalStats(email, stats) {
  if (!email) return;
  const avatar = (typeof isValidSanctuaryAvatar === 'function' && isValidSanctuaryAvatar(stats.avatar))
    ? stats.avatar
    : (stats.avatar || '');
  const payload = {
    username: stats.username,
    xp: Number(stats.xp) || 0,
    level: Number(stats.level) || 1,
    avatar
  };
  localStorage.setItem(statsStorageKey(email), JSON.stringify(payload));
  localStorage.setItem('mystic9_user_email', email);
  localStorage.setItem('mystic9_username', payload.username);
  localStorage.setItem('mystic9_user_xp', String(payload.xp));
  localStorage.setItem('mystic9_user_level', String(payload.level));
  if (payload.avatar) localStorage.setItem('mystic9_avatar', payload.avatar);
  else localStorage.removeItem('mystic9_avatar');
}

function applyStatsToRuntime(stats) {
  if (typeof currentXP !== 'undefined') currentXP = Number(stats.xp) || 0;
  if (typeof currentLevel !== 'undefined') currentLevel = Number(stats.level) || 1;
  if (typeof updateXPMeterDisplay === 'function') updateXPMeterDisplay();
  if (typeof refreshPublicIdentityDisplays === 'function') refreshPublicIdentityDisplays();
}

function computeLevelFromXP(xp) {
  const thresholds = (typeof levelThresholds !== 'undefined') ? levelThresholds : [
    { level: 1, xp: 0 }, { level: 2, xp: 250 }, { level: 3, xp: 600 },
    { level: 4, xp: 1100 }, { level: 5, xp: 1800 }, { level: 6, xp: 2700 },
    { level: 7, xp: 4000 }, { level: 8, xp: 6000 }, { level: 9, xp: 10000 }
  ];
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i].xp) {
      level = thresholds[i].level;
      break;
    }
  }
  return level;
}

async function persistUserProfileToSupabase(partial = {}, immediate = false) {
  const email = localStorage.getItem('mystic9_user_email');
  if (!email) return;

  const stats = {
    username: sanitizeUsername(partial.username || localStorage.getItem('mystic9_username') || '', email),
    xp: partial.xp != null ? Number(partial.xp) : Number(localStorage.getItem('mystic9_user_xp') || 0),
    level: partial.level != null ? Number(partial.level) : Number(localStorage.getItem('mystic9_user_level') || 1),
    avatar: partial.avatar || localStorage.getItem('mystic9_avatar') || ''
  };
  writeLocalStats(email, stats);

  const run = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      await supabaseClient.auth.updateUser({
        data: {
          username: stats.username,
          display_name: stats.username,
          xp: stats.xp,
          level: stats.level,
          avatar: stats.avatar || ''
        }
      });

      const { error } = await supabaseClient.from('user_profiles').upsert({
        id: user.id,
        email,
        username: stats.username,
        xp: stats.xp,
        level: stats.level,
        avatar: stats.avatar || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) console.warn('user_profiles upsert skipped:', error.message);
    } catch (err) {
      console.warn('Profile persistence fallback (local only):', err);
    }
  };

  if (immediate) {
    await run();
    return;
  }

  clearTimeout(profilePersistTimer);
  profilePersistTimer = setTimeout(run, 700);
}

async function loadPersistedProfile(user) {
  const email = user?.email || localStorage.getItem('mystic9_user_email') || '';
  const local = readLocalStats(email) || {};
  const meta = user?.user_metadata || {};

  let username = meta.username || meta.display_name || local.username;
  let xp = meta.xp;
  let level = meta.level;
  let avatar = meta.avatar || local.avatar || localStorage.getItem('mystic9_avatar') || '';

  if (user?.id) {
    try {
      const { data: row } = await supabaseClient
        .from('user_profiles')
        .select('username, xp, level, avatar')
        .eq('id', user.id)
        .maybeSingle();
      if (row) {
        username = row.username || username;
        if (row.xp != null) xp = row.xp;
        if (row.level != null) level = row.level;
        if (row.avatar) avatar = row.avatar;
      }
    } catch (err) {
      console.warn('Could not load user_profiles row:', err);
    }
  }

  username = sanitizeUsername(username, email);
  xp = Number.isFinite(Number(xp)) ? Number(xp) : (Number(local.xp) || 0);
  level = Number.isFinite(Number(level)) ? Number(level) : computeLevelFromXP(xp);
  if (typeof isValidSanctuaryAvatar === 'function' && !isValidSanctuaryAvatar(avatar)) avatar = '';

  if (String(email).toLowerCase() === MASTER_ADMIN_EMAIL) {
    xp = Math.max(xp, 10000);
    level = 9;
  }

  writeLocalStats(email, { username, xp, level, avatar });
  applyStatsToRuntime({ username, xp, level, avatar });
  return { username, xp, level, email, avatar };
}

async function notifyAdminOfNewRegistration(email, username) {
  const payload = {
    seeker_email: email,
    username,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabaseClient.from('registration_alerts').insert(payload);
    if (error) console.warn('registration_alerts insert skipped:', error.message);
  } catch (err) {
    console.warn('Registration alert table unavailable:', err);
  }

  try {
    await fetch(ADMIN_ALERT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: `New mystic9.net registration: ${username}`,
        name: username,
        email,
        message: `A new seeker registered on mystic9.net.\n\nUsername: ${username}\nEmail: ${email}`
      })
    });
  } catch (err) {
    console.warn('Registration email alert could not be sent:', err);
  }
}

async function submitSecureContactInquiry(name, senderEmail, message) {
  const record = {
    name,
    sender_email: senderEmail,
    message,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabaseClient.from('contact_inquiries').insert(record);
    if (error) console.warn('contact_inquiries insert skipped:', error.message);
  } catch (err) {
    console.warn('Contact table unavailable:', err);
  }

  try {
    const response = await fetch(ADMIN_ALERT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: `mystic9.net contact form: ${name}`,
        name,
        email: senderEmail,
        message
      })
    });
    if (!response.ok) throw new Error('Contact routing failed');
    return true;
  } catch (err) {
    console.warn('Secure contact routing error:', err);
    return false;
  }
}

async function signUpUser(email, password, username, avatar) {
  if (!isValidCustomUsername(username)) {
    return { data: null, error: { message: 'Please choose a public username of 3–32 characters. Email addresses cannot be used as usernames.' } };
  }
  if (typeof isValidSanctuaryAvatar === 'function' && !isValidSanctuaryAvatar(avatar)) {
    return { data: null, error: { message: 'Please select a mystic avatar to complete initiation.' } };
  }
  const safeUsername = normalizeChosenUsername(username);
  const safeAvatar = avatar;
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getPasswordResetRedirectUrl(),
      data: {
        username: safeUsername,
        avatar: safeAvatar
      }
    }
  });

  if (error) {
    console.error('Sign up error:', error.message);
    return { data, error };
  }

  const existing = readLocalStats(email);
  const startingXP = Number(existing?.xp) || 0;
  const startingLevel = Number(existing?.level) || computeLevelFromXP(startingXP);
  writeLocalStats(email, { username: safeUsername, xp: startingXP, level: startingLevel, avatar: safeAvatar });
  applyStatsToRuntime({ username: safeUsername, xp: startingXP, level: startingLevel, avatar: safeAvatar });
  if (data?.user) {
    await persistUserProfileToSupabase({ username: safeUsername, xp: startingXP, level: startingLevel, avatar: safeAvatar }, true);
  }
  await notifyAdminOfNewRegistration(email, safeUsername);
  console.log('User registered:', data);
  return { data, error, username: safeUsername, avatar: safeAvatar };
}

async function loginUser(email, password) {
  markPasswordRecovery(false);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) console.error('Login error:', error.message);
  else {
    markPasswordRecovery(false);
    if (typeof clearAuthRedirectParams === 'function') clearAuthRedirectParams();
    console.log('User logged in:', data);
  }
  return { data, error };
}

function sanitizeRedirectUrl(raw) {
  let value = String(raw || '').trim();
  value = value.replace(/^\[([^\]]+)\]\([^)]*\)$/, '$1');
  value = value.replace(/[\[\]<>()]/g, '').trim();
  return value;
}

function getPasswordResetRedirectUrl() {
  const origin = sanitizeRedirectUrl(window.location.origin).replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return `${origin}${AUTH_CALLBACK_PATH}`;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return `${CANONICAL_SITE_URL}${AUTH_CALLBACK_PATH}`;
    return `${url.origin}${AUTH_CALLBACK_PATH}`;
  } catch (err) {
    return `${CANONICAL_SITE_URL}${AUTH_CALLBACK_PATH}`;
  }
}

function passwordResetRedirectCandidates() {
  const origin = sanitizeRedirectUrl(window.location.origin).replace(/\/+$/, '');
  const list = [
    getPasswordResetRedirectUrl(),
    `${origin}/`,
    origin,
    `${CANONICAL_SITE_URL}${AUTH_CALLBACK_PATH}`,
    `${CANONICAL_SITE_URL}/`
  ];
  return list.filter((url, i) => url && list.indexOf(url) === i);
}

function formatPasswordResetError(error) {
  const msg = String((error && (error.message || error.error_description || error.msg)) || error || '').trim();
  const lower = msg.toLowerCase();
  if (/rate limit|too many/i.test(lower)) {
    return 'Too many reset requests arrived at once. Wait a minute, then send the link again.';
  }
  if (/redirect/i.test(lower)) {
    return 'The return path for this reset was rejected. The sanctuary retried the primary site address. Please try once more.';
  }
  if (/template|email/i.test(lower) && /not|missing|config/i.test(lower)) {
    return 'The reset email could not be composed right now. Please try again in a moment.';
  }
  if (/network|fetch|failed to fetch|load failed/i.test(lower)) {
    return 'The sanctuary could not reach the reset service. Check your connection and try again.';
  }
  return msg || 'The reset link could not be sent. Please try again.';
}

function clearAuthRedirectParams() {
  if (!window.history.replaceState) return;
  const path = window.location.pathname === AUTH_CALLBACK_PATH || window.location.pathname === '/update-password'
    ? '/'
    : window.location.pathname;
  window.history.replaceState({}, document.title, path);
}

function setAuthMessage(formId, text, type) {
  const form = document.getElementById(formId);
  const box = form ? form.querySelector('.auth-message') : document.getElementById(`${formId.replace('-form', '-message')}`);
  if (!box) return;
  box.textContent = text || '';
  box.classList.remove('success', 'error', 'show');
  if (!text) return;
  box.classList.add('show', type === 'error' ? 'error' : 'success');
}

function hideAllAuthForms() {
  ['signup-form', 'login-form', 'forgot-form', 'reset-form'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function revealAuthPanel() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('show');
}

function openAuthModal(formId) {
  showAuthForm(formId || 'login-form');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('show');
}

function ensureSignupUsernameField() {
  const signup = document.getElementById('signup-form');
  const login = document.getElementById('login-form');
  if (login) {
    login.querySelectorAll('.signup-username-block, #signup-username').forEach((el) => el.remove());
  }
  if (!signup) return null;

  let field = signup.querySelector('#signup-username');
  if (!field) {
    const block = document.createElement('div');
    block.className = 'signup-username-block';
    block.setAttribute('data-signup-only', 'username');
    block.innerHTML = [
      '<label class="auth-field-label" for="signup-username">Username</label>',
      '<input type="text" id="signup-username" name="username" placeholder="Public username (shown in chat)" autocomplete="username" minlength="3" maxlength="32" required pattern="[^@]{3,32}" title="3–32 characters, not an email address">'
    ].join('');
    const emailField = signup.querySelector('#signup-email');
    const emailLabel = signup.querySelector('label[for="signup-email"]');
    const anchor = emailLabel || emailField || signup.firstChild;
    signup.insertBefore(block, anchor);
    field = signup.querySelector('#signup-username');
  }

  if (field) {
    field.required = true;
    field.setAttribute('name', 'username');
    field.setAttribute('autocomplete', 'username');
    field.setAttribute('minlength', '3');
    field.setAttribute('maxlength', '32');
    field.setAttribute('pattern', '[^@]{3,32}');
  }
  return field;
}

function syncAuthViewTabs(formId) {
  const tabs = document.getElementById('auth-view-tabs');
  const loginTab = document.getElementById('auth-tab-login');
  const signupTab = document.getElementById('auth-tab-signup');
  const hideTabs = formId === 'forgot-form' || formId === 'reset-form';
  if (tabs) tabs.classList.toggle('hidden', hideTabs);
  if (loginTab) loginTab.classList.toggle('active', formId === 'login-form');
  if (signupTab) signupTab.classList.toggle('active', formId === 'signup-form');
}

function showAuthForm(formId) {
  revealAuthPanel();
  hideAllAuthForms();
  if (formId === 'signup-form') ensureSignupUsernameField();
  const form = document.getElementById(formId);
  if (form) form.classList.remove('hidden');
  syncAuthViewTabs(formId);
  if (formId === 'signup-form') {
    if (typeof initSanctuaryAvatarPickers === 'function') initSanctuaryAvatarPickers();
    const usernameField = document.getElementById('signup-username');
    if (usernameField) usernameField.focus();
  }
}

function toggleAuthForms(e) {
  if (e) e.preventDefault();
  const login = document.getElementById('login-form');
  const loginVisible = login && !login.classList.contains('hidden');
  showAuthForm(loginVisible ? 'signup-form' : 'login-form');
}

function showLoginForm(e) {
  if (e) e.preventDefault();
  markPasswordRecovery(false);
  showAuthForm('login-form');
}

function showForgotPasswordForm(e) {
  if (e) e.preventDefault();
  const loginEmail = document.getElementById('login-email')?.value.trim();
  showAuthForm('forgot-form');
  const forgotEmail = document.getElementById('forgot-email');
  if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;
  setAuthMessage('forgot-form', '', '');
}

function showPasswordResetForm(message) {
  const run = () => {
    markPasswordRecovery(true);
    showAuthForm('reset-form');
    setAuthMessage(
      'reset-form',
      message || 'Recovery link verified. Set a new password to re-enter the sanctuary.',
      'success'
    );
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

async function consumeAuthCallback() {
  const { search, hash } = parseAuthParams();
  const onCallbackPath = window.location.pathname === AUTH_CALLBACK_PATH
    || window.location.pathname === '/update-password';
  if (!isAuthCallbackUrl() && !isPasswordRecoveryUrl() && !onCallbackPath) return null;

  const errorText = search.get('error_description') || hash.get('error_description') || search.get('error') || hash.get('error');
  if (errorText && !search.has('code') && !hash.has('access_token') && !search.has('token_hash')) {
    showLoginForm();
    setAuthMessage('login-form', decodeURIComponent(String(errorText).replace(/\+/g, ' ')), 'error');
    return 'error';
  }

  const otpType = search.get('type') || hash.get('type') || '';
  const recoveryHint = otpType === 'recovery' || readSessionFlag(RESET_REQUEST_KEY) || readSessionFlag(RECOVERY_FLAG_KEY);

  const sessionFromHash = async () => {
    const access = hash.get('access_token');
    const refresh = hash.get('refresh_token');
    if (!access || !refresh || typeof supabaseClient.auth.setSession !== 'function') return null;
    const { error } = await supabaseClient.auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) return error;
    return null;
  };

  let { data: existing } = await supabaseClient.auth.getSession();
  if (!existing?.session && hash.has('access_token')) {
    const hashError = await sessionFromHash();
    if (hashError) {
      showLoginForm();
      setAuthMessage('login-form', formatPasswordResetError(hashError), 'error');
      return 'error';
    }
    existing = (await supabaseClient.auth.getSession()).data;
  }

  if (existing && existing.session) {
    if (recoveryHint || isPasswordRecoveryUrl()) {
      markPasswordRecovery(true);
      showPasswordResetForm();
      return 'recovery';
    }
    return 'session';
  }

  const tokenHash = search.get('token_hash') || hash.get('token_hash');
  if (tokenHash) {
    const { error } = await supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType === 'magiclink' ? 'magiclink' : 'recovery'
    });
    if (error) {
      showLoginForm();
      setAuthMessage('login-form', formatPasswordResetError(error), 'error');
      return 'error';
    }
    markPasswordRecovery(otpType !== 'magiclink');
    if (pendingPasswordRecovery) showPasswordResetForm();
    return pendingPasswordRecovery ? 'recovery' : 'session';
  }

  const code = search.get('code');
  if (code && typeof supabaseClient.auth.exchangeCodeForSession === 'function') {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      const { data: after } = await supabaseClient.auth.getSession();
      if (after && after.session) {
        if (recoveryHint) {
          markPasswordRecovery(true);
          showPasswordResetForm();
          return 'recovery';
        }
        return 'session';
      }
      showLoginForm();
      setAuthMessage('login-form', formatPasswordResetError(error), 'error');
      return 'error';
    }
    markPasswordRecovery(recoveryHint || otpType === 'recovery');
    if (pendingPasswordRecovery) showPasswordResetForm();
    return pendingPasswordRecovery ? 'recovery' : 'session';
  }

  if (hash.has('access_token') || search.has('code') || search.has('token_hash')) {
    return 'pending';
  }

  return recoveryHint && onCallbackPath ? 'pending' : null;
}

async function requestPasswordReset(email) {
  const address = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { data: null, error: { message: 'Please enter a valid email address.' } };
  }

  writeSessionFlag(RESET_REQUEST_KEY, true);

  let lastError = null;
  const targets = passwordResetRedirectCandidates();
  for (let i = 0; i < targets.length; i++) {
    const redirectTo = sanitizeRedirectUrl(targets[i]);
    try {
      const { data, error } = await supabaseClient.auth.resetPasswordForEmail(address, { redirectTo });
      if (!error) return { data, error: null };
      lastError = error;
      if (!/redirect/i.test(String(error.message || ''))) break;
    } catch (err) {
      lastError = err;
      break;
    }
  }

  try {
    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ email: address, redirectTo: getPasswordResetRedirectUrl() })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return { data: payload, error: null };
    const apiMissing = response.status === 404 || response.status === 405;
    if (!(apiMissing && lastError)) {
      lastError = { message: payload.message || payload.error_description || payload.msg || `Reset request failed (${response.status})` };
    }
  } catch (err) {
    if (!lastError) lastError = err;
  }

  writeSessionFlag(RESET_REQUEST_KEY, false);
  return { data: null, error: { message: formatPasswordResetError(lastError) } };
}

async function updateAccountPassword(newPassword) {
  const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) console.error('Password update error:', error.message);
  else markPasswordRecovery(false);
  return { data, error };
}

async function saveJournalEntry(content, frequency = 432) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return alert('Please sign in to save your journal entry.');

  const { error } = await supabaseClient.from('journals').insert([
    { user_id: user.id, content: content, frequency_hz: frequency }
  ]);

  if (error) alert('Error saving entry: ' + error.message);
  else alert('Journal entry saved safely to the sanctuary.');
}

async function restoreSupabaseSession() {
  try {
    const consumed = await consumeAuthCallback();
    if (consumed === 'recovery') {
      const { data: { session: recovered } } = await supabaseClient.auth.getSession();
      if (recovered) clearAuthRedirectParams();
      return 'recovery';
    }
    if (consumed === 'error') {
      clearAuthRedirectParams();
      return false;
    }

    const awaitingResetLink = isPasswordRecoveryUrl()
      || (readSessionFlag(RESET_REQUEST_KEY) && isAuthCallbackUrl());
    if (!awaitingResetLink && !readSessionFlag(RECOVERY_FLAG_KEY)) markPasswordRecovery(false);

    const { data: { session } } = await supabaseClient.auth.getSession();
    const recoveryIntent = isPasswordRecoveryUrl()
      || pendingPasswordRecovery
      || readSessionFlag(RECOVERY_FLAG_KEY)
      || (readSessionFlag(RESET_REQUEST_KEY) && isAuthCallbackUrl());

    if (session && isAuthCallbackUrl()) {
      if (recoveryIntent) {
        markPasswordRecovery(true);
        showPasswordResetForm();
        clearAuthRedirectParams();
        return 'recovery';
      }
      markPasswordRecovery(false);
      clearAuthRedirectParams();
    }

    if (!pendingPasswordRecovery && isAuthCallbackUrl() && readSessionFlag(RESET_REQUEST_KEY)) {
      await new Promise((resolve) => {
        if (pendingPasswordRecovery || isPasswordRecoveryUrl()) return resolve();
        const timeout = setTimeout(resolve, 2500);
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }

    if (isPasswordRecoveryUrl() || pendingPasswordRecovery || readSessionFlag(RECOVERY_FLAG_KEY)) {
      showPasswordResetForm();
      if (isAuthCallbackUrl()) clearAuthRedirectParams();
      return 'recovery';
    }

    if (session?.user) {
      markPasswordRecovery(false);
      await loadPersistedProfile(session.user);
      if (typeof applyAuthenticatedState === 'function') {
        applyAuthenticatedState(session.user.email);
      }
      return true;
    }
  } catch (err) {
    console.warn('Supabase session restore skipped:', err);
  }

  const savedEmail = localStorage.getItem('mystic9_user_email');
  if (savedEmail) {
    const local = readLocalStats(savedEmail);
    if (local) applyStatsToRuntime(local);
    else {
      applyStatsToRuntime({
        username: localStorage.getItem('mystic9_username') || sanitizeUsername('', ''),
        xp: Number(localStorage.getItem('mystic9_user_xp') || 0),
        level: Number(localStorage.getItem('mystic9_user_level') || 1),
        avatar: localStorage.getItem('mystic9_avatar') || ''
      });
    }
    if (typeof applyAuthenticatedState === 'function') {
      applyAuthenticatedState(savedEmail);
    }
    return true;
  }
  return false;
}

async function handleSaveEntry() {
  const content = document.getElementById('journal-content').value;
  const freq = document.getElementById('journal-freq').value;
  if (!content) return alert('Please enter thoughts to channel.');
  await saveJournalEntry(content, parseInt(freq, 10));
  document.getElementById('journal-content').value = '';
}

/*
  Optional one-time SQL (Supabase Dashboard → SQL Editor):

  create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    username text,
    xp integer default 0,
    level integer default 1,
    avatar text,
    updated_at timestamptz default now()
  );
  alter table public.user_profiles add column if not exists avatar text;
  alter table public.user_profiles enable row level security;
  create policy "read own profile" on public.user_profiles for select using (auth.uid() = id);
  create policy "upsert own profile" on public.user_profiles for insert with check (auth.uid() = id);
  create policy "update own profile" on public.user_profiles for update using (auth.uid() = id);

  create table if not exists public.registration_alerts (
    id bigint generated always as identity primary key,
    seeker_email text,
    username text,
    created_at timestamptz default now()
  );
  create table if not exists public.contact_inquiries (
    id bigint generated always as identity primary key,
    name text,
    sender_email text,
    message text,
    created_at timestamptz default now()
  );
  alter table public.registration_alerts enable row level security;
  alter table public.contact_inquiries enable row level security;
  create policy "insert registration alerts" on public.registration_alerts for insert to authenticated, anon with check (true);
  create policy "insert contact inquiries" on public.contact_inquiries for insert to authenticated, anon with check (true);

  create table if not exists public.user_feeds (
    user_slug text primary key,
    token_hash text not null,
    payload jsonb not null default '{}'::jsonb,
    is_public boolean default false,
    updated_at timestamptz default now()
  );
  alter table public.user_feeds enable row level security;
  create extension if not exists pgcrypto;
  create or replace function public.read_user_feed(p_slug text, p_token text default '')
  returns jsonb language plpgsql security definer set search_path = public as $$
  declare rec public.user_feeds;
  begin
    select * into rec from public.user_feeds where user_slug = p_slug;
    if not found then return null; end if;
    if p_token is not null and length(p_token) >= 48
       and encode(digest(p_token, 'sha256'), 'hex') = rec.token_hash then
      return jsonb_build_object('tokenOk', true, 'isPublic', rec.is_public, 'payload', rec.payload, 'tokenHash', rec.token_hash);
    end if;
    if rec.is_public then
      return jsonb_build_object('tokenOk', false, 'isPublic', true, 'payload', rec.payload, 'tokenHash', rec.token_hash);
    end if;
    return null;
  end;
  $$;
  grant execute on function public.read_user_feed(text, text) to anon, authenticated;
  create or replace function public.publish_user_feed(p_slug text, p_token_hash text, p_payload jsonb, p_public boolean)
  returns void language plpgsql security definer set search_path = public as $$
  begin
    insert into public.user_feeds (user_slug, token_hash, payload, is_public, updated_at)
    values (p_slug, p_token_hash, coalesce(p_payload, '{}'::jsonb), coalesce(p_public, false), now())
    on conflict (user_slug) do update
      set token_hash = excluded.token_hash,
          payload = excluded.payload,
          is_public = excluded.is_public,
          updated_at = now();
  end;
  $$;
  grant execute on function public.publish_user_feed(text, text, jsonb, boolean) to anon, authenticated;

  Then add a Database Webhook on registration_alerts INSERT if you want a second backend email path.
*/
