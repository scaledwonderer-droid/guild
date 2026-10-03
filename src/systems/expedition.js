import { getDungeon } from '../data/dungeon.js';
import { LOOT_ITEMS } from '../data/items.js';
import { statsFor } from '../data/adventurers.js';
import { createCampScene, adjustRelation } from './relationships.js';
import { simulateBattle } from './combat.js';
import { partyLimitForLevel } from './guild.js';
import { createExpeditionDiscovery, recordDiscovery, mergeExpeditionSurvey } from './survey.js';
import { advanceDay, advanceObservedActivity, createActivityPlan } from './time.js';
import { RARE_BOSSES, TRIAL_KEY_ITEMS } from '../data/v07.js';
import { awardTrialHonors, hasTrialKeys, unlockTrialSeal } from './trial.js';

const pick = (rng, items) => items[Math.floor(rng() * items.length)];
const rnd = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFor(expedition) {
  let local = expedition.rngState >>> 0;
  const rng = makeRng(local);
  return () => {
    const value = rng();
    local = (local + 0x6D2B79F5) >>> 0;
    expedition.rngState = local;
    return value;
  };
}

function partyFor(state, ids) { return ids.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean); }
function activeFor(state, expedition) { return partyFor(state, expedition.partyIds).filter(person => person.hp > 0); }
function dungeonFor(expedition) { return getDungeon(expedition.dungeonId); }

function carryLimitFor(state, party) {
  const base = Math.max(12, party.length * 8);
  return base + party.reduce((sum, person) => sum + statsFor(person, state.inventory).carryBonus, 0);
}

export function rareBossChanceFor(state, dungeonId) {
  if (!RARE_BOSSES[dungeonId] || !(state.unlockedDungeons || ['old-cave']).includes('trial-labyrinth')) return 0;
  const priorRuns = Math.max(0, Number(state.surveyRecords?.[dungeonId]?.runs || 0));
  // Repeated field work helps the guild notice unusual signs, but never makes them routine.
  return Math.min(.07, .03 + Math.floor(priorRuns / 2) * .005);
}

export function startExpedition(state, dungeonId = state.selectedDungeonId || 'old-cave') {
  const dungeon = getDungeon(dungeonId);
  if (!(state.unlockedDungeons || ['old-cave']).includes(dungeon.id)) return { ok: false, message: 'この遠征先はまだ解禁されていません。' };
  const eligible = state.party.map(id => state.adventurers.find(person => person.id === id)).filter(person => person && !person.injury);
  if (!eligible.length) return { ok: false, message: '遠征に出せる冒険者がいません。編成か負傷状態を確認してください。' };
  if (eligible.length < state.party.length) return { ok: false, message: '負傷中の冒険者が編成に含まれています。編成を見直してください。' };
  if (eligible.length > partyLimitForLevel(state.guildLevel || 1)) return { ok: false, message: `現在のギルドではパーティーは${partyLimitForLevel(state.guildLevel || 1)}人までです。` };
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rareBossChance = rareBossChanceFor(state, dungeon.id);
  const rareBossRoll = makeRng(seed ^ 0x7f4a7c15);
  const rareBossPlan = rareBossRoll() < rareBossChance
    ? { floor: 2 + Math.floor(rareBossRoll() * Math.max(1, dungeon.floors - 2)), id: RARE_BOSSES[dungeon.id].id }
    : null;
  const activityPlan = createActivityPlan(state, { primaryIds: eligible.map(person => person.id), includePrimary: true, forNextDay: true });
  const requestedObserver = state.observationChoice || 'expedition';
  const observerGroup = requestedObserver === 'none'
    ? { id: 'none', type: 'none', label: '同行なし', memberIds: [], names: [] }
    : activityPlan.find(group => group.id === requestedObserver) || activityPlan.find(group => group.id === 'expedition');
  const startHp = {};
  const startFatigue = {};
  for (const person of eligible) {
    const maxHp = statsFor(person, state.inventory).maxHp;
    person.hp = Math.max(1, Math.min(maxHp, person.hp || maxHp));
    startHp[person.id] = person.hp;
    startFatigue[person.id] = Number(person.fatigue || 0);
  }
  const expedition = {
    id: `exp-${Date.now()}`, seed, rngState: seed, dungeonId: dungeon.id,
    phase: 'explore', floor: 1, floorEvents: [], eventIndex: 0,
    guildLevel: Math.max(1, Number(state.guildLevel || 1)),
    partyIds: eligible.map(person => person.id), leaderId: state.leaderId, policy: state.policy,
    log: [], narrative: { type: 'explore', title: '遠征開始', description: `冒険者たちは${dungeon.name}の入口で装備を確かめ、隊列を組んだ。` },
    kills: 0, defeated: [], xpEarned: 0, loot: [], carriedWeight: 0,
    carryLimit: carryLimitFor(state, eligible), bonusXp: 0, casualties: [], campedAt: [],
    campTemplateHistory: [], visitedFloors: [1], bossDefeated: false, elapsed: 0, raidReports: [],
    campChanges: [], campContext: null, discovery: createExpeditionDiscovery(1),
    rareBossPlan, rareBossEncountered: false, trialBossVictory: false,
    cursedIds: [], sleepingIds: [], bleedingIds: [], pendingRareBossRetreat: false,
    trialBossRoomUnlocked: Boolean(state.trialBossRoomUnlocked),
    startHp,
    startFatigue,
    activityPlan,
    observationTargetId: observerGroup?.id || 'expedition',
    observationGroup: observerGroup?.id === 'expedition' || observerGroup?.id === 'none' ? null : { ...structuredClone(observerGroup || {}), cursor: 0 },
    observationFeed: []
  };
  for (const person of eligible) {
    person.injury = null;
    person.fatigue = Math.min(100, person.fatigue + 8);
  }
  state.selectedDungeonId = dungeon.id;
  state.expedition = expedition;
  state.lastResult = null;
  state.screen = 'expedition';
  state.stats.runs++;
  addLog(expedition, `第${state.day}日、${eligible.map(person => person.name).join('・')}が${dungeon.name}へ出発した。`, 'good');
  addLog(expedition, `遠征方針は「${policyName(expedition.policy)}」。判断はパーティーに任せる。`, 'normal');
  expedition.floorEvents = makeFloorEvents(expedition, 1);
  return { ok: true };
}

function makeFloorEvents(expedition, floor) {
  const rng = randomFor(expedition);
  const dungeon = dungeonFor(expedition);
  const level = Math.max(1, Number(expedition.guildLevel || 1));
  if (dungeon.id === 'trial-labyrinth') {
    if (floor === dungeon.floors) {
      const events = [];
      if (rng() < .55) events.push({ kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '封印前の複合障害' });
      events.push(expedition.trialBossRoomUnlocked
        ? { kind: 'boss', enemyIds: ['trial-boss'], title: '迷宮の守護者' }
        : { kind: 'trial-gate', title: '封鎖された最深部' });
      return events;
    }
    const enemyPool = dungeon.enemyGroups[floor] || dungeon.enemyGroups[1];
    const events = [{ kind: 'encounter', enemies: pick(rng, enemyPool).slice(), title: '迷宮の番兵' }];
    const routes = dungeon.routeChoices?.[floor];
    if (routes?.length) events.push({ kind: 'route', choices: routes, title: '分岐路' });
    else if (floor % 2 === 0 || rng() < .5) events.push({ kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '迷宮の複合障害' });
    else events.push({ kind: 'side', title: '迷宮の小さな出来事' });
    if (floor >= 5 && floor % 3 === 2) events.push({ kind: 'march', title: '長い迷宮行軍' });
    return events;
  }
  if (floor === dungeon.floors) {
    const hazard = dungeon.hazards.length && (dungeon.id !== 'old-cave' || rng() < .25) ? { kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '最深部の危険' } : null;
    const finalEvents = [...(hazard ? [hazard] : []), { kind: 'boss', title: dungeon.boss }];
    if (level >= 4 && dungeon.hazards.length && rng() < .2 + (level - 4) * .1) finalEvents.unshift({ kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '重なる危険' });
    return finalEvents;
  }
  const enemyPool = dungeon.enemyGroups[floor] || dungeon.enemyGroups[dungeon.floors - 1];
  const encounter = pick(rng, enemyPool);
  const events = [{ kind: 'encounter', enemies: encounter.slice(), title: '敵との遭遇' }];
  if (!expedition.rareBossEncountered && expedition.rareBossPlan?.floor === floor) {
    events.push({ kind: 'rare-boss', title: '異様な気配' });
  }
  if (dungeon.hazards.length && (dungeon.id !== 'old-cave' || rng() < .2)) {
    events.push({ kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '探索中の障害' });
  }
  if (dungeon.id === 'trap-fort') {
    if ([2, 4].includes(floor)) events.push({ kind: 'locked-chest', title: '鍵付き宝箱' });
    else events.push({ kind: 'chest', trapped: true, title: '罠付きの宝箱' });
  } else if (dungeon.id === 'collapsed-mine') events.push({ kind: 'mine-cache', title: '鉱脈の採掘' });
  else {
    const secondRoll = rng();
    if (secondRoll < .2) events.push({ kind: 'chest', title: '見つかった宝箱' });
    else if (secondRoll < .43) events.push({ kind: 'side', title: '小さな出来事' });
    else events.push({ kind: 'explore', title: '通路の先へ' });
  }
  if (dungeon.id === 'collapsed-mine') events.push({ kind: 'march', title: '険しい坑道の行軍' });
  else if (level >= 2 && floor >= 2 && rng() < .2 + Math.max(0, level - 2) * .09) events.push({ kind: 'march', title: '長い行軍' });
  if (level >= 3 && dungeon.hazards.length && rng() < .1 + Math.max(0, level - 3) * .1) events.push({ kind: 'hazard', hazard: pick(rng, dungeon.hazards), title: '重なる危険' });
  return events;
}

