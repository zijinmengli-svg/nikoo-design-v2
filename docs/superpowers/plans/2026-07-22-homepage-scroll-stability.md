# Homepage Scroll Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make homepage card navigation deterministic across mouse wheels, trackpads, touch, low frame rates, and page visibility changes while reducing idle animation cost.

**Architecture:** Add a small UMD-style, DOM-free `ScrollCore` module for normalized input, one-card gesture commitment, and stable spring integration. Keep DOM orchestration in `scroll.js`, but separate committed navigation state from temporary visual state. Add lifecycle-aware animation scheduling to the mascot and particle canvases.

**Tech Stack:** Vanilla JavaScript, CSS, Node.js built-in `node:test`, local no-cache Python server, in-app browser regression checks.

## Global Constraints

- Preserve the current six-card order, visual layout, parallax direction, and viewport scaling style.
- Add no runtime dependencies or build step.
- One wheel gesture may commit at most one adjacent card.
- A normalized accumulated distance of exactly `40px` must commit.
- Production scripts must continue to work as plain browser scripts.

---

### Task 1: Testable scroll core

**Files:**
- Create: `js/scroll-core.js`
- Create: `tests/scroll-core.test.js`

**Interfaces:**
- Produces: `ScrollCore.normalizeWheelDelta(deltaX, deltaY, deltaMode)`.
- Produces: `ScrollCore.createGestureController({ threshold, sensitivity, cardCount })` with `begin(index)`, `push(delta)`, `reset()`, and `getState()`.
- Produces: `ScrollCore.stepSpring(position, velocity, target, elapsed, options)`.

- [ ] **Step 1: Write failing tests** for exact-threshold commitment, sub-threshold hold, dominant-axis normalization, one-card lock, boundary clamping, and repeated `50ms` spring convergence.
- [ ] **Step 2: Run `node --test tests/scroll-core.test.js`** and confirm failure because `js/scroll-core.js` does not exist.
- [ ] **Step 3: Implement the minimal UMD module** with pure functions and fixed `1/120s` spring substeps.
- [ ] **Step 4: Re-run `node --test tests/scroll-core.test.js`** and confirm all tests pass.

### Task 2: Deterministic homepage navigation

**Files:**
- Modify: `index.html`
- Modify: `js/scroll.js`
- Modify: `css/style.css`
- Test: `tests/scroll-core.test.js`

**Interfaces:**
- Consumes: `window.ScrollCore` from Task 1.
- Preserves: `window.ScrollAPI.scrollToCard(index)` and `window.ScrollAPI.getActiveIdx()`.

- [ ] **Step 1: Add behavior tests** proving a committed gesture remains locked until reset and reverse pre-threshold input cancels rather than commits.
- [ ] **Step 2: Run the focused tests** and confirm the new assertion fails.
- [ ] **Step 3: Load `scroll-core.js` before `scroll.js`** and replace wheel accumulation with the controller.
- [ ] **Step 4: Keep `activeIdx` committed-only**, use a separate minimap renderer, and base touch snapping on `touchStartIdx`.
- [ ] **Step 5: Use `stepSpring` for pan and scale**, reset cleanly on `visibilitychange`, restore clicks when pan settles, and snap instantly for reduced motion.
- [ ] **Step 6: Build minimap ticks as native buttons** and add reset/focus-visible CSS.
- [ ] **Step 7: Run all Node tests** and confirm zero failures.

### Task 3: Idle animation lifecycle

**Files:**
- Modify: `js/mascot.js`
- Modify: `js/bg-particles.js`
- Create: `tests/animation-lifecycle.test.js`

**Interfaces:**
- Mascot animation starts only when both document and canvas are visible.
- `wave.webp` loads only after the first hover request.
- Particle loop runs at approximately 30 FPS and cancels while hidden.

- [ ] **Step 1: Add source-level regression tests** that require visibility lifecycle hooks, lazy wave loading, explicit `cancelAnimationFrame`, and a particle frame interval.
- [ ] **Step 2: Run the lifecycle tests** and confirm they fail against the current scripts.
- [ ] **Step 3: Implement mascot IntersectionObserver/visibility scheduling and lazy wave loading.**
- [ ] **Step 4: Implement particle 30 FPS throttling plus explicit stop/start on visibility.**
- [ ] **Step 5: Run both test files** and confirm zero failures.

### Task 4: Browser regression and final verification

**Files:**
- Verify: `index.html`, `js/scroll-core.js`, `js/scroll.js`, `js/mascot.js`, `js/bg-particles.js`, `css/style.css`

**Interfaces:**
- Verifies the public browser behavior and visual output rather than adding a new interface.

- [ ] **Step 1: Run `node --test tests/*.test.js`** and record the pass count.
- [ ] **Step 2: Run `node --check`** for every modified JavaScript file.
- [ ] **Step 3: Start the no-cache local server** and test exact-threshold, sub-threshold, burst scrolling, keyboard navigation, minimap focus, and card clicks.
- [ ] **Step 4: Verify initial resources omit `wave.webp`** and confirm the browser console has no errors.
- [ ] **Step 5: Capture the final centered-card screenshot** and inspect it for layout regressions.
- [ ] **Step 6: Review `git diff --check`, `git diff`, and `git status`** before reporting completion.

