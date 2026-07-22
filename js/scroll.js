/* ==========================================================================
   scroll.js  —  Spring panning · viewport scale · parallax · sliding minimap
   ========================================================================== */
(function () {
  'use strict';

  var Core = window.ScrollCore;
  if (!Core) throw new Error('ScrollCore must load before scroll.js');

  /* ── Config ── */
  var CARD_COUNT  = 6;   /* Vibe Cooding 卡暂时隐藏（原 7；恢复时改回 7）*/
  var CARD_W      = 1200;
  var CARD_GAP    = 40;
  var CARD_STEP   = CARD_W + CARD_GAP; // 1240
  var MAX_PAN     = (CARD_COUNT - 1) * CARD_STEP; // 6200
  var CARD_HALF   = CARD_W / 2; // 600  — strip centering offset
  var GESTURE_THRESHOLD = 40;
  var GESTURE_SILENCE   = 160;

  /* Pan spring — rauno.me source: stiffness 500, damping 50
     (stiffness 600/damping 80 was the circle element; the strip pan
      uses the softer 500/50 pair for that silky glide feel)          */
  var PAN_K = 500, PAN_D = 50;

  /* Scale spring — exact rauno.me params: stiffness:500 damping:50. */
  var SCL_K = 500, SCL_D = 50, SCL_M = 1;
  var SPRING_STEP = 1 / 120;
  var SPRING_MAX_ELAPSED = 0.1;

  /* Parallax: text moves at PARALLAX_FACTOR × card's offset from center
     — creates a "sliding left-to-right" motion within the card          */
  var PARALLAX_FACTOR = 0.28;

  /* Minimap — two-state ticks, CSS handles width transition; no JS tracker */

  /* ── Elements ── */
  var scaler  = document.getElementById('cardsScaler');
  var strip   = document.getElementById('cardStrip');
  var minimap = document.getElementById('minimap');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionQuery.matches;

  /* ── Pan state ── */
  var panPos    = 0;
  var panVel    = 0;
  var panTarget = 0;

  /* ── Scale state ── */
  var scaleBase   = 1;
  var scaleCur    = 1;
  var scaleVel    = 0;
  var scaleTarget = 1;

  /* ── Snap / panning state ── */
  var activeIdx  = 0; /* committed card only — animation never mutates this */
  var previewIdx = 0;
  var wheelTimer = null;
  var rafId      = null;
  var lastTime   = null;
  var wheelGesture = Core.createGestureController({
    threshold: GESTURE_THRESHOLD,
    sensitivity: 0.5,
    cardCount: CARD_COUNT
  });

  /* ── Parallax cache: { cardIdx, elements[] } for cards 1-6 ── */
  var parallaxItems = [];

  /* ================================================================
     Build minimap — flex row of ticks. First tick marked .active.
     ================================================================ */
  var ticks = [];

  (function buildMinimap() {
    for (var i = 0; i < CARD_COUNT; i++) {
      (function (idx) {
        var t = document.createElement('button');
        t.type = 'button';
        t.className = 'mm-tick' + (idx === 0 ? ' active' : '');
        t.setAttribute('aria-label', 'Card ' + (idx + 1));
        t.addEventListener('click', function () { snapToCard(idx); });
        minimap.appendChild(t);
        ticks.push(t);
      })(i);
    }
  })();

  /* ================================================================
     Setup parallax element cache  (called once after DOM ready)
     ================================================================ */
  function setupParallax() {
    /* Selectors for the main animated element in each card */
    var map = {
      1: ['#card-01'],
      2: ['#card-02 .c-proj-title'],
      3: ['#card-03 .c-proj-title'],
      5: ['#card-06 .contact-lines']   /* 隐藏 Vibe 卡后，联系卡位于第 6 张(index 5)；恢复时改回 6 */
    };
    for (var i = 1; i < CARD_COUNT; i++) {
      var sels = map[i];
      if (!sels) continue;
      var els = [];
      for (var j = 0; j < sels.length; j++) {
        var el = document.querySelector(sels[j]);
        if (el) els.push(el);
      }
      if (els.length) parallaxItems.push({ cardIdx: i, elements: els });
    }
  }

  /* ================================================================
     Update parallax offsets based on current panPos
     Offset formula: -relPos × FACTOR  →  text drifts left→right
     as each card enters from the right and exits to the left
     ================================================================ */
  function updateParallax() {
    for (var i = 0; i < parallaxItems.length; i++) {
      var item  = parallaxItems[i];
      /* relPos > 0: card is to the right of viewport center (not yet shown)
         relPos = 0: card is at center
         relPos < 0: card has passed (to the left)                            */
      var relPos = panPos + item.cardIdx * CARD_STEP;
      var offset = (-relPos * PARALLAX_FACTOR).toFixed(2);
      for (var j = 0; j < item.elements.length; j++) {
        item.elements[j].style.setProperty('--parallax-x', offset + 'px');
      }
    }
  }

  /* ================================================================
     Viewport scale
     ================================================================ */
  function computeBaseScale() {
    return Math.min(
      Math.max(Math.min(window.innerWidth / 1300, window.innerHeight / 1020), 0.2),
      1.0
    );
  }

  /* ================================================================
     Apply transforms
     ================================================================ */
  function applyTransforms() {
    scaler.style.transform = 'scale(' + scaleCur.toFixed(5) + ')';
    strip.style.transform  =
      'translateX(' + (panPos - CARD_HALF).toFixed(2) + 'px) translateY(-50%)';
  }

  /* ================================================================
     Update minimap
     ================================================================ */
  function renderMinimap(idx) {
    idx = Core.clamp(Math.round(idx), 0, CARD_COUNT - 1);
    if (idx === previewIdx) return;
    ticks[previewIdx].classList.remove('active');
    ticks[idx].classList.add('active');
    previewIdx = idx;
  }

  /* ================================================================
     Panning CSS class  (suppresses hover-strip while strip moves)
     ================================================================ */
  function setPanning(on) {
    document.body.classList.toggle('is-panning', on);
  }

  /* ================================================================
     Wheel handler
     ================================================================ */
  function cancelWheelGesture() {
    clearTimeout(wheelTimer);
    wheelTimer = null;
    wheelGesture.reset();
  }

  function finishWheelGesture() {
    var state = wheelGesture.getState();
    wheelTimer = null;
    wheelGesture.reset();
    if (state.active && !state.locked) snapToCard(activeIdx, true);
  }

  window.addEventListener('wheel', function (e) {
    e.preventDefault();

    var delta = Core.normalizeWheelDelta(e.deltaX, e.deltaY, e.deltaMode);
    if (!delta) return;
    if (!wheelGesture.getState().active) wheelGesture.begin(activeIdx);

    var result = wheelGesture.push(delta);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(finishWheelGesture, GESTURE_SILENCE);

    if (result.phase === 'preview') {
      if (!reduceMotion) {
        var cardRest = -(activeIdx * CARD_STEP);
        panTarget = Core.clamp(cardRest - result.offset, -MAX_PAN, 0);
        setPanning(true);
        kick();
      }
    } else if (result.phase === 'commit') {
      snapToCard(result.index, true);
    }
  }, { passive: false });

  /* ================================================================
     Touch / trackpad swipe
     ================================================================ */
  var touchX = 0, touchY = 0, touchAxis = null;
  var touchStartIdx = 0, touchStartPan = 0;

  window.addEventListener('touchstart', function (e) {
    cancelWheelGesture();
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    touchAxis = null;
    touchStartIdx = activeIdx;
    touchStartPan = -(activeIdx * CARD_STEP);
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    var dx = e.touches[0].clientX - touchX;
    var dy = e.touches[0].clientY - touchY;
    if (!touchAxis) touchAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (touchAxis !== 'x') return;
    e.preventDefault();
    setPanning(true);
    panTarget = Core.clamp(touchStartPan + dx, -MAX_PAN, 0);
    panPos     = panTarget;
    panVel     = 0;
    applyTransforms();
    renderMinimap(-panPos / CARD_STEP);
    updateParallax();
  }, { passive: false });

  function finishTouch() {
    if (touchAxis !== 'x') {
      setPanning(false);
      touchAxis = null;
      return;
    }
    var diff = panTarget - touchStartPan;
    var idx = touchStartIdx;
    if (diff <= -GESTURE_THRESHOLD) idx += 1;
    else if (diff >= GESTURE_THRESHOLD) idx -= 1;
    touchAxis = null;
    snapToCard(idx);
  }

  window.addEventListener('touchend', finishTouch, { passive: true });
  window.addEventListener('touchcancel', finishTouch, { passive: true });

  /* ================================================================
     Snap to card
     ================================================================ */
  function settleImmediately() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
    panPos = panTarget;
    panVel = 0;
    scaleBase = computeBaseScale();
    scaleTarget = Math.max(0.6, scaleBase + panPos * 0.00006);
    scaleCur = scaleTarget;
    scaleVel = 0;
    applyTransforms();
    updateParallax();
    setPanning(false);
  }

  function snapToCard(idx, preserveWheel) {
    if (!preserveWheel) cancelWheelGesture();
    idx = Core.clamp(idx, 0, CARD_COUNT - 1);
    panTarget = -(idx * CARD_STEP);
    activeIdx = idx;
    renderMinimap(idx);
    setPanning(true);
    if (reduceMotion) {
      settleImmediately();
      return;
    }
    kick();
  }

  /* ================================================================
     RAF animation loop
     ================================================================ */
  function kick() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId    = null;
    var dt   = lastTime ? (now - lastTime) / 1000 : 0.016;
    lastTime = now;

    /* ── Pan spring ── */
    var nextPan = Core.stepSpring(panPos, panVel, panTarget, dt, {
      stiffness: PAN_K,
      damping: PAN_D,
      mass: 1,
      maxStep: SPRING_STEP,
      maxElapsed: SPRING_MAX_ELAPSED
    });
    panPos = nextPan.position;
    panVel = nextPan.velocity;
    var panSettled = Math.abs(panPos - panTarget) < 0.25 && Math.abs(panVel) < 0.25;
    if (panSettled) { panPos = panTarget; panVel = 0; }

    /* ── Scale — rauno.me faithful: spring tracks position continuously ──
       Formula mirrors rauno.me's: target = D.get() - 0.0001 × scrollY
       Adapted for my coords (panPos = -scrollX, range 0 → -MAX_PAN):
         rauno per-card reduction: 0.0001 × 744 = 7.4%
         my CARD_STEP = 1240 → factor = 744/1240 ≈ 0.6
         → target = scaleBase + panPos × 0.00006
       At card 0 (panPos=0)   : target = scaleBase (100%)
       At card 1 (panPos=-1240): target ≈ scaleBase − 0.074 (7.4% ↓)
       At card 6 (panPos=-7440): target ≈ scaleBase − 0.446 → floor 0.6
       Scale restores naturally when panning back to card 0 — smooth & symmetric,
       same as rauno.me. Spring (K=500/D=50) smooths both shrink and restore. */
    scaleBase = computeBaseScale();
    scaleTarget = Math.max(0.6, scaleBase + panPos * 0.00006);

    var nextScale = Core.stepSpring(scaleCur, scaleVel, scaleTarget, dt, {
      stiffness: SCL_K,
      damping: SCL_D,
      mass: SCL_M,
      maxStep: SPRING_STEP,
      maxElapsed: SPRING_MAX_ELAPSED
    });
    scaleCur = nextScale.position;
    scaleVel = nextScale.velocity;
    var sclSettled = Math.abs(scaleCur - scaleTarget) < 0.0001 &&
                     Math.abs(scaleVel) < 0.0001;
    if (sclSettled) { scaleCur = scaleTarget; scaleVel = 0; }

    /* ── Apply ── */
    applyTransforms();
    updateParallax();
    if (panSettled) setPanning(false); /* clicks need not wait for scale */

    /* ── Loop? ── */
    var stillMoving = !panSettled || !sclSettled;
    if (stillMoving) {
      rafId = requestAnimationFrame(frame);
    } else {
      lastTime = null;
      setPanning(false);
    }
  }

  /* ================================================================
     Keyboard
     ================================================================ */
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); snapToCard(activeIdx + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); snapToCard(activeIdx - 1); }
  });

  /* ================================================================
     Resize
     ================================================================ */
  window.addEventListener('resize', function () {
    scaleBase = computeBaseScale();
    kick();
  });

  function handleMotionPreference(e) {
    reduceMotion = e.matches;
    if (reduceMotion) snapToCard(activeIdx);
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', handleMotionPreference);
  else if (motionQuery.addListener) motionQuery.addListener(handleMotionPreference);

  document.addEventListener('visibilitychange', function () {
    lastTime = null;
    if (document.hidden) {
      cancelWheelGesture();
      touchAxis = null;
      panTarget = -(activeIdx * CARD_STEP);
      renderMinimap(activeIdx);
      settleImmediately();
    } else {
      scaleBase = computeBaseScale();
      kick();
    }
  });

  /* ================================================================
     Init
     ================================================================ */
  scaleBase   = computeBaseScale();
  scaleCur    = scaleBase;
  scaleTarget = scaleBase;
  applyTransforms();
  updateParallax();
  setupParallax();   /* cache DOM refs after initial render */

  /* ================================================================
     Public API
     ================================================================ */
  window.ScrollAPI = {
    scrollToCard: snapToCard,
    getActiveIdx:  function () { return activeIdx; }
  };

})();
