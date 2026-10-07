import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, loadGame } from '../src/systems/save.js';
import { statsFor } from '../src/data/adventurers.js';
import { createSpriteAppearance } from '../src/data/sprite-appearance.js';
import { ensureUniquePortraitAppearances } from '../src/data/portrait-appearance.js';
import { findRecruitPortrait } from '../src/data/recruit-portraits.js';
import { generateRecruitmentCandidates } from '../src/systems/recruitment.js';
import { campRaidRisk, resolveCarrierCampSupport } from '../src/systems/expedition.js';
import { createExpeditionDiscovery } from '../src/systems/survey.js';
import { renderPortrait } from '../src/ui/portraits.js';
import { render } from '../src/ui/render.js';
import { campBackdropStyle, dungeonBackdropStyle } from '../src/data/backgrounds.js';

function mockDocument(view) {
  const elements = new Map(['#page-title', '#day-count', '#date-label', '#guild-funds', '#next-upkeep', '#guild-rank']
    .map(id => [id, { textContent: '' }]));
  elements.set('#view', view);
  globalThis.document = {
    querySelector: selector => elements.get(selector) || null,
    querySelectorAll: selector => selector === '.nav-item' ? [] : []
  };
}

test('募集候補には別々の肖像が割り当てられ、スプライト色が一致する', () => {
  const state = createInitialState();
  const candidates = generateRecruitmentCandidates(state, () => .05);
  assert.equal(candidates.length, 3);
  assert.equal(new Set(candidates.map(person => person.portraitAppearance.portraitId)).size, 3);
  for (const person of candidates) {
    const portrait = findRecruitPortrait(person.portraitAppearance.portraitId);
    assert.ok(portrait);
    assert.equal(person.spriteAppearance.hairColor, portrait.appearance.hairColor);
    assert.equal(person.spriteAppearance.outfitPrimary, portrait.appearance.outfitPrimary);
    assert.match(renderPortrait(person), /portrait-recruit-image/);
  }
});

test('既存セーブの重複肖像は固有画像に差し替え、画像枯渇後は個別生成へ移行する', () => {
  const people = Array.from({ length: 6 }, (_, index) => ({
    id: `legacy-thief-${index}`, name: `斥候${index}`, job: 'thief', level: 1, hp: 20, fatigue: 0,
    spriteAppearance: createSpriteAppearance(`legacy-thief-${index}`, 'thief'),
    portraitAppearance: { version: 2, portraitId: 'thief-1' }
  }));
  ensureUniquePortraitAppearances(people);
  const ids = people.map(person => person.portraitAppearance.portraitId);
  assert.equal(new Set(ids).size, people.length);
  assert.ok(ids.slice(0, 4).every(id => findRecruitPortrait(id)));
  assert.ok(ids.slice(4).every(id => id.startsWith('generated:')));
  const lookKeys = people.map(person => {
    const look = person.portraitAppearance;
    return ['hairColor', 'hairStyle', 'skinTone', 'outfitPrimary', 'outfitSecondary', 'accessory', 'bodyType', 'eyeColor', 'faceShape', 'ageBand', 'expression'].map(key => look[key]).join('|');
  });
  assert.equal(new Set(lookKeys).size, people.length);
  assert.notEqual(renderPortrait(people[4]), renderPortrait(people[5]));
  assert.match(renderPortrait(people[4]), /portrait-procedural/);
});

