(function mystic9Academy() {
  const COURSES = window.MYSTIC9_ACADEMY_COURSES || {};
  const STORE_ENROLL = 'mystic9_academy_enrollments';
  const STORE_ATTR = 'mystic9_academy_attribution';
  const STORE_PROGRESS = 'mystic9_academy_study';
  const ASSESS_ID = 'assessment';
  let toneNodes = null;
  let activeCourseId = '';
  let activeChapterId = '';
  let lockY = 0;
  let siteLocked = false;

  const ACADEMY_STEWARD_EMAIL = 'zen3845@outlook.com';
  let liveAuthEmail = '';

  function client() {
    return window.supabaseClient || null;
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch (err) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private */ }
  }

  async function syncLiveAuthEmail() {
    liveAuthEmail = '';
    const user = await currentUser();
    if (user && user.email) liveAuthEmail = String(user.email).trim().toLowerCase();
    return liveAuthEmail;
  }

  function hasStaffAccess() {
    return liveAuthEmail === ACADEMY_STEWARD_EMAIL;
  }

  function hasPaidCourseEntitlement(courseId) {
    if (courseId !== 'harmonic' && courseId !== 'master') return false;
    if (typeof window.hasAcademyCourse === 'function') return window.hasAcademyCourse(courseId);
    const kind = (window.MYSTIC9_COURSE_KIND || {})[courseId];
    if (!kind || String(kind).indexOf('academy_') !== 0) return false;
    if (kind === 'membership_solstice' || kind === 'membership_activator') return false;
    return typeof window.hasCommerceKind === 'function' && window.hasCommerceKind(kind);
  }

  function isUnlocked(courseId) {
    if (courseId === 'foundations') return isSignedIn();
    if (courseId !== 'harmonic' && courseId !== 'master') return false;
    if (hasStaffAccess()) return true;
    return hasPaidCourseEntitlement(courseId);
  }

  function isSignedIn() {
    if (typeof isSanctuarySignedIn === 'function') return isSanctuarySignedIn();
    return !!(localStorage.getItem('mystic9_user_email') || '').trim();
  }

  function enrollments() {
    return Object.assign({ foundations: false, harmonic: false, master: false }, readJson(STORE_ENROLL, {}));
  }

  function study(courseId) {
    const all = readJson(STORE_PROGRESS, {});
    const row = all[courseId] || { done: {}, cursor: '', assignment: '', quiz: null };
    if (!row.done) row.done = {};
    return row;
  }

  function saveStudy(courseId, row) {
    const all = readJson(STORE_PROGRESS, {});
    all[courseId] = row;
    writeJson(STORE_PROGRESS, all);
  }

  function flatten(course) {
    const items = [];
    (course.modules || []).forEach((mod, mi) => {
      (mod.chapters || []).forEach((ch, ci) => {
        items.push(Object.assign({ moduleTitle: mod.title, moduleIndex: mi, chapterIndex: ci }, ch));
      });
    });
    items.push({
      id: ASSESS_ID,
      title: 'Examination & field assignment',
      kind: 'assessment',
      moduleTitle: 'Capstone',
      minutes: 25
    });
    return items;
  }

  function courseProgress(courseId) {
    const course = COURSES[courseId];
    if (!course) return { percent: 0, complete: 0, total: 1, chaptersDone: 0, chapterTotal: 0, assessed: false };
    const items = flatten(course).filter((item) => item.id !== ASSESS_ID);
    const row = study(courseId);
    const chaptersDone = items.filter((item) => row.done[item.id]).length;
    const assessed = !!(row.quiz && row.quiz.passed && (row.assignment || '').trim().split(/\s+/).length >= (course.assignment.minWords || 80));
    const total = items.length + 1;
    const complete = chaptersDone + (assessed ? 1 : 0);
    return { percent: Math.round((complete / total) * 100), complete, total, chaptersDone, chapterTotal: items.length, assessed };
  }

  function chapterUnlocked(courseId, chapterId) {
    if (hasStaffAccess()) return true;
    const items = flatten(COURSES[courseId]);
    const index = items.findIndex((item) => item.id === chapterId);
    if (index <= 0) return true;
    const prev = items[index - 1];
    const row = study(courseId);
    if (chapterId === ASSESS_ID) {
      return items.filter((item) => item.id !== ASSESS_ID).every((item) => row.done[item.id]);
    }
    return !!row.done[prev.id];
  }

  function setEnrolled(courseId, on) {
    const next = enrollments();
    next[courseId] = !!on;
    writeJson(STORE_ENROLL, next);
    return next;
  }

  async function currentUser() {
    const sb = client();
    if (!sb || !sb.auth) return null;
    try {
      const { data } = await sb.auth.getUser();
      return data && data.user ? data.user : null;
    } catch (err) { return null; }
  }

  function captureAttribution() {
    const params = new URLSearchParams(window.location.search);
    const attr = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      landing_path: window.location.pathname + window.location.search
    };
    if (attr.utm_source || attr.utm_campaign || (window.location.pathname || '').indexOf('/academy') === 0) {
      writeJson(STORE_ATTR, Object.assign(readJson(STORE_ATTR, {}), attr, { captured_at: new Date().toISOString() }));
    }
  }

  async function logFunnel(eventName, courseId) {
    const sb = client();
    if (!sb) return;
    const user = await currentUser();
    const attr = readJson(STORE_ATTR, {});
    try {
      await sb.from('academy_funnel_events').insert({
        user_id: user ? user.id : null,
        event_name: eventName,
        course_id: courseId || null,
        utm_source: attr.utm_source || null,
        utm_medium: attr.utm_medium || null,
        utm_campaign: attr.utm_campaign || null,
        landing_path: attr.landing_path || window.location.pathname
      });
    } catch (err) { /* optional */ }
  }

  async function persistEnrollment(courseId, amount) {
    if (courseId !== 'foundations' || (amount && Number(amount) > 0)) return;
    setEnrolled(courseId, true);
    const user = await currentUser();
    const sb = client();
    if (user && sb) {
      try {
        await sb.from('academy_enrollments').upsert({
          user_id: user.id,
          course_id: 'foundations',
          status: 'active',
          source: 'site',
          amount_gbp: 0
        }, { onConflict: 'user_id,course_id' });
      } catch (err) { /* optional */ }
    }
    await logFunnel('enroll_free', courseId);
    if (typeof window.publishSeekerFeed === 'function') window.publishSeekerFeed();
    renderHub();
  }

  async function grantStaffCurriculum() {
    if (!hasStaffAccess()) return;
    await persistEnrollment('foundations', 0);
  }

  function stopTone() {
    if (!toneNodes) return;
    try { if (toneNodes.lfo) toneNodes.lfo.stop(); } catch (err) { /* ignore */ }
    try { toneNodes.osc.stop(); } catch (err) { /* already stopped */ }
    try { toneNodes.osc.disconnect(); toneNodes.gain.disconnect(); } catch (err) { /* ignore */ }
    toneNodes = null;
    const btn = document.getElementById('academy-tone-toggle');
    if (btn) {
      btn.textContent = 'Start frequency';
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function startTone(hz) {
    stopTone();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = typeof getAudioContext === 'function' ? getAudioContext() : new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    if (hz < 40) {
      osc.frequency.value = 108;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = hz;
      lfoGain.gain.value = 0.028;
      gain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      lfo.start();
      osc.start();
      toneNodes = { osc, lfo, gain, ctx };
    } else {
      osc.frequency.value = hz;
      gain.gain.value = 0.035;
      osc.connect(gain);
      osc.start();
      toneNodes = { osc, gain, ctx };
    }
    const btn = document.getElementById('academy-tone-toggle');
    if (btn) {
      btn.textContent = 'Stop frequency';
      btn.setAttribute('aria-pressed', 'true');
    }
  }

  function showBanner(message, kind) {
    const el = document.getElementById('academy-banner');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
    el.className = 'academy-banner' + (kind ? ' is-' + kind : '');
  }

  function wordCount(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function renderHub() {
    document.querySelectorAll('[data-academy-course]').forEach((node) => {
      const id = node.getAttribute('data-academy-course');
      const course = COURSES[id];
      if (!course) return;
      const unlocked = isUnlocked(id);
      const prog = courseProgress(id);
      const status = node.querySelector('[data-academy-status]');
      const action = node.querySelector('[data-academy-action]');
      const meter = node.querySelector('[data-academy-meter]');
      node.classList.toggle('is-unlocked', unlocked);
      if (status) {
        if (hasStaffAccess()) status.textContent = 'Sanctuary steward access';
        else if (unlocked) status.textContent = prog.assessed ? 'Complete · certificate available' : `In study · ${prog.percent}%`;
        else status.textContent = course.price === 0 ? 'Included with registration' : `One-time unlock · £${course.price} GBP`;
      }
      if (action) {
        action.textContent = unlocked
          ? (prog.percent ? 'Continue immersive study' : 'Enter immersive study')
          : (course.price === 0 ? (isSignedIn() ? 'Open Foundations' : 'Register to begin · £0') : `Unlock access · £${course.price}`);
      }
      if (meter) meter.style.width = unlocked ? `${Math.max(prog.percent, 4)}%` : '0%';
    });
    const accessNote = document.getElementById('academy-access-note');
    if (accessNote) {
      if (hasStaffAccess()) accessNote.textContent = 'Steward view: you can open study windows to maintain the sanctuary. Seekers still purchase each paid current on its own.';
      else if (isSignedIn()) accessNote.textContent = 'Foundations opens with your sanctuary account. Harmonic and Mastery are standalone PayPal unlocks. Memberships and passes do not include Academy.';
      else accessNote.textContent = 'Register to open Foundations. Harmonic and Mastery require their own PayPal checkout. Site passes do not unlock Academy.';
    }
  }

  function lockSiteScroll() {
    const room = document.getElementById('academy-classroom');
    if (room && room.parentElement !== document.body) {
      document.body.appendChild(room);
    }
    if (siteLocked) return;
    lockY = window.scrollY || window.pageYOffset || 0;
    siteLocked = true;
    document.body.classList.add('academy-lock');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
  }

  function unlockSiteScroll() {
    if (!siteLocked) return;
    document.body.classList.remove('academy-lock');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.documentElement.style.overflow = '';
    siteLocked = false;
    window.scrollTo(0, lockY);
  }

  function chromeHtml(course, locked) {
    const mark = locked
      ? (course.price ? `Locked · £${course.price} GBP` : 'Locked · registration required')
      : (hasStaffAccess() ? 'Steward access' : (course.price ? `Unlocked · £${course.price}` : 'Included · £0'));
    return `<div class="academy-chrome" role="banner">
      <button type="button" class="mystic-btn secondary academy-back" data-academy-back>← All courses</button>
      <div class="academy-chrome-meta">
        <p>mystic9.net Academy · Immersive window</p>
        <strong>${course.title}</strong>
      </div>
      <p class="academy-price-mark">${mark}</p>
    </div>`;
  }

  function wrapSuite(course, locked, playerHtml) {
    return `${chromeHtml(course, locked)}
      <div class="academy-study-scroll" data-academy-suite="${course.id}">
        ${playerHtml}
      </div>`;
  }

  function syncChromeOffset() {
    const room = document.getElementById('academy-classroom');
    const chrome = room && room.querySelector('.academy-chrome');
    if (!room || !chrome || room.hidden) return;
    const height = Math.ceil(chrome.getBoundingClientRect().height);
    room.style.setProperty('--academy-chrome-h', Math.max(height, 80) + 'px');
  }

  function downloadsHtml(course) {
    const items = course.resources || [];
    if (!items.length) return '';
    return `<div class="academy-downloads">
      <p class="academy-toc-mod">Downloadable resources</p>
      ${items.map((item) => `<button type="button" class="academy-dl" data-resource="${item.id}">↓ ${item.title}</button>`).join('')}
    </div>`;
  }

  function resourceInner(course, resource) {
    if (resource.kind === 'guide') {
      return course.modules.map((mod) => {
        const body = mod.chapters.map((ch) => {
          const drill = ch.drill ? `<p><strong>Required drill:</strong> ${ch.drill}</p>` : '';
          const hz = ch.hz ? `<p><strong>Working frequency:</strong> ${ch.hz} Hz (low volume, bounded listen).</p>` : '';
          return `<h3>${ch.title}</h3>${ch.html || ''}${drill}${hz}`;
        }).join('');
        return `<h2>${mod.title}</h2>${body}`;
      }).join('') + `<h2>Capstone</h2><p>${course.assignment.prompt}</p><p>Examination: ${course.quiz.length} questions. Pass mark 75% plus ${course.assignment.minWords}+ word field report.</p>`;
    }
    if (resource.kind === 'chart') {
      if (course.id === 'foundations') {
        return `<h2>Breath &amp; frequency chart</h2>
          <table><thead><tr><th>Tool</th><th>Use</th><th>Bound</th></tr></thead><tbody>
          <tr><td>4-4-4 breath</td><td>Occupy instrument</td><td>Nine cycles + 60s silence</td></tr>
          <tr><td>432 Hz</td><td>Spine stack, jaw quiet</td><td>≤3 minutes, then mute</td></tr>
          <tr><td>Silent count</td><td>If sound-sensitive</td><td>Same nine cycles</td></tr>
          <tr><td>Seal decree</td><td>Return borrowed weather</td><td>Twice, slow, palms on body</td></tr>
          </tbody></table>
          <p>The tone is a guest. You are the host. Guests leave. Hosts remain sealed.</p>`;
      }
      if (course.id === 'harmonic') {
        return `<h2>Spiral of 9 frequency chart</h2>
          <ol>
            <li>Earth / root: feet heavy</li>
            <li>Sacral: life without grabbing</li>
            <li>Solar: will without humiliation</li>
            <li>Heart: warmth without collapse</li>
            <li>Throat: speech without performance</li>
            <li>Brow: seeing without inventing</li>
            <li>Crown: open without floating</li>
            <li>Soul star: contact without bypass</li>
            <li>Master: reverse the climb</li>
          </ol>
          <p>528 Hz: two minutes after the nine-syllable seal, then mute. Still-point: eleven minutes. Then one earthly task.</p>`;
      }
      return `<h2>Five-station activation chart</h2>
        <ol>
          <li>Seal: occupy / return borrowed current</li>
          <li>Ladder: climb and reverse</li>
          <li>Still-point: eleven honest minutes</li>
          <li>Decree: one instruction the body agrees to</li>
          <li>Offering: completed earthly task that costs a little</li>
        </ol>
        <p>7.83 Hz pulse: two minutes as a metronome for the ask, then mute. Proof before sunset.</p>`;
    }
    if (course.id === 'foundations') {
      return `<h2>Daily seal worksheet</h2>
        <p>Seven mornings. Same five lines. Different weather.</p>
        <ol>
          <li>Date / time / cycles completed: ________</li>
          <li>Borrowed current returned: ________</li>
          <li>Bodily action for today: ________</li>
          <li>Tone used (432 / silent): ________</li>
          <li>Occupation sentence spoken (yes / no): ________</li>
        </ol>`;
    }
    if (course.id === 'harmonic') {
      return `<h2>Encoding &amp; still-point worksheet</h2>
        <ol>
          <li>Nine-syllable seal (write, do not type only): ________</li>
          <li>If syllables changed, why: ________</li>
          <li>Ladder both directions completed: ________</li>
          <li>Still-point minutes held: ________</li>
          <li>Earthly task after the timer: ________</li>
        </ol>`;
    }
    return `<h2>Teaching &amp; offering worksheet</h2>
      <ol>
        <li>Seal in a tired person's verbs: ________</li>
        <li>Ladder in a tired person's verbs: ________</li>
        <li>Still-point in a tired person's verbs: ________</li>
        <li>Decree (one instruction): ________</li>
        <li>Offering completed today: ________</li>
        <li>Who could you teach without humiliating them: ________</li>
      </ol>`;
  }

  function downloadResource(courseId, resourceId) {
    if (!isUnlocked(courseId)) return;
    const course = COURSES[courseId];
    const resource = (course.resources || []).find((item) => item.id === resourceId);
    if (!course || !resource) return;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${resource.title} · mystic9.net Academy</title>
      <style>
        body{font-family:Georgia,serif;max-width:720px;margin:32px auto;padding:0 24px 64px;color:#111;line-height:1.65}
        h1,h2,h3{font-family:Palatino,Georgia,serif} h1{border-bottom:2px solid #c9a227;padding-bottom:8px}
        table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px;text-align:left}
        .foot{margin-top:36px;font-size:12px;color:#444}
        @media print{body{margin:16px}}
      </style></head>
      <body>
        <p>mystic9.net Academy · ${course.level} · ${course.title}</p>
        <h1>${resource.title}</h1>
        ${resourceInner(course, resource)}
        <p class="foot">Print this page or use Save as PDF. These materials are for enrolled study. They are contemplative tools, not medical advice. Frequency precedes form.</p>
        <script>window.print();</script>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mystic9-${courseId}-${resource.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function closeClassroom() {
    stopTone();
    const room = document.getElementById('academy-classroom');
    if (room) {
      room.hidden = true;
      room.innerHTML = '';
      room.className = 'academy-immersive';
      room.style.removeProperty('--academy-chrome-h');
    }
    activeCourseId = '';
    unlockSiteScroll();
    if ((window.location.pathname || '').indexOf('/academy/') === 0) {
      try { history.replaceState({}, '', '/academy'); } catch (err) { /* ignore */ }
    }
  }

  async function beginAcademyCheckout(courseId) {
    const kind = (window.MYSTIC9_COURSE_KIND || {})[courseId];
    if (!kind) return;
    if (!isSignedIn()) {
      if (typeof openAuthModal === 'function') openAuthModal('signup-form');
      return;
    }
    logFunnel('checkout_start', courseId);
    const url = typeof window.mystic9PaypalUrl === 'function' ? await window.mystic9PaypalUrl(kind) : '';
    if (!url) return;
    window.location.assign(url);
  }

  async function confirmAcademyPurchase(courseId) {
    for (let i = 0; i < 6; i += 1) {
      if (typeof window.refreshCommerceEntitlements === 'function') await window.refreshCommerceEntitlements();
      if (isUnlocked(courseId)) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    renderHub();
    if (!isUnlocked(courseId)) {
      showBanner('PayPal has not confirmed this current yet. Complete checkout, then reopen the course after the payment email arrives.', 'info');
      openClassroom(courseId);
      return;
    }
    showBanner(`${COURSES[courseId].title} is unlocked after confirmed payment.`, 'success');
    openClassroom(courseId);
  }

  function navHtml(course, chapterId) {
    const row = study(course.id);
    const items = flatten(course);
    let html = '<nav class="academy-toc" aria-label="Course outline">';
    course.modules.forEach((mod) => {
      html += `<p class="academy-toc-mod">${mod.title}</p><ul>`;
      mod.chapters.forEach((ch) => {
        const open = chapterUnlocked(course.id, ch.id);
        const done = !!row.done[ch.id];
        html += `<li><button type="button" class="academy-toc-btn ${ch.id === chapterId ? 'is-current' : ''} ${done ? 'is-done' : ''} ${open ? '' : 'is-locked'}" data-go="${ch.id}" ${open ? '' : 'disabled'}>${done ? '✓ ' : open ? '' : '🔒 '}${ch.title}</button></li>`;
      });
      html += '</ul>';
    });
    const assessOpen = chapterUnlocked(course.id, ASSESS_ID);
    const assessed = !!(row.quiz && row.quiz.passed);
    html += `<p class="academy-toc-mod">Capstone</p><ul><li><button type="button" class="academy-toc-btn ${chapterId === ASSESS_ID ? 'is-current' : ''} ${assessed ? 'is-done' : ''} ${assessOpen ? '' : 'is-locked'}" data-go="${ASSESS_ID}" ${assessOpen ? '' : 'disabled'}>${assessed ? '✓ ' : assessOpen ? '' : '🔒 '}Examination & assignment</button></li></ul></nav>`;
    return html;
  }

  function assessmentHtml(course) {
    const row = study(course.id);
    const quiz = course.quiz.map((item, index) => `
      <fieldset class="academy-quiz-item">
        <legend>Q${index + 1}. ${item.q}</legend>
        ${item.a.map((choice, choiceIndex) => `
          <label class="academy-choice"><input type="radio" name="q${index}" value="${choiceIndex}" ${row.quiz && row.quiz.answers && row.quiz.answers[index] === choiceIndex ? 'checked' : ''}><span>${choice}</span></label>
        `).join('')}
      </fieldset>`).join('');
    const words = wordCount(row.assignment);
    const need = course.assignment.minWords;
    return `
      <article class="academy-article">
        <p class="academy-kicker">Capstone · ${course.quiz.length} questions · written assignment ${need}+ words</p>
        <h2>Examination & field assignment</h2>
        <p class="academy-lead">Both are required. The quiz tests whether the protocol is in the body. The assignment proves you ran it in matter. Threshold: 75% on the exam and a complete field report.</p>
        <form id="academy-assess-form">
          ${quiz}
          <label class="academy-assign-label" for="academy-assignment">${course.assignment.prompt}</label>
          <textarea id="academy-assignment" name="assignment" rows="10" minlength="80">${row.assignment || ''}</textarea>
          <p class="academy-wordcount" id="academy-wordcount">${words} words · ${need} required</p>
          <button type="submit" class="mystic-btn">Submit examination & assignment</button>
        </form>
        <div id="academy-quiz-result" class="academy-quiz-result"></div>
      </article>`;
  }

  function chapterHtml(course, chapter) {
    if (chapter.id === ASSESS_ID) return assessmentHtml(course);
    const extra = chapter.kind === 'frequency' ? `
      <div class="academy-lab">
        <p>Working frequency: <strong>${chapter.hz} Hz</strong> sine · keep volume low.</p>
        <button type="button" class="mystic-btn" id="academy-tone-toggle" aria-pressed="false">Start frequency</button>
      </div>` : '';
    const drill = chapter.drill ? `<div class="academy-drill"><h3>Required drill</h3><p>${chapter.drill}</p></div>` : '';
    return `
      <article class="academy-article">
        <p class="academy-kicker">${chapter.moduleTitle} · ${chapter.kind} · ${chapter.minutes || 10} min</p>
        <h2>${chapter.title}</h2>
        <div class="academy-prose">${chapter.html || ''}</div>
        ${drill}
        ${extra}
      </article>`;
  }

  function renderClassroom() {
    const course = COURSES[activeCourseId];
    const room = document.getElementById('academy-classroom');
    if (!course || !room) return;
    const items = flatten(course);
    if (!items.some((item) => item.id === activeChapterId)) activeChapterId = items[0].id;
    const chapter = items.find((item) => item.id === activeChapterId) || items[0];
    const unlocked = isUnlocked(course.id);
    const prog = courseProgress(course.id);
    const index = items.findIndex((item) => item.id === chapter.id);
    lockSiteScroll();
    room.hidden = false;
    room.className = `academy-immersive academy-view academy-view--${course.id}`;
    if (!unlocked) {
      const investment = course.price === 0
        ? 'Foundations is included with registration. Create a sanctuary account to enter the full immersive study window. No paid lecture is shown before that seal.'
        : `This current is locked. Required investment: £${course.price} GBP, one time, via PayPal to rootslabintl@gmail.com. Lecture text, labs, and downloads stay closed until PayPal notifies the sanctuary.`;
      room.innerHTML = wrapSuite(course, true, `
          <div class="academy-player academy-player-gate">
            <div class="academy-gateway academy-gateway-wide">
              <p class="academy-kicker">${course.level} current · access control</p>
              <p class="academy-price-mark">${course.price ? '£' + course.price + ' GBP · one-time unlock' : '£0 · registration required'}</p>
              <h2>Study suite sealed</h2>
              <p class="academy-lead">${investment}</p>
              <ul class="academy-trust">
                <li>Study sections, frequency labs, and printable resources remain sealed</li>
                <li>Written field assignment required for certification after unlock</li>
                <li>No subscription · access updates after PayPal confirmation</li>
                <li>Solstice Pass and Full Activator Membership do not open this current</li>
              </ul>
              <button type="button" class="mystic-btn" id="academy-gate-btn">${course.price === 0 ? 'Register to open Foundations' : 'Proceed to PayPal checkout · £' + course.price}</button>
            </div>
          </div>`);
      bindPlayer(course.id);
      requestAnimationFrame(syncChromeOffset);
      return;
    }
    if (!chapterUnlocked(course.id, chapter.id)) {
      activeChapterId = items.find((item) => chapterUnlocked(course.id, item.id)).id;
      return renderClassroom();
    }
    room.innerHTML = wrapSuite(course, false, `
        <div class="academy-player">
          <aside class="academy-side">
            <p class="academy-kicker">${course.level} · ${course.price ? '£' + course.price : 'Included'}</p>
            <h3>${course.title}</h3>
            <div class="academy-progress-card">
              <span>${prog.percent}% of study path</span>
              <div class="academy-progress-track"><i style="width:${prog.percent}%"></i></div>
              <small>${prog.chaptersDone}/${prog.chapterTotal} sections · exam ${prog.assessed ? 'passed' : 'locked or pending'}</small>
            </div>
            ${navHtml(course, chapter.id)}
            ${downloadsHtml(course)}
          </aside>
          <div class="academy-main">
            ${chapterHtml(course, chapter)}
            <footer class="academy-pager">
              <button type="button" class="mystic-btn secondary" data-academy-prev ${index === 0 ? 'disabled' : ''}>Previous</button>
              <button type="button" class="mystic-btn" data-academy-complete>${chapter.id === ASSESS_ID ? 'Scroll to submit examination' : 'Mark section complete & continue'}</button>
            </footer>
          </div>
        </div>`);
    bindPlayer(course.id, items, index);
    const scroller = room.querySelector('.academy-study-scroll');
    if (scroller) scroller.scrollTop = 0;
    requestAnimationFrame(syncChromeOffset);
  }

  function openClassroom(courseId, chapterId) {
    if (typeof window.closeDropdownMenu === 'function') window.closeDropdownMenu();
    stopTone();
    activeCourseId = courseId;
    const row = study(courseId);
    activeChapterId = chapterId || row.cursor || flatten(COURSES[courseId])[0].id;
    row.cursor = activeChapterId;
    saveStudy(courseId, row);
    renderClassroom();
  }

  function completeAndNext(courseId, items, index) {
    const chapter = items[index];
    if (chapter.id === ASSESS_ID) {
      const form = document.getElementById('academy-assess-form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const row = study(courseId);
    row.done[chapter.id] = true;
    const next = items[index + 1];
    if (next) {
      row.cursor = next.id;
      activeChapterId = next.id;
    }
    saveStudy(courseId, row);
    renderHub();
    renderClassroom();
  }

  async function submitAssessment(courseId, form) {
    const course = COURSES[courseId];
    const answers = [];
    let correct = 0;
    course.quiz.forEach((item, index) => {
      const picked = form.querySelector(`input[name="q${index}"]:checked`);
      const value = picked ? Number(picked.value) : -1;
      answers.push(value);
      if (value === item.i) correct += 1;
    });
    if (answers.some((value) => value < 0)) {
      showBanner('Answer every examination question. Partial papers are not accepted.', 'info');
      return;
    }
    const assignment = (form.assignment && form.assignment.value) || '';
    const words = wordCount(assignment);
    if (words < course.assignment.minWords) {
      showBanner(`Field assignment is ${words} words. ${course.assignment.minWords} words are required.`, 'info');
      return;
    }
    const score = Math.round((correct / course.quiz.length) * 100);
    const passed = score >= 75;
    const row = study(courseId);
    row.assignment = assignment;
    row.quiz = { score, passed, answers, at: new Date().toISOString() };
    saveStudy(courseId, row);
    const user = await currentUser();
    const sb = client();
    if (user && sb) {
      try {
        await sb.from('academy_quiz_results').insert({
          user_id: user.id, course_id: courseId, score, passed, answers: { answers, assignment }
        });
      } catch (err) { /* ignore */ }
    }
    const box = document.getElementById('academy-quiz-result');
    if (!passed) {
      if (box) box.innerHTML = `<p>Score ${score}%. The threshold is 75% plus a complete assignment. Restudy locked-behind-you sections and resubmit.</p>`;
      return;
    }
    if (box) {
      box.innerHTML = `<p>Score ${score}%. Assignment accepted (${words} words). Protocol recognised.</p><button type="button" class="mystic-btn" id="academy-cert-btn">Issue certificate</button>`;
      const certBtn = document.getElementById('academy-cert-btn');
      if (certBtn) certBtn.onclick = () => issueCertificate(courseId, score);
    }
    renderHub();
  }

  async function issueCertificate(courseId, score) {
    const course = COURSES[courseId];
    const user = await currentUser();
    const localName = (localStorage.getItem('mystic9_username') || '').trim();
    const name = (user && user.user_metadata && (user.user_metadata.username || user.user_metadata.display_name)) || localName || 'Seeker of mystic9.net';
    const issued = new Date().toISOString().slice(0, 10);
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Certificate · ${course.title}</title>
      <style>body{background:#090a10;color:#fff;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
      .sheet{border:2px solid #e6c865;padding:64px;max-width:760px;text-align:center;background:rgba(15,15,25,.94)}
      h1{color:#e6c865}</style></head>
      <body><div class="sheet"><p>mystic9.net · Online Course Academy</p><h1>${course.title}</h1>
      <p>This certifies that</p><h2>${name}</h2>
      <p>completed every study section, the written field assignment, and the examination at ${score}% on ${issued}.</p>
      <p style="color:#03dac6;letter-spacing:.12em">FREQUENCY PRECEDES FORM</p></div>
      <script>window.print();</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mystic9-${courseId}-certificate.html`;
    a.click();
    const sb = client();
    if (user && sb) {
      try {
        await sb.from('academy_certificates').upsert({
          user_id: user.id, course_id: courseId, holder_name: name, pdf_url: a.download
        }, { onConflict: 'user_id,course_id' });
      } catch (err) { /* ignore */ }
    }
  }

  function bindPlayer(courseId, items, index) {
    const room = document.getElementById('academy-classroom');
    if (!room) return;
    const back = room.querySelector('[data-academy-back]');
    if (back) back.onclick = closeClassroom;
    room.querySelectorAll('[data-go]').forEach((btn) => {
      btn.onclick = () => {
        stopTone();
        const row = study(courseId);
        row.cursor = btn.getAttribute('data-go');
        saveStudy(courseId, row);
        openClassroom(courseId, row.cursor);
      };
    });
    const prev = room.querySelector('[data-academy-prev]');
    if (prev && items) {
      prev.onclick = () => {
        if (index > 0) openClassroom(courseId, items[index - 1].id);
      };
    }
    const complete = room.querySelector('[data-academy-complete]');
    if (complete && items) complete.onclick = () => completeAndNext(courseId, items, index);
    const gate = document.getElementById('academy-gate-btn');
    if (gate) {
      gate.onclick = () => {
        if (COURSES[courseId].price === 0) {
          if (typeof openAuthModal === 'function') openAuthModal('signup-form');
        } else beginAcademyCheckout(courseId);
      };
    }
    const tone = document.getElementById('academy-tone-toggle');
    if (tone) {
      const chapter = items ? items[index] : null;
      tone.onclick = () => {
        if (toneNodes) stopTone();
        else startTone(chapter && chapter.hz ? chapter.hz : 432);
      };
    }
    const form = document.getElementById('academy-assess-form');
    if (form) {
      const area = document.getElementById('academy-assignment');
      const count = document.getElementById('academy-wordcount');
      if (area && count) {
        area.addEventListener('input', () => {
          count.textContent = `${wordCount(area.value)} words · ${COURSES[courseId].assignment.minWords} required`;
        });
      }
      form.onsubmit = (event) => {
        event.preventDefault();
        submitAssessment(courseId, form);
      };
    }
    const certBtn = document.getElementById('academy-cert-btn');
    if (certBtn && study(courseId).quiz) {
      certBtn.onclick = () => issueCertificate(courseId, study(courseId).quiz.score);
    }
    room.querySelectorAll('[data-resource]').forEach((btn) => {
      btn.onclick = () => downloadResource(courseId, btn.getAttribute('data-resource'));
    });
  }

  function bindHub() {
    document.querySelectorAll('[data-academy-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-academy-course]');
        const id = card && card.getAttribute('data-academy-course');
        if (!id || !COURSES[id]) return;
        if (!isUnlocked(id) && COURSES[id].price > 0) {
          openClassroom(id);
          return;
        }
        openClassroom(id);
      });
    });
  }

  function academySlug() {
    const path = (window.location.pathname || '').replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'academy') return parts[1] || 'hub';
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash === 'academy') return 'hub';
    if (hash.indexOf('academy-') === 0) return hash.slice(8);
    return new URLSearchParams(window.location.search).get('course') || '';
  }

  function paidReturnCourse() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paypal') === 'return') {
      const slug = academySlug();
      if (slug && COURSES[slug]) return slug;
      try { return sessionStorage.getItem('mystic9_pay_kind') === 'academy_master' ? 'master' : (sessionStorage.getItem('mystic9_pay_kind') === 'academy_harmonic' ? 'harmonic' : ''); } catch (err) { return ''; }
    }
    return '';
  }

  async function applyLandingRoute() {
    if (typeof window.refreshCommerceEntitlements === 'function') await window.refreshCommerceEntitlements();
    const paid = paidReturnCourse();
    if (paid && COURSES[paid]) {
      await confirmAcademyPurchase(paid);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('paypal');
        history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
      } catch (err) { /* ignore */ }
      return;
    }
    const slug = academySlug();
    if (slug && slug !== 'hub' && COURSES[slug]) {
      openClassroom(slug);
      return;
    }
    if (slug === 'hub' || (window.location.pathname || '').indexOf('/academy') === 0) {
      const academy = document.getElementById('academy');
      if (academy) academy.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function initAcademy() {
    captureAttribution();
    bindHub();
    if (!window.__mystic9AcademyEsc) {
      window.__mystic9AcademyEsc = true;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && activeCourseId) closeClassroom();
      });
      window.addEventListener('resize', syncChromeOffset);
    }
    await syncLiveAuthEmail();
    if (isSignedIn()) await persistEnrollment('foundations', 0);
    if (typeof window.refreshCommerceEntitlements === 'function') await window.refreshCommerceEntitlements();
    await grantStaffCurriculum();
    renderHub();
    const sb = client();
    if (sb && sb.auth) {
      sb.auth.onAuthStateChange(async (event, session) => {
        await syncLiveAuthEmail();
        if (session && session.user) {
          if (typeof window.refreshCommerceEntitlements === 'function') await window.refreshCommerceEntitlements();
          await persistEnrollment('foundations', 0);
          await grantStaffCurriculum();
        }
        renderHub();
      });
    }
    await applyLandingRoute();
    setTimeout(() => grantStaffCurriculum().then(renderHub), 700);
  }

  window.initAcademy = initAcademy;
  window.openAcademyCourse = openClassroom;
  window.closeAcademyClassroom = closeClassroom;
  window.beginAcademyCheckout = beginAcademyCheckout;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAcademy);
  else initAcademy();
})();
