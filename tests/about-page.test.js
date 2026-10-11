'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'about.html'), 'utf8');

function workflowCard(title) {
  const cards = html.match(/<article>[\s\S]*?<\/article>/g) || [];
  return cards.find((card) => card.includes(`<h3>${title}</h3>`)) || '';
}

test('视频素材下载工具保留介绍但不展示下载入口', () => {
  const card = workflowCard('视频素材一键下载工具');

  assert.match(card, /本地下载工具/);
  assert.doesNotMatch(card, /<a\b/i);
  assert.doesNotMatch(card, /\bdownload\b/i);
  assert.doesNotMatch(card, /\.zip/i);
});
