import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTING_ADVENTURERS, statsFor } from '../src/data/adventurers.js';
import { STARTING_ITEMS } from '../src/data/items.js';
import { equipmentFit, equipmentProfile } from '../src/systems/equipment.js';
import { createInitialState, loadGame } from '../src/systems/save.js';
import { advanceExpedition, campRaidRisk, resolveCampRaid, startExpedition } from '../src/systems/expedition.js';
import { createExpeditionDiscovery } from '../src/systems/survey.js';
import { render } from '../src/ui/render.js';

test('重装を魔術師に着せると適性外ペナルティと重量疲労が出る', () => {
  const mage = structuredClone(STARTING_ADVENTURERS.find(person => person.job === 'mage'));
  const correct = structuredClone(mage);
  const illFit = { ...structuredClone(mage), weapon: 'weapon_iron_sword', armor: 'armor_iron' };
  assert.equal(equipmentFit('mage', STARTING_ITEMS.find(item => item.uid === 'armor_iron')), 'unfit');
  assert.equal(equipmentFit('mage', STARTING_ITEMS.find(item => item.uid === 'weapon_oak_staff')), 'fit');
  assert.ok(statsFor(illFit, STARTING_ITEMS).speed < statsFor(correct, STARTING_ITEMS).speed);
  assert.ok(statsFor(illFit, STARTING_ITEMS).attack < statsFor(correct, STARTING_ITEMS).attack);
  assert.ok(equipmentProfile(illFit, STARTING_ITEMS).fatigue > equipmentProfile(correct, STARTING_ITEMS).fatigue);
});

test('安全な方針と見張り役は野営襲撃リスクを下げる', () => {
  const state = createInitialState();
  state.guildLevel = 4;
  state.guildContribution = 480;
  const risky = { dungeonId: 'collapsed-mine', guildLevel: 4, policy: 'push', partyIds: ['leon', 'milia', 'cecil'], loot: [{ value: 500 }], floor: 2 };
  for (const person of state.adventurers) person.fatigue = 75;
  const careful = { ...risky, policy: 'safe', partyIds: ['leon', 'milia', 'elna', 'toma'], loot: [] };
  assert.ok(campRaidRisk(state, risky).chance > campRaidRisk(state, careful).chance);
  assert.equal(campRaidRisk(state, risky).chance, campRaidRisk(state, { ...risky, observationTargetId: 'none' }).chance);
});

test('野営襲撃は自動戦闘となり、脅威を調査記録へ残す', () => {
  const state = createInitialState();
  const expedition = {
    dungeonId: 'old-cave', guildLevel: 1, floor: 2, policy: 'push', partyIds: ['leon', 'milia', 'elna'],
    observationTargetId: 'expedition', loot: [{ name: '古い剣', value: 80, weight: 3 }], carriedWeight: 3,
    discovery: createExpeditionDiscovery(2), kills: 0, xpEarned: 0, bonusXp: 0, defeated: [], casualties: [],
    raidReports: [], log: [], elapsed: 0
  };
  const scene = { title: '夜営', dialogue: [], narration: [], changes: [], speakers: [] };
  resolveCampRaid(state, expedition, scene, () => 0);
  assert.equal(expedition.pendingCampRaid, true);
  assert.equal(expedition.currentBattle.type, 'raid');
  assert.equal(expedition.currentBattle.status, 'playing');
  assert.ok(expedition.discovery.externalThreats.length > 0);
  assert.ok(expedition.raidReports.length > 0);
  state.expedition = expedition;
  expedition.currentBattle.status = 'finished';
  const advanced = advanceExpedition(state);
  assert.equal(advanced.ok, true);
  assert.equal(expedition.pendingCampRaid, false);
  assert.equal(expedition.currentBattle, null);
});

test('古びた洞窟で出発から帰還まで遠征ループが進む', () => {
  const state = createInitialState();
  state.policy = 'safe';
  assert.equal(startExpedition(state, 'old-cave').ok, true);
  let steps = 0;
  while (state.expedition && steps < 120) {
    if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
    const result = advanceExpedition(state);
    assert.equal(result.ok, true);
    steps++;
  }
  assert.ok(steps < 120, '遠征が上限操作数内に帰還する');
  assert.ok(state.lastResult);
  assert.ok(state.lastResult.fatigueChanges.every(entry => Number.isFinite(entry.equipment)));
});

test('Version 0.5fixセーブを最新形式へ移行し、調査項目を補う', () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    const old = createInitialState();
    old.version = 8;
    delete old.surveyRecords['old-cave'].externalThreats;
    old.inventory.push({ uid: 'armor_scale_vest_old', name: '洞窟獣の鱗鎧', slot: 'armor', weight: 5, defense: 5 });
    values.set('ashen-crown-guild-v01', JSON.stringify(old));
    const loaded = loadGame();
    assert.equal(loaded.state.version, 12);
    assert.equal(loaded.migrated, true);
    assert.deepEqual(loaded.state.surveyRecords['old-cave'].externalThreats, []);
    assert.equal(loaded.state.inventory.find(item => item.uid === 'armor_scale_vest_old').effects.poisonResistance, .28);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('ギルド・装備・遠征画面が背景と適性情報を描画する', () => {
  const state = createInitialState();
  const view = { innerHTML: '', querySelectorAll: () => [] };
  const elements = new Map(['#page-title', '#day-count', '#date-label', '#guild-funds', '#next-upkeep', '#guild-rank'].map(id => [id, { textContent: '' }]));
  elements.set('#view', view);
  globalThis.document = {
    querySelector: selector => elements.get(selector) || null,
    querySelectorAll: selector => selector === '.nav-item' ? [] : []
  };
  try {
    state.screen = 'guild';
    render(state);
    assert.match(view.innerHTML, /guild-hall-banner/);
    assert.match(view.innerHTML, /assets\/backgrounds\/scenes\/guild-hall\.webp/);
    state.screen = 'adventurers';
    render(state);
    assert.match(view.innerHTML, /適性あり/);
    assert.match(view.innerHTML, /装備重量/);
    state.screen = 'expedition';
    assert.equal(startExpedition(state, 'old-cave').ok, true);
    render(state);
    assert.match(view.innerHTML, /scene-backdrop/);
    assert.match(view.innerHTML, /assets\/backgrounds\/scenes\/old-cave\.webp/);
    state.expedition.phase = 'camp';
    state.expedition.narrative = { type: 'camp', title: '野営', description: '休息', campScene: { title: '野営', speakers: [], narration: [], dialogue: [] } };
    render(state);
    assert.match(view.innerHTML, /camp-landscape/);
    assert.match(view.innerHTML, /assets\/backgrounds\/scenes\/camp-old-cave\.webp/);
  } finally {
    delete globalThis.document;
  }
});