function logTime(expedition) {
  expedition.elapsed++;
  return `行動 ${String(expedition.elapsed).padStart(2, '0')}`;
}

function addLog(expedition, text, tone = 'normal') {
  expedition.log.unshift({ time: logTime(expedition), text, tone });
  expedition.log = expedition.log.slice(0, 42);
}

export function advanceExpedition(state) {
  const expedition = state.expedition;
  if (!expedition) return { ok: false, message: '進行中の遠征はありません。' };
  if (expedition.pendingBattleAdvance && expedition.currentBattle?.status === 'playing') return { ok: false, message: '戦闘の様子を見終わるまでお待ちください。' };
  advanceObservedActivity(expedition);
  const dungeon = dungeonFor(expedition);
  if (expedition.pendingBattleAdvance) {
    if (expedition.currentBattle?.status === 'playing') return { ok: false, message: '戦闘の様子を見終わるまでお待ちください。' };
    expedition.pendingBattleAdvance = false;
    if (expedition.pendingCampRaid) {
      expedition.pendingCampRaid = false;
      expedition.currentBattle = null;
      if (!activeFor(state, expedition).length) {
        finishExpedition(state, 'defeat', '夜襲で隊列が崩れ、冒険者たちは救助されて帰還しました。');
        return { ok: true };
      }
      if (shouldRetreat(state, expedition)) {
        finishExpedition(state, 'retreat', `夜襲の被害を受け、${policyName(expedition.policy)}の判断で帰還しました。`);
        return { ok: true };
      }
      expedition.narrative = { type: 'camp', title: '夜襲のあと', description: '冒険者たちは再び見張りを立て、夜明けまで休息を取った。', campScene: expedition.narrative?.campScene };
      addLog(expedition, '夜襲の傷を確かめ、見張りを改めて夜を越した。', 'camp');
      return { ok: true };
    }
    expedition.currentBattle = null;
    return settleAfterEvent(state, expedition);
  }
  if (expedition.phase === 'camp') {
    if (shouldRetreat(state, expedition)) {
      addLog(expedition, `パーティーは状態を確かめ、${policyName(expedition.policy)}の方針に従って帰還を選んだ。`, 'danger');
      finishExpedition(state, 'retreat', `野営の時点で消耗が大きく、${policyName(expedition.policy)}の判断で帰還しました。`);
      return { ok: true };
    }
    if (expedition.floor >= dungeon.floors) {
      if (expedition.dungeonId === 'trial-labyrinth' && !expedition.bossDefeated) {
        finishExpedition(state, 'sealed', '最深部へ到達したものの、閉ざされた扉の先へ進めませんでした。封印についての記録を持ち帰ります。');
        return { ok: true };
      }
      finishExpedition(state, 'cleared', `最深部の脅威を退け、${dungeon.name}の調査を終えました。`);
      return { ok: true };
    }
    startNextFloor(state, expedition);
    return { ok: true };
  }
  const event = expedition.floorEvents[expedition.eventIndex];
  if (!event) {
    finishExpedition(state, 'retreat', '進路を保てず、パーティーはダンジョンを離れました。');
    return { ok: true };
  }
  resolveEvent(state, expedition, event);
  expedition.eventIndex++;
  if (expedition.pendingBattleAdvance) return { ok: true };
  return settleAfterEvent(state, expedition);
}

function settleAfterEvent(state, expedition) {
  const dungeon = dungeonFor(expedition);
  if (!activeFor(state, expedition).length) {
    finishExpedition(state, 'defeat', '全員が戦闘不能となり、遠征を続けられませんでした。');
    return { ok: true };
  }
  if (expedition.pendingRareBossRetreat) {
    expedition.pendingRareBossRetreat = false;
    addLog(expedition, '特殊個体の力を前に、隊列を保てるうちに撤退した。次に挑むには、さらなる育成と準備が必要だ。', 'danger');
    finishExpedition(state, 'retreat', '特殊個体を討伐できず、冒険者たちは自律判断で退路を選びました。');
    return { ok: true };
  }
  if (expedition.eventIndex >= expedition.floorEvents.length) {
    if (expedition.floor === dungeon.floors && expedition.bossDefeated) {
      addLog(expedition, '最深部の調査を完了。冒険者たちは帰路についた。', 'good');
      finishExpedition(state, 'cleared', `最深部の脅威を退け、${dungeon.name}の調査を終えました。`);
      return { ok: true };
    }
    if (expedition.floor === dungeon.floors && expedition.dungeonId === 'trial-labyrinth') {
      finishExpedition(state, 'sealed', '最深部へ到達したものの、閉ざされた扉の先へ進めませんでした。封印についての記録を持ち帰ります。');
      return { ok: true };
    }
    if (shouldRetreat(state, expedition)) {
      addLog(expedition, `仲間の消耗を考慮し、${policyName(expedition.policy)}の方針に従って帰還を選んだ。`, 'danger');
      finishExpedition(state, 'retreat', `消耗が大きくなったため、${policyName(expedition.policy)}の判断で帰還しました。`);
      return { ok: true };
    }
    if ((dungeon.campFloors || [2, 4]).includes(expedition.floor) && !expedition.campedAt.includes(expedition.floor)) {
      enterCamp(state, expedition);
      return { ok: true };
    }
    startNextFloor(state, expedition);
  }
  return { ok: true };
}

function resolveTrialGate(state, expedition) {
  state.trialSealDiscovered = true;
  expedition.trialSealDiscovered = true;
  recordDiscovery(expedition, 'sealedRooms', '最深部を封じる扉');
  const party = activeFor(state, expedition);
  const cautious = party.some(person => person.personality === '慎重');
  const text = cautious
    ? '石扉には四つの異なる刻印が彫られている。慎重に調べた者が、対応する欠片を捧げれば封印が解けると気づいた。'
    : '石扉には四つの異なる刻印が並んでいた。対応する欠片を集めて捧げなければ、奥へは進めない。';
  if (hasTrialKeys(state)) {
    const opened = unlockTrialSeal(state);
    if (opened.ok) {
      expedition.trialBossRoomUnlocked = true;
      expedition.floorEvents.push({ kind: 'boss', enemyIds: ['trial-boss'], title: '迷宮の守護者' });
      expedition.narrative = { type: 'boss', title: '封印が解ける', description: `${text} 刻印片が光り、最深部の扉が開いた。` };
      addLog(expedition, '四つの刻印片が封印に反応し、最深部の扉が開いた。', 'good');
      return;
    }
  }
  expedition.narrative = { type: 'event', title: '閉ざされた石扉', description: text };
  addLog(expedition, text, 'normal');
}

