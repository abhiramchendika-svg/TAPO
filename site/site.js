// Progressive enhancement for the pre-rendered marketing pages. Everything is readable without it.
(function () {
  'use strict';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // Header: menu toggle and frosted background once scrolled
  var nav = $('#snav'), btn = $('#menuBtn');
  if (btn) btn.addEventListener('click', function () { var o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
  var onScroll = function () { nav && nav.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Card shine follows the pointer
  $$('.cardface').forEach(function (el) {
    el.addEventListener('pointermove', function (e) { var b = el.getBoundingClientRect(); el.style.setProperty('--mx', ((e.clientX - b.left) / b.width) * 100 + '%'); el.style.setProperty('--my', ((e.clientY - b.top) / b.height) * 100 + '%'); });
  });

  // Hero phone leans toward the pointer
  var stage = $('#stage3d'), phone = $('#phone3d');
  if (stage && phone && !REDUCE && window.matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', function (e) { var b = stage.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5; phone.style.transform = 'rotateX(' + (20 - y * 14) + 'deg) rotateY(' + (-24 + x * 22) + 'deg) rotateZ(' + (8 - x * 4) + 'deg)'; });
    stage.addEventListener('pointerleave', function () { phone.style.transform = ''; });
  }

  // Live ranking cycles through example purchases (ranked at build time by the app's engine)
  var live = $('#liveRank'), label = $('#liveCat'), data = [];
  try { data = JSON.parse(($('#demos') || {}).textContent || '[]'); } catch (e) {}
  if (live && data.length && !REDUCE) {
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % data.length;
      var d = data[i], top = d.rows[0].value || 1;
      label.textContent = d.label;
      live.innerHTML = '';
      d.rows.forEach(function (r, j) {
        var row = document.createElement('div'); row.className = 'lr' + (j === 0 ? ' top' : '');
        var b = document.createElement('b'); b.textContent = r.name;
        var s = document.createElement('span'); s.textContent = r.reward;
        var bar = document.createElement('div'); bar.className = 'bar';
        var fill = document.createElement('i'); fill.style.width = Math.max(4, (r.value / top) * 100) + '%'; fill.style.background = j === 0 ? 'var(--green)' : r.color;
        bar.appendChild(fill); row.appendChild(b); row.appendChild(s); row.appendChild(bar); live.appendChild(row);
      });
    }, 2800);
  }

  // Product: phone screen follows the chapter in view
  var chs = $$('.chapter'), layers = $$('.phone-sticky .layer');
  if (chs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { var k = Number(en.target.getAttribute('data-ch')); chs.forEach(function (c, j) { c.classList.toggle('on', j === k); }); layers.forEach(function (l, j) { l.classList.toggle('on', j === k); }); } }); }, { rootMargin: '-45% 0px -45% 0px' });
    chs.forEach(function (c) { io.observe(c); });
  }

  // Product: three phones rise into place, blurring with scroll speed
  var rise = $('#rise'), phones = $$('#risePhones .device');
  if (rise && phones.length && !REDUCE) {
    var lastY = window.scrollY, t = null, LAG = [0.12, 0, 0.24], TILT = [-7, 0, 7];
    var upd = function () {
      var b = rise.getBoundingClientRect(), vh = window.innerHeight, p = Math.max(0, Math.min(1, (vh - b.top) / (vh * 0.85)));
      var dy = window.scrollY - lastY; lastY = window.scrollY; var blur = Math.min(7, Math.abs(dy) * 0.12);
      phones.forEach(function (ph, k) { var q = Math.max(0, Math.min(1, (p - LAG[k]) / (1 - LAG[k]))), e = 1 - Math.pow(1 - q, 3); ph.style.transform = 'translateY(' + (1 - e) * 220 + 'px) rotate(' + (1 - e) * TILT[k] + 'deg) scale(' + (0.9 + e * 0.1) + ')'; ph.style.filter = q < 1 && blur > 0.3 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none'; });
      clearTimeout(t); t = setTimeout(function () { phones.forEach(function (ph) { ph.style.filter = 'none'; }); }, 140);
    };
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  // Aurora background: slow, throttled, paused when hidden; one static frame with Reduce Motion
  var cv = $('#aurora');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), w, h, dpr = Math.min(2, window.devicePixelRatio || 1), raf = null, last = 0;
    var blobs = [{ x: 0.78, y: 0.12, r: 0.55, c: '111,217,164', a: 0.1, s: 0.7 }, { x: 0.15, y: 0.3, r: 0.5, c: '169,155,255', a: 0.08, s: 0.5 }, { x: 0.55, y: 0.85, r: 0.6, c: '236,233,226', a: 0.05, s: 0.4 }];
    var size = function () { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    var draw = function (tt) { ctx.clearRect(0, 0, w, h); blobs.forEach(function (b, k) { var x = (b.x + Math.sin(tt * b.s * 0.2 + k) * 0.06) * w, y = (b.y + Math.cos(tt * b.s * 0.17 + k * 2) * 0.05) * h, r = b.r * Math.max(w, h); var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')'); g.addColorStop(1, 'rgba(' + b.c + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }); };
    var loop = function (ts) { if (ts - last > 66) { draw(ts / 1000); last = ts; } raf = requestAnimationFrame(loop); };
    size(); draw(0);
    window.addEventListener('resize', function () { size(); draw(last / 1000); });
    if (!REDUCE) {
      raf = requestAnimationFrame(loop);
      document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else if (!raf) raf = requestAnimationFrame(loop); });
    }
  }
})();
