/* ─── 版本号 ───────────────────────────────────────────────
   发版时只改这一行，三个页面自动同步。
   同步更新 CHANGELOG.md 后一起 git commit。
──────────────────────────────────────────────────────── */
window.SITE_VERSION = 'v1.0.0';

(function () {
  var el = document.createElement('div');
  el.id = 'site-version';
  el.textContent = window.SITE_VERSION;
  el.style.cssText = [
    'position:fixed',
    'right:16px',
    'bottom:12px',
    'font-size:10px',
    'color:#999999',
    'font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif',
    'letter-spacing:0.03em',
    'pointer-events:none',
    'z-index:9999',
    'user-select:none'
  ].join(';');
  document.body.appendChild(el);
})();
