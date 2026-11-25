// /showcase/: steps the demo-flow stage through its four states. Progressive enhancement only:
// without this script the stage shows the finished flow and the step list explains every step.
// - Autoplays only when motion is allowed, and only while the stage is on screen and the tab is visible.
// - A Pause/Play button controls it (WCAG 2.2.2); choosing a step shows it and pauses.
// - ?step=1..4 opens a specific step, paused (used for the README preview image).
(function () {
  'use strict';
  var stage = document.getElementById('scStage');
  if (!stage) return;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var LOW = document.documentElement.getAttribute('data-quality') === 'low';
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var steps = Array.prototype.slice.call(stage.querySelectorAll('.sc-step'));
  var playBtn = document.getElementById('scPlay');
  var live = document.getElementById('scLive');
  var DUR = [2200, 2600, 2600, 4400];
  var step = 3, timer = 0, userPaused = false, visible = true, playing = false;

  function show(i, announce) {
    step = i;
    stage.setAttribute('data-step', String(i));
    stage.style.setProperty('--step-ms', DUR[i] + 'ms');
    steps.forEach(function (b, j) {
      if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', j < i);
    });
    if (announce && live) {
      var b = steps[i];
      live.textContent = 'Step ' + (i + 1) + ' of 4: ' + b.querySelector('.sc-t').textContent + '. ' + b.querySelector('.sc-d').textContent;
    }
  }
  function schedule() {
    clearTimeout(timer);
    // restart the progress bar for this step
    stage.classList.remove('playing'); void stage.offsetWidth; stage.classList.add('playing');
    timer = setTimeout(function () { show((step + 1) % 4, false); schedule(); }, DUR[step]);
  }
  function setPlaying(on) {
    playing = on;
    clearTimeout(timer);
    if (on) schedule(); else stage.classList.remove('playing');
    if (playBtn) {
      playBtn.classList.toggle('is-paused', !on);
      playBtn.querySelector('.sc-play-l').textContent = on ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', on ? 'Pause the animation' : 'Play the animation');
    }
  }
  function sync() { var want = !userPaused && visible && !document.hidden; if (want !== playing) setPlaying(want); }

  // initial state
  var q = /[?&]step=([1-4])/.exec(location.search);
  if (q) { show(Number(q[1]) - 1, false); userPaused = true; }
  else if (REDUCE) { show(3, false); userPaused = true; }
  else show(0, false);
  if (playBtn) playBtn.hidden = false;
  setPlaying(false);
  sync();

  steps.forEach(function (b, j) {
    b.addEventListener('click', function () { userPaused = true; setPlaying(false); show(j, true); });
  });
  if (playBtn) playBtn.addEventListener('click', function () {
    userPaused = playing;
    if (!userPaused && step === 3) show(0, false);
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(stage);
  }

  // a gentle lean toward the pointer (desktop pointers, motion allowed, capable devices only)
  var scene = stage.querySelector('.scene'), world = stage.querySelector('.world'), raf = 0;
  if (scene && world && FINE && !REDUCE && !LOW) {
    scene.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = scene.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        world.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
        world.style.setProperty('--rx', (4 - y * 4).toFixed(2) + 'deg');
      });
    }, { passive: true });
    scene.addEventListener('pointerleave', function () { world.style.removeProperty('--ry'); world.style.removeProperty('--rx'); });
  }
})();