test('Version 0.7セーブの読み込みで重複肖像を補い、fix形式へ更新する', () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    const old = createInitialState();
    old.version = 10;
    const candidates = generateRecruitmentCandidates(old, () => .21);
    candidates[1].portraitAppearance = structuredClone(candidates[0].portraitAppearance);
    values.set('ashen-crown-guild-v01', JSON.stringify(old));
    const loaded = loadGame();
    assert.equal(loaded.state.version, 12);
    const portraitIds = loaded.state.recruitmentCandidates.map(person => person.portraitAppearance.portraitId);
    assert.equal(new Set(portraitIds).size, portraitIds.length);
    assert.ok(loaded.migrated);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

function campFixture(policy = 'push') {
  const state = createInitialState();
  const member = state.adventurers.find(person => person.id === 'leon');
  const carrier = {
    id: 'test-carrier', name: 'リオ', job: 'carrier', level: 1, exp: 0, personality: '世話好き',
    statMods: {}, spriteAppearance: createSpriteAppearance('test-carrier', 'carrier'),
    weapon: '', armor: '', hp: 1, fatigue: 58, injury: null
  };
  state.adventurers.push(carrier);
  const memberMax = statsFor(member, state.inventory).maxHp;
  const carrierMax = statsFor(carrier, state.inventory).maxHp;
  member.hp = Math.round(memberMax * .55);
  member.fatigue = 58;
  carrier.hp = Math.round(carrierMax * .55);
  const expedition = {
    partyIds: [member.id, carrier.id], policy, dungeonId: 'old-cave', guildLevel: 1,
    loot: [], floor: 2, observationTargetId: 'expedition', campSupportRiskBonus: 0
  };
  const scene = { title: '野営', dialogue: [], narration: [], changes: [], speakers: [] };
  return { state, member, carrier, expedition, scene };
}

test('運び屋は野営で自律的に料理し、HP・疲労回復と小さな夜襲リスクを生む', () => {
  const { state, member, carrier, expedition, scene } = campFixture('push');
  const oldHp = member.hp;
  const oldFatigue = member.fatigue;
  const support = resolveCarrierCampSupport(state, expedition, scene, () => .5);
  assert.equal(support.type, 'cook');
  assert.ok(member.hp > oldHp);
  assert.ok(member.fatigue < oldFatigue);
  assert.equal(scene.campActivity.carrierId, carrier.id);
  assert.ok(scene.dialogue.some(line => line.speakerId === carrier.id));
  const base = campRaidRisk(state, { ...expedition, campSupportRiskBonus: 0 }).chance;
  const withSupport = campRaidRisk(state, expedition).chance;
  assert.ok(withSupport > base);
  assert.ok(withSupport - base <= .013);
});

test('HPが十分な野営では運び屋が演奏して疲労だけを和らげる', () => {
  const { state, member, carrier, expedition, scene } = campFixture('push');
  const memberMax = statsFor(member, state.inventory).maxHp;
  const carrierMax = statsFor(carrier, state.inventory).maxHp;
  member.hp = memberMax;
  carrier.hp = carrierMax;
  const oldHp = member.hp;
  const oldFatigue = member.fatigue;
  const support = resolveCarrierCampSupport(state, expedition, scene, () => .5);
  assert.equal(support.type, 'play');
  assert.equal(member.hp, oldHp);
  assert.ok(member.fatigue < oldFatigue);
  assert.ok(scene.narration.some(line => line.includes('奏でた')));
});

test('5人同士の戦闘表示は左右の全HPを含み、ログと調査欄は折りたためる', () => {
  const state = createInitialState();
  const party = state.adventurers.slice(0, 5);
  const allies = party.map(person => ({
    id: person.id, hp: person.hp, maxHp: statsFor(person, state.inventory).maxHp, alive: true
  }));
  const enemies = Array.from({ length: 5 }, (_, index) => ({
    id: `foe-${index}`, name: `洞窟魔物${index + 1}`, kind: 'goblin', hp: 12 + index, maxHp: 24, alive: true
  }));
  state.screen = 'expedition';
  state.expedition = {
    id: 'test-expedition', dungeonId: 'old-cave', phase: 'explore', floor: 1, floorEvents: [], eventIndex: 0,
    guildLevel: 1, partyIds: party.map(person => person.id), leaderId: party[0].id, policy: 'balanced',
    log: [], narrative: { type: 'encounter', title: '戦闘中', description: '魔物と対峙した。' },
    kills: 0, carriedWeight: 0, carryLimit: 40, elapsed: 1, discovery: createExpeditionDiscovery(1),
    currentBattle: { type: 'encounter', status: 'playing', playbackIndex: -1, actions: [], initialSnapshot: { allies, enemies } }
  };
  const view = { innerHTML: '', dataset: {}, querySelectorAll: () => [] };
  mockDocument(view);
  try {
    render(state);
    assert.match(view.innerHTML, /dense-arena/);
    assert.match(view.innerHTML, /data-ally-count="5" data-enemy-count="5"/);
    for (const person of party) assert.match(view.innerHTML, new RegExp(`${person.name}.*疲`, 's'));
    for (const enemy of enemies) assert.ok(view.innerHTML.includes(enemy.name));
    assert.match(view.innerHTML, /battle-log/);
    assert.match(view.innerHTML, /battle-survey/);
    assert.match(view.innerHTML, /assets\/backgrounds\/scenes\/old-cave\.webp/);
  } finally {
    delete globalThis.document;
  }
});

test('試練の迷宮と野営には専用背景が使われる', () => {
  const state = createInitialState();
  state.guildLevel = 5;
  state.guildContribution = 500;
  state.unlockedDungeons = ['old-cave', 'trial-labyrinth'];
  state.selectedDungeonId = 'trial-labyrinth';
  state.screen = 'party';
  const view = { innerHTML: '', dataset: {}, querySelectorAll: () => [] };
  mockDocument(view);
  try {
    render(state);
    assert.match(view.innerHTML, /assets\/backgrounds\/trial-labyrinth\.webp/);
    assert.match(campBackdropStyle('trial-labyrinth'), /assets\/backgrounds\/trial-camp\.webp/);
    assert.match(dungeonBackdropStyle('trial-labyrinth'), /assets\/backgrounds\/trial-labyrinth\.webp/);
  } finally {
    delete globalThis.document;
  }
});
