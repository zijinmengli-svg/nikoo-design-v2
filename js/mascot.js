/* 宠胖胖 IP 互动动画：idle 循环 + 悬停挥手。
   驱动 <canvas class="mascot">（精灵图在 images/mascot/）。
   点击仍由卡片处理(进详情页)，挥手只在悬停触发，互不冲突。 */
(function () {
  'use strict';
  var META = { idle: { frames: 50, cols: 10, fw: 400 }, wave: { frames: 72, cols: 12, fw: 400 } };
  var FPS = 30, DIR = 'images/mascot/', sheets = {};

  function load(name) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = DIR + name + '.webp';
    });
  }

  var wavePromise = null;

  function ensureWave() {
    if (sheets.wave) return Promise.resolve(sheets.wave);
    if (!wavePromise) {
      wavePromise = load('wave').then(function (image) {
        if (image) sheets.wave = image;
        return image;
      });
    }
    return wavePromise;
  }

  load('idle').then(function (image) {
    if (!image) return;
    sheets.idle = image;
    document.querySelectorAll('canvas.mascot').forEach(init);
  });

  function init(canvas) {
    var ctx = canvas.getContext('2d');
    var state = 'idle', frame = 0, last = 0, rafId = null;
    var inView = false;

    canvas.addEventListener('mouseenter', function () {
      if (state === 'wave') return;
      ensureWave().then(function (image) {
        if (!image) return;
        state = 'wave';
        frame = 0;
        start();
      });
    });

    function draw(clip, idx) {
      var m = META[clip], sx = (idx % m.cols) * m.fw, sy = Math.floor(idx / m.cols) * m.fw;
      ctx.clearRect(0, 0, 400, 400);
      ctx.drawImage(sheets[clip], sx, sy, m.fw, m.fw, 0, 0, 400, 400);
    }
    function loop(t) {
      rafId = null;
      if (!inView || document.hidden) return;
      if (t - last >= 1000 / FPS) {
        last = t;
        draw(state, frame);
        frame++;
        if (state === 'wave') { if (frame >= META.wave.frames) { state = 'idle'; frame = 0; } }
        else if (frame >= META.idle.frames) { frame = 0; }
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (!rafId && inView && !document.hidden) rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      last = 0;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start();
        else stop();
      }, { threshold: 0.05 }).observe(canvas);
    } else {
      inView = true;
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });
  }
})();
