(function mystic9SeekerFeed() {
  const VAULT_KEY = 'mystic9_feed_vault';
  const PINS_KEY = 'mystic9_library_pins';
  const PUBLIC_KEY = 'mystic9_feed_public';
  const COURSE_TITLES = {
    foundations: 'Foundations of Frequency',
    harmonic: 'Harmonic Resonance & DNA Coding',
    master: 'Quantum Field Mastery & Frequency Activation'
  };

  function origin() {
    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'https://mystic9.net';
      }
      return window.location.origin.replace(/\/+$/, '') || 'https://mystic9.net';
    } catch (err) {
      return 'https://mystic9.net';
    }
  }

  function email() {
    return String(localStorage.getItem('mystic9_user_email') || '').trim().toLowerCase();
  }

  function readJson(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '');
      return raw == null ? fallback : raw;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private */ }
  }

  function hexRandom(bytes) {
    const buf = new Uint8Array(bytes);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    return Array.from(buf).map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  function slugify(name) {
    const base = String(name || 'seeker')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 28) || 'seeker';
    return base;
  }

  function vault() {
    const all = readJson(VAULT_KEY, {});
    return all && typeof all === 'object' ? all : {};
  }

  function saveVault(all) {
    writeJson(VAULT_KEY, all);
  }

  function ensureIdentity() {
    const mail = email();
    if (!mail) return null;
    const all = vault();
    let row = all[mail];
    if (!row || !row.token || !row.slug) {
      const name = (typeof getPublicUsername === 'function' ? getPublicUsername() : '') || 'seeker';
      row = {
        token: hexRandom(32),
        slug: `${slugify(name)}-${hexRandom(4)}`
      };
      all[mail] = row;
      saveVault(all);
    }
    return row;
  }

  function pins() {
    const list = readJson(PINS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function setPins(list) {
    writeJson(PINS_KEY, list);
  }

  function isPinned(id) {
    return pins().indexOf(id) !== -1;
  }

  function togglePin(id) {
    if (!id || !email()) return false;
    const next = pins().slice();
    const at = next.indexOf(id);
    if (at === -1) next.unshift(id);
    else next.splice(at, 1);
    setPins(next.slice(0, 40));
    publish();
    syncPinButton(id);
    return at === -1;
  }

  function feedUrl() {
    const id = ensureIdentity();
    if (!id) return '';
    return `${origin()}/feed/${encodeURIComponent(id.slug)}.xml?token=${id.token}`;
  }

  function membershipPath() {
    const state = typeof getMembershipState === 'function' ? getMembershipState() : {};
    return state.path || 'free';
  }

  function collectItems() {
    const items = [];
    const now = new Date().toISOString();
    const name = typeof getPublicUsername === 'function' ? getPublicUsername() : 'Seeker';
    const level = Number(localStorage.getItem('mystic9_user_level') || 1);
    const path = membershipPath();

    items.push({
      guid: 'profile',
      title: `${name} · Level ${level} · ${path} path`,
      description: 'Public sanctuary identity note. Email remains private.',
      link: `${origin()}/#sanctuary`,
      date: now,
      category: 'Profile',
      visibility: 'public'
    });

    const enroll = readJson('mystic9_academy_enrollments', {});
    Object.keys(COURSE_TITLES).forEach((id) => {
      if (!enroll[id] && !(id === 'foundations' && email())) return;
      items.push({
        guid: `academy-${id}`,
        title: `Academy unlocked: ${COURSE_TITLES[id]}`,
        description: 'A modular Academy current is open on this seeker path.',
        link: `${origin()}/academy/${id === 'foundations' ? 'foundations' : id === 'harmonic' ? 'harmonic' : 'master'}`,
        date: now,
        category: 'Academy',
        visibility: 'public'
      });
    });

    const study = readJson('mystic9_academy_study', {});
    Object.keys(study).forEach((courseId) => {
      const done = (study[courseId] && study[courseId].done) || {};
      const complete = Object.keys(done).filter((key) => done[key]).length;
      if (!complete) return;
      items.push({
        guid: `study-${courseId}`,
        title: `${COURSE_TITLES[courseId] || courseId}: ${complete} study marks`,
        description: 'Private Academy progress snapshot for this feed token.',
        link: `${origin()}/academy`,
        date: now,
        category: 'Academy',
        visibility: 'private'
      });
    });

    pins().forEach((id) => {
      const article = typeof findLibraryArticle === 'function' ? findLibraryArticle(id) : null;
      if (!article) return;
      items.push({
        guid: `pin-${id}`,
        title: `Pinned transmission: ${article.title}`,
        description: article.category || 'Library pin',
        link: `${origin()}/library/${encodeURIComponent(id)}`,
        date: now,
        category: 'Library',
        visibility: 'private'
      });
    });

    const reads = readJson('mystic9_library_reads', { ids: [] });
    (reads.ids || []).slice(-8).reverse().forEach((id) => {
      const article = typeof findLibraryArticle === 'function' ? findLibraryArticle(id) : null;
      if (!article) return;
      items.push({
        guid: `read-${id}`,
        title: `Recently opened: ${article.title}`,
        description: 'Private library activity for this feed token.',
        link: `${origin()}/library/${encodeURIComponent(id)}`,
        date: now,
        category: 'Library',
        visibility: 'private'
      });
    });

    return items.slice(0, 36);
  }

  function payload() {
    return {
      displayName: typeof getPublicUsername === 'function' ? getPublicUsername() : 'Seeker',
      level: Number(localStorage.getItem('mystic9_user_level') || 1),
      path: membershipPath(),
      items: collectItems()
    };
  }

  let publishTimer = null;
  function publish() {
    const id = ensureIdentity();
    if (!id) return;
    refreshUi();
    clearTimeout(publishTimer);
    publishTimer = setTimeout(async () => {
      try {
        await fetch('/api/user-feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: id.slug,
            token: id.token,
            isPublic: localStorage.getItem(PUBLIC_KEY) === '1',
            payload: payload()
          })
        });
      } catch (err) { /* local static server may not expose /api */ }
    }, 400);
  }

  function refreshUi() {
    const journal = document.getElementById('seeker-feed-journal');
    const heroFeed = document.getElementById('hero-seeker-feed');
    const signed = !!email();
    if (journal) journal.classList.toggle('hidden', !signed);
    if (heroFeed) heroFeed.classList.toggle('hidden', !signed);
    const url = signed ? feedUrl() : '';
    document.querySelectorAll('[data-seeker-feed-url]').forEach((el) => {
      if (el.tagName === 'A') el.setAttribute('href', url || '#');
      else el.textContent = url;
    });
    const box = document.getElementById('seeker-feed-public');
    if (box) box.checked = localStorage.getItem(PUBLIC_KEY) === '1';
  }

  function copyLink() {
    const url = feedUrl();
    if (!url) return;
    const done = () => {
      const note = document.getElementById('seeker-feed-note');
      if (note) note.textContent = 'Feed link copied. Paste it into any RSS reader.';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => {
        window.prompt('Copy your private RSS link', url);
      });
    } else {
      window.prompt('Copy your private RSS link', url);
    }
    publish();
  }

  function rotateToken() {
    const mail = email();
    if (!mail) return;
    const all = vault();
    const name = typeof getPublicUsername === 'function' ? getPublicUsername() : 'seeker';
    all[mail] = { token: hexRandom(32), slug: `${slugify(name)}-${hexRandom(4)}` };
    saveVault(all);
    publish();
    const note = document.getElementById('seeker-feed-note');
    if (note) note.textContent = 'A new feed token was issued. Update your reader with the copied link.';
  }

  function setPublic(on) {
    try { localStorage.setItem(PUBLIC_KEY, on ? '1' : '0'); } catch (err) { /* private */ }
    publish();
  }

  function syncPinButton(id) {
    const btn = document.getElementById('library-pin-btn');
    if (!btn) return;
    const articleId = id || btn.getAttribute('data-article-id');
    const on = articleId && isPinned(articleId);
    btn.classList.toggle('is-pinned', !!on);
    btn.textContent = on ? 'Pinned to RSS' : 'Pin to RSS';
  }

  window.publishSeekerFeed = publish;
  window.copySeekerFeedLink = copyLink;
  window.rotateSeekerFeedToken = rotateToken;
  window.toggleLibraryPin = function (id) {
    const btn = document.getElementById('library-pin-btn');
    togglePin(id || (btn && btn.getAttribute('data-article-id')));
  };
  window.isLibraryPinned = isPinned;
  window.syncLibraryPinButton = syncPinButton;
  window.refreshSeekerFeedUI = refreshUi;
  window.setSeekerFeedPublic = setPublic;

  window.addEventListener('DOMContentLoaded', () => {
    if (email()) publish();
    else refreshUi();
  });
})();
