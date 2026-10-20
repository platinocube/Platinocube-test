/* Platino Cube: behaviour. Plain JavaScript, no libraries. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var SELF = (document.currentScript && document.currentScript.src) || '/assets/main.js';
  function asset(name) {
    var u = new URL(name, SELF);
    u.search = new URL(SELF, location.href).search;
    return u.href;
  }
  function hasWebGL() {
    // weak phones (under 4 GB memory) get the light CSS cube instead of the 3D one
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  // plain import() so it also works under a strict Content-Security-Policy
  var load3d = function () { return import(asset('cube3d.js')); };
  var rtl = doc.dir === 'rtl';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  /* ---------- Splash: only on the first page of a visit ---------- */
  if (doc.classList.contains('splash-on')) {
    try { sessionStorage.setItem('pc_seen', '1'); } catch (e) {}
    setTimeout(function () { doc.classList.remove('splash-on'); }, 2600);
  }

  /* ---------- Year in footer ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Mobile menu ---------- */
  var burger = $('[data-burger]');
  var mnav = $('[data-mnav]');
  var menuOpen = false;
  var lockY = 0;
  var closeTimer = null;
  var outside = $$('body > *').filter(function (el) { return el !== mnav && el.tagName !== 'SCRIPT'; });
  function focusables() {
    return $$('a[href], button:not([disabled])', mnav).filter(function (el) { return el.offsetParent !== null; });
  }
  function setMenu(open) {
    if (!mnav || open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    clearTimeout(closeTimer);
    if (open) {
      lockY = window.scrollY || window.pageYOffset;
      doc.style.setProperty('--lock-y', (-lockY) + 'px');
      doc.classList.add('menu-locked', 'menu-open');
      outside.forEach(function (el) { el.setAttribute('inert', ''); });
      mnav.hidden = false;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { mnav.classList.add('open'); });
      });
      setTimeout(function () { var f = $('[data-mnav-close]', mnav); if (f) f.focus(); }, reduced ? 0 : 250);
    } else {
      mnav.classList.remove('open');
      outside.forEach(function (el) { el.removeAttribute('inert'); });
      doc.classList.remove('menu-locked', 'menu-open');
      window.scrollTo({ top: lockY, behavior: 'instant' });
      closeTimer = setTimeout(function () { mnav.hidden = true; }, reduced ? 0 : 520);
      burger.focus({ preventScroll: true });
    }
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () { setMenu(true); });
    $('[data-mnav-close]', mnav).addEventListener('click', function () { setMenu(false); });
    $$('a', mnav).forEach(function (a) {
      a.addEventListener('click', function () {
        // same-page links (for example #quote) close the menu and scroll there
        var u = new URL(a.href, location.href);
        if (u.pathname === location.pathname && u.hash) {
          setMenu(false);
        }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1001px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Counters ---------- */
  var counters = $$('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduced || target < 2) { el.textContent = target; return; }
    var start = null;
    el.textContent = '0';
    function step(ts) {
      if (!start) start = ts;
      var t = clamp((ts - start) / 1300);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Words light up as you scroll ---------- */
  var wordBlocks = $$('[data-words]');
  wordBlocks.forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el._words = $$('.w', el);
  });

  /* ---------- Card tilt + glow ---------- */
  if (finePointer && !reduced) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 7).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 9).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- The Cube (home hero) ---------- */
  var stage = $('[data-cube-stage]');
  var cube = null;
  if (stage) {
    cube = {
      stage: stage,
      pin: $('.hero-pin', stage),
      el: $('[data-cube]', stage),
      tilt: $('[data-cube-tilt]', stage),
      scene: $('[data-cube-scene]', stage),
      copy: $('[data-hero-copy]', stage),
      hint: $('.scroll-hint', stage),
      zone: $('.cube-zone', stage),
      quip: $('[data-quip]', stage),
      index: $$('[data-cube-index] li', stage),
      quips: [],
      active: -1,
      quipOn: false
    };
    try { cube.quips = JSON.parse(cube.scene.getAttribute('data-quips')); } catch (e) {}
    var baseY = rtl ? -24 : 24;
    cube.tilt.style.setProperty('--ty', baseY + 'deg');

    // Six views: front, right, back, left, top, bottom
    var K = [[0, 0], [0, -90], [0, -180], [0, -270], [-90, -360], [-270, -360]];

    var setActive = function (i) {
      if (i === cube.active) return;
      cube.active = i;
      cube.index.forEach(function (li, n) { li.classList.toggle('on', n === i); });
      if (cube.quip) cube.quip.textContent = cube.quips[i] || '';
    };
    setActive(0);

    var showQuip = function (on) {
      cube.quipOn = on;
      cube.scene.classList.toggle('show-quip', on);
    };
    cube.scene.addEventListener('mouseenter', function () { showQuip(true); });
    cube.scene.addEventListener('mouseleave', function () { showQuip(false); });
    cube.scene.addEventListener('focus', function () { showQuip(true); });
    cube.scene.addEventListener('blur', function () { showQuip(false); });
    cube.scene.addEventListener('click', function () { if (!finePointer) showQuip(!cube.quipOn); });

    if (finePointer && !reduced) {
      cube.pin.addEventListener('pointermove', function (e) {
        var x = e.clientX / window.innerWidth - 0.5;
        var y = e.clientY / window.innerHeight - 0.5;
        cube.tilt.style.setProperty('--tx', (-16 - y * 16).toFixed(2) + 'deg');
        cube.tilt.style.setProperty('--ty', (baseY + x * 30).toFixed(2) + 'deg');
        if (cube.api) cube.api.set({ tx: x, ty: y });
      });
      cube.pin.addEventListener('pointerleave', function () {
        cube.tilt.style.setProperty('--tx', '-16deg');
        cube.tilt.style.setProperty('--ty', baseY + 'deg');
        if (cube.api) cube.api.set({ tx: 0, ty: 0 });
      });
    }

    // The real 3D platinum cube (falls back to the CSS cube if WebGL is missing)
    if (!reduced && hasWebGL()) {
      var faceData = $$('.face', stage).map(function (f) {
        return {
          num: $('.face-num', f).textContent,
          name: $('.face-name', f).textContent,
          line: $('.face-line', f).textContent,
          icon: $('.face-icon', f).outerHTML
        };
      });
      // If the 3D cube is not ready in time, show the flat cube so the hero is never empty
      var giveUp = setTimeout(function () { doc.classList.remove('gl-pending'); }, 7000);
      load3d().then(function (m) {
        return m.initHeroCube({ pin: cube.pin, anchor: cube.scene, endAnchor: cube.scene, faces: faceData, rtl: rtl });
      }).then(function (api) {
        clearTimeout(giveUp);
        cube.api = api;
        doc.classList.add('has-3d');
        setTimeout(function () { doc.classList.remove('gl-pending'); }, 900);
        request();
        setTimeout(api.measure, 400);
        window.addEventListener('load', api.measure);
      }).catch(function (err) {
        clearTimeout(giveUp);
        doc.classList.remove('gl-pending');
        if (window.console) console.warn('3D cube unavailable', err);
      });
    } else {
      doc.classList.remove('gl-pending');
    }

    // ---- Auto-turning cube: turns by itself, pauses on hover, cq_drag/swipe to spin, click a name to jump ----
    var cq_pos = 0;                 // face counter (keeps growing so turns always cq_go forward smoothly)
    var cq_drag = 0;                // extra degrees while cq_dragging
    var cq_cur = { rx: 0, ry: 0 };
    var cq_paused = false, cq_dragging = false, cq_onScreen = true, cq_lastTurn = performance.now();
    var cq_HOLD = 3200;             // ms on each face
    var cq_target = function () {
      var i = ((cq_pos % 6) + 6) % 6, lap = Math.floor(cq_pos / 6);
      var rx = K[i][0] - 360 * lap, ry = K[i][1] - 360 * lap;
      return { rx: rx, ry: (ry + cq_drag) * (rtl ? -1 : 1), i: i };
    };
    var cq_go = function (n) { cq_pos = n; cq_lastTurn = performance.now(); setActive(cq_target().i); };
    cube.update = function () {};
    if (!reduced) {
      var cq_last = performance.now();
      var cq_tick = function (now) {
        var dt = Math.min(0.05, (now - cq_last) / 1000);
        cq_last = now;
        if (cq_onScreen && !cq_paused && !cq_dragging && !document.hidden && now - cq_lastTurn > cq_HOLD) cq_go(cq_pos + 1);
        var tg = cq_target();
        var k = 1 - Math.exp(-dt * (cq_dragging ? 14 : 4.2));
        cq_cur.rx += (tg.rx - cq_cur.rx) * k;
        cq_cur.ry += (tg.ry - cq_cur.ry) * k;
        cube.el.style.setProperty('--rx', cq_cur.rx.toFixed(2) + 'deg');
        cube.el.style.setProperty('--ry', cq_cur.ry.toFixed(2) + 'deg');
        if (cube.api) cube.api.set({ rx: -cq_cur.rx, ry: cq_cur.ry, q: 0 });
        requestAnimationFrame(cq_tick);
      };
      requestAnimationFrame(cq_tick);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { cq_onScreen = en[0].isIntersecting; if (cq_onScreen) cq_lastTurn = performance.now(); }).observe(cube.scene);
      }
      // hover pauses (desktop)
      cube.scene.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') cq_paused = true; });
      cube.scene.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { cq_paused = false; cq_lastTurn = performance.now() - cq_HOLD / 2; } });
      // cq_drag / swipe to spin
      var cq_startX = 0, cq_startY = 0, cq_moved = false;
      cube.scene.style.touchAction = 'pan-y';
      cube.scene.addEventListener('pointerdown', function (e) {
        cq_dragging = true; cq_moved = false; cq_startX = e.clientX; cq_startY = e.clientY;
        try { cube.scene.setPointerCapture(e.pointerId); } catch (err) {}
      });
      cube.scene.addEventListener('pointermove', function (e) {
        if (!cq_dragging) return;
        var dx = e.clientX - cq_startX;
        if (Math.abs(dx) > 6) cq_moved = true;
        cq_drag = dx * 0.45 * (rtl ? -1 : 1);
      });
      var cq_endDrag = function (e) {
        if (!cq_dragging) return;
        cq_dragging = false;
        var dx = e.clientX - cq_startX;
        cq_drag = 0;
        if (Math.abs(dx) > 40) cq_go(cq_pos + ((dx < 0) !== rtl ? 1 : -1));
        else cq_lastTurn = performance.now();
      };
      cube.scene.addEventListener('pointerup', cq_endDrag);
      cube.scene.addEventListener('pointercancel', cq_endDrag);
      cube.scene.addEventListener('click', function (e) { if (cq_moved) { e.stopImmediatePropagation(); cq_moved = false; } }, true);
      // keyboard: arrows turn the cube
      cube.scene.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); cq_go(cq_pos + ((e.key === 'ArrowRight') !== rtl ? 1 : -1)); }
      });
    }
    // service names under the cube jump to that face
    $$('[data-face]', stage).forEach(function (b) {
      b.addEventListener('click', function () {
        var j = +b.getAttribute('data-face'), i = ((cq_pos % 6) + 6) % 6;
        cq_go(cq_pos - i + j);
        showQuip(true);
        setTimeout(function () { if (!cube.scene.matches(':hover')) showQuip(false); }, 2200);
      });
    });
    // scroll-down button
    var cq_nextBtn = $('[data-scroll-next]', stage);
    if (cq_nextBtn) cq_nextBtn.addEventListener('click', function () {
      var nxt = stage.nextElementSibling;
      if (nxt) window.scrollTo({ top: nxt.getBoundingClientRect().top + window.scrollY - 70, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Plan, Create, Grow line ---------- */
  var stepLists = $$('[data-steps]').map(function (el) {
    return { el: el, items: $$('[data-step], .tl-item', el) };
  });
  function updateSteps(vh) {
    stepLists.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var fill = reduced ? 1 : clamp((vh * 0.78 - r.top) / (r.height + vh * 0.15));
      s.el.style.setProperty('--fill', fill.toFixed(3));
      s.items.forEach(function (it, i) { it.classList.toggle('on', fill >= (i / s.items.length) + 0.02 || fill >= 0.99); });
    });
  }

  /* ---------- About: 3D logo mark ---------- */
  var markHost = $('[data-mark3d]');
  if (markHost && !reduced && hasWebGL()) {
    load3d().then(function (m) { return m.initMark(markHost); })
      .then(function () { markHost.classList.add('is-3d'); })
      .catch(function () {});
  }

  /* ---------- Illustrations play only while on screen ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('play', en.isIntersecting); });
    }, { rootMargin: '60px' });
    $$('.illus, .plat-strip, .marquee, .duo-diagram, .cta-orbit, .mark-stage').forEach(function (el) { pio.observe(el); });
  }

  /* ---------- Services band: smooth drift + spotlight on the centre item ---------- */
  var band = $('[data-band]');
  if (band && !reduced && 'IntersectionObserver' in window) {
    var bWrap = band.parentElement;
    var bItems = $$('.band-item', band);
    var bPos = [];
    var bX = 0, bThird = 0, bVis = false, bLast = 0, bLastY = window.scrollY, bBoost = 0, bSlow = 1, bSlowT = 1;
    var bDir = rtl ? -1 : 1;
    var bMeasure = function () {
      bThird = band.scrollWidth / 3;
      bPos = bItems.map(function (it) { return it.offsetLeft + it.offsetWidth / 2; });
    };
    var bTick = function (now) {
      if (!bVis) { bLast = 0; return; }
      var dt = bLast ? Math.min(0.05, (now - bLast) / 1000) : 0;
      bLast = now;
      var y = window.scrollY;
      var v = dt ? Math.abs(y - bLastY) / dt : 0;
      bLastY = y;
      bBoost += (Math.min(v * 0.12, 160) - bBoost) * 0.06;
      bSlow += (bSlowT - bSlow) * 0.06;
      bX -= bDir * (38 + bBoost) * bSlow * dt;
      if (bX <= -bThird) bX += bThird;
      if (bX > 0) bX -= bThird;
      band.style.transform = 'translate3d(' + bX.toFixed(2) + 'px,0,0)';
      var half = bWrap.clientWidth / 2;
      for (var k = 0; k < bItems.length; k++) {
        var d = Math.abs(bPos[k] + bX - half) / half;
        var f = Math.max(0, 1 - d * 1.15);
        bItems[k].style.setProperty('--f', (f * f * (3 - 2 * f)).toFixed(3));
      }
      requestAnimationFrame(bTick);
    };
    bMeasure();
    bX = rtl ? -bThird : 0;
    window.addEventListener('resize', bMeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bMeasure);
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !bVis) { bVis = true; requestAnimationFrame(bTick); }
      if (!vis) bVis = false;
    }).observe(bWrap);
    bWrap.addEventListener('pointerenter', function () { bSlowT = 0.25; });
    bWrap.addEventListener('pointerleave', function () { bSlowT = 1; });
  }

  /* ---------- Client logos: colour wipe when shown on touch screens ---------- */
  if ('IntersectionObserver' in window && !finePointer) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('colored'); bio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$('[data-brand]').forEach(function (el) { bio.observe(el); });
  }

  /* ---------- Monthly report: tabs, morphing chart, hover guide, filters, like ---------- */
  var dash = $('[data-dash]');
  if (dash) {
    var cfg = {};
    try { cfg = JSON.parse(dash.getAttribute('data-chart')); } catch (e) {}
    var lLine = $('.lc-line', dash), lArea = $('.lc-area', dash), lPrev = $('.lc-prev', dash), lDot = $('.lc-dot', dash);
    var lGuide = $('.lc-guide', dash), lHover = $('.lc-hover', dash), lWrap = $('[data-lc]', dash), lTip = $('.lc-tip', dash);
    var mLabel = $('[data-metric-label]', dash), pill = $('.tab-pill', dash);
    var tabsEl = $$('[role="tab"]', dash), kpiEl = $$('button.kpi', dash), barEl = $$('.pbar-fill', dash);
    var order = ['reach', 'engagement', 'leads'];
    var metric = 'reach';
    var cur = cfg.metrics.reach.line.slice(), curPrev = cfg.metrics.reach.prev.slice();
    var used = false, auto = null, hoverIdx = -1;
    var pathOf = function (a) { return 'M' + a.map(function (y, i) { return (i * 40) + ' ' + y.toFixed(1); }).join(' L'); };
    var draw = function () {
      lLine.setAttribute('d', pathOf(cur));
      lArea.setAttribute('d', pathOf(cur) + ' L400 160 L0 160 Z');
      lPrev.setAttribute('d', pathOf(curPrev));
      lDot.setAttribute('cy', cur[cur.length - 1].toFixed(1));
      if (hoverIdx >= 0) placeHover(hoverIdx);
    };
    var movePill = function () {
      var on = $('[role="tab"].on', dash);
      if (!on || !pill) return;
      pill.style.width = on.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    };
    var setMetric = function (m, byUser) {
      if (byUser) { used = true; dash.classList.add('used'); stopAuto(); }
      if (m === metric) return;
      metric = m;
      tabsEl.forEach(function (b) { var on = b.getAttribute('data-metric') === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      kpiEl.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-metric') === m); });
      mLabel.textContent = cfg.labels[m];
      barEl.forEach(function (b, i) { b.style.setProperty('--w', cfg.metrics[m].bars[i] + '%'); });
      movePill();
      var from = cur.slice(), fromP = curPrev.slice(), to = cfg.metrics[m].line, toP = cfg.metrics[m].prev;
      var t0 = performance.now(), dur = reduced ? 0 : 800;
      var step = function (now) {
        var k = dur ? Math.min(1, (now - t0) / dur) : 1;
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        cur = from.map(function (v, i) { return v + (to[i] - v) * e; });
        curPrev = fromP.map(function (v, i) { return v + (toP[i] - v) * e; });
        draw();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var stopAuto = function () { clearInterval(auto); auto = null; };
    var startAuto = function () {
      if (used || reduced || auto) return;
      auto = setInterval(function () {
        if (dash.matches(':hover')) return;
        setMetric(order[(order.indexOf(metric) + 1) % order.length]);
      }, 4200);
    };
    tabsEl.concat(kpiEl).forEach(function (b) {
      b.addEventListener('click', function () { setMetric(b.getAttribute('data-metric'), true); });
    });
    $('[role="tablist"]', dash).addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var dir = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
      var next = order[(order.indexOf(metric) + dir + order.length) % order.length];
      setMetric(next, true);
      $('[role="tab"][data-metric="' + next + '"]', dash).focus();
    });
    var placeHover = function (i) {
      var px = i * 40, py = cur[i];
      lGuide.setAttribute('x1', px); lGuide.setAttribute('x2', px);
      lHover.setAttribute('cx', px); lHover.setAttribute('cy', py.toFixed(1));
      var w = Math.min(3, Math.floor(i / 10 * 4));
      lTip.querySelector('b').textContent = cfg.weeks[w];
      lTip.querySelector('span').textContent = cfg.labels[metric] + ' · ' + cfg.tip;
      var left = Math.min(Math.max(i / 10 * 100, 12), 88);
      lTip.style.left = left + '%';
      lTip.style.top = (py / 160 * 100) + '%';
    };
    var onMove = function (e) {
      var r = lWrap.getBoundingClientRect();
      var i = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 10);
      hoverIdx = i;
      lWrap.classList.add('hovering');
      placeHover(i);
      if (!used) { used = true; dash.classList.add('used'); stopAuto(); }
    };
    lWrap.addEventListener('pointermove', onMove);
    lWrap.addEventListener('pointerdown', onMove);
    lWrap.addEventListener('pointerleave', function () { hoverIdx = -1; lWrap.classList.remove('hovering'); });
    dash.addEventListener('pointermove', function (e) {
      var r = dash.getBoundingClientRect();
      dash.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      dash.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    // Calendar: filter by content type
    var cal = $('[data-cal]', dash);
    $$('.cal-key button', dash).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        var active = b.classList.contains('on');
        $$('.cal-key button', dash).forEach(function (x) { x.classList.remove('on'); });
        cal.classList.remove('f-p', 'f-r', 's-s', 'f-s');
        if (!active) { b.classList.add('on'); cal.classList.add('f-' + f); }
      });
    });
    // Top post: like with a heart burst
    var like = $('.like', dash), burst = $('.burst', dash);
    var pop = function () {
      if (reduced) return;
      burst.classList.remove('pop'); void burst.offsetWidth; burst.classList.add('pop');
    };
    like.addEventListener('click', function () {
      var on = !like.classList.contains('liked');
      like.classList.toggle('liked', on);
      like.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) pop();
    });
    $('.mini-post .post-img', dash).addEventListener('dblclick', function () { if (!like.classList.contains('liked')) like.click(); else pop(); });
    // Start the tour when the report is on screen
    if ('IntersectionObserver' in window) {
      var liked = false;
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) {
          movePill();
          startAuto();
          if (!liked && !reduced) { liked = true; setTimeout(function () { if (!like.classList.contains('liked')) like.click(); }, 2200); }
        } else stopAuto();
      }, { threshold: 0.35 }).observe(dash);
    }
    window.addEventListener('resize', movePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    movePill();
  }

  /* ---------- Headings reveal word by word ---------- */
  if (!reduced) {
    $$('[data-split]').forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      words.forEach(function (w, i) {
        var o = document.createElement('span');
        o.className = 'sw';
        var inner = document.createElement('span');
        inner.textContent = w;
        inner.style.transitionDelay = (i * 60) + 'ms';
        o.appendChild(inner);
        h.appendChild(o);
        if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ---------- Magnetic main buttons + "View" cursor ---------- */
  if (finePointer && !reduced) {
    $$('.btn-red').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.28;
        b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
    var views = $$('[data-view]');
    if (views.length) {
      var bubble = document.createElement('div');
      bubble.className = 'view-cursor';
      bubble.setAttribute('aria-hidden', 'true');
      bubble.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
      document.body.appendChild(bubble);
      document.addEventListener('pointermove', function (e) {
        bubble.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      });
      views.forEach(function (v) {
        v.addEventListener('pointerenter', function () { bubble.classList.add('on'); });
        v.addEventListener('pointerleave', function () { bubble.classList.remove('on'); });
      });
    }
  }

  /* ---------- Floating logo tiles ---------- */
  var floats = reduced ? [] : $$('[data-float]');
  function updateFloats(vh) {
    floats.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var c = r.top + r.height / 2 - vh / 2;
      el.style.translate = '0 ' + (c * -parseFloat(el.getAttribute('data-float'))).toFixed(1) + 'px';
    });
  }

  /* ---------- Words ---------- */
  function updateWords(vh) {
    wordBlocks.forEach(function (el) {
      var words = el._words;
      if (reduced) { words.forEach(function (w) { w.classList.add('lit'); }); return; }
      var r = el.getBoundingClientRect();
      var prog = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3));
      var lit = Math.round(prog * words.length);
      words.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
    });
  }

  /* ---------- Scroll loop ---------- */
  var header = $('[data-header]');
  var bar = $('[data-progress]');
  var ticking = false;
  function onFrame() {
    ticking = false;
    var vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - vh;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ')';
    if (cube) cube.update(vh);
    updateWords(vh);
    updateSteps(vh);
    updateFloats(vh);
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  onFrame();

  /* ---------- Services page: highlight the service in view ---------- */
  var spyLinks = $$('[data-spy]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-spy') === en.target.id); });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    spyLinks.forEach(function (a) {
      var t = document.getElementById(a.getAttribute('data-spy'));
      if (t) sio.observe(t);
    });
  }

  /* ---------- Page transitions ---------- */
  if (!reduced) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target || a.hasAttribute('download') || a.hasAttribute('data-cookie-settings')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (/\.(php|xml|png|jpe?g|webp|pdf)$/i.test(url.pathname)) return;
      e.preventDefault();
      doc.classList.add('leaving');
      setTimeout(function () { location.href = url.href; }, 220);
    });
    window.addEventListener('pageshow', function () { doc.classList.remove('leaving'); });
  }

  /* ---------- Quote form ---------- */
  var form = $('[data-form]');
  if (form) {
    var msgs = {};
    try { msgs = JSON.parse(form.getAttribute('data-msgs')); } catch (e) {}
    var status = $('[data-status]', form);
    var btn = $('button[type="submit"]', form);
    var thanks = $('[data-thanks]');
    var btnHTML = btn.innerHTML;

    var showError = function (key, field) {
      status.textContent = msgs[key] || msgs.fail;
      status.classList.add('error');
      $$('.field', form).forEach(function (f) { f.classList.remove('invalid'); });
      if (field) {
        var input = form.elements[field === 'phone' && form.elements.phone_local ? 'phone_local' : field];
        if (input) { input.closest('.field').classList.add('invalid'); input.focus(); }
      }
    };

    // Country code picker (Jordan by default)
    var ccBtn = $('[data-cc]', form), ccList = $('[data-cc-list]', form);
    var ccCode = '962';
    if (ccBtn && ccList) {
      var ccItems = $$('li', ccList);
      var ccOpen = function (open) {
        ccList.hidden = !open;
        ccBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { var sel = $('li[aria-selected="true"]', ccList) || ccItems[0]; sel.focus(); sel.scrollIntoView({ block: 'nearest' }); }
      };
      var ccPick = function (li) {
        ccItems.forEach(function (x) { x.setAttribute('aria-selected', x === li ? 'true' : 'false'); });
        ccCode = li.getAttribute('data-code');
        $('[data-cc-iso]', ccBtn).textContent = li.getAttribute('data-iso');
        $('[data-cc-code]', ccBtn).textContent = '+' + ccCode;
        form.elements.phone_local.placeholder = li.getAttribute('data-iso') === 'JO' ? '79 123 4567' : '';
        ccOpen(false);
        form.elements.phone_local.focus();
      };
      ccBtn.addEventListener('click', function () { ccOpen(ccList.hidden); });
      ccItems.forEach(function (li) {
        li.addEventListener('click', function () { ccPick(li); });
        li.addEventListener('keydown', function (e) {
          var i = ccItems.indexOf(li);
          if (e.key === 'ArrowDown') { e.preventDefault(); (ccItems[i + 1] || li).focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); (ccItems[i - 1] || li).focus(); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ccPick(li); }
          else if (e.key === 'Escape') { ccOpen(false); ccBtn.focus(); }
        });
      });
      document.addEventListener('click', function (e) { if (!ccList.hidden && !e.target.closest('.fx-phone-field')) ccOpen(false); });
    }

    // Service chips: highlight the chosen one
    var chips = $$('.svc-chip', form);
    var syncChips = function () { chips.forEach(function (c) { c.classList.toggle('on', $('input', c).checked); }); };
    chips.forEach(function (c) {
      var r = $('input', c);
      r.addEventListener('change', syncChips);
      r.addEventListener('focus', function () { if (r.matches(':focus-visible')) c.classList.add('focus'); });
      r.addEventListener('blur', function () { c.classList.remove('focus'); });
    });
    form.addEventListener('reset', function () { setTimeout(syncChips, 0); });

    // Message counter
    var area = $('[data-chars]', form), countN = $('[data-chars-n]', form);
    if (area && countN) area.addEventListener('input', function () { countN.textContent = area.value.length; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var local = (form.elements.phone_local ? form.elements.phone_local.value : form.elements.phone.value).replace(/[^\d]/g, '');
      if (form.elements.phone_local) {
        local = local.replace(/^0+/, '');  // 079... -> 79...
        if (local.indexOf(ccCode) === 0 && local.length > ccCode.length + 6) local = local.slice(ccCode.length);  // typed +962 again
        form.elements.phone.value = '+' + ccCode + ' ' + local;
      }
      if (name.length < 2) return showError('name', 'name');
      if (local.length < 6) return showError('phone', 'phone');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('email', 'email');

      status.classList.remove('error');
      $$('.field', form).forEach(function (f) { f.classList.remove('invalid'); });
      // Test version (free test hosting): no mailer there, so say so politely
      if (doc.hasAttribute('data-test')) { status.textContent = msgs.test || ''; return; }
      status.textContent = '';
      btn.disabled = true;
      btn.textContent = msgs.sending || '…';

      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false, error: 'fail' }; });
      }).then(function (data) {
        if (data && data.ok) {
          form.hidden = true;
          thanks.hidden = false;
          thanks.focus();
          form.reset();
          window.dispatchEvent(new CustomEvent('pc:lead', { detail: { form_id: form.id } }));
        } else {
          var err = data && data.error;
          showError(err in msgs ? err : 'fail', err === 'name' || err === 'phone' || err === 'email' ? err : null);
        }
      }).catch(function () {
        showError('fail');
      }).then(function () {
        btn.disabled = false;
        btn.innerHTML = btnHTML;
      });
    });
  }
})();
