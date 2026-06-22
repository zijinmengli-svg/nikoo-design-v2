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

  Promise.all([load('idle'), load('wave')]).then(function (imgs) {
    if (!imgs[0] || !imgs[1]) return;
    sheets.idle = imgs[0]; sheets.wave = imgs[1];
    document.querySelectorAll('canvas.mascot').forEach(init);
  });

  function init(canvas) {
    var ctx = canvas.getContext('2d');
    var state = 'idle', frame = 0, last = 0;
    canvas.addEventListener('mouseenter', function () { if (state !== 'wave') { state = 'wave'; frame = 0; } });

    function draw(clip, idx) {
      var m = META[clip], sx = (idx % m.cols) * m.fw, sy = Math.floor(idx / m.cols) * m.fw;
      ctx.clearRect(0, 0, 400, 400);
      ctx.drawImage(sheets[clip], sx, sy, m.fw, m.fw, 0, 0, 400, 400);
    }
    function loop(t) {
      if (t - last >= 1000 / FPS) {
        last = t;
        draw(state, frame);
        frame++;
        if (state === 'wave') { if (frame >= META.wave.frames) { state = 'idle'; frame = 0; } }
        else if (frame >= META.idle.frames) { frame = 0; }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
})();
