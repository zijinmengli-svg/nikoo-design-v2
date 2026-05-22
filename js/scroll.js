/* ==========================================================================
   scroll.js  —  Spring panning · viewport scale · parallax · sliding minimap
   ========================================================================== */
(function () {
  'use strict';

  /* ── Config ── */
  var CARD_COUNT  = 7;
  var CARD_W      = 1200;
  var CARD_GAP    = 40;
  var CARD_STEP   = CARD_W + CARD_GAP; // 1240
  var MAX_PAN     = (CARD_COUNT - 1) * CARD_STEP; // 7440
  var CARD_HALF   = CARD_W / 2; // 600  — strip centering offset

  /* Pan spring — rauno.me source: stiffness 500, damping 50
     (stiffness 600/damping 80 was the circle element; the strip pan
      uses the softer 500/50 pair for that silky glide feel)          */
  var PAN_K = 500, PAN_D = 50;

  /* Scale spring — exact rauno.me params: stiffness:500 damping:50.
     Explicit-Euler stability check: D·dt/M = 50×0.016/1 = 0.80 ✓
     ζ = D/(2√KM) = 50/(2×√500) = 1.12 → overdamped, no oscillation. */
  var SCL_K = 500, SCL_D = 50, SCL_M = 1;

  /* Parallax: text moves at PARALLAX_FACTOR × card's offset from center
     — creates a "sliding left-to-right" motion within the card          */
  var PARALLAX_FACTOR = 0.28;

  /* Minimap — two-state ticks, CSS handles width transition; no JS tracker */

  /* ── Elements ── */
  var scaler  = document.getElementById('cardsScaler');
  var strip   = document.getElementById('cardStrip');
  var minimap = document.getElementById('minimap');

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
  var activeIdx  = 0;
  var snapTimer  = null;
  var rafId      = null;
  var lastTime   = null;

  /* ── Parallax cache: { cardIdx, elements[] } for cards 1-6 ── */
  var parallaxItems = [];

  /* ================================================================
     Build minimap — flex row of ticks. First tick marked .active.
     ================================================================ */
  var ticks = [];

  (function buildMinimap() {
    for (var i = 0; i < CARD_COUNT; i++) {
      (function (idx) {
        var t = document.createElement('div');
        t.className = 'mm-tick' + (idx === 0 ? ' active' : '');
        t.setAttribute('role', 'button');
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
      1: ['#card-01 .c01-a', '#card-01 .c01-i'],
      2: ['#card-02 .c02-text'],
      3: ['#card-03 .c03-text'],
      4: ['#card-04 .c04-text'],
      5: ['#card-05 .c05-text'],
      6: ['#card-06 .c06-manifesto']
    };
    for (var i = 1; i <= 6; i++) {
      var els = [];
      var sels = map[i];
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
  function updateMinimap(rawProgress) {
    var idx = Math.max(0, Math.min(CARD_COUNT - 1, Math.round(rawProgress)));
    if (idx !== activeIdx) {
      ticks[activeIdx].classList.remove('active');
      ticks[idx].classList.add('active');
      activeIdx = idx;
    }
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
  window.addEventListener('wheel', function (e) {
    e.preventDefault();

    /* deltaMode normalization — rauno.me 540 chunk source:
       mode 0 = pixels (trackpad), mode 1 = lines ×40, mode 2 = pages ×800 */
    var rawX = e.deltaX, rawY = e.deltaY;
    if (e.deltaMode === 1) { rawX *= 40; rawY *= 40; }
    if (e.deltaMode === 2) { rawX *= 800; rawY *= 800; }
    /* Sum both axes so horizontal AND vertical scroll both drive the pan */
    panTarget -= (rawX + rawY) * 0.5;
    panTarget  = Math.max(-MAX_PAN, Math.min(0, panTarget));

    /* ROOT FIX: clamp panTarget to ±1 card-step from the active card's rest pos.
       Without this, Mac trackpad inertia events (fired after finger lift) keep
       accumulating panTarget to -5000+ px, making the strip fly off-screen
       ("画面错乱清空") and causing a visible spring reversal on snap ("反弹").
       Clamp lets the user scroll at most 1 card ahead/behind at a time. */
    var cardRest = -(activeIdx * CARD_STEP);
    panTarget = Math.max(cardRest - CARD_STEP, Math.min(cardRest + CARD_STEP, panTarget));
    panTarget = Math.max(-MAX_PAN, Math.min(0, panTarget)); /* re-apply global bounds */

    setPanning(true);

    /* Direction-based snap — measured from the CURRENT card's position.
       Move ≥ 40 px left  → snap forward 1 card.
       Move ≥ 40 px right → snap backward 1 card.
       Small nudge        → stay on current card (no snap-back to origin). */
    clearTimeout(snapTimer);
    snapTimer = setTimeout(function () {
      var currentPan = -(activeIdx * CARD_STEP);
      var diff = panTarget - currentPan;   /* negative = moved left */
      var idx;
      if      (diff < -40) { idx = activeIdx + 1; }   /* forward  */
      else if (diff >  40) { idx = activeIdx - 1; }   /* backward */
      else                 { idx = activeIdx;     }   /* hold     */
      snapToCard(Math.max(0, Math.min(CARD_COUNT - 1, idx)));
    }, 160);

    kick();
  }, { passive: false });

  /* ================================================================
     Touch / trackpad swipe
     ================================================================ */
  var touchX = 0, touchY = 0, touchAxis = null, touchLast = 0;

  window.addEventListener('touchstart', function (e) {
    touchX = touchLast = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    touchAxis = null;
    setPanning(true);
    clearTimeout(snapTimer);
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    var dx = e.touches[0].clientX - touchX;
    var dy = e.touches[0].clientY - touchY;
    if (!touchAxis) touchAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (touchAxis !== 'x') return;
    e.preventDefault();
    var moveDelta = e.touches[0].clientX - touchLast;
    touchLast = e.touches[0].clientX;
    panTarget += moveDelta;
    panTarget  = Math.max(-MAX_PAN, Math.min(0, panTarget));
    panPos     = panTarget;
    applyTransforms();
    updateMinimap(-panPos / CARD_STEP);
    updateParallax();
  }, { passive: false });

  window.addEventListener('touchend', function () {
    snapTimer = setTimeout(function () {
      var currentPan = -(activeIdx * CARD_STEP);
      var diff = panTarget - currentPan;
      var idx;
      if      (diff < -40) { idx = activeIdx + 1; }
      else if (diff >  40) { idx = activeIdx - 1; }
      else                 { idx = activeIdx;     }
      snapToCard(Math.max(0, Math.min(CARD_COUNT - 1, idx)));
    }, 80);
  }, { passive: true });

  /* ================================================================
     Snap to card
     ================================================================ */
  function snapToCard(idx) {
    idx = Math.max(0, Math.min(CARD_COUNT - 1, idx));
    panTarget = -(idx * CARD_STEP);
    ticks.forEach(function (t, i) { t.classList.toggle('active', i === idx); });
    activeIdx = idx;
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
    var dt   = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;

    /* ── Pan spring ── */
    var fPan = -PAN_K * (panPos - panTarget) - PAN_D * panVel;
    panVel  += fPan * dt;
    panPos  += panVel * dt;
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

    var fScl = -SCL_K * (scaleCur - scaleTarget) - SCL_D * scaleVel;
    scaleVel += (fScl / SCL_M) * dt;
    scaleCur += scaleVel * dt;
    var sclSettled = Math.abs(scaleCur - scaleTarget) < 0.0001 &&
                     Math.abs(scaleVel) < 0.0001;
    if (sclSettled) { scaleCur = scaleTarget; scaleVel = 0; }

    /* ── Apply ── */
    applyTransforms();
    if (!panSettled) updateMinimap(-panPos / CARD_STEP);
    updateParallax();

    /* ── Loop? ── */
    var stillMoving = !panSettled || !sclSettled;
    if (stillMoving) {
      rafId = requestAnimationFrame(frame);
    } else {
      lastTime = null;
      setPanning(false); /* re-enable hover after strip has settled */
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
