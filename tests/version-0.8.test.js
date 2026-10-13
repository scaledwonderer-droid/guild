import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS } from '../src/data/dungeon.js';
import { createInitialState, loadGame, saveGame } from '../src/systems/save.js';
import { syncGuildProgress } from '../src/systems/guild.js';
import { guildMaturityTier, lateDungeonClears, recordLateDungeonClear, rosterCapacity } from '../src/systems/maturity.js';
import { advanceDay, upkeepCost } from '../src/systems/time.js';
import { generateRecruitmentCandidates } from '../src/systems/recruitment.js';
import { simulateBattle } from '../src/systems/combat.js';
import { statsFor } from '../src/data/adventurers.js';
import { render } from '../src/ui/render.js';

const lateIds = ['aldina-road', 'fergran-ruins', 'north-expanse'];

test('後半用3地域は試練の守護者を倒すまで遠征先に出ない', () => {
  const state = createInitialState();
  state.guildLevel = 5;
  syncGuildProgress(state);
  assert.equal(state.unlockedDungeons.includes('trial-labyrinth'), true);
  assert.deepEqual(lateIds.filter(id => state.unlockedDungeons.includes(id)), []);
  for (const id of lateIds) {
    assert.ok(DUNGEONS[id].lateGame);
    assert.ok(DUNGEONS[id].floors >= 8);
  }
  state.trialBossDefeated = true;
  syncGuildProgress(state);
  assert.deepEqual(lateIds.filter(id => state.unlockedDungeons.includes(id)), lateIds);
  assert.ok(lateIds.every(id => state.surveyRecords[id].runs === 0));
});

test('後半地域の踏破がギルド成熟・受入枠・維持費へ反映され、重複記録しない', () => {
  const state = createInitialState();
  state.trialBossDefeated = true;
  const baseCapacity = rosterCapacity(state);
  const baseUpkeep = upkeepCost(state);
  assert.equal(guildMaturityTier(state), 1);
  assert.equal(recordLateDungeonClear(state, lateIds[0]).tier, 2);
  const matureCapacity = rosterCapacity(state);
  const matureUpkeep = upkeepCost(state);
  assert.ok(matureCapacity > baseCapacity);
  assert.ok(matureUpkeep > baseUpkeep);
  assert.equal(recordLateDungeonClear(state, lateIds[0]).changed, false);
  recordLateDungeonClear(state, lateIds[1]);
  recordLateDungeonClear(state, lateIds[2]);
  assert.equal(guildMaturityTier(state), 3);
  assert.deepEqual(lateDungeonClears(state), lateIds);
});

test('成熟後の訓練班ではベテランが新人を手伝い、少量の追加経験値を与える', () => {
  const state = createInitialState();
  state.trialBossDefeated = true;
  state.lateDungeonClears = [lateIds[0]];
  const trainee = { ...state.adventurers[0], id: 'rookie', name: '新人', level: 1, exp: 0, injury: null, fatigue: 0 };
  const mentor = { ...state.adventurers[1], id: 'mentor', name: '先輩', level: 12, exp: 0, injury: null, fatigue: 0 };
  state.adventurers = [trainee, mentor];
  const result = advanceDay(state, {
    activityPlan: [{ id: 'training', type: 'training', label: '訓練班', memberIds: ['rookie', 'mentor'], names: ['新人', '先輩'] }]
  });
  assert.equal(trainee.exp, 16);
  assert.match(trainee.activityHistory[0].summary, /先輩/);
  assert.equal(result.day, 2);
});

test('接近反撃型の敵は前衛の近接攻撃へ反撃し、弓の攻撃には反撃しない', () => {
  const state = createInitialState();
  const warrior = state.adventurers.find(person => person.job === 'warrior');
  warrior.level = 20;
  warrior.hp = statsFor(warrior, state.inventory).maxHp;
  const meleeRun = { dungeonId: 'fergran-ruins', partyIds: [warrior.id], alerted: false, rangedPressure: false, casualties: [], kills: 0, xpEarned: 0, defeated: [] };
  const melee = simulateBattle(state, meleeRun, ['ruin-guard'], 1, () => .4);
  assert.ok(melee.actions.some(action => action.label === '接近への反撃'));

  const archer = { ...warrior, id: 'test-archer', name: '弓師', job: 'archer', weapon: null, armor: null, level: 20, hp: 240, conditions: [] };
  state.adventurers.push(archer);
  const rangedRun = { dungeonId: 'fergran-ruins', partyIds: [archer.id], alerted: false, rangedPressure: false, casualties: [], kills: 0, xpEarned: 0, defeated: [] };
  const ranged = simulateBattle(state, rangedRun, ['ruin-guard'], 1, () => .4);
  assert.equal(ranged.actions.some(action => action.label === '接近への反撃'), false);
});

test('成熟ギルドの募集では経験者が候補に混ざり、候補の外見は個別に保存される', () => {
  const state = createInitialState();
  state.trialBossDefeated = true;
  state.lateDungeonClears = [...lateIds];
  state.unlockedJobs = ['warrior', 'mage', 'priest', 'thief', 'archer', 'carrier'];
  const candidates = generateRecruitmentCandidates(state, () => 0);
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every(candidate => candidate.level > 1));
  assert.equal(new Set(candidates.map(candidate => candidate.id)).size, 3);
  assert.equal(new Set(candidates.map(candidate => candidate.portraitAppearance.portraitId)).size, 3);
  assert.ok(candidates.every(candidate => candidate.spriteAppearance && candidate.portraitAppearance));
});

test('後半地域の踏破・状態異常がVersion 13セーブに保存され、再ロードされる', () => {
  const previousStorage = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  try {
    const state = createInitialState();
    state.lateDungeonClears = [lateIds[0]];
    state.adventurers[0].conditions = ['裂傷'];
    assert.equal(saveGame(state), true);
    const loaded = loadGame();
    assert.equal(loaded.state.version, 13);
    assert.deepEqual(loaded.state.lateDungeonClears, [lateIds[0]]);
    assert.deepEqual(loaded.state.adventurers[0].conditions, ['裂傷']);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test('編成画面では許可前の後半地域名を隠し、許可後も未調査情報を「不明」にする', () => {
  const previousDocument = globalThis.document;
  const nodes = new Map();
  const makeNode = () => ({ textContent: '', dataset: {}, classList: { toggle() {} }, setAttribute() {}, querySelectorAll() { return []; } });
  nodes.set('#view', makeNode());
  globalThis.document = { querySelector: selector => nodes.get(selector) || makeNode(), querySelectorAll: () => [] };
  try {
    const state = createInitialState();
    state.screen = 'party';
    state.guildLevel = 5;
    syncGuildProgress(state);
    render(state);
    assert.equal(lateIds.some(id => nodes.get('#view').innerHTML.includes(DUNGEONS[id].name)), false);
    state.trialBossDefeated = true;
    syncGuildProgress(state);
    render(state);
    assert.ok(lateIds.every(id => nodes.get('#view').innerHTML.includes(DUNGEONS[id].name)));
    assert.match(nodes.get('#view').innerHTML, /出現する敵|確認済みの敵/);
    assert.match(nodes.get('#view').innerHTML, />不明</);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
