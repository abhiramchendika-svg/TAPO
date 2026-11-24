// Progressive enhancement for the pre-rendered marketing pages. Everything is readable and usable
// without it. No animation loops run unless something is moving; all listeners are passive.
(function () {
  'use strict';
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var LOW = document.documentElement.getAttribute('data-quality') === 'low';
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- header: frosted once scrolled (rAF-throttled) ---------- */
  var nav = $('#snav');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); });
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobile menu: glass sheet that grows from the button ---------- */
  var btn = $('#menuBtn'), sheet = $('#sheet');
  var setMenu = function (open) {
    nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    if (open) { var first = $('a', sheet); if (first) first.focus({ preventScroll: true }); }
  };
  if (btn && sheet) {
    btn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false); });
  }

  /* ---------- nav indicator: slides to the hovered link, rests on the current page ---------- */
  var links = $('#slinks'), ind = links && $('.nav-ind', links);
  if (links && ind) {
    var current = $('a[aria-current="page"]', links);
    var moveTo = function (a) {
      if (!a) { ind.style.opacity = '0'; return; }
      ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)'; ind.style.opacity = '1';
    };
    moveTo(current);
    $$('a', links).forEach(function (a) { a.addEventListener('pointerenter', function () { moveTo(a); }); a.addEventListener('focus', function () { moveTo(a); }); });
    links.addEventListener('pointerleave', function () { moveTo(current); });
    window.addEventListener('resize', function () { moveTo(current); }, { passive: true });
  }

  /* ---------- magnetic primary buttons (desktop pointer only) ---------- */
  if (FINE && !REDUCE && !LOW) {
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect(), x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2;
        el.style.transform = 'translate(' + (x * 0.12).toFixed(1) + 'px,' + (y * 0.2).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- card faces: light follows the pointer ---------- */
  if (FINE && !LOW) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.cardface');
      if (!el) return;
      var b = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - b.left) / b.width) * 100 + '%');
      el.style.setProperty('--my', ((e.clientY - b.top) / b.height) * 100 + '%');
    }, { passive: true });
  }

  /* ---------- hero phone leans toward the pointer ---------- */
  var stage = $('#stage3d'), phone = $('#phone3d');
  if (stage && phone && FINE && !REDUCE && !LOW) {
    stage.addEventListener('pointermove', function (e) {
      var b = stage.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      phone.style.transform = 'rotateX(' + (18 - y * 10).toFixed(2) + 'deg) rotateY(' + (-22 + x * 16).toFixed(2) + 'deg) rotateZ(' + (7 - x * 3).toFixed(2) + 'deg)';
    });
    stage.addEventListener('pointerleave', function () { phone.style.transform = ''; });
  }

  /* ---------- home: decision tool (rankings were computed at build time by the app's engine) ---------- */
  var dataEl = $('#decide-data'), form = $('#decideForm');
  if (dataEl && form) {
    var D = {}; try { D = JSON.parse(dataEl.textContent); } catch (e) {}
    var state = { cat: 'groceries', amt: 2500 };
    var fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
    var setText = function (id, t) { var el = document.getElementById(id); if (el) el.textContent = t; };
    var paint = function () {
      var d = D.table && D.table[state.cat + '|' + state.amt]; if (!d) return;
      setText('aCtx', D.labels[state.cat] + ' · ₹' + fmt.format(state.amt));
      setText('aName', d.name); setText('aEarn', d.earn); setText('aWhy', d.why);
      var face = $('#aFace'); if (face && face.getAttribute('data-card') !== d.card) { face.innerHTML = D.faces[d.card]; face.setAttribute('data-card', d.card); }
      var led = $('#aLedger'); led.textContent = '';
      d.rows.forEach(function (r, i) {
        var row = document.createElement('div'); row.className = 'ledger-row' + (i === 0 ? ' win' : '');
        var dot = document.createElement('i'); dot.style.background = r.c;
        var n = document.createElement('span'); n.className = 'n'; n.textContent = r.n;
        var rr = document.createElement('span'); rr.className = 'r'; rr.textContent = r.r;
        var v = document.createElement('span'); v.className = 'v'; v.textContent = r.v;
        row.append(dot, n, rr, v); led.appendChild(row);
      });
      var ans = $('#answer'); if (!REDUCE) { ans.classList.remove('swap'); void ans.offsetWidth; ans.classList.add('swap'); }
    };
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-cat')) { state.cat = b.getAttribute('data-cat'); $$('[data-cat]', form).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }
      if (b.hasAttribute('data-amt')) { state.amt = Number(b.getAttribute('data-amt')); $$('[data-amt]', form).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }
      paint();
    });
  }

  /* ---------- product: phone screen follows the chapter in view ---------- */
  var chs = $$('.chapter'), layers = $$('.phone-sticky .layer');
  if (chs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var k = Number(en.target.getAttribute('data-ch'));
        chs.forEach(function (c, j) { c.classList.toggle('on', j === k); });
        layers.forEach(function (l, j) { l.classList.toggle('on', j === k); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    chs.forEach(function (c) { io.observe(c); });
  }

  /* ---------- product: three phones rise into place, only while the section is on screen ---------- */
  var rise = $('#rise'), phones = $$('#risePhones .device');
  if (rise && phones.length && !REDUCE && 'IntersectionObserver' in window) {
    var active = false, raf = 0, lastY = window.scrollY, LAG = [0.12, 0, 0.24], TILT = [-6, 0, 6];
    var upd = function () {
      raf = 0;
      var b = rise.getBoundingClientRect(), vh = window.innerHeight, p = Math.max(0, Math.min(1, (vh - b.top) / (vh * 0.85)));
      var v = Math.abs(window.scrollY - lastY); lastY = window.scrollY;
      phones.forEach(function (ph, k) {
        var q = Math.max(0, Math.min(1, (p - LAG[k]) / (1 - LAG[k]))), e = 1 - Math.pow(1 - q, 3);
        ph.style.transform = 'translate3d(0,' + ((1 - e) * 200).toFixed(1) + 'px,0) rotate(' + ((1 - e) * TILT[k]).toFixed(2) + 'deg) scale(' + (0.92 + e * 0.08).toFixed(3) + ')';
        // motion blur only while moving fast and still travelling; never on low-power devices
        ph.style.filter = !LOW && q < 1 && v > 24 ? 'blur(' + Math.min(5, v * 0.06).toFixed(1) + 'px)' : '';
      });
    };
    var onS = function () { if (active && !raf) raf = requestAnimationFrame(upd); };
    new IntersectionObserver(function (es) { active = es[0].isIntersecting; if (active) upd(); else phones.forEach(function (ph) { ph.style.filter = ''; }); }).observe(rise);
    window.addEventListener('scroll', onS, { passive: true });
    upd();
  }

  /* ---------- FAQ: animated, interruptible accordion on top of <details> ---------- */
  $$('.faq details').forEach(function (d) {
    var sum = $('summary', d), ans = $('.ans', d), anim = null;
    if (!sum || !ans || REDUCE || !ans.animate) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var opening = !d.open;
      var start = ans.offsetHeight;
      if (anim) anim.cancel();
      if (opening) d.open = true;
      var end = opening ? ans.scrollHeight : 0;
      if (opening && start === 0) start = 0;
      anim = ans.animate([{ height: start + 'px', opacity: opening ? 0.3 : 1 }, { height: end + 'px', opacity: opening ? 1 : 0.2 }], { duration: Math.min(420, 180 + Math.abs(end - start) * 0.6), easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = function () { anim = null; if (!opening) d.open = false; };
    });
  });
})();
