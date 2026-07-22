/* Pure scroll interaction helpers shared by the homepage and Node tests. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScrollCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeWheelDelta(deltaX, deltaY, deltaMode) {
    var x = Number.isFinite(deltaX) ? deltaX : 0;
    var y = Number.isFinite(deltaY) ? deltaY : 0;
    var multiplier = deltaMode === 1 ? 40 : (deltaMode === 2 ? 800 : 1);
    x *= multiplier;
    y *= multiplier;
    return Math.abs(x) > Math.abs(y) ? x : y;
  }

  function createGestureController(options) {
    options = options || {};
    var threshold = Math.max(1, options.threshold || 40);
    var sensitivity = Number.isFinite(options.sensitivity) ? options.sensitivity : 1;
    var cardCount = Math.max(1, options.cardCount || 1);
    var active = false;
    var originIndex = 0;
    var accumulated = 0;
    var committedIndex = null;
    var lockedOffset = 0;

    function begin(index) {
      active = true;
      originIndex = clamp(Math.round(index || 0), 0, cardCount - 1);
      accumulated = 0;
      committedIndex = null;
      lockedOffset = 0;
      return getState();
    }

    function push(delta) {
      if (!active) begin(originIndex);
      if (committedIndex !== null) {
        return { phase: 'locked', index: committedIndex, offset: lockedOffset };
      }

      accumulated += (Number.isFinite(delta) ? delta : 0) * sensitivity;
      if (Math.abs(accumulated) >= threshold) {
        var direction = accumulated > 0 ? 1 : -1;
        committedIndex = clamp(originIndex + direction, 0, cardCount - 1);
        lockedOffset = direction * threshold;
        return { phase: 'commit', index: committedIndex, offset: lockedOffset };
      }

      return { phase: 'preview', index: originIndex, offset: accumulated };
    }

    function reset() {
      active = false;
      accumulated = 0;
      committedIndex = null;
      lockedOffset = 0;
    }

    function getState() {
      return {
        active: active,
        originIndex: originIndex,
        accumulated: accumulated,
        committedIndex: committedIndex,
        locked: committedIndex !== null
      };
    }

    return {
      begin: begin,
      push: push,
      reset: reset,
      getState: getState
    };
  }

  function stepSpring(position, velocity, target, elapsed, options) {
    options = options || {};
    var stiffness = Number.isFinite(options.stiffness) ? options.stiffness : 500;
    var damping = Number.isFinite(options.damping) ? options.damping : 50;
    var mass = Number.isFinite(options.mass) && options.mass > 0 ? options.mass : 1;
    var maxStep = Number.isFinite(options.maxStep) && options.maxStep > 0
      ? options.maxStep
      : 1 / 120;
    var maxElapsed = Number.isFinite(options.maxElapsed) && options.maxElapsed > 0
      ? options.maxElapsed
      : 0.1;
    var total = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, maxElapsed);
    var steps = Math.max(1, Math.ceil(total / maxStep));
    var dt = total / steps;
    var nextPosition = position;
    var nextVelocity = velocity;

    for (var i = 0; i < steps; i += 1) {
      var force = -stiffness * (nextPosition - target) - damping * nextVelocity;
      nextVelocity += (force / mass) * dt;
      nextPosition += nextVelocity * dt;
    }

    return { position: nextPosition, velocity: nextVelocity };
  }

  return {
    clamp: clamp,
    normalizeWheelDelta: normalizeWheelDelta,
    createGestureController: createGestureController,
    stepSpring: stepSpring
  };
});
