'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getImageDimensions,
  getLoadingHints,
  resetToTop
} = require('../js/project-media.js');

test('first project image is eager and high-priority while later images remain lazy', () => {
  assert.deepEqual(getLoadingHints(0), {
    loading: 'eager',
    fetchPriority: 'high'
  });
  assert.deepEqual(getLoadingHints(1), {
    loading: 'lazy',
    fetchPriority: 'low'
  });
  assert.deepEqual(getLoadingHints(17), {
    loading: 'lazy',
    fetchPriority: 'low'
  });
});

test('known project artwork reserves its real aspect ratio before network load', () => {
  assert.deepEqual(
    getImageDimensions({ src: 'data:image/webp;base64,abc', width: 1000, height: 1333 }),
    { width: 1000, height: 1333 }
  );
  assert.deepEqual(
    getImageDimensions({ src: 'images/miaosheng/02-01-1.webp' }),
    { width: 2880, height: 1620 }
  );
  assert.deepEqual(
    getImageDimensions({ src: 'images/miaosheng/02-01.webp?cache=1' }),
    { width: 2880, height: 2100 }
  );
  assert.deepEqual(
    getImageDimensions({ src: 'images/pet/03-16.webp' }),
    { width: 2880, height: 2100 }
  );
  assert.deepEqual(
    getImageDimensions({ src: 'images/crm/01.webp' }),
    { width: 3840, height: 2160 }
  );
});

test('project entry disables browser restoration and resets scroll to the top', () => {
  const scrollCalls = [];
  const fakeWindow = {
    history: { scrollRestoration: 'auto' },
    scrollTo(x, y) {
      scrollCalls.push([x, y]);
    }
  };

  resetToTop(fakeWindow);

  assert.equal(fakeWindow.history.scrollRestoration, 'manual');
  assert.deepEqual(scrollCalls, [[0, 0]]);
});
