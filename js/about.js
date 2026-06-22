/* 履历页：联系方式点击复制 + toast 提示 */
(function () {
  var toast = document.getElementById('toast');
  var timer = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 1800);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    showToast('已复制到剪切板');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast('已复制到剪切板'); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  document.querySelectorAll('.contact-copy').forEach(function (el) {
    el.addEventListener('click', function () {
      var v = el.getAttribute('data-copy');
      if (v) copyText(v);
    });
  });
})();
