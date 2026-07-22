'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ScrollCore = require('../js/scroll-core.js');

test('normalizes wheel modes and uses the dominant axis', () => {
  assert.equal(ScrollCore.normalizeWheelDelta(12, 80, 0), 80);
  assert.equal(ScrollCore.normalizeWheelDelta(-90, 30, 0), -90);
  assert.equal(ScrollCore.normalizeWheelDelta(0, 2, 1), 80);
  assert.equal(ScrollCore.normalizeWheelDelta(0, -1, 2), -800);
});

test('commits when normalized movement is exactly the threshold', () => {
  const gesture = ScrollCore.createGestureController({
    threshold: 40,
    sensitivity: 0.5,
    cardCount: 6
  });

  gesture.begin(0);
  assert.deepEqual(gesture.push(80), {
    phase: 'commit',
    index: 1,
    offset: 40
  });
});

test('keeps sub-threshold movement as preview and reversal cancels it', () => {
  const gesture = ScrollCore.createGestureController({
    threshold: 40,
    sensitivity: 0.5,
    cardCount: 6
  });

  gesture.begin(2);
  assert.deepEqual(gesture.push(79), {
    phase: 'preview',
    index: 2,
    offset: 39.5
  });
  assert.deepEqual(gesture.push(-79), {
    phase: 'preview',
    index: 2,
    offset: 0
  });
});

test('locks a committed gesture to one adjacent card until reset', () => {
  const gesture = ScrollCore.createGestureController({
    threshold: 40,
    sensitivity: 0.5,
    cardCount: 6
  });

  gesture.begin(1);
  assert.equal(gesture.push(200).index, 2);
  assert.deepEqual(gesture.push(1200), {
    phase: 'locked',
    index: 2,
    offset: 40
  });

  gesture.reset();
  gesture.begin(2);
  assert.deepEqual(gesture.push(-80), {
    phase: 'commit',
    index: 1,
    offset: -40
  });
});

test('clamps gesture commits at the first and last card', () => {
  const gesture = ScrollCore.createGestureController({
    threshold: 40,
    sensitivity: 0.5,
    cardCount: 6
  });

  gesture.begin(5);
  assert.equal(gesture.push(80).index, 5);
  gesture.reset();
  gesture.begin(0);
  assert.equal(gesture.push(-80).index, 0);
});

test('fixed-substep spring stays finite and converges across repeated 50ms frames', () => {
  let position = 100;
  let velocity = 0;
  let maxPosition = Math.abs(position);

  for (let i = 0; i < 120; i += 1) {
    const next = ScrollCore.stepSpring(position, velocity, 0, 0.05, {
      stiffness: 500,
      damping: 50,
      mass: 1,
      maxStep: 1 / 120,
      maxElapsed: 0.1
    });
    position = next.position;
    velocity = next.velocity;
    maxPosition = Math.max(maxPosition, Math.abs(position));
  }

  assert.equal(Number.isFinite(position), true);
  assert.equal(Number.isFinite(velocity), true);
  assert.ok(maxPosition <= 100);
  assert.ok(Math.abs(position) < 0.01);
  assert.ok(Math.abs(velocity) < 0.1);
});