function resolveTrialRoute(state, expedition, event, rng) {
  const party = activeFor(state, expedition);
  const cautious = party.filter(person => person.personality === '慎重').length;
  const bold = party.filter(person => person.personality === '勇敢' || person.personality === '強気').length;
  const thief = party.some(person => person.job === 'thief');
  const weights = event.choices.map(route => {
    let weight = route.type === 'safe' ? (expedition.policy === 'safe' ? 6 : expedition.policy === 'push' ? 2 : 4) : route.type === 'danger' ? (expedition.policy === 'push' ? 4 : 1.4) : .8;
    if (route.type === 'safe') weight += cautious * .45;
    if (route.type === 'danger') weight += bold * .38 + (route.hazard && thief ? .25 : 0);
    return Math.max(.1, weight);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  let route = event.choices.at(-1);
  for (let index = 0; index < event.choices.length; index++) {
    roll -= weights[index];
    if (roll <= 0) { route = event.choices[index]; break; }
  }
  recordDiscovery(expedition, 'routes', route.name);
  const line = `隊列は「${route.name}」を選んだ。${route.type === 'safe' ? '足場を確かめながら慎重に進む。' : route.type === 'deadEnd' ? '行き止まりへ回り込み、引き返すことになった。' : '危険を承知で近道を進む。'}`;
  addLog(expedition, line, route.type === 'danger' ? 'danger' : 'normal');
  if (route.type === 'safe') {
    for (const person of party) person.fatigue = Math.max(0, person.fatigue - 1);
    expedition.narrative = { type: 'explore', title: route.name, description: line };
  } else if (route.type === 'deadEnd') {
    for (const person of party) person.fatigue = Math.min(100, person.fatigue + 3);
    expedition.bonusXp += 2;
    expedition.narrative = { type: 'event', title: '行き止まり', description: line };
  } else {
    if (route.hazard) resolveHazard(state, expedition, route.hazard, rng);
    if (route.reward) {
      const item = addLoot(state, expedition, rng, 'cache');
      if (item) addLog(expedition, `危険な近道の先で「${item.name}」を回収した。`, 'good');
    }
    expedition.narrative = { type: 'danger', title: route.name, description: line + (route.hazard ? ` ${hazardTitle(route.hazard)}に見舞われた。` : '') };
  }
  expedition.campContext = { type: route.type === 'safe' ? 'scout' : 'trial-route', route: route.name };
}

function grantRareBossKey(state, expedition, dungeonId, rng) {
  const boss = RARE_BOSSES[dungeonId];
  const template = TRIAL_KEY_ITEMS.find(item => item.keyId === boss?.keyId);
  if (!template) return;
  const item = { ...template, uid: `${template.keyId}_${Date.now()}_${Math.floor(rng() * 100000)}` };
  state.inventory.push(item);
  expedition.loot.push({ ...item, resolved: '重要品として保管' });
  state.trialKeyHistory ||= [];
  state.trialKeyHistory.push({ day: Number(state.day || 1), event: 'found', keyId: item.keyId, name: item.name, dungeonId });
  recordDiscovery(expedition, 'loot', item.name);
  addLog(expedition, `${boss.name}を討伐し、「${item.name}」を回収した。`, 'good');
}

function resolveEvent(state, expedition, event) {
  const dungeon = dungeonFor(expedition);
  const floorName = dungeon.floorNames[expedition.floor - 1];
  const rng = randomFor(expedition);
  if (event.kind === 'encounter' || event.kind === 'boss' || event.kind === 'rare-boss') {
    if (event.kind === 'rare-boss') {
      expedition.rareBossEncountered = true;
      const rare = RARE_BOSSES[dungeon.id];
      expedition.raidTemplates = { ...(expedition.raidTemplates || {}), 'rare-boss': { ...rare.template } };
    }
    const enemyIds = event.enemyIds || (event.kind === 'boss' ? ['boss'] : event.kind === 'rare-boss' ? ['rare-boss'] : event.enemies);
    const names = enemyIds.map(id => expedition.raidTemplates?.[id]?.name || dungeon.enemiesById[id]?.name || '魔物');
    if (event.kind === 'boss') recordDiscovery(expedition, 'bosses', names);
    else if (event.kind === 'rare-boss') recordDiscovery(expedition, 'specialBosses', names);
    else recordDiscovery(expedition, 'enemies', names);
    const bossEvent = event.kind === 'boss' || event.kind === 'rare-boss';
    const battleTitle = event.kind === 'rare-boss' ? names[0] : event.kind === 'boss' ? names[0] : names.join('・');
    expedition.narrative = {
      type: bossEvent ? 'boss' : 'combat',
      title: bossEvent ? `${battleTitle}、立ちはだかる` : `${names.join('・')}と遭遇`,
      description: bossEvent ? `${dungeon.name}の奥で、強大な個体が進路をふさいだ。隊列と役割に注目しよう。` : `${floorName}で${names.join('、')}が進路をふさいだ。冒険者たちは自ら戦い方を選ぶ。`
    };
    addLog(expedition, `${floorName}で${names.join('・')}と遭遇した。`, 'danger');
    const result = simulateBattle(state, expedition, enemyIds, expedition.floor, rng);
    for (const line of result.lines.slice().reverse()) addLog(expedition, line, line.includes('回復') || line.includes('倒した') ? 'good' : 'normal');
    expedition.campMemory = result.campMemory || null;
    expedition.currentBattle = {
      id: `${expedition.id}-battle-${expedition.floor}-${expedition.elapsed}`, type: event.kind,
      floor: expedition.floor, status: 'playing', playbackIndex: -1,
      initialSnapshot: result.initialSnapshot, actions: result.actions, foes: result.foes,
      rounds: result.rounds, victory: result.victory, enemyCount: result.enemies,
      logEntryCount: result.lines.length + 1,
      displayTitle: result.victory ? bossEvent ? `${battleTitle}を退けた` : '戦闘に勝利' : '戦線が崩れた',
      displayDescription: result.victory ? `${result.rounds}ラウンドで敵を退けた。役割を活かして隊列を保った。` : '冒険者たちは傷ついた仲間を支え、退路を探す。'
    };
    expedition.pendingBattleAdvance = true;
    if (event.kind === 'rare-boss' && !result.victory) expedition.pendingRareBossRetreat = true;
    if (result.victory) {
      expedition.bonusXp += event.kind === 'boss' ? 18 : event.kind === 'rare-boss' ? 35 : 3;
      if (event.kind === 'boss' && dungeon.id === 'trial-labyrinth' && event.enemyIds?.includes('trial-boss')) {
        expedition.trialBossVictory = true;
        expedition.trialBossBattle = { actions: result.actions };
      }
      if (event.kind === 'rare-boss') grantRareBossKey(state, expedition, dungeon.id, rng);
      else if (event.kind === 'boss' && rng() < .8) addLoot(state, expedition, rng, 'boss');
    }
    expedition.narrative = {
      type: bossEvent ? 'boss' : 'combat',
      title: bossEvent ? `${battleTitle}、立ちはだかる` : `${names.join('・')}と遭遇`,
      description: '冒険者たちは前衛と後衛に分かれ、敵の動きを見ながら自ら応戦している。'
    };
    return;
  }
  if (event.kind === 'trial-gate') return resolveTrialGate(state, expedition);
  if (event.kind === 'route') return resolveTrialRoute(state, expedition, event, rng);
  if (event.kind === 'hazard') return resolveHazard(state, expedition, event.hazard, rng);
  if (event.kind === 'march') {
    recordDiscovery(expedition, 'environments', '長距離行軍');
    const carrier = activeFor(state, expedition).find(person => person.job === 'carrier');
    const baseIncrease = dungeon.id === 'collapsed-mine' ? 14 : dungeon.id === 'trial-labyrinth' ? 8 : 6 + Math.max(0, Number(expedition.guildLevel || 1) - 3);
    const relief = carrier ? statsFor(carrier, state.inventory).carrierFatigueRelief : 0;
    const increase = Math.max(2, baseIncrease - relief);
    for (const person of activeFor(state, expedition)) person.fatigue = Math.min(100, person.fatigue + increase);
    if (carrier) recordDiscovery(expedition, 'skills', '行軍時の荷重分散');
    const text = carrier ? `長い移動が続いた。${carrier.name}が荷を分け、疲労増加を${increase}に抑えた。` : `険しい長距離行軍で足が重くなり、全員の疲労が${increase}増えた。`;
    expedition.narrative = { type: 'danger', title: '長い行軍', description: text };
    addLog(expedition, text, 'danger');
    return;
  }
  if (event.kind === 'locked-chest') return resolveLockedChest(state, expedition, rng);
  if (event.kind === 'mine-cache') {
    recordDiscovery(expedition, 'events', '鉱脈');
    const item = addLoot(state, expedition, rng, 'cache');
    expedition.bonusXp += 3;
    const text = item ? `鉱脈から「${item.name}」を採掘し、荷に加えた。重さ ${item.weight}。` : '鉱脈を見つけたが、荷がいっぱいで鉱石を残した。';
    expedition.campContext = { type: 'carrier', item: item?.name || '' };
    expedition.narrative = { type: item ? 'loot' : 'event', title: '鉱脈の採掘', description: text };
    addLog(expedition, text, item ? 'good' : 'danger');
    return;
  }
  if (event.kind === 'chest') {
    if (dungeon.id === 'trap-fort') return resolveTrappedChest(state, expedition, rng, Boolean(event.trapped));
    recordDiscovery(expedition, 'events', '宝箱');
    const hasGear = rng() < .68;
    const gear = hasGear ? addLoot(state, expedition, rng, 'chest') : null;
    if (hasGear && !gear) {
      expedition.narrative = { type: 'event', title: '荷の限界', description: '宝箱の品を見つけたが、積載量に余裕がなく、その場に残して進んだ。' };
    } else if (gear) {
      expedition.bonusXp += 3;
      expedition.narrative = { type: 'loot', title: '宝箱の中の品', description: `箱の底から「${gear.name}」を見つけた。重さ ${gear.weight}、帰還まで大切に運ぶ。` };
      addLog(expedition, `宝箱から「${gear.name}」を見つけた。`, 'good');
    } else {
      expedition.bonusXp += 5;
      expedition.narrative = { type: 'loot', title: '道具と記録', description: '保存食と古い遠征記録を見つけ、次の探索に役立てた。' };
      addLog(expedition, '宝箱から保存食と古い遠征記録を見つけた。', 'good');
    }
    return;
  }
  if (event.kind === 'side') {
    const side = pick(rng, dungeon.sideEvents);
    recordDiscovery(expedition, 'events', side.title);
    let text = pick(rng, side.lines);
    if (side.effect === 'heal') {
      const weakest = activeFor(state, expedition).sort((a, b) => a.hp / statsFor(a, state.inventory).maxHp - b.hp / statsFor(b, state.inventory).maxHp)[0];
      if (weakest) {
        const stats = statsFor(weakest, state.inventory);
        const amount = Math.min(stats.maxHp - weakest.hp, 8);
        weakest.hp += amount;
        text += ` ${weakest.name}は手当てを受け、HPが${amount}回復した。`;
      }
    } else if (side.effect === 'fatigue') {
      for (const person of activeFor(state, expedition)) person.fatigue = Math.max(0, person.fatigue - 3);
    } else if (side.effect === 'loot') {
      const item = addLoot(state, expedition, rng, 'cache');
      if (item) text += ` 「${item.name}」を持ち帰ります。`;
    } else expedition.bonusXp += 2;
    expedition.narrative = { type: 'event', title: side.title, description: text };
    addLog(expedition, text, 'normal');
    return;
  }
  const text = pick(rng, dungeon.explorationLines);
  expedition.narrative = { type: 'explore', title: event.title || '通路の先へ', description: text };
  addLog(expedition, text, 'normal');
  expedition.bonusXp += 2;
}

function resolveHazard(state, expedition, hazard, rng) {
  const party = activeFor(state, expedition);
  if (!party.length) return;
  const dungeon = dungeonFor(expedition);
  const thief = party.find(person => person.job === 'thief');
  const archer = party.find(person => person.job === 'archer');
  const carrier = party.find(person => person.job === 'carrier');
  const warrior = party.find(person => person.job === 'warrior');
  const cautious = party.some(person => person.personality === '慎重');
  let text = '';
  let tone = 'normal';
  let context = null;
  recordDiscovery(expedition, 'hazards', hazardTitle(hazard));
  const environment = ({
    gust: '強風', 'low-visibility': '視界不良', 'falling-rock': '落石',
    'cave-in': '崩落', 'unstable-ground': '不安定な足場', dust: '粉塵'
  })[hazard];
  if (environment) recordDiscovery(expedition, 'environments', environment);
  if (['pit', 'poison', 'blast', 'alarm'].includes(hazard)) {
    const trapName = { pit: '落とし穴', poison: '毒針', blast: '爆発罠', alarm: '警報装置' }[hazard];
    const skill = thief ? statsFor(thief, state.inventory).trapSkill : cautious ? .12 : .04;
    if (thief && rng() < skill) {
      recordDiscovery(expedition, 'skills', ['罠発見', '罠解除']);
      text = `${thief.name}が${trapName}を発見した。仕掛けを解除し、安全な通路を通過した。`;
      expedition.bonusXp += 4;
      context = { type: 'thief', hazard: trapName };
      expedition.campMemory = { type: 'support', actorId: thief.id, targetId: party[0].id };
      tone = 'good';
    } else if (hazard === 'alarm') {
      if (thief) recordDiscovery(expedition, 'skills', '罠発見');
      text = `警報装置が鳴り響いた。次の敵は警戒している。`;
      expedition.alerted = true;
      context = { type: 'alarm' };
      tone = 'danger';
    } else {
      if (thief) recordDiscovery(expedition, 'skills', '罠発見');
      const target = pick(rng, party);
      const rawDamage = hazard === 'blast' ? rnd(rng, 13, 21) : hazard === 'pit' ? rnd(rng, 12, 20) : rnd(rng, 8, 15);
      const targetStats = statsFor(target, state.inventory);
      const damage = Math.max(1, Math.round(rawDamage * (hazard === 'poison' ? 1 - targetStats.poisonResistance : 1)));
      applyDamage(state, expedition, target, damage, hazard === 'poison' ? '毒針' : trapName);
      if (hazard === 'poison') {
        recordDiscovery(expedition, 'statusEffects', '毒');
        target.fatigue = Math.min(100, target.fatigue + Math.max(2, Math.round(8 * (1 - targetStats.poisonResistance))));
        if (targetStats.poisonResistance > 0) recordDiscovery(expedition, 'equipment', '毒への抵抗を確認した装備');
      }
      text = thief ? `${thief.name}は罠を見つけたが、解除が間に合わなかった。${target.name}が${trapName}で${damage}ダメージを受けた。` : `罠を見落とした。${target.name}が${trapName}で${damage}ダメージ${hazard === 'poison' ? 'を受け、毒で疲労も増えた' : 'を受けた'}。`;
      context = { type: thief ? 'thief-failed' : 'trap', hazard: trapName, targetId: target.id };
      tone = 'danger';
    }
  } else if (hazard === 'gust' || hazard === 'low-visibility') {
    if (archer && rng() < .72) {
      recordDiscovery(expedition, 'skills', '安全経路の察知');
      text = `${archer.name}が風と崖上の動きを読み、安全な足場へ誘導した。`;
      expedition.bonusXp += 3;
      context = { type: 'archer' };
      tone = 'good';
    } else {
      const target = pick(rng, party);
      const damage = rnd(rng, 8, 14);
      applyDamage(state, expedition, target, damage, hazard === 'gust' ? '強風の危険' : '視界不良の奇襲');
      text = `強風で視界と隊列が乱れた。${target.name}が${damage}ダメージを受け、全員の疲労が増した。`;
      for (const person of party) person.fatigue = Math.min(100, person.fatigue + 4);
      expedition.rangedPressure = true;
      context = { type: 'gorge' };
      tone = 'danger';
    }
  } else if (hazard === 'falling-rock' || hazard === 'cave-in' || hazard === 'unstable-ground') {
    const target = pick(rng, party);
    const base = rnd(rng, 12, 22);
    const damage = Math.max(3, base - (warrior ? 7 : 0) - statsFor(target, state.inventory).collapseDefense);
    if (statsFor(target, state.inventory).collapseDefense) recordDiscovery(expedition, 'equipment', '崩落を和らげる防具');
    applyDamage(state, expedition, target, damage, '崩落');
    const carrierRelief = carrier ? statsFor(carrier, state.inventory).carrierFatigueRelief : 0;
    const fatigue = Math.max(2, 7 - carrierRelief);
    for (const person of party) person.fatigue = Math.min(100, person.fatigue + fatigue);
    text = warrior
      ? `${warrior.name}が崩落した梁を押さえた。${target.name}の被害は${damage}ダメージに抑えられた。`
      : `坑道の天井が崩れた。${target.name}が${damage}ダメージを受け、粉塵で全員が疲れた。`;
    text += ` 全員の疲労が${fatigue}増えた。`;
    if (carrier) text += ` ${carrier.name}が荷を整理し、疲労の増加を抑えた。`;
    if (carrier) recordDiscovery(expedition, 'skills', ['荷物整理', '疲労軽減']);
    context = { type: carrier ? 'carrier' : 'collapse' };
    tone = 'danger';
  } else if (hazard === 'dust') {
    const carrierRelief = carrier ? statsFor(carrier, state.inventory).carrierFatigueRelief : 0;
    const increase = carrier ? Math.max(2, 10 - carrierRelief) : 10;
    for (const person of party) person.fatigue = Math.min(100, person.fatigue + increase);
    text = carrier ? `${carrier.name}が荷を軽くし、粉塵の中でも疲労増加を${increase}に抑えて進んだ。` : `濃い粉塵に息を取られ、全員の疲労が${increase}増した。`;
    if (carrier) recordDiscovery(expedition, 'skills', ['荷物整理', '疲労軽減']);
    context = { type: 'carrier' };
  }
  expedition.campContext = context;
  expedition.rangedPressure = false;
  expedition.narrative = { type: tone === 'danger' ? 'danger' : 'event', title: hazardTitle(hazard), description: text };
  addLog(expedition, text, tone);
}

function hazardTitle(hazard) {
  return ({ pit: '落とし穴', poison: '毒針の罠', blast: '爆発罠', alarm: '警報装置', gust: '峡谷の突風', 'falling-rock': '落石', 'low-visibility': '視界不良', 'cave-in': '坑道の崩落', dust: '鉱山粉塵', 'unstable-ground': '不安定な足場' })[hazard] || '探索中の障害';
}

function resolveLockedChest(state, expedition, rng) {
  return resolveTrappedChest(state, expedition, rng, true);
}

function resolveTrappedChest(state, expedition, rng, locked) {
  const party = activeFor(state, expedition);
  if (!party.length) return;
  const thief = party.find(person => person.job === 'thief');
  const title = locked ? '鍵付き宝箱' : '罠付きの宝箱';
  recordDiscovery(expedition, 'events', title);
  recordDiscovery(expedition, 'hazards', '宝箱に仕掛けられた罠');
  if (thief && rng() < statsFor(thief, state.inventory).trapSkill) {
    recordDiscovery(expedition, 'skills', ['罠発見', '罠解除', ...(locked ? ['鍵開け'] : [])]);
    const item = addLoot(state, expedition, rng, 'chest');
    const text = item
      ? `${thief.name}が仕掛けを解除${locked ? 'して鍵を開け' : 'し'}、「${item.name}」を回収した。`
      : `${thief.name}が仕掛けを解除${locked ? 'して鍵を開け' : 'した'}が、荷がいっぱいで中身を残した。`;
    expedition.bonusXp += 4;
    expedition.narrative = { type: item ? 'loot' : 'event', title: '罠を解除', description: text };
    addLog(expedition, text, item ? 'good' : 'normal');
    expedition.campContext = { type: 'thief', hazard: title };
    return;
  }

  // Without a trained trap worker the party usually leaves a chest alone; a rushed attempt can still trigger it.
  const cautious = party.some(person => person.personality === '慎重');
  const triggerChance = thief ? 1 : Math.max(.42, (locked ? .74 : .62) - (cautious ? .12 : 0));
  if (rng() >= triggerChance) {
    const text = `${title}を見つけたが、安全を優先して手を出さずに進んだ。`;
    expedition.narrative = { type: 'event', title, description: text };
    addLog(expedition, text, 'normal');
    expedition.campContext = { type: 'locked-chest' };
    return;
  }

  const trap = pick(rng, ['poison', 'blast', 'alarm', 'curse', 'sleep', 'bleed', 'pit']);
  const trapName = { poison: '毒針', blast: '爆発', alarm: '警報', curse: '呪い', sleep: '眠り粉', bleed: '出血針', pit: '落とし穴' }[trap];
  recordDiscovery(expedition, 'hazards', `${trapName}の罠`);
  if (trap === 'alarm') {
    expedition.alerted = true;
    recordDiscovery(expedition, 'statusEffects', '警報で敵が警戒');
    const text = `${thief ? `${thief.name}は仕掛けに気づいたが、` : ''}警報装置が鳴った。次に現れる敵は警戒している。`;
    expedition.narrative = { type: 'danger', title: '宝箱の警報', description: text };
    addLog(expedition, text, 'danger');
    expedition.campContext = { type: thief ? 'thief-failed' : 'locked-chest', hazard: trapName };
    return;
  }
  const target = pick(rng, party);
  const resistance = statsFor(target, state.inventory).poisonResistance;
  const damage = trap === 'blast' ? rnd(rng, 18, 27)
    : trap === 'pit' ? rnd(rng, 14, 22)
      : trap === 'bleed' ? rnd(rng, 11, 17)
        : trap === 'poison' ? Math.round(rnd(rng, 10, 17) * (1 - resistance))
          : trap === 'curse' ? rnd(rng, 8, 13) : rnd(rng, 4, 8);
  applyDamage(state, expedition, target, damage, trapName);
  if (trap === 'poison') {
    target.fatigue = Math.min(100, target.fatigue + Math.max(4, Math.round(10 * (1 - resistance))));
    recordDiscovery(expedition, 'statusEffects', '毒');
  } else if (trap === 'curse') {
    expedition.cursedIds ||= [];
    if (!expedition.cursedIds.includes(target.id)) expedition.cursedIds.push(target.id);
    target.fatigue = Math.min(100, target.fatigue + 4);
    recordDiscovery(expedition, 'statusEffects', '呪い');
  } else if (trap === 'sleep') {
    expedition.sleepingIds ||= [];
    if (!expedition.sleepingIds.includes(target.id)) expedition.sleepingIds.push(target.id);
    target.fatigue = Math.min(100, target.fatigue + 5);
    recordDiscovery(expedition, 'statusEffects', '眠り');
  } else if (trap === 'bleed') {
    expedition.bleedingIds ||= [];
    if (!expedition.bleedingIds.includes(target.id)) expedition.bleedingIds.push(target.id);
    target.fatigue = Math.min(100, target.fatigue + 5);
    recordDiscovery(expedition, 'statusEffects', '出血');
  }
  const text = `${thief ? `${thief.name}が${title}を調べたが、` : `${title}に手を伸ばし、`}${trapName}の罠が作動した。${target.name}は${damage}ダメージを受けた${trap === 'poison' ? '。毒で疲労も増した' : trap === 'sleep' ? '。眠気で次の戦闘の動きが鈍る' : trap === 'curse' ? '。呪いが遠征中の攻撃を鈍らせる' : trap === 'bleed' ? '。傷口から出血している' : ''}。`;
  expedition.narrative = { type: 'danger', title: `${trapName}の作動`, description: text };
  addLog(expedition, text, 'danger');
  expedition.campContext = { type: thief ? 'thief-failed' : 'trap', hazard: trapName, targetId: target.id };
}

function applyDamage(state, expedition, person, amount, cause) {
  const previousHp = person.hp;
  person.hp = Math.max(0, person.hp - amount);
  if (person.hp === 0) {
    person.injury = '重傷';
    if (!expedition.casualties.includes(person.name)) expedition.casualties.push(person.name);
    const helper = activeFor(state, expedition).find(other => other.id !== person.id);
    if (helper) {
      expedition.campMemory = { type: 'wounded', actorId: helper.id, targetId: person.id };
      adjustRelation(state, helper.id, person.id, 1);
    }
  }
  return previousHp - person.hp;
}

function addLoot(state, expedition, rng, source) {
  const dungeon = dungeonFor(expedition);
  let pool = dungeon.lootPool.map(templateId => LOOT_ITEMS.find(item => item.template === templateId)).filter(Boolean);
  if (source === 'boss') {
    const rare = pool.filter(item => item.rarity === 'rare');
    if (rare.length) pool = rare;
  }
  if (!pool.length) pool = LOOT_ITEMS;
  const template = pick(rng, pool);
  recordDiscovery(expedition, 'loot', template.name);
  const item = { ...template, uid: `${template.template}_${Date.now()}_${Math.floor(rng() * 100000)}`, foundOnRun: expedition.id };
  delete item.template;
  const weight = Number(item.weight || 1);
  const overloadedLimit = expedition.carryLimit + Math.ceil(expedition.carryLimit * .22);
  if (expedition.carriedWeight + weight > overloadedLimit) {
    const carrierText = partyHas(expedition, state, 'carrier')
      ? '運び屋が荷を組み直し、ほかの荷を守った。'
      : (state.unlockedJobs || []).includes('carrier')
        ? '運び屋がいれば、より多く運べただろう。'
        : '荷を増やせる仲間がいれば、より多く運べただろう。';
    addLog(expedition, `荷が限界に達し、「${item.name}」はその場に残した。${carrierText}`, 'danger');
    return null;
  }
  expedition.loot.push(item);
  expedition.carriedWeight += weight;
  const baseCarryLimit = Math.max(12, expedition.partyIds.length * 8);
  if (partyHas(expedition, state, 'carrier') && expedition.carriedWeight > baseCarryLimit) recordDiscovery(expedition, 'skills', '積載補助');
  if (expedition.carriedWeight > expedition.carryLimit) {
    expedition.overloaded = true;
    applyLoadFatigue(state, expedition, 2);
  }
  return item;
}

function partyHas(expedition, state, job) { return partyFor(state, expedition.partyIds).some(person => person.job === job); }

function applyLoadFatigue(state, expedition, base = 4) {
  if (expedition.carriedWeight <= expedition.carryLimit) return;
  const carrier = partyFor(state, expedition.partyIds).find(person => person.job === 'carrier');
  if (carrier) recordDiscovery(expedition, 'skills', '重量超過時の疲労軽減');
  const relief = carrier ? statsFor(carrier, state.inventory).carrierFatigueRelief : 0;
  const penalty = Math.max(1, base - relief);
  for (const person of activeFor(state, expedition)) person.fatigue = Math.min(100, person.fatigue + penalty);
}

function enterCamp(state, expedition) {
  expedition.phase = 'camp';
  expedition.campedAt.push(expedition.floor);
  const scene = createCampScene(state, expedition, randomFor(expedition), expedition.floor);
  resolveCarrierCampSupport(state, expedition, scene, randomFor(expedition));
  if (expedition.campContext?.type === 'thief') scene.narration.push('盗賊は罠と鍵の構造を手帳に写し、次の通路を先に調べると話した。');
  if (expedition.campContext?.type === 'archer' || expedition.campContext?.type === 'gorge') scene.narration.push('弓師は崖上の風向きを確かめ、遠距離の敵を見逃さないよう相談した。');
  if (expedition.campContext?.type === 'carrier') scene.narration.push('運び屋は荷紐を結び直し、「これ以上積むなら帰路に余裕を見よう」と告げた。');
  if (expedition.campContext?.type === 'trap') scene.narration.push('さきほどの罠の話が出た。慎重に足元を見るべきだという声に、皆がうなずいた。');
  if (expedition.campContext?.type === 'locked-chest') scene.narration.push('鍵のかかった宝箱のことを思い出し、道具があれば開けられたかもしれないと話した。');
  expedition.narrative = { type: 'camp', title: scene.title, description: '焚き火のそばで、仲間たちは夜を越える支度を整えた。', campScene: scene };
  expedition.campMemory = null;
  expedition.campChanges = [...(expedition.campChanges || []), ...scene.changes];
  addLog(expedition, `${scene.title}が始まった。`, 'camp');
  for (const line of [...scene.dialogue.map(turn => `${turn.speakerName}「${turn.text}」`), ...scene.narration].reverse()) addLog(expedition, line, 'camp');
  expedition.campContext = null;
  resolveCampRaid(state, expedition, scene, randomFor(expedition));
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resolveCarrierCampSupport(state, expedition, scene, rng = Math.random) {
  const party = activeFor(state, expedition);
  const carrier = party.find(person => person.job === 'carrier');
  if (!carrier || !scene) return null;
  const averageFatigue = party.reduce((sum, person) => sum + Number(person.fatigue || 0), 0) / Math.max(1, party.length);
  const hpNeed = party.reduce((sum, person) => {
    const maximum = Math.max(1, statsFor(person, state.inventory).maxHp);
    return sum + (maximum - Math.max(0, person.hp)) / maximum;
  }, 0) / Math.max(1, party.length);
  const policyShift = expedition.policy === 'safe' ? -.12 : expedition.policy === 'push' ? .13 : 0;
  const supportRank = statsFor(carrier, state.inventory).carrierFatigueRelief;
  const personalityShift = carrier.personality === '世話好き' ? .12 : carrier.personality === '温厚' ? .07 : carrier.personality === '無口' ? -.06 : 0;
  const danger = ({ 'old-cave': 0, 'trap-fort': .15, 'wind-gorge': .12, 'collapsed-mine': .17, 'trial-labyrinth': .2 })[expedition.dungeonId] ?? .1;
  const chance = clamp(.18 + Math.min(.1, supportRank * .012) + Math.min(.2, averageFatigue / 100 * .28) + Math.min(.16, hpNeed * .35) + policyShift + personalityShift - danger * .22, .045, .72);
  if (rng() >= chance) return null;

  const cooking = hpNeed >= .055 || (hpNeed > .015 && rng() < (expedition.policy === 'push' ? .78 : .58)) || (averageFatigue >= 38 && rng() < .3);
  const affected = [];
  let hpRestored = 0;
  let fatigueReduced = 0;
  for (const person of party) {
    if (cooking) {
      const maximum = Math.max(1, statsFor(person, state.inventory).maxHp);
      const beforeHp = person.hp;
      person.hp = Math.min(maximum, person.hp + Math.max(2, Math.round(maximum * (.04 + supportRank * .004))));
      hpRestored += person.hp - beforeHp;
    }
    const beforeFatigue = Number(person.fatigue || 0);
    const amount = (cooking ? 3 : 4) + Math.floor(supportRank / 2);
    person.fatigue = Math.max(0, beforeFatigue - amount);
    fatigueReduced += beforeFatigue - person.fatigue;
    if (person.id !== carrier.id && rng() < .22) {
      adjustRelation(state, carrier.id, person.id, 1);
      affected.push(person);
    }
  }
  const listener = affected[0] || party.find(person => person.id !== carrier.id);
  const reply = cooking
    ? 'こんな時の温かい食事は、思った以上に身にしみるな。'
    : 'その曲を聞くと、さっきまでの疲れが少し遠のくよ。';
  scene.campActivity = { carrierId: carrier.id, type: cooking ? 'cook' : 'play' };
  scene.supportEvent = {
    carrierId: carrier.id, type: cooking ? 'cook' : 'play', hpRestored, fatigueReduced,
    summary: cooking ? `料理でHPを合計${hpRestored}回復し、疲労を合計${fatigueReduced}軽減した。` : `演奏で疲労を合計${fatigueReduced}軽減した。`
  };
  scene.speakers = [...new Set([...(scene.speakers || []), carrier.id, ...(listener ? [listener.id] : [])])];
  if (cooking) {
    scene.title = '運び屋の温かな夕食';
    scene.dialogue.push({ speakerId: carrier.id, speakerName: carrier.name, text: '温かいうちに食べよう。鍋を空にしたら、明日の荷もまとめておく。' });
    if (listener) scene.dialogue.push({ speakerId: listener.id, speakerName: listener.name, text: reply });
    scene.narration.push(`${carrier.name}は小鍋を火にかけ、皆へ温かな食事を振る舞った。食欲とともに、張り詰めていた肩の力が少し抜ける。`);
    expedition.campSupportRiskBonus = .012;
  } else {
    scene.title = '焚き火の小さな演奏';
    scene.dialogue.push({ speakerId: carrier.id, speakerName: carrier.name, text: '帰り道まで気を張り詰めたままじゃいられない。少しだけ付き合ってくれ。' });
    if (listener) scene.dialogue.push({ speakerId: listener.id, speakerName: listener.name, text: reply });
    scene.narration.push(`${carrier.name}は荷の底から小さな弦楽器を取り出し、焚き火のそばで静かな曲を奏でた。`);
    expedition.campSupportRiskBonus = .009;
  }
  if (listener) scene.changes.push(`${carrier.name}と${listener.name}のあいだに、ささやかな安らぎが生まれた。`);
  return scene.supportEvent;
}

export function campRaidRisk(state, expedition) {
  const party = activeFor(state, expedition);
  const averageFatigue = party.length ? party.reduce((sum, person) => sum + Number(person.fatigue || 0), 0) / party.length : 0;
  const carriedValue = (expedition.loot || []).reduce((sum, item) => sum + Math.max(0, Number(item.value || 0)), 0);
  const dungeonRisk = ({ 'old-cave': 0, 'trap-fort': .085, 'wind-gorge': .075, 'collapsed-mine': .1 })[expedition.dungeonId] ?? .04;
  const thiefWatch = party.some(person => person.job === 'thief') ? .12 : 0;
  const epithetAwareness = party.reduce((sum, person) => sum + statsFor(person, state.inventory).raidAwareness, 0);
  const archerWatch = party.some(person => person.job === 'archer') ? .05 : 0;
  const cautiousWatch = party.some(person => person.personality === '慎重') ? .045 : 0;
  const policy = expedition.policy === 'safe' ? -.13 : expedition.policy === 'push' ? .08 : 0;
  const levelRisk = Math.max(0, Number(expedition.guildLevel || state.guildLevel || 1) - 1) * .038;
  const fameRisk = Math.min(.08, Number(state.guildContribution || 0) / 6000);
  const lootRisk = Math.min(.15, carriedValue / 850 * .15);
  const fatigueRisk = averageFatigue / 100 * .16;
  const alarmRisk = expedition.alerted ? .06 : 0;
  const campSupportRiskBonus = Math.max(0, Number(expedition.campSupportRiskBonus || 0));
  const chance = clamp(.025 + levelRisk + dungeonRisk + fameRisk + lootRisk + fatigueRisk + alarmRisk + campSupportRiskBonus + policy - thiefWatch - archerWatch - cautiousWatch - Math.min(.18, epithetAwareness), .01, .55);
  return { chance, averageFatigue, carriedValue, campSupportRiskBonus, level: Number(expedition.guildLevel || state.guildLevel || 1), fame: Number(state.guildContribution || 0) };
}

export function resolveCampRaid(state, expedition, scene, rng) {
  const risk = campRaidRisk(state, expedition);
  expedition.campSupportRiskBonus = 0;
  if (rng() >= risk.chance) return;
  const party = activeFor(state, expedition);
  if (!party.length) return;
  const assassinAllowed = risk.level >= 4 && risk.fame >= 240;
  const assassinChance = assassinAllowed ? clamp(.1 + Math.max(0, risk.fame - 240) / 1200 + risk.carriedValue / 1800, .1, .46) : 0;
  const kind = rng() < assassinChance ? 'assassin' : risk.level >= 3 ? 'bandit' : 'thief';
  const descriptions = {
    thief: { label: '夜盗', record: '野営地周辺の夜盗', ids: ['night-thief', 'night-thief'], templates: { 'night-thief': { name: '夜盗', hp: 22, attack: 7, defense: 1, speed: 10, xp: 2, kind: 'raider' } } },
    bandit: { label: '山賊', record: '組織化された山賊の夜襲', ids: ['camp-bandit', 'camp-bandit'], templates: { 'camp-bandit': { name: '山賊', hp: 34, attack: 10, defense: 3, speed: 9, xp: 4, kind: 'raider' } } },
    assassin: { label: '暗殺ギルドの刺客', record: '暗殺ギルドによる襲撃', ids: ['guild-assassin'], templates: { 'guild-assassin': { name: '暗殺ギルドの刺客', hp: 48, attack: 13, defense: 4, speed: 14, xp: 7, kind: 'assassin', ranged: true } } }
  }[kind];
  const watch = party.find(person => person.job === 'thief' || person.job === 'archer' || person.personality === '慎重');
  const observed = (expedition.observationTargetId || 'expedition') === 'expedition';
  recordDiscovery(expedition, 'externalThreats', descriptions.record);
  expedition.raidTemplates = descriptions.templates;
  expedition.raidAttackScale = expedition.policy === 'safe' ? .72 : expedition.policy === 'push' ? 1.08 : .9;
  expedition.pendingCampRaid = true;
  expedition.raidReports ||= [];
  const threatLine = kind === 'assassin'
    ? '暗殺者はギルドで名の知られた冒険者を狙い、野営地へ忍び寄った。'
    : kind === 'bandit' ? '見張りの隙を突き、組織化された山賊が野営地へ踏み込んだ。'
      : '荷物を狙う夜盗が、焚き火の陰から野営地へ近づいた。';
  if (watch) addLog(expedition, `${watch.name}が物音に気づき、仲間を起こした。`, 'danger');
  addLog(expedition, threatLine, 'danger');
  expedition.narrative = {
    type: 'raid', title: `${descriptions.label}の襲撃`,
    description: observed ? `${watch ? `${watch.name}の警告で冒険者たちが起き上がった。` : '物音に気づいた冒険者たちが起き上がった。'} ${threatLine}` : '野営中に襲撃を受けた。冒険者たちは自律的に応戦した。',
    campScene: scene
  };
  if (kind === 'assassin') {
    const target = party.find(person => person.id === expedition.leaderId) || party.slice().sort((a, b) => b.level - a.level || a.hp - b.hp)[0];
    expedition.assassinationTargetId = target?.id || null;
    if (target) addLog(expedition, `刺客の狙いは、隊を率いる${target.name}だった。`, 'danger');
  }
  expedition.raidAttackScale = (expedition.raidAttackScale || 1) * (watch ? .88 : 1);
  const result = simulateBattle(state, expedition, descriptions.ids, expedition.floor, rng);
  expedition.raidAttackScale = 1;
  for (const line of result.lines.slice().reverse()) addLog(expedition, line, line.includes('回復') || line.includes('倒した') ? 'good' : 'danger');
  const survived = activeFor(state, expedition).length;
  let stolen = null;
  if (!result.victory && expedition.loot.length) {
    const carrier = party.some(person => person.job === 'carrier');
    const thief = party.some(person => person.job === 'thief');
    const lossChance = clamp(.58 - (carrier ? .2 : 0) - (thief ? .17 : 0) - (expedition.policy === 'safe' ? .14 : 0), .08, .58);
    if (rng() < lossChance) {
      const index = expedition.loot.reduce((best, item, i, items) => Number(item.value || 0) > Number(items[best]?.value || 0) ? i : best, 0);
      stolen = expedition.loot.splice(index, 1)[0];
      expedition.carriedWeight = Math.max(0, expedition.carriedWeight - Number(stolen.weight || 0));
      addLog(expedition, `混乱の間に「${stolen.name}」を奪われた。`, 'danger');
    }
  }
  if (!result.victory && !survived) addLog(expedition, '仲間たちは救助され、重傷者を伴って帰還することになった。', 'danger');
  const summary = `${descriptions.label}の襲撃を受け、${result.victory ? '撃退した' : '敵は夜陰に紛れて退いた'}。${stolen ? `戦利品「${stolen.name}」を1点失った。` : '持ち帰る戦利品は守られた。'}${!survived ? '全員が戦闘不能となり救助された。' : ''}`;
  expedition.raidReports.unshift({ kind, label: descriptions.label, summary, observed, stolen: stolen?.name || null });
  expedition.campMemory = result.campMemory || expedition.campMemory || null;
  expedition.currentBattle = {
    id: `${expedition.id}-raid-${expedition.floor}-${expedition.elapsed}`, type: 'raid', status: 'playing', playbackIndex: -1,
    initialSnapshot: result.initialSnapshot, actions: result.actions, foes: result.foes,
    rounds: result.rounds, victory: result.victory, enemyCount: result.enemies,
    logEntryCount: result.lines.length + 3,
    displayTitle: result.victory ? `${descriptions.label}を撃退` : '襲撃者は闇へ退いた',
    displayDescription: summary
  };
  expedition.pendingBattleAdvance = true;
}

function startNextFloor(state, expedition) {
  const dungeon = dungeonFor(expedition);
  expedition.floor++;
  if (expedition.floor > dungeon.floors) return;
  expedition.phase = 'explore';
  expedition.eventIndex = 0;
  if (!expedition.visitedFloors.includes(expedition.floor)) expedition.visitedFloors.push(expedition.floor);
  recordDiscovery(expedition, 'floors', expedition.floor);
  expedition.floorEvents = makeFloorEvents(expedition, expedition.floor);
  const floorName = dungeon.floorNames[expedition.floor - 1];
  expedition.narrative = { type: 'explore', title: `第${expedition.floor}階層へ`, description: `${floorName}へ進んだ。足元と周囲を確かめ、次の気配を探る。` };
  addLog(expedition, `第${expedition.floor}階層「${floorName}」へ進んだ。`, 'good');
  if (expedition.carriedWeight > expedition.carryLimit) {
    applyLoadFatigue(state, expedition, 4);
    const carrier = partyFor(state, expedition.partyIds).find(person => person.job === 'carrier');
    addLog(expedition, carrier ? `${carrier.name}が荷を整理し、重量超過による疲労を抑えた。` : '荷が重く、歩くたびに疲労が増している。', 'danger');
    expedition.campContext = { type: carrier ? 'carrier' : 'overloaded' };
  }
}

function shouldRetreat(state, expedition) {
  const members = partyFor(state, expedition.partyIds);
  const alive = members.filter(person => person.hp > 0);
  if (!alive.length) return true;
  const ratios = alive.map(person => person.hp / statsFor(person, state.inventory).maxHp);
  const average = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  const fatigueValues = alive.map(person => Number(person.fatigue || 0));
  const averageFatigue = fatigueValues.reduce((sum, value) => sum + value, 0) / fatigueValues.length;
  const worstFatigue = Math.max(...fatigueValues);
  const severeMarchFatigue = expedition.dungeonId === 'collapsed-mine';
  const cautious = alive.filter(person => person.personality === '慎重').length;
  const loadDanger = expedition.carriedWeight > expedition.carryLimit * 1.15;
  if (expedition.policy === 'safe') return average < .70 || ratios.some(ratio => ratio < .43) || cautious >= 2 && average < .78 || severeMarchFatigue && (averageFatigue >= 58 || worstFatigue >= 84) || loadDanger;
  if (expedition.policy === 'push') return average < .25 || ratios.some(ratio => ratio < .09) || alive.length < Math.ceil(members.length / 2) || severeMarchFatigue && averageFatigue >= 95;
  return average < .43 || ratios.some(ratio => ratio < .19) || alive.length < Math.ceil(members.length / 2) || severeMarchFatigue && (averageFatigue >= 78 || worstFatigue >= 96) || loadDanger;
}

function finishExpedition(state, outcome, reason) {
  const expedition = state.expedition;
  if (!expedition) return;
  const dungeon = dungeonFor(expedition);
  const observed = (expedition.observationTargetId || 'expedition') === 'expedition';
  mergeExpeditionSurvey(state, expedition, outcome, { summaryOnly: !observed });
  const party = partyFor(state, expedition.partyIds);
  const expPerMember = Math.max(4, Math.floor((expedition.xpEarned + expedition.bonusXp + expedition.visitedFloors.length * 5) / Math.max(1, party.length)));
  const levelUps = [];
  const injuries = [];
  const fatigueChanges = [];
  for (const person of party) {
    const fatigueBefore = Number(person.fatigue || 0);
    person.exp += expPerMember;
    let gained = 0;
    while (person.level < 20 && person.exp >= person.level * 42) { person.exp -= person.level * 42; person.level++; gained++; }
    if (gained) levelUps.push({ name: person.name, levels: gained, level: person.level });
    const stats = statsFor(person, state.inventory);
    if (person.hp <= 0) person.injury = '重傷';
    else if (person.hp / stats.maxHp < .36) person.injury = '負傷';
    else if (person.injury !== '重傷') person.injury = null;
    if (person.injury) injuries.push({ name: person.name, kind: person.injury });
    const startHp = Number(expedition.startHp?.[person.id] ?? stats.maxHp);
    const lostRatio = Math.max(0, Math.min(1, (startHp - person.hp) / Math.max(1, stats.maxHp)));
    const basicFatigue = outcome === 'cleared' ? 12 : 9;
    const damageFatigue = Math.round(Math.min(.55, lostRatio) * 36);
    const injuryFatigue = person.injury === '重傷' ? 12 : person.injury === '負傷' ? 6 : 0;
    const equipmentFatigue = stats.equipmentFatigue || 0;
    const epithetFatigueReduction = Number(stats.fatigueReduction || 0);
    person.fatigue = Math.min(100, Math.max(0, fatigueBefore + basicFatigue + damageFatigue + injuryFatigue + equipmentFatigue - epithetFatigueReduction));
    person.guildTrust = Math.max(0, Math.min(100, Number(person.guildTrust ?? 75) + (outcome === 'cleared' ? 2 : outcome === 'retreat' ? 0 : -2)));
    fatigueChanges.push({ name: person.name, before: Number(expedition.startFatigue?.[person.id] ?? fatigueBefore), after: person.fatigue, basic: basicFatigue, damage: damageFatigue + injuryFatigue, equipment: equipmentFatigue, honor: epithetFatigueReduction });
    person.activityHistory ||= [];
    person.activityHistory.unshift({
      day: state.day, title: '遠征',
      summary: `${dungeon.name}へ遠征し、第${Math.max(...expedition.visitedFloors)}階層まで進んだ。${expedition.kills}体を討伐し、経験値${expPerMember}を得た。`,
      xp: expPerMember, fatigueDelta: person.fatigue - Number(expedition.startFatigue?.[person.id] ?? fatigueBefore)
    });
    person.activityHistory = person.activityHistory.slice(0, 8);
  }
  let bossAwards = [];
  if (expedition.dungeonId === 'trial-labyrinth' && expedition.trialBossVictory && !state.trialBossDefeated) {
    state.trialBossDefeated = true;
    bossAwards = awardTrialHonors(state, expedition, expedition.trialBossBattle);
  }
  const discoveries = structuredClone(expedition.discovery || createExpeditionDiscovery(0));
  if (!observed) {
    for (const field of ['enemies', 'hazards', 'statusEffects', 'environments', 'skills', 'equipment', 'loot', 'bosses', 'specialBosses', 'routes', 'sealedRooms', 'events']) discoveries[field] = [];
  }
  const summary = {
    id: expedition.id, dungeonId: dungeon.id, dungeonName: dungeon.name, floors: outcome === 'cleared' ? dungeon.floors : null,
    outcome, title: outcome === 'cleared' ? '調査完了' : outcome === 'defeat' ? '緊急帰還' : outcome === 'sealed' ? '封鎖された最深部を確認' : '撤退して帰還', reason,
    partyNames: party.map(person => person.name), partyIds: party.map(person => person.id),
    floor: expedition.floor, reachedFloor: Math.max(...expedition.visitedFloors), kills: expedition.kills,
    defeated: observed ? expedition.defeated.slice() : [], xp: expPerMember, totalXp: expedition.xpEarned + expedition.bonusXp,
    loot: expedition.loot.map(item => ({ ...item, resolved: item.slot === 'key' ? '重要品として保管' : item.resolved || null })), carriedWeight: expedition.carriedWeight,
    carryLimit: expedition.carryLimit, overloaded: Boolean(expedition.overloaded),
    levelUps, injuries, relationHints: observed ? [...(expedition.campChanges || [])] : (expedition.campChanges?.length ? ['仲間同士の関係に変化があったようです。'] : []),
    discoveries, bossAwards,
    raidReports: (expedition.raidReports || []).map(report => ({ ...report })),
    log: observed ? expedition.log.slice(0, 24) : [], day: state.day,
    observed, observationTargetLabel: expedition.observationGroup?.label || '主遠征隊',
    fatigueChanges, autonomousActivities: [], nextDay: state.day + 1
  };
  state.stats.kills += expedition.kills;
  if (outcome === 'cleared') state.stats.clears++;
  state.history.unshift({ title: summary.title, dungeonId: dungeon.id, dungeonName: dungeon.name, floor: summary.reachedFloor, kills: summary.kills, day: state.day, outcome });
  state.history = state.history.slice(0, 5);
  state.expedition = null;
  state.lastResult = summary;
  state.screen = 'expedition';
  const timeResult = advanceDay(state, { activityPlan: expedition.activityPlan || [], lockedIds: expedition.partyIds });
  summary.autonomousActivities = timeResult.activities.map(({ label, summary: activitySummary }) => ({ label, summary: activitySummary }));
  summary.economicEvents = timeResult.economic ? [timeResult.economic] : [];
  summary.departures = timeResult.departures || [];
  summary.nextDay = timeResult.day;
}

export function restAtGuild(state, adventurerId = '') {
  if (state.expedition) return { ok: false, message: '遠征中は休養できません。' };
  const person = adventurerId ? state.adventurers.find(entry => entry.id === adventurerId) : null;
  if (adventurerId && !person) return { ok: false, message: '休養させる冒険者が見つかりません。' };
  const forcedIds = person ? [person.id] : state.adventurers.map(entry => entry.id);
  const activityPlan = createActivityPlan(state, { forcedIds, forcedType: 'rest', forNextDay: true });
  const result = advanceDay(state, { activityPlan, forcedIds });
  const departed = person && !state.adventurers.some(entry => entry.id === person.id);
  const message = departed
    ? `${person.name}は休養を取る前にギルドを去りました。`
    : person ? `第${result.day}日。${person.name}は休養し、傷と疲労の回復に努めました。` : `第${result.day}日。全員が休養し、体力・疲労・負傷の回復に努めました。`;
  return { ok: true, result, message };
}

export function policyName(policy) {
  return policy === 'safe' ? '安全第一' : policy === 'push' ? '攻略優先' : '標準';
}
