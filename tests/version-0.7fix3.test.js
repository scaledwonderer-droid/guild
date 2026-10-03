import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = async path => readFile(resolve(root, path), 'utf8');

test('操作イベントはアプリのキャプチャ段階で委譲される', async () => {
  const main = await source('src/main.js');
  assert.match(main, /const app = document\.querySelector\('#app'\)/);
  assert.match(main, /closest\('\.nav-item\[data-screen\]'\)/);
  assert.match(main, /app\.addEventListener\('click',[\s\S]*?\}, true\)/);
  assert.match(main, /app\.addEventListener\('change',[\s\S]*?\}, true\)/);
  assert.match(main, /画面操作に失敗しました/);
});

test('画面内の「遠征準備へ」操作が画面属性に奪われず画面遷移する', async () => {
  const listeners = {};
  const nodes = new Map();
  const makeNode = () => ({
    textContent: '', dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {}, showModal() {}, querySelectorAll() { return []; }
  });
  const app = makeNode();
  app.addEventListener = (type, handler, capture) => { listeners[type] = { handler, capture }; };
  const view = makeNode();
  nodes.set('#app', app);
  nodes.set('#view', view);
  for (const id of ['#toast', '#save-status', '#page-title', '#day-count', '#date-label', '#guild-funds', '#next-upkeep', '#guild-rank', '#confirm-dialog', '#dialog-title', '#dialog-copy', '#dialog-confirm', '#new-game']) nodes.set(id, makeNode());
  globalThis.document = { querySelector: id => nodes.get(id) || makeNode(), querySelectorAll: () => [], getElementById: () => makeNode() };
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  globalThis.window = { confirm: () => true };
  await import(`../src/main.js?click-regression=${Date.now()}`);

  const control = {
    dataset: { action: 'nav-party' },
    closest(selector) {
      if (selector === '.nav-item[data-screen]') return null;
      if (selector === '[data-screen]') return view;
      if (selector === '[data-action]') return this;
      return null;
    }
  };
  listeners.click.handler({ target: control, preventDefault() {} });
  assert.equal(listeners.click.capture, true);
  assert.equal(view.dataset.screen, 'party');
  assert.equal(nodes.get('#page-title').textContent, '編成と遠征準備');
});

test('背景は操作面の背面に表示され、ポインター操作を遮らない', async () => {
  const css = await source('src/ui/experience.css');
  assert.match(css, /#view\s*>\s*\.view-backdrop\s*\{[^}]*z-index:\s*0/);
  assert.match(css, /#view\s*>\s*\.view-backdrop\s*\{[^}]*pointer-events:\s*none\s*!important/s);
  assert.match(css, /#view\s*>\s*:not\(\.view-backdrop\)\s*\{[^}]*z-index:\s*1/);
  assert.match(css, /backgrounds\/v06-environments\.webp/);
});

test('HTMLとCSSが参照する静的背景画像がパッケージ内に揃っている', async () => {
  const html = await source('index.html');
  assert.match(html, /href="styles\.css(?:\?[^\"]*)?"/);
  assert.match(html, /href="src\/ui\/experience\.css(?:\?[^\"]*)?"/);
  assert.match(html, /src="src\/main\.js(?:\?[^\"]*)?"/);
  for (const asset of [
    'assets/backgrounds/v06-environments.webp',
    'assets/backgrounds/v06-camps.webp',
    'assets/backgrounds/trial-labyrinth.webp',
    'assets/backgrounds/trial-camp.webp'
  ]) assert.ok(existsSync(resolve(root, asset)), `${asset} がありません`);
});

test('野営・探索・戦闘の背景画像は2Dキャラクター表示面に描画される', async () => {
  const render = await source('src/ui/render.js');
  const css = await source('src/ui/experience.css');
  assert.match(render, /class="scene \$\{isCamp[\s\S]*?style="\$\{isCamp \? campBackdropStyle\(dungeon\.id\) : dungeonBackdropStyle\(dungeon\.id\)\}"/);
  assert.match(css, /\.scene\.scene-explore-v02,[\s\S]*?\.scene\.scene-camp-v02\s*\{[^}]*background-image:[^}]*var\(--backdrop-image/);
  assert.match(css, /\.scene-backdrop\s*\{[^}]*background:linear-gradient/);
  assert.match(css, /\.scene\.scene-explore-v02 \.explore-illustration,[\s\S]*?\.scene\.scene-camp-v02 \.camp-landscape\s*\{\s*z-index:1/);
});
