import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { campBackdropStyle, dungeonBackdropStyle, guildBackdropStyle } from '../src/data/backgrounds.js';

const root = new URL('../', import.meta.url);

test('管理・遠征・野営背景は個別画像を縦横比を保つcoverで表示する', async () => {
  const expected = [
    [guildBackdropStyle(), 'guild-hall.webp'],
    [dungeonBackdropStyle('old-cave'), 'old-cave.webp'],
    [dungeonBackdropStyle('trap-fort'), 'trap-fort.webp'],
    [dungeonBackdropStyle('wind-gorge'), 'wind-gorge.webp'],
    [dungeonBackdropStyle('collapsed-mine'), 'collapsed-mine.webp'],
    [dungeonBackdropStyle('trial-labyrinth'), 'trial-labyrinth.webp'],
    [campBackdropStyle('old-cave'), 'camp-old-cave.webp'],
    [campBackdropStyle('trap-fort'), 'camp-trap-fort.webp'],
    [campBackdropStyle('wind-gorge'), 'camp-wind-gorge.webp'],
    [campBackdropStyle('collapsed-mine'), 'camp-collapsed-mine.webp'],
    [campBackdropStyle('trial-labyrinth'), 'trial-camp.webp']
  ];

  for (const [style, asset] of expected) {
    assert.match(style, /--backdrop-size:cover/);
    assert.ok(style.includes(asset), `背景画像 ${asset} が参照される`);
    assert.doesNotMatch(style, /(?:300% 200%|200% 200%)/);
  }

  for (const [, asset] of expected) {
    const path = asset.startsWith('trial-')
      ? new URL(`assets/backgrounds/${asset}`, root)
      : new URL(`assets/backgrounds/scenes/${asset}`, root);
    await access(fileURLToPath(path));
  }
});

test('背景CSSは画像のcover指定を受け取り、ページ外側の背景は従来どおり', async () => {
  const css = await readFile(new URL('src/ui/experience.css', root), 'utf8');
  assert.match(css, /\.guild-hall-banner[\s\S]*?background-size:cover,var\(--backdrop-size\)/);
  assert.match(css, /\.view\[data-screen="party"\][\s\S]*?background-size:cover,var\(--backdrop-size\)/);
  assert.match(css, /\.scene\.scene-explore-v02,[\s\S]*?background-size:cover,var\(--backdrop-size,cover\)/);
  assert.match(css, /body\s*\{\s*background:\s*var\(--bg\);\s*\}/);
});
