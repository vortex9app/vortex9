(function (root) {
  const CATALOG = [
    { id: 'solar-hierophant', pole: 'masculine', name: 'Solar Hierophant', accent: '#e6c865' },
    { id: 'obsidian-warden', pole: 'masculine', name: 'Obsidian Warden', accent: '#7dd3c7' },
    { id: 'ankh-sovereign', pole: 'masculine', name: 'Ankh Sovereign', accent: '#d4a017' },
    { id: 'thunder-oracle', pole: 'masculine', name: 'Thunder Oracle', accent: '#bb86fc' },
    { id: 'emerald-alchemist', pole: 'masculine', name: 'Emerald Alchemist', accent: '#2ecc40' },
    { id: 'lunar-priestess', pole: 'feminine', name: 'Lunar Priestess', accent: '#cfd8ff' },
    { id: 'rose-seraph', pole: 'feminine', name: 'Rose Seraph', accent: '#ff8ab4' },
    { id: 'sapphire-sibyl', pole: 'feminine', name: 'Sapphire Sibyl', accent: '#5b8cff' },
    { id: 'garnet-empress', pole: 'feminine', name: 'Garnet Empress', accent: '#ff6b6b' },
    { id: 'pearl-mystic', pole: 'feminine', name: 'Pearl Mystic', accent: '#e8d5b5' }
  ];

  const FACETS = {
    'solar-hierophant': {
      skin: '#c48a5a', hair: '#3a2416', glow: '#e6c865',
      halo: 'M32 6 L36 18 L48 14 L40 24 L50 32 L38 32 L32 44 L26 32 L14 32 L24 24 L16 14 L28 18 Z',
      robe: '#5a3a12'
    },
    'obsidian-warden': {
      skin: '#6d5a4e', hair: '#12141c', glow: '#03dac6',
      halo: 'M18 16 L32 6 L46 16 L42 28 L22 28 Z',
      robe: '#10221f'
    },
    'ankh-sovereign': {
      skin: '#b5793c', hair: '#1a120c', glow: '#e6c865',
      halo: 'M32 4 C40 4 46 12 46 20 C46 26 40 30 32 36 C24 30 18 26 18 20 C18 12 24 4 32 4 Z',
      robe: '#3d2a10'
    },
    'thunder-oracle': {
      skin: '#8d6e63', hair: '#2b1638', glow: '#bb86fc',
      halo: 'M32 8 L38 22 L52 22 L40 32 L46 46 L32 36 L18 46 L24 32 L12 22 L26 22 Z',
      robe: '#241433'
    },
    'emerald-alchemist': {
      skin: '#a07850', hair: '#1d2a18', glow: '#4caf50',
      halo: 'M32 8 L44 28 L32 48 L20 28 Z',
      robe: '#143018'
    },
    'lunar-priestess': {
      skin: '#d7b39a', hair: '#4a3f6b', glow: '#cfd8ff',
      halo: 'M40 12 A14 14 0 1 1 22 28 A10 10 0 1 0 40 12 Z',
      robe: '#2a2744'
    },
    'rose-seraph': {
      skin: '#e0b09a', hair: '#6b2438', glow: '#ff8ab4',
      halo: 'M32 6 C44 10 50 22 44 34 C38 28 26 28 20 34 C14 22 20 10 32 6 Z',
      robe: '#4a1828'
    },
    'sapphire-sibyl': {
      skin: '#c9a07e', hair: '#1a2744', glow: '#5b8cff',
      halo: 'M16 22 Q32 4 48 22 Q32 18 16 22 Z',
      robe: '#122038'
    },
    'garnet-empress': {
      skin: '#c6866a', hair: '#2a1014', glow: '#ff6b6b',
      halo: 'M12 20 L32 8 L52 20 L46 24 L32 14 L18 24 Z',
      robe: '#3a1018'
    },
    'pearl-mystic': {
      skin: '#e8cbb8', hair: '#8a7a6a', glow: '#e8d5b5',
      halo: 'M32 8 A16 16 0 1 1 31.9 8 Z',
      robe: '#3a3430'
    }
  };

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function svgFor(id) {
    const meta = CATALOG.find((item) => item.id === id) || CATALOG[0];
    const f = FACETS[meta.id] || FACETS['solar-hierophant'];
    const uid = meta.id.replace(/[^a-z]/g, '');
    return `<svg viewBox="0 0 64 64" role="img" aria-label="${escapeAttr(meta.name)}">
      <defs>
        <radialGradient id="${uid}-bg" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stop-color="${f.glow}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#07080e"/>
        </radialGradient>
        <linearGradient id="${uid}-skin" x1="30%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stop-color="#fff6ea"/>
          <stop offset="42%" stop-color="${f.skin}"/>
          <stop offset="100%" stop-color="#2a1810"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#${uid}-bg)" stroke="${f.glow}" stroke-width="1.4"/>
      <path d="${f.halo}" fill="${f.glow}" opacity="0.72"/>
      <ellipse cx="32" cy="50" rx="18" ry="12" fill="${f.robe}"/>
      <path d="M18 54 Q32 40 46 54 Q32 48 18 54 Z" fill="${meta.accent}" opacity="0.55"/>
      <circle cx="32" cy="28" r="11.5" fill="url(#${uid}-skin)"/>
      <path d="M20 24 Q32 8 44 24 Q40 16 32 14 Q24 16 20 24 Z" fill="${f.hair}"/>
      <path d="M24 29 Q32 33 40 29" fill="none" stroke="#1a120c" stroke-width="0.7" opacity="0.35"/>
      <circle cx="28" cy="28" r="1.15" fill="#120c08"/>
      <circle cx="36" cy="28" r="1.15" fill="#120c08"/>
      <path d="M29 33.5 Q32 35.5 35 33.5" fill="none" stroke="#5a331f" stroke-width="0.85" stroke-linecap="round"/>
      <circle cx="32" cy="18" r="2.2" fill="${f.glow}"/>
    </svg>`;
  }

  function isValid(id) {
    return CATALOG.some((item) => item.id === id);
  }

  function get(id) {
    return CATALOG.find((item) => item.id === id) || null;
  }

  function markup(id, sizeClass) {
    const meta = get(id);
    if (!meta) {
      return `<span class="mystic-avatar mystic-avatar--empty ${sizeClass || ''}" aria-hidden="true"></span>`;
    }
    return `<span class="mystic-avatar mystic-avatar--${meta.id} ${sizeClass || ''}" title="${escapeAttr(meta.name)}" style="--avatar-glow:${meta.accent}">${svgFor(meta.id)}</span>`;
  }

  function renderPicker(container, selectedId, inputId) {
    if (!container) return;
    const masculine = CATALOG.filter((item) => item.pole === 'masculine');
    const feminine = CATALOG.filter((item) => item.pole === 'feminine');
    const row = (items, label) => `
      <p class="avatar-pole-label">${label}</p>
      <div class="avatar-row">
        ${items.map((item) => `
          <button type="button" class="avatar-choice${selectedId === item.id ? ' is-selected' : ''}" data-avatar-id="${item.id}" aria-pressed="${selectedId === item.id ? 'true' : 'false'}" title="${escapeAttr(item.name)}">
            ${markup(item.id, 'avatar-choice-art')}
            <span>${escapeAttr(item.name)}</span>
          </button>
        `).join('')}
      </div>`;
    container.innerHTML = row(masculine, 'Divine masculine archetypes') + row(feminine, 'Divine feminine archetypes');
    container.querySelectorAll('.avatar-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-avatar-id');
        if (typeof root.selectSanctuaryAvatar === 'function') root.selectSanctuaryAvatar(id, inputId);
      });
    });
  }

  root.MYSTIC9_AVATARS = CATALOG;
  root.isValidSanctuaryAvatar = isValid;
  root.sanctuaryAvatarMarkup = markup;
  root.getSanctuaryAvatar = get;
  root.renderSanctuaryAvatarPicker = renderPicker;
})(window);
