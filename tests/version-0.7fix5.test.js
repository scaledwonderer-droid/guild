import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { campBackdropStyle, dungeonBackdropStyle, guildBackdropStyle } from '../src/data/backgrounds.js';

const root = resolve(new URL('..', import.meta.url).pathname);

test('背景URLはHTMLのstyle属性内で壊れない引用符を使う', () => {
  for (const style of [
    campBackdropStyle('old-cave'),
    campBackdropStyle('trial-labyrinth'),
    dungeonBackdropStyle('old-cave'),
    dungeonBackdropStyle('trial-labyrinth'),
    guildBackdropStyle()
  ]) {
    assert.doesNotMatch(style, /"/);
    assert.match(style, /--backdrop-image:url\('[^']+'\)/);
    const html = `<div style="${style}"></div>`;
    assert.match(html, /style="--backdrop-image:url\('[^']+'\)/);
  }
});

test('Pages用HTMLは修正版のCSSとモジュールを読み込む', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /experience\.css\?v=0\.7fix5/);
  assert.match(html, /src\/main\.js\?v=0\.7fix5/);
});
