import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS } from '../src/data/dungeon.js';
import { RARE_BOSSES } from '../src/data/v07.js';
import { createInitialState } from '../src/systems/save.js';
import { statsFor } from '../src/data/adventurers.js';
import { advanceExpedition, rareBossChanceFor, startExpedition } from '../src/systems/expedition.js';
import { simulateBattle } from '../src/systems/combat.js';
import { syncGuildProgress } from '../src/systems/guild.js';

function unlockTo(state, level) {
  state.guildLevel = level;
  state.guildContribution = Math.max(0, (level - 1) * 125);
  syncGuildProgress(state);
}

test('罠砦は各非ボス階に罠付きの宝箱イベントを置く', () => {
  const state = createInitialState();
  unlockTo(state, 5);
  assert.equal(startExpedition(state, 'trap-fort').ok, true);
  assert.ok(state.expedition.floorEvents.some(event => event.kind === 'chest' && event.trapped));
  assert.ok([2, 4].every(floor => DUNGEONS['trap-fort'].floorNames[floor - 1]));
});

test('盗賊の罠対応と運び屋の疲労軽減はレベルで伸び、加入直後は未完成', () => {
  const thiefAt = level => statsFor({ id: `thief-${level}`, job: 'thief', level, fatigue: 0 }, []).trapSkill;
  const carrierAt = level => statsFor({ id: `carrier-${level}`, job: 'carrier', level, fatigue: 0 }, []);
  assert.ok(thiefAt(1) < .2);
  assert.ok(thiefAt(15) > .8);
  assert.ok(thiefAt(15) > thiefAt(1) * 4);
  assert.equal(carrierAt(1).carrierFatigueRelief, 0);
  assert.equal(carrierAt(15).carrierFatigueRelief, 8);
  assert.ok(carrierAt(15).carryBonus > carrierAt(1).carryBonus * 2);
});

test('特殊個体は通常ボスより明確に強く、低レベル遭遇では撤退する', () => {
  for (const [dungeonId, rare] of Object.entries(RARE_BOSSES)) {
    const normal = DUNGEONS[dungeonId].enemiesById.boss;
    assert.ok(rare.template.hp > normal.hp * 3, `${dungeonId}: HP`);
    assert.ok(rare.template.attack > normal.attack * 1.5, `${dungeonId}: 攻撃力`);
  }

  const state = createInitialState();
  unlockTo(state, 5);
  state.policy = 'push';
  assert.equal(startExpedition(state, 'old-cave').ok, true);
  state.expedition.rareBossPlan = { floor: 2, id: RARE_BOSSES['old-cave'].id };
  let steps = 0;
  while (state.expedition && !state.expedition.rareBossEncountered && steps++ < 100) {
    if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
    advanceExpedition(state);
  }
  assert.ok(state.expedition?.rareBossEncountered, '特殊個体と遭遇する');
  state.expedition.currentBattle.status = 'finished';
  advanceExpedition(state);
  assert.equal(state.lastResult?.outcome, 'retreat');
  assert.match(state.lastResult.reason, /自律判断/);
});

test('峡谷の近接敵は反撃し、弓師は岩棚の射手に魔術師より有効', () => {
  const makeBattle = (job, enemyId) => {
    const state = createInitialState();
    const person = state.adventurers[0];
    person.job = job;
    person.level = 8;
    person.fatigue = 0;
    person.injury = null;
    person.hp = statsFor(person, state.inventory).maxHp;
    const expedition = {
      id: `test-${job}`, dungeonId: 'wind-gorge', partyIds: [person.id], raidTemplates: {},
      casualties: [], kills: 0, defeated: [], xpEarned: 0, alerted: false, rangedPressure: false
    };
    const result = simulateBattle(state, expedition, [enemyId], 1, () => .5);
    return { person, result };
  };
  const melee = makeBattle('warrior', 'cliff-lizard');
  assert.ok(melee.result.actions.some(action => action.label === '転倒'));
  const archer = makeBattle('archer', 'ridge-archer');
  const mage = makeBattle('mage', 'ridge-archer');
  const attacks = (result, id, kind) => result.actions.filter(action => action.actorId === id && action.kind === kind);
  const archerHits = attacks(archer.result, archer.person.id, 'arrow');
  const mageHits = attacks(mage.result, mage.person.id, 'spell');
  assert.ok(Math.max(...archerHits.map(action => action.amount)) > Math.max(...mageHits.map(action => action.amount)) * 2);
  assert.ok(mage.result.actions.some(action => action.kind === 'enemyStrike'), '魔術師は反撃を受ける前に倒しきれない');
});

test('採掘区の長距離行軍で熟練運び屋は新人より疲労を抑える', () => {
  const fatigueAfterMarch = level => {
    const state = createInitialState();
    unlockTo(state, 4);
    const person = state.adventurers[0];
    person.job = 'carrier';
    person.level = level;
    person.fatigue = 0;
    person.injury = null;
    person.hp = statsFor(person, state.inventory).maxHp;
    state.party = [person.id];
    state.leaderId = person.id;
    assert.equal(startExpedition(state, 'collapsed-mine').ok, true);
    state.expedition.floorEvents = [{ kind: 'march' }];
    state.expedition.eventIndex = 0;
    advanceExpedition(state);
    return person.fatigue;
  };
  assert.equal(fatigueAfterMarch(1), 22);
  assert.equal(fatigueAfterMarch(15), 14);

  const runMine = carrierLevel => {
    const state = createInitialState();
    unlockTo(state, 5);
    state.policy = 'balanced';
    const party = state.adventurers.slice(0, 5);
    const jobs = ['warrior', 'warrior', 'mage', 'priest', carrierLevel ? 'carrier' : 'archer'];
    party.forEach((person, index) => {
      person.job = jobs[index];
      person.level = 12;
      person.fatigue = 0;
      person.injury = null;
      person.hp = statsFor(person, state.inventory).maxHp;
    });
    if (carrierLevel) party[4].level = carrierLevel;
    state.party = party.map(person => person.id);
    state.leaderId = state.party[0];
    assert.equal(startExpedition(state, 'collapsed-mine').ok, true);
    state.expedition.rareBossPlan = null;
    let steps = 0;
    while (state.expedition && steps++ < 1200) {
      if (state.expedition.currentBattle?.status === 'playing') state.expedition.currentBattle.status = 'finished';
      advanceExpedition(state);
    }
    assert.ok(steps < 1200);
    return state.lastResult;
  };
  const noCarrier = runMine(null);
  const seasonedCarrier = runMine(15);
  assert.equal(noCarrier.outcome, 'retreat');
  assert.ok(noCarrier.reachedFloor < 5);
  assert.equal(seasonedCarrier.outcome, 'cleared');
  assert.ok(Math.max(...seasonedCarrier.fatigueChanges.map(change => change.after)) < 60);
});
