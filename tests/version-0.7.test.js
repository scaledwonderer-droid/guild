import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS } from '../src/data/dungeon.js';
import { RARE_BOSSES, TRIAL_DUNGEON, TRIAL_KEY_ITEMS } from '../src/data/v07.js';
import { STARTING_ADVENTURERS, statsFor } from '../src/data/adventurers.js';
import { createInitialState, loadGame, saveGame } from '../src/systems/save.js';
import { advanceExpedition, rareBossChanceFor, startExpedition } from '../src/systems/expedition.js';
import { syncGuildProgress } from '../src/systems/guild.js';
import { advanceDay } from '../src/systems/time.js';
import { itemStackKey, sellWarehouseItems, donateWarehouseItems } from '../src/systems/warehouse.js';
import { unlockTrialSeal } from '../src/systems/trial.js';
import { render } from '../src/ui/render.js';

function makeStrongParty(state, partySize = 5) {
  state.guildLevel = 5;
  state.guildContribution = 500;
  syncGuildProgress(state);
  state.party = state.adventurers.slice(0, partySize).map(person => person.id);
  state.leaderId = state.party[0];
  state.policy = 'push';
  state.observationChoice = 'expedition';
  for (const person of state.adventurers) {
    person.level = 20;
    person.exp = 0;
    person.statMods = { hp: 1000, attack: 220, defense: 80, speed: 50 };
    person.injury = null;
    person.fatigue = 0;
    person.hp = statsFor(person, state.inventory).maxHp;
  }
}

function runToReturn(state, maxSteps = 700) {
  let steps = 0;
  const camps = new Set();
  while (state.expedition && steps < maxSteps) {
    if (state.expedition.phase === 'camp') camps.add(state.expedition.floor);
    if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
    const response = advanceExpedition(state);
    assert.equal(response.ok, true, response.message);
    steps++;
  }
  assert.ok(steps < maxSteps, '遠征が上限操作数内に帰還する');
  return camps;
}

test('試練の迷宮はギルドLv5で解禁され、15区画と4つの野営地点を持つ', () => {
  const state = createInitialState();
  state.guildLevel = 4;
  syncGuildProgress(state);
  assert.equal(state.unlockedDungeons.includes('trial-labyrinth'), false);
  state.guildLevel = 5;
  syncGuildProgress(state);
  assert.equal(state.unlockedDungeons.includes('trial-labyrinth'), true);
  assert.equal(TRIAL_DUNGEON.floors, 15);
  assert.deepEqual(TRIAL_DUNGEON.campFloors, [3, 6, 9, 12]);
  assert.ok(Object.keys(TRIAL_DUNGEON.routeChoices).length >= 6);
  assert.equal(Object.keys(DUNGEONS).length, 5);
});

test('既存4遠征先に別々のレアボスと保護された専用刻印片を設定', () => {
  assert.deepEqual(Object.keys(RARE_BOSSES).sort(), ['collapsed-mine', 'old-cave', 'trap-fort', 'wind-gorge'].sort());
  assert.equal(new Set(Object.values(RARE_BOSSES).map(boss => boss.keyId)).size, 4);
  assert.equal(TRIAL_KEY_ITEMS.length, 4);
  assert.ok(TRIAL_KEY_ITEMS.every(item => item.protected && item.slot === 'key' && item.value === 0 && item.guildValue === 0));
});

test('特殊個体は試練の迷宮解禁後にのみ低確率で出現する', () => {
  const state = createInitialState();
  assert.equal(rareBossChanceFor(state, 'old-cave'), 0);
  state.guildLevel = 5;
  state.guildContribution = 500;
  syncGuildProgress(state);
  assert.equal(rareBossChanceFor(state, 'old-cave'), .03);
  state.surveyRecords['old-cave'].runs = 24;
  assert.equal(rareBossChanceFor(state, 'old-cave'), .07);
  assert.equal(rareBossChanceFor(state, 'trial-labyrinth'), 0);
});

