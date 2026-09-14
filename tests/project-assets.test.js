'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'project.html'), 'utf8');
const projectsMatch = html.match(
  /var PROJECTS = (\{[\s\S]*?\n\s*\});\n\n\s*\/\* 全局项目顺序/
);

assert.ok(projectsMatch, 'project.html should expose the PROJECTS configuration');
const projects = vm.runInNewContext(`(${projectsMatch[1]})`);

function assertWebpAssets(assetPaths) {
  assetPaths.forEach((assetPath) => {
    const data = fs.readFileSync(path.join(root, assetPath));
    assert.equal(data.subarray(0, 4).toString('ascii'), 'RIFF', assetPath);
    assert.equal(data.subarray(8, 12).toString('ascii'), 'WEBP', assetPath);
  });
}

test('秒省助手按确认顺序展示 18 张新版设计稿', () => {
  const expected = [
    'images/miaosheng/02-01.webp',
    'images/miaosheng/02-01-1.webp',
    ...Array.from({ length: 16 }, (_, index) =>
      `images/miaosheng/02-${String(index + 2).padStart(2, '0')}.webp`
    )
  ];

  assert.deepEqual(Array.from(projects.miaosheng.images), expected);
  assertWebpAssets(expected);
});

test('宠胖胖在设计策略后展示关键设计一，共 17 张新版设计稿', () => {
  const expected = [
    'images/pet/03-01.webp',
    'images/pet/03-02.webp',
    'images/pet/03-03.webp',
    'images/pet/03-04-2.webp',
    'images/pet/03-04.webp',
    ...Array.from({ length: 12 }, (_, index) =>
      `images/pet/03-${String(index + 5).padStart(2, '0')}.webp`
    )
  ];

  assert.deepEqual(Array.from(projects.pet.images), expected);
  assertWebpAssets(expected);
});
