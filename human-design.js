(function () {
  const HD_WHEEL = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];
  const HD_WHEEL_START = 302;
  const GATE_SPAN = 5.625;
  const LINE_SPAN = 0.9375;

  const GATE_CENTER = {
    64: 'Head', 61: 'Head', 63: 'Head',
    47: 'Ajna', 24: 'Ajna', 4: 'Ajna', 17: 'Ajna', 43: 'Ajna', 11: 'Ajna',
    62: 'Throat', 23: 'Throat', 56: 'Throat', 35: 'Throat', 12: 'Throat', 45: 'Throat', 33: 'Throat', 8: 'Throat', 31: 'Throat', 20: 'Throat', 16: 'Throat',
    7: 'G', 1: 'G', 13: 'G', 25: 'G', 46: 'G', 2: 'G', 15: 'G', 10: 'G',
    21: 'Heart', 40: 'Heart', 26: 'Heart', 51: 'Heart',
    6: 'Solar Plexus', 37: 'Solar Plexus', 22: 'Solar Plexus', 36: 'Solar Plexus', 30: 'Solar Plexus', 55: 'Solar Plexus', 49: 'Solar Plexus',
    5: 'Sacral', 14: 'Sacral', 29: 'Sacral', 59: 'Sacral', 9: 'Sacral', 3: 'Sacral', 42: 'Sacral', 27: 'Sacral', 34: 'Sacral',
    48: 'Spleen', 57: 'Spleen', 44: 'Spleen', 50: 'Spleen', 32: 'Spleen', 28: 'Spleen', 18: 'Spleen',
    53: 'Root', 60: 'Root', 52: 'Root', 19: 'Root', 39: 'Root', 41: 'Root', 58: 'Root', 38: 'Root', 54: 'Root'
  };

  const GATE_NAME = {
    1: 'The Creative', 2: 'The Receptive', 3: 'Ordering', 4: 'Youthful Folly', 5: 'Waiting', 6: 'Conflict', 7: 'The Army', 8: 'Holding Together',
    9: 'Focus', 10: 'Treading', 11: 'Peace', 12: 'Standstill', 13: 'The Listener', 14: 'Prosperity', 15: 'Modesty', 16: 'Skills',
    17: 'Following', 18: 'Correction', 19: 'Approach', 20: 'The Now', 21: 'Control', 22: 'Grace', 23: 'Splitting Apart', 24: 'Returning',
    25: 'Spirit of the Self', 26: 'The Trickster', 27: 'Nourishment', 28: 'The Game Player', 29: 'Perseverance', 30: 'Recognition', 31: 'Influence', 32: 'Duration',
    33: 'Retreat', 34: 'Power', 35: 'Change', 36: 'Crisis', 37: 'Friendship', 38: 'The Fighter', 39: 'Provocation', 40: 'Deliverance',
    41: 'Contraction', 42: 'Increase', 43: 'Insight', 44: 'Alertness', 45: 'The Gatherer', 46: 'The Determined', 47: 'Realizing', 48: 'Depth',
    49: 'Revolution', 50: 'Values', 51: 'Shock', 52: 'Stillness', 53: 'Beginnings', 54: 'Ambition', 55: 'Spirit', 56: 'The Wanderer',
    57: 'Intuitive Clarity', 58: 'Joy', 59: 'Sexuality', 60: 'Limitation', 61: 'Mystery', 62: 'Details', 63: 'Doubt', 64: 'Confusion'
  };

  const CHANNELS = [
    { gates: [1, 8], name: 'Inspiration', centers: ['G', 'Throat'] },
    { gates: [2, 14], name: 'The Beat', centers: ['G', 'Sacral'] },
    { gates: [3, 60], name: 'Mutation', centers: ['Sacral', 'Root'] },
    { gates: [4, 63], name: 'Logic', centers: ['Ajna', 'Head'] },
    { gates: [5, 15], name: 'Rhythm', centers: ['Sacral', 'G'] },
    { gates: [6, 59], name: 'Mating', centers: ['Solar Plexus', 'Sacral'] },
    { gates: [7, 31], name: 'The Alpha', centers: ['G', 'Throat'] },
    { gates: [9, 52], name: 'Concentration', centers: ['Sacral', 'Root'] },
    { gates: [10, 20], name: 'Awakening', centers: ['G', 'Throat'] },
    { gates: [10, 34], name: 'Exploration', centers: ['G', 'Sacral'] },
    { gates: [10, 57], name: 'Perfected Form', centers: ['G', 'Spleen'] },
    { gates: [11, 56], name: 'Curiosity', centers: ['Ajna', 'Throat'] },
    { gates: [12, 22], name: 'Openness', centers: ['Throat', 'Solar Plexus'] },
    { gates: [13, 33], name: 'The Prodigal', centers: ['G', 'Throat'] },
    { gates: [16, 48], name: 'The Wavelength', centers: ['Throat', 'Spleen'] },
    { gates: [17, 62], name: 'Acceptance', centers: ['Ajna', 'Throat'] },
    { gates: [18, 58], name: 'Judgment', centers: ['Spleen', 'Root'] },
    { gates: [19, 49], name: 'Synthesis', centers: ['Root', 'Solar Plexus'] },
    { gates: [20, 34], name: 'Charisma', centers: ['Throat', 'Sacral'] },
    { gates: [20, 57], name: 'The Brain Wave', centers: ['Throat', 'Spleen'] },
    { gates: [21, 45], name: 'The Money Line', centers: ['Heart', 'Throat'] },
    { gates: [23, 43], name: 'Structuring', centers: ['Throat', 'Ajna'] },
    { gates: [24, 61], name: 'Awareness', centers: ['Ajna', 'Head'] },
    { gates: [25, 51], name: 'Initiation', centers: ['G', 'Heart'] },
    { gates: [26, 44], name: 'Surrender', centers: ['Heart', 'Spleen'] },
    { gates: [27, 50], name: 'Preservation', centers: ['Sacral', 'Spleen'] },
    { gates: [28, 38], name: 'Struggle', centers: ['Spleen', 'Root'] },
    { gates: [29, 46], name: 'Discovery', centers: ['Sacral', 'G'] },
    { gates: [30, 41], name: 'Recognition', centers: ['Solar Plexus', 'Root'] },
    { gates: [32, 54], name: 'Transformation', centers: ['Spleen', 'Root'] },
    { gates: [34, 57], name: 'Power', centers: ['Sacral', 'Spleen'] },
    { gates: [35, 36], name: 'Transitoriness', centers: ['Throat', 'Solar Plexus'] },
    { gates: [37, 40], name: 'Community', centers: ['Solar Plexus', 'Heart'] },
    { gates: [39, 55], name: 'Emoting', centers: ['Root', 'Solar Plexus'] },
    { gates: [42, 53], name: 'Maturation', centers: ['Sacral', 'Root'] },
    { gates: [47, 64], name: 'Abstraction', centers: ['Ajna', 'Head'] }
  ];

  const LINE_NAME = { 1: 'Investigator', 2: 'Hermit', 3: 'Martyr', 4: 'Opportunist', 5: 'Heretic', 6: 'Role Model' };
  const MOTORS = ['Heart', 'Solar Plexus', 'Sacral', 'Root'];
  const ALL_CENTERS = ['Head', 'Ajna', 'Throat', 'G', 'Heart', 'Sacral', 'Solar Plexus', 'Spleen', 'Root'];

  const TYPE_COPY = {
    Generator: {
      strategy: 'To Respond',
      overview: 'Your sacral motor is defined. Life opens when you wait for something real to meet your body, then answer with a yes or a no from the gut rather than from the mind. Forced initiation drains the field. Response restores it.'
    },
    'Manifesting Generator': {
      strategy: 'To Respond, then inform',
      overview: 'Sacral fire is on, and a motor reaches the throat. You are built to respond first, then move fast, skip, and course-correct. Inform those in your field before you pivot so the current stays clean.'
    },
    Manifestor: {
      strategy: 'To Inform',
      overview: 'You initiate. A motor reaches the throat without a defined sacral, so impact lands before others are ready. Informing is not asking permission. It is clearing the path so your spark does not meet resistance.'
    },
    Projector: {
      strategy: 'Wait for the Invitation',
      overview: 'The sacral is open and no motor reaches the throat. Your gift is seeing into systems and people. Recognition and a true invitation are the fuel. Forcing visibility collapses the aura.'
    },
    Reflector: {
      strategy: 'Wait a lunar cycle',
      overview: 'No centers are defined. You sample the moon and the room. Clarity for major moves ripens across about twenty-eight days. You are a cosmic barometer, not a fixed identity.'
    }
  };

  const AUTHORITY_COPY = {
    Emotional: 'Solar plexus is defined. Truth is a wave. Do not treat the high or the low as a final answer. Ride the weather until the body is neutral, then decide.',
    Sacral: 'In-the-moment gut response. Sounds, sensations, uh-huh and uh-uh. The mind will try to override. Let the sacral speak before the story does.',
    Splenic: 'Instinctive, quiet, and now. The spleen whispers once. If you wait for a second opinion from the mind, the original hit has already passed.',
    'Ego Manifested': 'Heart to throat. Your authority is will spoken. Promises must be yours to keep. Inform from the chest, not from proving.',
    'Ego Projected': 'Willpower is present, yet it waits for recognition. The right invitation lets the heart say yes. Hustle without invitation empties the battery.',
    'Self-Projected': 'Identity speaks through the G and the throat. Talk it out with the right listener. You hear your direction in your own voice.',
    Mental: 'No inner authority in the body. The environment and sounding board matter. Discuss, sleep, and feel which room leaves you clear.',
    Lunar: 'The moon is your timing organ. Sample a full cycle before binding your life to a new contract, city, or companion.'
  };

  const OPEN_CENTER_PATH = {
    Head: 'Release the pressure to answer every question. Inspiration is weather, not a command.',
    Ajna: 'You are not here to be certain. Hold concepts lightly and let knowing arrive without freezing it.',
    Throat: 'Do not perform for attention. Speak when energy is actually moving, not to prove you exist.',
    G: 'Direction and love are found, not forced. Follow places and people that make the identity feel like home.',
    Heart: 'Drop the proving. Worth is not a willpower contest. Rest the heart from bargains it never agreed to.',
    Sacral: 'Stop generating for others. Rest is sacred. Work that is not yours will always feel like a leak.',
    'Solar Plexus': 'You amplify feeling. Name what is yours and what is the room. Pause before you swallow someone else\'s wave.',
    Spleen: 'Fear is data, not destiny. Hygiene, timing, and instinct keep the field clean without clinging to survival stories.',
    Root: 'Adrenal pressure is not a deadline from the universe. Move when the pulse is true, not when the clock panics.'
  };

  const CROSS_THEME = {
    1: 'the Sphinx', 2: 'the Sphinx', 3: 'Laws', 4: 'Explanation', 5: 'the Sleeping Phoenix', 6: 'Eden', 7: 'the Sphinx', 8: 'Contagion',
    9: 'Planning', 10: 'the Vessel of Love', 11: 'Eden', 12: 'Eden', 13: 'the Sphinx', 14: 'Empowering', 15: 'the Vessel of Love', 16: 'the Vessel of Love',
    17: 'Service', 18: 'Service', 19: 'the Four Ways', 20: 'the Sleeping Phoenix', 21: 'Tension', 22: 'Informing', 23: 'Explanation', 24: 'the Four Ways',
    25: 'the Vessel of Love', 26: 'Tension', 27: 'the Unexpected', 28: 'the Unexpected', 29: 'Contagion', 30: 'Contagion', 31: 'the Unexpected', 32: 'Maya',
    33: 'the Four Ways', 34: 'the Sleeping Phoenix', 35: 'Consciousness', 36: 'Eden', 37: 'Planning', 38: 'Tension', 39: 'Tension', 40: 'Planning',
    41: 'the Unexpected', 42: 'Maya', 43: 'Explanation', 44: 'the Four Ways', 45: 'Rulership', 46: 'the Vessel of Love', 47: 'Rulership', 48: 'Tension',
    49: 'Explanation', 50: 'Laws',     51: 'the Clarion', 52: 'Service', 53: 'Penetration', 54: 'Penetration', 55: 'the Sleeping Phoenix', 56: 'Laws',
    57: 'the Clarion', 58: 'Service', 59: 'the Sleeping Phoenix', 60: 'Laws', 61: 'the Clarion', 62: 'the Clarion', 63: 'Consciousness', 64: 'Consciousness'
  };

  let lastChart = null;
  let selectedPlace = null;
  let placeTimer = null;
  let astronomyMod = null;

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normDeg(d) {
    return ((d % 360) + 360) % 360;
  }

  function longitudeToGate(lon) {
    const pos = normDeg(lon - HD_WHEEL_START);
    const idx = Math.min(63, Math.floor(pos / GATE_SPAN));
    const line = Math.min(6, Math.floor((pos % GATE_SPAN) / LINE_SPAN) + 1);
    return { gate: HD_WHEEL[idx], line: line, lon: lon };
  }

  function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function fromJulian(jd) {
    return new Date((jd - 2440587.5) * 86400000);
  }

  function zonedCivilToUtc(year, month, day, hour, minute, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });
    function read(ms) {
      const map = {};
      formatter.formatToParts(new Date(ms)).forEach(function (part) {
        if (part.type !== 'literal') map[part.type] = part.value;
      });
      return Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    }
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    let guess = wanted;
    for (let i = 0; i < 4; i++) {
      const diff = wanted - read(guess);
      guess += diff;
      if (diff === 0) break;
    }
    return new Date(guess);
  }

  function meeusSun(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L0 = normDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M = normDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const Mr = M * Math.PI / 180;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);
    return normDeg(L0 + C);
  }

  function meeusMoon(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L = normDeg(218.3164477 + 481267.88123421 * T);
    const D = (297.8501921 + 445267.1114034 * T) * Math.PI / 180;
    const M = (357.5291092 + 35999.0502909 * T) * Math.PI / 180;
    const Mp = (134.9633964 + 477198.8673981 * T) * Math.PI / 180;
    const F = (93.272095 + 483202.0175233 * T) * Math.PI / 180;
    const lon = L
      + 6.289 * Math.sin(Mp)
      + 1.274 * Math.sin(2 * D - Mp)
      + 0.658 * Math.sin(2 * D)
      + 0.214 * Math.sin(2 * Mp)
      - 0.186 * Math.sin(M)
      - 0.114 * Math.sin(2 * F);
    return normDeg(lon);
  }

  function meeusPlanet(jd, key) {
    const T = (jd - 2451545.0) / 36525;
    const orbits = {
      mercury: [252.2509, 149472.6746, 0.387, 7.0, 29.1, 48.3, 77.5],
      venus: [181.9798, 58517.8154, 0.723, 3.39, 54.9, 76.7, 131.6],
      mars: [355.433, 19140.2993, 1.524, 1.85, 286.5, 49.6, 336.1],
      jupiter: [34.3515, 3034.9057, 5.203, 1.3, 273.9, 100.5, 14.3],
      saturn: [50.0774, 1222.1138, 9.537, 2.49, 339.4, 113.7, 93.1],
      uranus: [314.055, 428.4669, 19.19, 0.77, 99.0, 74.0, 173.0],
      neptune: [304.3487, 218.4862, 30.07, 1.77, 276.3, 131.8, 48.1],
      pluto: [238.929, 145.208, 39.48, 17.16, 113.8, 110.3, 224.1]
    };
    const o = orbits[key];
    const L = normDeg(o[0] + o[1] * T);
    const earthL = meeusSun(jd);
    const r = o[2];
    const elong = (L - earthL) * Math.PI / 180;
    const geo = L - Math.atan2(Math.sin(elong), r - Math.cos(elong)) * 180 / Math.PI * 0.15;
    return normDeg(geo);
  }

  function meeusTrueNode(jd) {
    const T = (jd - 2451545.0) / 36525;
    const omega = 125.0445479 - 1934.1362608 * T + 0.0020708 * T * T;
    const F = (93.272095 + 483202.0175233 * T) * Math.PI / 180;
    return normDeg(omega - 1.4979 * Math.sin(2 * F));
  }

  const BODY_MAP = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto'
  };

  async function loadAstronomy() {
    if (typeof Astronomy !== 'undefined') return Astronomy;
    if (astronomyMod) return astronomyMod;
    try {
      astronomyMod = await import('https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js');
    } catch (err) {
      astronomyMod = null;
    }
    return astronomyMod || (typeof Astronomy !== 'undefined' ? Astronomy : null);
  }

  function bodyLongitude(mod, date, name, jd) {
    const astro = mod || (typeof Astronomy !== 'undefined' ? Astronomy : null);
    const key = BODY_MAP[name];
    if (astro && key && astro.GeoVector && astro.Ecliptic && astro.Body) {
      try {
        const time = astro.MakeTime ? astro.MakeTime(date) : date;
        const vec = astro.GeoVector(astro.Body[key], time, true);
        const ecl = astro.Ecliptic(vec);
        if (ecl && typeof ecl.elon === 'number' && !isNaN(ecl.elon)) return normDeg(ecl.elon);
      } catch (err) { /* use fallback */ }
    }
    if (name === 'sun') return meeusSun(jd);
    if (name === 'moon') return meeusMoon(jd);
    return meeusPlanet(jd, name);
  }

  function allBodies(mod, date) {
    const jd = julianDay(date);
    const sun = bodyLongitude(mod, date, 'sun', jd);
    const moon = bodyLongitude(mod, date, 'moon', jd);
    const node = meeusTrueNode(jd);
    const map = {
      Sun: sun,
      Earth: normDeg(sun + 180),
      Moon: moon,
      'North Node': node,
      'South Node': normDeg(node + 180),
      Mercury: bodyLongitude(mod, date, 'mercury', jd),
      Venus: bodyLongitude(mod, date, 'venus', jd),
      Mars: bodyLongitude(mod, date, 'mars', jd),
      Jupiter: bodyLongitude(mod, date, 'jupiter', jd),
      Saturn: bodyLongitude(mod, date, 'saturn', jd),
      Uranus: bodyLongitude(mod, date, 'uranus', jd),
      Neptune: bodyLongitude(mod, date, 'neptune', jd),
      Pluto: bodyLongitude(mod, date, 'pluto', jd)
    };
    const activations = {};
    Object.keys(map).forEach(function (key) {
      activations[key] = Object.assign({ planet: key }, longitudeToGate(map[key]));
    });
    return activations;
  }

  function findDesignDate(mod, birth) {
    const birthJd = julianDay(birth);
    const sun0 = bodyLongitude(mod, birth, 'sun', birthJd);
    const target = normDeg(sun0 - 88);
    let lo = birthJd - 96;
    let hi = birthJd - 80;
    for (let i = 0; i < 46; i++) {
      const mid = (lo + hi) / 2;
      const midDate = fromJulian(mid);
      const lon = bodyLongitude(mod, midDate, 'sun', mid);
      const diff = ((lon - target + 180) % 360) - 180;
      if (Math.abs(diff) < 1e-5) return midDate;
      if (diff < 0) lo = mid;
      else hi = mid;
    }
    return fromJulian((lo + hi) / 2);
  }

  function uniqueGates(personality, design) {
    const set = {};
    [personality, design].forEach(function (side) {
      Object.keys(side).forEach(function (planet) {
        set[side[planet].gate] = true;
      });
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  function definedChannels(gates) {
    const have = {};
    gates.forEach(function (g) { have[g] = true; });
    return CHANNELS.filter(function (ch) {
      return have[ch.gates[0]] && have[ch.gates[1]];
    });
  }

  function definedCentersFromChannels(channels) {
    const defined = {};
    channels.forEach(function (ch) {
      defined[ch.centers[0]] = true;
      defined[ch.centers[1]] = true;
    });
    return Object.keys(defined);
  }

  function centerGraph(channels) {
    const graph = {};
    ALL_CENTERS.forEach(function (c) { graph[c] = []; });
    channels.forEach(function (ch) {
      graph[ch.centers[0]].push(ch.centers[1]);
      graph[ch.centers[1]].push(ch.centers[0]);
    });
    return graph;
  }

  function canReach(graph, starts, goal, allowed) {
    const seen = {};
    const q = starts.slice();
    while (q.length) {
      const cur = q.shift();
      if (!allowed[cur] || seen[cur]) continue;
      seen[cur] = true;
      if (cur === goal) return true;
      (graph[cur] || []).forEach(function (n) { q.push(n); });
    }
    return false;
  }

  function componentCount(defined, channels) {
    const allowed = {};
    defined.forEach(function (c) { allowed[c] = true; });
    const graph = centerGraph(channels);
    const seen = {};
    let count = 0;
    defined.forEach(function (start) {
      if (seen[start]) return;
      count += 1;
      const q = [start];
      while (q.length) {
        const cur = q.shift();
        if (seen[cur] || !allowed[cur]) continue;
        seen[cur] = true;
        (graph[cur] || []).forEach(function (n) { q.push(n); });
      }
    });
    return count;
  }

  function deriveType(defined, channels) {
    if (!defined.length) return 'Reflector';
    const allow = {};
    defined.forEach(function (c) { allow[c] = true; });
    const graph = centerGraph(channels);
    const sacral = allow.Sacral;
    const motorStarts = MOTORS.filter(function (m) { return allow[m]; });
    const motorToThroat = canReach(graph, motorStarts, 'Throat', allow);
    if (sacral && motorToThroat) return 'Manifesting Generator';
    if (sacral) return 'Generator';
    if (motorToThroat) return 'Manifestor';
    return 'Projector';
  }

  function deriveAuthority(type, defined, channels) {
    const has = {};
    defined.forEach(function (c) { has[c] = true; });
    if (type === 'Reflector') return 'Lunar';
    if (has['Solar Plexus']) return 'Emotional';
    if (has.Sacral) return 'Sacral';
    if (has.Spleen) return 'Splenic';
    if (has.Heart) {
      const allow = {};
      defined.forEach(function (c) { allow[c] = true; });
      const graph = centerGraph(channels);
      return canReach(graph, ['Heart'], 'Throat', allow) ? 'Ego Manifested' : 'Ego Projected';
    }
    if (has.G) return 'Self-Projected';
    return 'Mental';
  }

  function profileAngle(conscious, unconscious) {
    const p = conscious + '/' + unconscious;
    if (p === '4/1') return 'Juxtaposition';
    if (conscious === 5 || conscious === 6) return 'Left Angle';
    return 'Right Angle';
  }

  function formatActivation(act) {
    return act.gate + '.' + act.line;
  }

  function buildChart(personality, design, meta) {
    const gates = uniqueGates(personality, design);
    const channels = definedChannels(gates);
    const defined = definedCentersFromChannels(channels);
    const type = deriveType(defined, channels);
    const authority = deriveAuthority(type, defined, channels);
    const pSun = personality.Sun;
    const dSun = design.Sun;
    const angle = profileAngle(pSun.line, dSun.line);
    const splits = componentCount(defined, channels);
    let definition = 'No Definition';
    if (splits === 1) definition = 'Single Definition';
    else if (splits === 2) definition = 'Split Definition';
    else if (splits === 3) definition = 'Triple Split';
    else if (splits >= 4) definition = 'Quadruple Split';
    const open = ALL_CENTERS.filter(function (c) { return defined.indexOf(c) === -1; });
    const theme = CROSS_THEME[pSun.gate] || 'the Vessel';
    const crossName = angle + ' Cross of ' + theme;
    return {
      meta: meta,
      personality: personality,
      design: design,
      type: type,
      strategy: TYPE_COPY[type].strategy,
      authority: authority,
      profile: pSun.line + '/' + dSun.line,
      profileNames: LINE_NAME[pSun.line] + ' / ' + LINE_NAME[dSun.line],
      definition: definition,
      gates: gates,
      channels: channels,
      definedCenters: defined,
      openCenters: open,
      incarnationCross: {
        name: crossName,
        angle: angle,
        personalitySun: formatActivation(pSun),
        personalityEarth: formatActivation(personality.Earth),
        designSun: formatActivation(dSun),
        designEarth: formatActivation(design.Earth)
      }
    };
  }

  async function calculateChart(input) {
    const mod = await loadAstronomy();
      let birth;
      try {
        birth = zonedCivilToUtc(input.year, input.month, input.day, input.hour, input.minute, input.timeZone || 'UTC');
      } catch (err) {
        birth = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0));
      }
    const designDate = findDesignDate(mod, birth);
    const personality = allBodies(mod, birth);
    const design = allBodies(mod, designDate);
    return buildChart(personality, design, {
      birthIso: birth.toISOString(),
      designIso: designDate.toISOString(),
      place: input.placeLabel,
      timeZone: input.timeZone
    });
  }

  function planetRows(side) {
    return Object.keys(side).map(function (planet) {
      const act = side[planet];
      return '<li><span>' + esc(planet) + '</span><strong>' + esc(act.gate + '.' + act.line) + '</strong> ' + esc(GATE_NAME[act.gate] || '') + '</li>';
    }).join('');
  }

  function bodygraphSvg(chart) {
    const on = {};
    chart.definedCenters.forEach(function (c) { on[c] = true; });
    const fill = function (name) {
      return on[name] ? 'rgba(3,218,198,0.45)' : 'rgba(8,8,16,0.72)';
    };
    const stroke = function (name) {
      return on[name] ? '#03dac6' : 'rgba(187,134,252,0.35)';
    };
    return '<svg class="hd-bodygraph" viewBox="0 0 220 360" role="img" aria-label="Human Design bodygraph">'
      + '<polygon points="110,18 138,52 82,52" fill="' + fill('Head') + '" stroke="' + stroke('Head') + '" stroke-width="2"/>'
      + '<polygon points="110,62 138,96 82,96" fill="' + fill('Ajna') + '" stroke="' + stroke('Ajna') + '" stroke-width="2"/>'
      + '<polygon points="110,108 132,140 88,140" fill="' + fill('Throat') + '" stroke="' + stroke('Throat') + '" stroke-width="2"/>'
      + '<polygon points="110,152 142,196 78,196" fill="' + fill('G') + '" stroke="' + stroke('G') + '" stroke-width="2"/>'
      + '<rect x="148" y="158" width="36" height="28" rx="4" fill="' + fill('Heart') + '" stroke="' + stroke('Heart') + '" stroke-width="2"/>'
      + '<rect x="34" y="214" width="44" height="36" rx="6" fill="' + fill('Spleen') + '" stroke="' + stroke('Spleen') + '" stroke-width="2"/>'
      + '<rect x="88" y="214" width="44" height="36" rx="6" fill="' + fill('Sacral') + '" stroke="' + stroke('Sacral') + '" stroke-width="2"/>'
      + '<polygon points="176,216 200,250 152,250" fill="' + fill('Solar Plexus') + '" stroke="' + stroke('Solar Plexus') + '" stroke-width="2"/>'
      + '<rect x="88" y="292" width="44" height="36" rx="6" fill="' + fill('Root') + '" stroke="' + stroke('Root') + '" stroke-width="2"/>'
      + '</svg>';
  }

  function renderChart(chart) {
    lastChart = chart;
    const stage = document.getElementById('hd-results');
    if (!stage) return;
    const paid = typeof hasPaidPassAccess === 'function' && hasPaidPassAccess();
    const typeInfo = TYPE_COPY[chart.type];
    const authCopy = AUTHORITY_COPY[chart.authority] || '';
    const free = '<div class="hd-free-grid">'
      + '<article class="hd-metric"><h3>Type</h3><p class="hd-metric-value">' + esc(chart.type) + '</p><p>' + esc(typeInfo.overview) + '</p><p class="hd-strategy-line">Strategy: ' + esc(chart.strategy) + '</p></article>'
      + '<article class="hd-metric"><h3>Authority</h3><p class="hd-metric-value">' + esc(chart.authority) + '</p><p>' + esc(authCopy) + '</p></article>'
      + '</div>';
    const masteryInner = '<div class="hd-mastery-inner">'
      + '<div class="hd-mastery-top">'
      + bodygraphSvg(chart)
      + '<div><h3>Profile &amp; Cross</h3>'
      + '<p class="hd-metric-value">' + esc(chart.profile) + ' · ' + esc(chart.profileNames) + '</p>'
      + '<p>' + esc(chart.incarnationCross.name) + '</p>'
      + '<p class="hd-cross-gates">' + esc(chart.incarnationCross.personalitySun) + ' / ' + esc(chart.incarnationCross.personalityEarth)
      + ' · ' + esc(chart.incarnationCross.designSun) + ' / ' + esc(chart.incarnationCross.designEarth) + '</p>'
      + '<p>' + esc(chart.definition) + '</p></div></div>'
      + '<h3>Defined Channels</h3><ul class="hd-chip-list">'
      + (chart.channels.length ? chart.channels.map(function (ch) {
        return '<li>' + esc(ch.gates[0] + '-' + ch.gates[1]) + ' ' + esc(ch.name) + '</li>';
      }).join('') : '<li>None completed</li>')
      + '</ul>'
      + '<h3>Activated Gates</h3><ul class="hd-chip-list">'
      + chart.gates.map(function (g) { return '<li>' + esc(g) + ' ' + esc(GATE_NAME[g] || '') + '</li>'; }).join('')
      + '</ul>'
      + '<div class="hd-planet-grid"><div><h3>Personality</h3><ul class="hd-planet-list">' + planetRows(chart.personality) + '</ul></div>'
      + '<div><h3>Design</h3><ul class="hd-planet-list">' + planetRows(chart.design) + '</ul></div></div>'
      + '<h3>Deconditioning Paths</h3><ul class="hd-decon-list">'
      + chart.openCenters.map(function (c) {
        return '<li><strong>' + esc(c) + '</strong> ' + esc(OPEN_CENTER_PATH[c]) + '</li>';
      }).join('')
      + (chart.openCenters.length ? '' : '<li>All nine centers are defined. Deconditioning lives in the patience of your type and authority, not in an open center.</li>')
      + '</ul>'
      + '<p class="hd-note">Open centers take in the world. Defined centers speak. Walk the open ones as classrooms rather than as missing pieces.</p>'
      + '</div>';
    const lock = paid ? '' : '<div class="hd-lock-veil" id="hd-lock-veil">'
      + '<div class="hd-lock-card">'
      + '<span class="agent-badge">MASTERY LOCK</span>'
      + '<h3>Full Bodygraph Decode</h3>'
      + '<p>Channels, gates, incarnation cross, profile lines, and deconditioning paths open with Solstice Pass / Master Activation tier.</p>'
      + '<button type="button" class="mystic-btn" onclick="unlockHumanDesignMastery()">Open with Solstice Pass</button>'
      + '</div></div>';
    stage.innerHTML = '<p class="hd-place-stamp">' + esc(chart.meta.place) + ' · ' + esc(chart.meta.timeZone) + '</p>'
      + free
      + '<div class="hd-mastery-wrap ' + (paid ? 'is-open' : 'is-locked') + '">'
      + masteryInner
      + lock
      + '</div>';
    stage.classList.remove('hidden');
    if (typeof pulseChakraGlow === 'function') pulseChakraGlow('#e6c865');
  }

  window.unlockHumanDesignMastery = function () {
    try { sessionStorage.setItem('mystic9_unlock_resume', JSON.stringify({ humanDesign: true })); } catch (err) { /* private */ }
    if (typeof openMembershipGateway === 'function') openMembershipGateway('humandesign');
  };

  window.refreshHumanDesignMastery = function () {
    if (lastChart) renderChart(lastChart);
  };

  window.searchHumanDesignPlaces = function (query) {
    const box = document.getElementById('hd-place-results');
    if (!box) return;
    const q = String(query || '').trim();
    if (placeTimer) clearTimeout(placeTimer);
    if (q.length < 2) {
      box.innerHTML = '';
      box.classList.add('hidden');
      return;
    }
    placeTimer = setTimeout(async function () {
      try {
        const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=6';
        const res = await fetch(url);
        const data = await res.json();
        const features = (data && data.features) || [];
        if (!features.length) {
          box.innerHTML = '<button type="button" class="hd-place-option" disabled>No matching city</button>';
          box.classList.remove('hidden');
          return;
        }
        box.innerHTML = features.map(function (f, i) {
          const p = f.properties || {};
          const label = [p.name, p.city, p.state, p.country].filter(Boolean).filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).join(', ');
          const lon = f.geometry && f.geometry.coordinates ? f.geometry.coordinates[0] : '';
          const lat = f.geometry && f.geometry.coordinates ? f.geometry.coordinates[1] : '';
          return '<button type="button" class="hd-place-option" data-i="' + i + '" data-lat="' + esc(lat) + '" data-lon="' + esc(lon) + '" data-label="' + esc(label) + '">' + esc(label) + '</button>';
        }).join('');
        box.classList.remove('hidden');
        box.querySelectorAll('.hd-place-option').forEach(function (btn) {
          btn.addEventListener('click', function () {
            selectPlace(btn.getAttribute('data-label'), Number(btn.getAttribute('data-lat')), Number(btn.getAttribute('data-lon')));
          });
        });
      } catch (err) {
        box.innerHTML = '<p class="hd-note">City lookup is quiet right now. Type City, Country and we will still try to resolve it on decode.</p>';
        box.classList.remove('hidden');
      }
    }, 280);
  };

  async function resolveTimezone(lat, lon) {
    const attempts = [
      'https://api.geotimezone.com/public/timezone?latitude=' + lat + '&longitude=' + lon,
      'https://timeapi.io/api/timezone/coordinate?latitude=' + lat + '&longitude=' + lon
    ];
    for (let i = 0; i < attempts.length; i++) {
      try {
        const res = await fetch(attempts[i]);
        if (!res.ok) continue;
        const data = await res.json();
        const zone = data.iana_timezone || data.timezone || data.timeZone || data.TimeZone || '';
        if (zone) return zone;
      } catch (err) { /* next */ }
    }
    const offset = Math.round(lon / 15);
    const sign = offset >= 0 ? '+' : '-';
    return 'UTC' + sign + Math.abs(offset);
  }

  async function geocodeFallback(label) {
    const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(label) + '&limit=1';
    const res = await fetch(url);
    const data = await res.json();
    const f = data && data.features && data.features[0];
    if (!f) return null;
    const p = f.properties || {};
    const pretty = [p.name, p.city, p.state, p.country].filter(Boolean).filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).join(', ');
    return {
      label: pretty || label,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0]
    };
  }

  async function selectPlace(label, lat, lon) {
    const tz = await resolveTimezone(lat, lon);
    selectedPlace = { label: label, lat: lat, lon: lon, timeZone: tz };
    const input = document.getElementById('hd-location');
    const stamp = document.getElementById('hd-tz-stamp');
    const box = document.getElementById('hd-place-results');
    if (input) input.value = label;
    if (stamp) stamp.textContent = 'Field clock: ' + tz;
    if (box) {
      box.innerHTML = '';
      box.classList.add('hidden');
    }
  }

  window.selectHumanDesignPlace = selectPlace;

  window.decodeHumanDesignChart = async function () {
    if (typeof requireRegisteredToolAccess === 'function' && !requireRegisteredToolAccess('hd')) return;
    const status = document.getElementById('hd-status');
    const dateVal = (document.getElementById('hd-birth-date') || {}).value;
    const timeVal = (document.getElementById('hd-birth-time') || {}).value;
    const locVal = ((document.getElementById('hd-location') || {}).value || '').trim();
    if (!dateVal || !timeVal || !locVal) {
      if (status) status.textContent = 'Birth date, exact time, and city are all required for a true bodygraph.';
      return;
    }
    if (status) status.textContent = 'Reading the sky and the 88° design imprint...';
    try {
      let place = selectedPlace;
      if (!place || place.label !== locVal) {
        const found = await geocodeFallback(locVal);
        if (!found) throw new Error('location');
        const tz = await resolveTimezone(found.lat, found.lon);
        place = { label: found.label, lat: found.lat, lon: found.lon, timeZone: tz };
        selectedPlace = place;
        const stamp = document.getElementById('hd-tz-stamp');
        if (stamp) stamp.textContent = 'Field clock: ' + tz;
      }
      const parts = dateVal.split('-');
      const tparts = timeVal.split(':');
      const tz = place.timeZone && place.timeZone.indexOf('UTC') === 0
        ? 'UTC'
        : place.timeZone;
      let hour = Number(tparts[0]);
      let minute = Number(tparts[1]);
      let year = Number(parts[0]);
      let month = Number(parts[1]);
      let day = Number(parts[2]);
      if (place.timeZone && place.timeZone.indexOf('UTC') === 0) {
        const off = Number(String(place.timeZone).replace('UTC', '').replace('+', '')) || 0;
        const utc = Date.UTC(year, month - 1, day, hour - off, minute, 0);
        const d = new Date(utc);
        year = d.getUTCFullYear();
        month = d.getUTCMonth() + 1;
        day = d.getUTCDate();
        hour = d.getUTCHours();
        minute = d.getUTCMinutes();
      }
      const chart = await calculateChart({
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        timeZone: tz,
        placeLabel: place.label
      });
      renderChart(chart);
      const box = document.getElementById('hd-place-results');
      if (box) {
        box.innerHTML = '';
        box.classList.add('hidden');
      }
      if (status) status.textContent = 'Decode complete. Type and authority are open on the free path.';
    } catch (err) {
      if (status) status.textContent = 'The sky engine could not finish. Check the city spelling and exact birth time, then try again.';
    }
  };
})();