test('刻印片は売却・納品・維持費の強制売却対象にならず、揃うと封印が恒久解放', () => {
  const state = createInitialState();
  const key = { ...TRIAL_KEY_ITEMS[0], uid: 'test-key-one' };
  state.inventory.push(key);
  const stack = itemStackKey(key);
  assert.equal(sellWarehouseItems(state, stack, 1).ok, false);
  assert.equal(donateWarehouseItems(state, stack, 1).ok, false);
  state.day = 9;
  state.gold = 0;
  advanceDay(state, { activityPlan: [] });
  assert.ok(state.inventory.some(item => item.keyId === key.keyId));

  state.trialSealDiscovered = true;
  state.inventory.push(...TRIAL_KEY_ITEMS.slice(1).map((item, index) => ({ ...item, uid: `test-key-${index + 2}` })));
  const opened = unlockTrialSeal(state);
  assert.equal(opened.ok, true);
  assert.equal(state.trialBossRoomUnlocked, true);
  assert.equal(state.inventory.some(item => item.slot === 'key'), false);
  assert.equal(unlockTrialSeal(state).ok, false);
  assert.equal(state.trialKeyHistory.at(-1).event, 'seal-unlocked');
});

test('レアボス討伐時は対応する固有キーが即時に倉庫へ入り、個別調査記録にも残る', () => {
  const state = createInitialState();
  state.guildLevel = 5;
  state.guildContribution = 500;
  syncGuildProgress(state);
  state.policy = 'push';
  for (const person of state.adventurers.slice(0, 3)) {
    person.level = 20;
    person.statMods = { hp: 800, attack: 180, defense: 60, speed: 40 };
    person.hp = statsFor(person, state.inventory).maxHp;
  }
  assert.equal(startExpedition(state, 'old-cave').ok, true);
  state.expedition.rareBossPlan = { floor: 2, id: RARE_BOSSES['old-cave'].id };
  let steps = 0;
  while (state.expedition && state.expedition.floor < 2 && steps++ < 50) {
    if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
    advanceExpedition(state);
  }
  assert.equal(state.expedition.floor, 2);
  assert.ok(state.expedition.floorEvents.some(event => event.kind === 'rare-boss'));
  while (state.expedition && !state.inventory.some(item => item.keyId === RARE_BOSSES['old-cave'].keyId) && steps++ < 50) {
    if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
    advanceExpedition(state);
  }
  assert.ok(state.inventory.some(item => item.keyId === RARE_BOSSES['old-cave'].keyId));
  assert.ok(state.expedition.discovery.specialBosses.includes(RARE_BOSSES['old-cave'].name));
});

