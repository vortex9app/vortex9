(function mystic9Commerce() {
  const MERCHANT = 'rootslabintl@gmail.com';
  const SITE = 'https://mystic9.net';
  const PRODUCTS = {
    academy_harmonic: { amount: '22.00', name: 'Mystic9 Harmonic Resonance DNA Coding', returnPath: '/academy/harmonic?paypal=return' },
    academy_master: { amount: '77.00', name: 'Mystic9 Quantum Field Mastery', returnPath: '/academy/master?paypal=return' },
    ebook_spiral: { amount: '7.77', name: 'The Living Spiral of Nine', returnPath: '/?ebook=return#library' },
    ebook_chaos: { amount: '8.88', name: 'The Sovereign Frequency', returnPath: '/?ebook=return#library' },
    ebook_static: { amount: '11.11', name: 'The Architecture of Resonance', returnPath: '/?ebook=return#library' },
    vortex9_month: { amount: '8.00', name: 'Vortex9 Individual Monthly Tier', returnPath: '/vortex9?paid=1' },
    vortex9_year: { amount: '77.00', name: 'Vortex9 Individual Annual Tier', returnPath: '/vortex9?paid=1' },
    vortex9_citadel: { amount: '699.00', name: 'Vortex9 Sovereign Business Citadel Pack', returnPath: '/vortex9?paid=1' }
  };
  const STRIPE = {
    membership_solstice: 'https://buy.stripe.com/6oU4gyepO2xY48D6Ow8AE02',
    membership_activator: 'https://buy.stripe.com/14AdR895udcCeNh8WE8AE01'
  };
  const COURSE_KIND = { harmonic: 'academy_harmonic', master: 'academy_master' };

  function kinds() {
    return Array.isArray(window.__mystic9CommerceKinds) ? window.__mystic9CommerceKinds : [];
  }

  function hasKind(kind) {
    return kinds().indexOf(kind) !== -1;
  }

  function hasAcademyCourse(courseId) {
    const kind = COURSE_KIND[courseId];
    if (!kind || String(kind).indexOf('academy_') !== 0) return false;
    return kinds().indexOf(kind) !== -1;
  }

  function newIntent() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sessionToken() {
    const sb = window.supabaseClient;
    if (!sb || !sb.auth) return '';
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session && data.session.access_token ? data.session.access_token : '';
    } catch (err) {
      return '';
    }
  }

  async function refresh() {
    const token = await sessionToken();
    let intent = '';
    try { intent = sessionStorage.getItem('mystic9_pay_intent') || ''; } catch (err) { intent = ''; }
    const url = '/api/commerce-status' + (intent ? ('?intent=' + encodeURIComponent(intent)) : '');
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    try {
      const res = await fetch(url, { headers, cache: 'no-store' });
      const json = await res.json();
      window.__mystic9CommerceKinds = Array.isArray(json.kinds) ? json.kinds : [];
    } catch (err) {
      if (!Array.isArray(window.__mystic9CommerceKinds)) window.__mystic9CommerceKinds = [];
    }
    return kinds();
  }

  function paypalUrl(kind) {
    const product = PRODUCTS[kind];
    if (!product) return '';
    let userId = '';
    let email = (localStorage.getItem('mystic9_user_email') || '').trim().toLowerCase();
    try {
      const session = window.supabaseClient && window.supabaseClient.auth
        ? null
        : null;
      void session;
    } catch (err) { /* ignore */ }
    const intent = newIntent();
    try { sessionStorage.setItem('mystic9_pay_intent', intent); sessionStorage.setItem('mystic9_pay_kind', kind); } catch (err) { /* ignore */ }
    const custom = [kind, userId, email, intent].join('|');
    const notify = SITE + '/api/paypal-ipn';
    const ret = SITE + product.returnPath;
    const params = new URLSearchParams({
      cmd: '_xclick',
      business: MERCHANT,
      currency_code: 'GBP',
      amount: product.amount,
      item_name: product.name,
      item_number: kind,
      custom: custom,
      notify_url: notify,
      return: ret,
      cancel_return: SITE + (kind.indexOf('academy') === 0 ? '/academy' : '/#library'),
      no_shipping: '1',
      rm: '1'
    });
    return 'https://www.paypal.com/cgi-bin/webscr?' + params.toString();
  }

  async function paypalUrlAsync(kind) {
    const product = PRODUCTS[kind];
    if (!product) return '';
    let userId = '';
    let email = (localStorage.getItem('mystic9_user_email') || '').trim().toLowerCase();
    const sb = window.supabaseClient;
    if (sb && sb.auth) {
      try {
        const { data } = await sb.auth.getUser();
        if (data && data.user) {
          userId = data.user.id || '';
          email = String(data.user.email || email).toLowerCase();
        }
      } catch (err) { /* ignore */ }
    }
    const intent = newIntent();
    try { sessionStorage.setItem('mystic9_pay_intent', intent); sessionStorage.setItem('mystic9_pay_kind', kind); } catch (err) { /* ignore */ }
    const custom = [kind, userId, email, intent].join('|');
    const params = new URLSearchParams({
      cmd: '_xclick',
      business: MERCHANT,
      currency_code: 'GBP',
      amount: product.amount,
      item_name: product.name,
      item_number: kind,
      custom: custom,
      notify_url: SITE + '/api/paypal-ipn',
      return: SITE + product.returnPath,
      cancel_return: SITE + (kind.indexOf('academy') === 0 ? '/academy' : '/#library'),
      no_shipping: '1',
      rm: '1'
    });
    return 'https://www.paypal.com/cgi-bin/webscr?' + params.toString();
  }

  function stripeUrl(kind) {
    const base = STRIPE[kind];
    if (!base) return '';
    const email = (localStorage.getItem('mystic9_user_email') || '').trim();
    const url = new URL(base);
    if (email) url.searchParams.set('prefilled_email', email);
    try {
      const pending = kind === 'membership_solstice' ? 'solstice' : 'activator';
      sessionStorage.setItem('mystic9_pending_membership', pending);
    } catch (err) { /* ignore */ }
    return url.toString();
  }

  async function stripeUrlAsync(kind) {
    const url = new URL(stripeUrl(kind) || 'https://mystic9.net');
    const sb = window.supabaseClient;
    if (sb && sb.auth) {
      try {
        const { data } = await sb.auth.getUser();
        if (data && data.user && data.user.id) url.searchParams.set('client_reference_id', data.user.id);
        if (data && data.user && data.user.email) url.searchParams.set('prefilled_email', data.user.email);
      } catch (err) { /* ignore */ }
    }
    return url.toString();
  }

  window.hasCommerceKind = hasKind;
  window.hasAcademyCourse = hasAcademyCourse;
  window.refreshCommerceEntitlements = refresh;
  window.mystic9PaypalUrl = paypalUrlAsync;
  window.mystic9StripeUrl = stripeUrlAsync;
  window.MYSTIC9_COURSE_KIND = COURSE_KIND;
  window.MYSTIC9_COMMERCE_READY = true;
})();
