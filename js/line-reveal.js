/* 履历页 · 滚动「响应式分行」入场动效
   参考 https://demos.gsap.com/demo/responsive-line-splits-on-scroll/
   技术：GSAP SplitText(分行 + 行遮罩) + ScrollTrigger(滚动触发)
   作用范围：标题 + 正文（不含「个人经历 / EXPERIENCE」区块、不含数据磁贴与联系方式）
   说明：配合 <head> 里的 reveal-armed 兜底类防止首屏闪烁；
        若 GSAP 缺失 / 出错 / 用户开启「减少动态」，则直接显示文字、不做动画。 */
(function () {
  'use strict';

  var html = document.documentElement;
  function showAll() { html.classList.remove('reveal-armed'); }

  // GSAP 没加载成功 → 直接显示，保证简历文字一定可见
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { showAll(); return; }

  // 尊重系统「减少动态效果」
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* 纯文本 / 仅尾部有链接 → 逐行遮罩上升 */
  var SPLIT_SELECTOR = [
    '.hero h1',
    '.about-section h2', '.about-section .body-copy p',
    '.workflow-section h2', '.workflow-cards h3', '.workflow-cards p',
    '.experience-section h2', '.experience-section .section-lead',   /* 经历区块的标题+引言也加入动画 */
    '.contact-section h2', '.contact-section .body-copy p'
  ].join(',');
  /* 段落「中间」含加粗等内联元素 → 整段淡入上移，不分行(避免拆散/丢失加粗文字) */
  var FADE_SELECTOR = '.hero-copy';

  var started = false;
  function init() {
    if (started) return;          /* 只初始化一次（fonts.ready 与兜底定时器二选一）*/
    started = true;
    try {
      gsap.utils.toArray(SPLIT_SELECTOR).forEach(function (el) {
        SplitText.create(el, {
          type: 'lines',
          ignore: '.wf-link, .accent',   /* 尾部的链接/强调色不参与分行，保持行内 */
          mask: 'lines',          /* 自动生成 overflow:hidden 行遮罩 */
          autoSplit: true,        /* 字体就绪 / 视口变化时自动重新分行（响应式）*/
          linesClass: 'reveal-line',
          aria: 'auto',           /* 保留屏幕阅读器可读性 */
          onSplit: function (self) {
            var tw = gsap.from(self.lines, {
              yPercent: 110,        /* 从行遮罩下方升入 */
              duration: 0.8,
              ease: 'power3.out',
              stagger: 0.1,
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true          /* 进入视口播放一次 */
              }
            });
            el.style.visibility = 'visible';   /* 接管 reveal-armed 的隐藏：行由遮罩控制显隐 */
            return tw;
          }
        });
      });
      /* 含中间加粗等内联元素的段落(首屏正文)：整段淡入上移，不拆行 → 加粗保留 */
      gsap.utils.toArray(FADE_SELECTOR).forEach(function (el) {
        gsap.from(el, {
          y: 24,
          autoAlpha: 0,            /* 同时管理 opacity + visibility，接管 reveal-armed 隐藏 */
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });
      showAll();                 /* 移除全局兜底类（淡入段落由 gsap autoAlpha 控制显隐）*/
      ScrollTrigger.refresh();
    } catch (e) {
      showAll();                 /* 任何异常都保证文字可见 */
    }
  }

  /* 等字体就绪再分行，避免按回退字体测错断行位置 */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
    /* 字体迟迟不就绪的兜底 */
    setTimeout(init, 1200);
  } else {
    init();
  }
})();