test('封印確認で一度帰還し、解放後のボス討伐で隊員ごとに称号・固有技能を保存', () => {
  const state = createInitialState();
  makeStrongParty(state);
  assert.equal(startExpedition(state, 'trial-labyrinth').ok, true);
  const camps = runToReturn(state);
  assert.equal(state.lastResult.outcome, 'sealed');
  assert.equal(state.trialSealDiscovered, true);
  assert.equal(state.trialBossRoomUnlocked, false);
  assert.ok(state.lastResult.discoveries.routes.length > 0);
  assert.deepEqual([...camps].sort((a, b) => a - b), [3, 6, 9, 12]);

  state.inventory.push(...TRIAL_KEY_ITEMS.map((item, index) => ({ ...item, uid: `journey-key-${index}` })));
  assert.equal(unlockTrialSeal(state).ok, true);
  assert.equal(state.trialBossRoomUnlocked, true);
  assert.equal(startExpedition(state, 'trial-labyrinth').ok, true);
  runToReturn(state);
  assert.equal(state.lastResult.outcome, 'cleared');
  assert.equal(state.trialBossDefeated, true);
  assert.equal(state.lastResult.bossAwards.length, 5);
  assert.equal(new Set(state.lastResult.bossAwards.map(award => award.epithet)).size, 5);
  for (const id of state.party) {
    const person = state.adventurers.find(entry => entry.id === id);
    assert.ok(person.epithets.length);
    assert.ok(person.epithets[0].skillId);
    assert.ok(person.epithets[0].skillName);
  }
  assert.equal(state.trialBossRecords.length, 1);
  assert.equal(state.trialBossRecords[0].honors.length, 5);

  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    assert.equal(saveGame(state), true);
    const loaded = loadGame();
    assert.equal(loaded.state.version, 12);
    assert.equal(loaded.state.trialBossRoomUnlocked, true);
    assert.equal(loaded.state.trialBossDefeated, true);
    assert.equal(loaded.state.trialBossRecords[0].honors.length, 5);
    assert.equal(loaded.state.adventurers.find(person => person.id === state.party[0]).epithets[0].skillId, state.adventurers.find(person => person.id === state.party[0]).epithets[0].skillId);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('迷宮の守護者はLv15の挑戦とLv20の準備済み討伐を区別する', () => {
  const originalRandom = Math.random;
  const originalNow = Date.now;
  Math.random = () => 0.1;
  Date.now = () => 123456790;
  try {
    const runAtLevel = level => {
      const state = createInitialState();
      state.guildLevel = 5;
      state.guildContribution = 500;
      syncGuildProgress(state);
      state.party = state.adventurers.slice(0, 5).map(person => person.id);
      state.leaderId = state.party[0];
      state.policy = 'push';
      state.trialBossRoomUnlocked = true;
      for (const person of state.adventurers) {
        person.level = level;
        person.fatigue = 0;
        person.injury = null;
        person.statMods = {};
        person.hp = statsFor(person, state.inventory).maxHp;
      }
      assert.equal(startExpedition(state, 'trial-labyrinth').ok, true);
      runToReturn(state);
      return state.lastResult;
    };
    const level15 = runAtLevel(15);
    const level20 = runAtLevel(20);
    assert.notEqual(level15.outcome, 'cleared', 'Lv15は挑戦可能でも守護者討伐は安定しない');
    assert.equal(level20.outcome, 'cleared', 'Lv20の5人編成なら適切な準備で討伐可能');
    assert.equal(level20.bossAwards.length, 5);
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});

test('調査前は封印情報を伏せ、討伐後は二つ名記録を画面に表示する', () => {
  const state = createInitialState();
  state.guildLevel = 5;
  state.guildContribution = 500;
  syncGuildProgress(state);
  state.selectedDungeonId = 'trial-labyrinth';
  state.screen = 'party';
  const view = { innerHTML: '', querySelectorAll: () => [] };
  const elements = new Map(['#page-title', '#day-count', '#date-label', '#guild-funds', '#next-upkeep', '#guild-rank']
    .map(id => [id, { textContent: '' }]));
  elements.set('#view', view);
  globalThis.document = {
    querySelector: selector => elements.get(selector) || null,
    querySelectorAll: selector => selector === '.nav-item' ? [] : []
  };
  try {
    render(state);
    assert.match(view.innerHTML, /試練の迷宮/);
    assert.doesNotMatch(view.innerHTML, /最深部の封印記録|灰色の環片/);
    state.surveyRecords['trial-labyrinth'].runs = 1;
    state.trialSealDiscovered = true;
    state.inventory.push({ ...TRIAL_KEY_ITEMS[0], uid: 'ui-key' });
    render(state);
    assert.match(view.innerHTML, /最深部の封印記録/);
    assert.match(view.innerHTML, /灰色の環片/);
    assert.match(view.innerHTML, /取得済み 1 \/ 4 種/);
    state.screen = 'guild';
    state.trialBossRecords = [{ day: 24, boss: '迷宮の守護者', partyNames: ['レオン'], honors: [{ adventurer: 'レオン', epithet: '不屈の盾', skill: '最後の防壁' }] }];
    render(state);
    assert.match(view.innerHTML, /迷宮討伐のギルド記録/);
    assert.match(view.innerHTML, /「不屈の盾」 レオン/);
  } finally {
    delete globalThis.document;
  }
});
