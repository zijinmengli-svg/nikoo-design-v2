/* ============================================================
   首页背景粒子光效（方案 A · 低调背景版）
   关闭方式（任选其一）：
     1) 删除 index.html 里 <script src="js/bg-particles.js"></script> 这一行；
     2) 或在该行之前加一句：<script>window.NIKOO_BG=false;</script>
   调强弱：改下面 CONFIG 里的 COUNT / ALPHA / SIZE 即可。
   ============================================================ */
(function () {
  'use strict';
  if (window.NIKOO_BG === false) return;

  var CONFIG = {
    COUNT: 520,        // 粒子数（越多越密；demo 版是 1400，这里调弱）
    ALPHA: 0.42,       // 整体亮度（0–1，越低越淡）
    SIZE: 4,           // 粒子基准大小
    GOLD: 0.05,        // 品牌黄占比
    AUTO: 0.0006,      // 自转速度
    MOUSE: 0.5         // 跟手转动幅度（0=不跟手）
  };

  var canvas = document.createElement('canvas');
  canvas.id = 'bgParticles';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
  if (document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild);
  else document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W, H, cx, cy, spread;
  function resize() {
    W = canvas.width = innerWidth * DPR; H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    cx = W / 2; cy = H / 2; spread = Math.min(W, H) * 0.5;
  }
  resize();
  addEventListener('resize', resize);

  function sprite(rgb) {
    var s = 64, o = document.createElement('canvas'); o.width = o.height = s;
    var x = o.getContext('2d'), g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.45, 'rgba(' + rgb + ',0.3)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); return o;
  }
  var sprWhite = sprite('255,250,238'), sprGold = sprite('254,233,0');

  var P = [];
  for (var i = 0; i < CONFIG.COUNT; i++) {
    var th = Math.random() * 2 * Math.PI, ph = Math.acos(2 * Math.random() - 1), r = Math.cbrt(Math.random());
    P.push({
      x: r * Math.sin(ph) * Math.cos(th),
      y: r * Math.sin(ph) * Math.sin(th),
      z: r * Math.cos(ph),
      s: 0.5 + Math.random() * 1.5,
      gold: Math.random() < CONFIG.GOLD
    });
  }

  var rx = 0, ry = 0, mx = 0, my = 0, auto = 0, raf = null, visible = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointermove', function (e) {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  });
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible && !reduce) start();
  });

  function render() {
    var trx = my * CONFIG.MOUSE * 0.7, tryy = mx * CONFIG.MOUSE + auto;
    rx += (trx - rx) * 0.05; ry += (tryy - ry) * 0.05;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    var cosX = Math.cos(rx), sinX = Math.sin(rx), cosY = Math.cos(ry), sinY = Math.sin(ry), focal = 2.4;
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      var x = p.x * cosY - p.z * sinY, z = p.x * sinY + p.z * cosY;
      var y2 = p.y * cosX - z * sinX, z2 = p.y * sinX + z * cosX;
      var scale = focal / (focal + z2);
      var sx = cx + x * scale * spread, sy = cy + y2 * scale * spread;
      var size = p.s * scale * CONFIG.SIZE * DPR;
      ctx.globalAlpha = Math.max(0, Math.min(1, scale - 0.5)) * CONFIG.ALPHA;
      ctx.drawImage(p.gold ? sprGold : sprWhite, sx - size, sy - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    auto += CONFIG.AUTO;
    render();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }

  if (reduce) { render(); }   // 减弱动效偏好：只画一帧静态
  else start();
})();
