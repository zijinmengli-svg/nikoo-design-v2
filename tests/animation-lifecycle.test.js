'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
}

test('mascot loads wave lazily and pauses when canvas or page is hidden', () => {
  const code = source('mascot.js');

  assert.doesNotMatch(code, /Promise\.all\(\[load\('idle'\),\s*load\('wave'\)\]\)/);
  assert.match(code, /load\('wave'\)/);
  assert.match(code, /IntersectionObserver/);
  assert.match(code, /visibilitychange/);
  assert.match(code, /cancelAnimationFrame/);
});

test('particle loop is frame-limited and explicitly stops while hidden', () => {
  const code = source('bg-particles.js');

  assert.match(code, /FRAME_INTERVAL\s*=\s*1000\s*\/\s*30/);
  assert.match(code, /function stop\(\)/);
  assert.match(code, /cancelAnimationFrame/);
  assert.match(code, /if \(document\.hidden\) stop\(\)/);
});
