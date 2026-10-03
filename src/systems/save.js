import { STARTING_ADVENTURERS, statsFor } from '../data/adventurers.js';
import { ensureSpriteAppearance } from '../data/sprite-appearance.js';
import { ensureUniquePortraitAppearances } from '../data/portrait-appearance.js';
import { STARTING_ITEMS, LOOT_ITEMS, SHOP_ITEMS } from '../data/items.js';
import { DUNGEONS } from '../data/dungeon.js';
import { syncGuildProgress, partyLimitForLevel } from './guild.js';
import { createSurveyRecord, createExpeditionDiscovery } from './survey.js';

const SAVE_KEY = 'ashen-crown-guild-v01';

export function createInitialState() {
  const state = {
    version: 12,
    day: 1,
    screen: 'home',
    adventurers: structuredClone(STARTING_ADVENTURERS),
    inventory: structuredClone(STARTING_ITEMS),
    party: ['leon', 'milia', 'elna'],
    leaderId: 'leon',
    policy: 'balanced',
    selectedDungeonId: 'old-cave',
    guildLevel: 1,
    guildContribution: 0,
    guildNotices: [],
    unlockedDungeons: ['old-cave'],
    unlockedJobs: ['warrior', 'mage', 'priest'],
    surveyRecords: { 'old-cave': createSurveyRecord() },
    gold: 90,
    financeHistory: [{ day: 1, delta: 90, label: 'ギルド設立資金' }],
    warehouseFilter: 'all',
    warehouseExchangeSequence: 0,
    warehouseExchangeHistory: [],
    relationships: {},
    recruitmentCandidates: [],
    recruitmentReadyOn: 1,
    recruitmentSequence: 0,
    recruitmentBoostJobs: [],
    passedRecruitCandidates: [],
    observationChoice: 'expedition',
    departedAdventurers: [],
    economicNotices: [],
    departureNotices: [],
    dayActivitySummary: [],
    expedition: null,
    lastResult: null,
    trialSealDiscovered: false,
    trialBossRoomUnlocked: false,
    trialBossDefeated: false,
    trialKeyHistory: [],
    trialBossRecords: [],
    history: [],
    stats: { runs: 0, clears: 0, kills: 0 }
  };
  const ids = state.adventurers.map(person => person.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) state.relationships[pairKey(ids[i], ids[j])] = 50;
  Object.assign(state.relationships, {
    [pairKey('leon', 'elna')]: 72,
    [pairKey('bram', 'milia')]: 37,
    [pairKey('cecil', 'toma')]: 65,
    [pairKey('milia', 'leon')]: 56
  });
  for (const person of state.adventurers) person.hp = statsFor(person, state.inventory).maxHp;
  for (const person of state.adventurers) {
    person.guildTrust = 76;
    person.activityHistory = [];
    ensureSpriteAppearance(person);
  }
  ensureUniquePortraitAppearances(state.adventurers);
  return state;
}

function migrateSave(saved) {
  const fresh = createInitialState();
  const migrated = { ...fresh, ...saved, version: 12, stats: { ...fresh.stats, ...(saved.stats || {}) } };
  migrated.adventurers = Array.isArray(saved.adventurers) ? saved.adventurers : fresh.adventurers;
  migrated.inventory = Array.isArray(saved.inventory) ? saved.inventory : fresh.inventory;
  const knownItems = [...STARTING_ITEMS, ...LOOT_ITEMS, ...SHOP_ITEMS];
  for (const item of migrated.inventory) {
    const template = knownItems.find(candidate => candidate.name === item.name && candidate.slot === item.slot);
    if (template && !item.effects && template.effects) item.effects = structuredClone(template.effects);
  }
  migrated.party = Array.isArray(saved.party) ? saved.party.slice() : fresh.party.slice();
  migrated.relationships = { ...fresh.relationships, ...(saved.relationships || {}) };
  migrated.history = Array.isArray(saved.history) ? saved.history : [];
  migrated.guildContribution = Math.max(0, Number(saved.guildContribution || 0));
  migrated.guildLevel = Math.max(1, Math.min(5, Number(saved.guildLevel || 1)));
  migrated.guildNotices = Array.isArray(saved.guildNotices) ? saved.guildNotices : [];
  if (![4, 5, 6, 7, 8, 9, 10, 11, 12].includes(saved.version)) {
    migrated.guildNotices = migrated.guildNotices.map((notice, index) => ({
      id: `migrated-${notice.id || index}`,
      title: 'ギルド公認ランクが上昇しました',
      details: ['ギルドの権限が拡大しました。']
    }));
  }
  migrated.surveyRecords = saved.surveyRecords && typeof saved.surveyRecords === 'object' && !Array.isArray(saved.surveyRecords) ? saved.surveyRecords : {};
  for (const dungeonId of migrated.unlockedDungeons || ['old-cave']) {
    const record = migrated.surveyRecords[dungeonId] || createSurveyRecord();
    migrated.surveyRecords[dungeonId] = { ...createSurveyRecord(), ...record, externalThreats: Array.isArray(record.externalThreats) ? record.externalThreats : [] };
  }
  migrated.gold = Math.max(0, Number(saved.gold ?? fresh.gold));
  migrated.recruitmentCandidates = Array.isArray(saved.recruitmentCandidates) ? saved.recruitmentCandidates : [];
  migrated.financeHistory = Array.isArray(saved.financeHistory) ? saved.financeHistory.slice(0, 50) : [];
  migrated.warehouseFilter = ['all', 'weapon', 'armor', 'material', 'consumable', 'valuable', 'important', 'other'].includes(saved.warehouseFilter) ? saved.warehouseFilter : 'all';
  migrated.warehouseExchangeSequence = Math.max(0, Number(saved.warehouseExchangeSequence || 0));
  migrated.warehouseExchangeHistory = Array.isArray(saved.warehouseExchangeHistory) ? saved.warehouseExchangeHistory.slice(0, 20) : [];
  migrated.recruitmentReadyOn = Math.max(1, Number(saved.recruitmentReadyOn ?? migrated.day ?? 1));
  migrated.recruitmentSequence = Math.max(0, Number(saved.recruitmentSequence || 0));
  migrated.recruitmentBoostJobs = Array.isArray(saved.recruitmentBoostJobs) ? saved.recruitmentBoostJobs : [];
  migrated.passedRecruitCandidates = Array.isArray(saved.passedRecruitCandidates) ? saved.passedRecruitCandidates : [];
  migrated.departedAdventurers = Array.isArray(saved.departedAdventurers) ? saved.departedAdventurers : [];
  const rosterHistory = [...migrated.adventurers, ...migrated.departedAdventurers, ...migrated.recruitmentCandidates];
  for (const person of rosterHistory) {
    ensureSpriteAppearance(person);
    person.epithets = Array.isArray(person.epithets) ? person.epithets : [];
  }
  ensureUniquePortraitAppearances(rosterHistory);
  migrated.economicNotices = Array.isArray(saved.economicNotices) ? saved.economicNotices : [];
  migrated.departureNotices = Array.isArray(saved.departureNotices) ? saved.departureNotices : [];
  migrated.dayActivitySummary = Array.isArray(saved.dayActivitySummary) ? saved.dayActivitySummary : [];
  migrated.observationChoice = saved.observationChoice || 'expedition';
  migrated.trialSealDiscovered = Boolean(saved.trialSealDiscovered);
  migrated.trialBossRoomUnlocked = Boolean(saved.trialBossRoomUnlocked);
  migrated.trialBossDefeated = Boolean(saved.trialBossDefeated);
  migrated.trialKeyHistory = Array.isArray(saved.trialKeyHistory) ? saved.trialKeyHistory : [];
  migrated.trialBossRecords = Array.isArray(saved.trialBossRecords) ? saved.trialBossRecords : [];
  migrated.selectedDungeonId = saved.selectedDungeonId || 'old-cave';
  const trialWasUnlocked = (migrated.unlockedDungeons || []).includes('trial-labyrinth');
  syncGuildProgress(migrated);
  if (!trialWasUnlocked && migrated.unlockedDungeons.includes('trial-labyrinth')) {
    migrated.guildNotices.push({
      id: 'migrated-trial-permit',
      title: '王国より調査許可が下りました',
      details: ['新たな地域への遠征が可能になりました。内部状況は不明です。']
    });
  }
  // Old v0.2 allowed four at the start. The expanded roster now opens at three;
  // preserve the first three selected members while keeping the old save usable.
  migrated.party = migrated.party.filter(id => migrated.adventurers.some(person => person.id === id)).slice(0, partyLimitForLevel(migrated.guildLevel));
  if (!migrated.party.includes(migrated.leaderId)) migrated.leaderId = migrated.party[0] || '';
  if (migrated.expedition) {
    migrated.expedition.dungeonId ||= 'old-cave';
    migrated.expedition.carryLimit ||= Math.max(12, migrated.expedition.partyIds?.length * 5 || 15);
    migrated.expedition.carriedWeight ??= (migrated.expedition.loot || []).reduce((sum, item) => sum + Number(item.weight || 1), 0);
    migrated.expedition.floorEvents ||= [];
    migrated.expedition.campChanges ||= [];
    migrated.expedition.observationTargetId ||= 'expedition';
    migrated.expedition.observationGroup ||= null;
    migrated.expedition.observationFeed ||= [];
    migrated.expedition.activityPlan ||= [];
    migrated.expedition.guildLevel ||= migrated.guildLevel || 1;
    migrated.expedition.raidReports ||= [];
    migrated.expedition.pendingCampRaid ??= false;
    migrated.expedition.raidAttackScale ||= 1;
    migrated.expedition.startHp ||= Object.fromEntries((migrated.expedition.partyIds || []).map(id => [id, migrated.adventurers.find(person => person.id === id)?.hp || 1]));
    migrated.expedition.startFatigue ||= Object.fromEntries((migrated.expedition.partyIds || []).map(id => [id, migrated.adventurers.find(person => person.id === id)?.fatigue || 0]));
    if (!migrated.expedition.discovery) {
      migrated.expedition.discovery = createExpeditionDiscovery(0);
      migrated.expedition.discovery.floors = [...new Set(migrated.expedition.visitedFloors || [migrated.expedition.floor || 1])];
    }
  }
  if (migrated.lastResult && !Array.isArray(migrated.lastResult.loot)) migrated.lastResult.loot = [];
  // v0.2 automatically stored all returned equipment before displaying its report.
  if (saved.version === 1) for (const item of migrated.lastResult?.loot || []) item.resolved ||= '保管';
  for (const person of migrated.adventurers) {
    person.fatigue = Math.max(0, Math.min(100, Number(person.fatigue || 0)));
    person.level = Math.max(1, Number(person.level || 1));
    person.hp = Math.max(0, Math.min(statsFor(person, migrated.inventory).maxHp, Number(person.hp ?? statsFor(person, migrated.inventory).maxHp)));
    person.guildTrust = Math.max(0, Math.min(100, Number(person.guildTrust ?? 75)));
    person.activityHistory = Array.isArray(person.activityHistory) ? person.activityHistory.slice(0, 8) : [];
  }
  if (saved.version < 4) migrateHistoricSurvey(migrated, saved.version);
  if (migrated.expedition) migrated.screen = 'expedition';
  return migrated;
}

function migrateHistoricSurvey(state, previousVersion) {
  const knownNames = {
    '古びた洞窟': 'old-cave',
    '罠師の廃砦': 'trap-fort',
    '風裂き峡谷': 'wind-gorge',
    '崩落鉱山': 'collapsed-mine'
  };
  const findDungeonId = entry => {
    if (entry?.dungeonId && DUNGEONS[entry.dungeonId]) return entry.dungeonId;
    if (entry?.dungeonName && knownNames[entry.dungeonName]) return knownNames[entry.dungeonName];
    if (entry?.dungeonName) return Object.values(DUNGEONS).find(dungeon => dungeon.name === entry.dungeonName)?.id || null;
    return previousVersion === 1 ? 'old-cave' : null;
  };
  const recordFor = dungeonId => {
    if (!dungeonId || !(state.unlockedDungeons || []).includes(dungeonId)) return null;
    return state.surveyRecords[dungeonId] ||= createSurveyRecord();
  };
  const addFacts = (record, field, values) => {
    const list = Array.isArray(values) ? values : [values];
    record[field] = [...new Set([...(record[field] || []), ...list.filter(value => value !== null && value !== undefined && value !== '')])];
  };
  const addVisitedFloors = (record, floor) => {
    const reached = Math.max(0, Math.floor(Number(floor || 0)));
    if (reached) addFacts(record, 'floors', Array.from({ length: reached }, (_, index) => index + 1));
  };

  for (const entry of state.history || []) {
    const record = recordFor(findDungeonId(entry));
    if (!record) continue;
    record.runs++;
    addVisitedFloors(record, entry.floor);
    if (typeof entry.outcome === 'string') record.lastOutcome = entry.outcome;
  }

  const result = state.lastResult;
  if (!result) return;
  const dungeonId = findDungeonId(result);
  const record = recordFor(dungeonId);
  if (!record) return;
  const hasMatchingHistory = (state.history || []).some(entry => findDungeonId(entry) === dungeonId && Number(entry.day) === Number(result.day) && Number(entry.floor) === Number(result.reachedFloor));
  if (!hasMatchingHistory) record.runs++;
  addVisitedFloors(record, result.reachedFloor);
  if (typeof result.outcome === 'string') record.lastOutcome = result.outcome;
  addFacts(record, 'enemies', Array.isArray(result.defeated) ? result.defeated : []);
  addFacts(record, 'loot', (result.loot || []).map(item => item.name));

  const logText = (Array.isArray(result.log) ? result.log : []).map(entry => typeof entry === 'string' ? entry : entry.text || '').join('\n');
  const hazardFacts = [
    ['pit', '落とし穴'], ['poison', '毒針の罠'], ['blast', '爆発罠'], ['alarm', '警報装置'],
    ['gust', '峡谷の突風'], ['falling-rock', '落石'], ['low-visibility', '視界不良'],
    ['cave-in', '坑道の崩落'], ['dust', '鉱山粉塵'], ['unstable-ground', '不安定な足場']
  ];
  const dungeon = DUNGEONS[dungeonId];
  for (const [hazard, label] of hazardFacts) {
    if (logText.includes(label)) {
      addFacts(record, 'hazards', label);
      const environment = ({ gust: '強風', 'low-visibility': '視界不良', 'falling-rock': '落石', 'cave-in': '崩落', 'unstable-ground': '不安定な足場', dust: '粉塵' })[hazard];
      if (environment) addFacts(record, 'environments', environment);
    }
  }
  if (logText.includes('毒で疲労')) addFacts(record, 'statusEffects', '毒');
  if (logText.includes('仕掛けを解除')) addFacts(record, 'skills', ['罠発見', '罠解除']);
  else if (logText.includes('罠を見つけた')) addFacts(record, 'skills', '罠発見');
  if (logText.includes('鍵を解除')) addFacts(record, 'skills', '鍵開け');
  if (logText.includes('安全な足場へ誘導')) addFacts(record, 'skills', '安全経路の察知');
  if (logText.includes('荷を整理')) addFacts(record, 'skills', ['荷物整理', '疲労軽減']);
  if (logText.includes('宝箱')) addFacts(record, 'events', '宝箱');
  if (logText.includes('鉱脈')) addFacts(record, 'events', '鉱脈');
  if (dungeon?.enemiesById?.boss && (result.outcome === 'cleared' || logText.includes(dungeon.enemiesById.boss.name))) {
    addFacts(record, 'bosses', dungeon.enemiesById.boss.name);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: createInitialState(), loaded: false };
    const saved = JSON.parse(raw);
    if (![1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(saved.version) || !Array.isArray(saved.adventurers) || !Array.isArray(saved.inventory)) throw new Error('Unsupported save');
    return { state: migrateSave(saved), loaded: true, migrated: saved.version !== 12 };
  } catch (error) {
    console.warn('セーブデータを読み込めませんでした。新しい記録を開始します。', error);
    return { state: createInitialState(), loaded: false, corrupted: true };
  }
}

export function saveGame(state) {
  try {
    state.version = 12;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('保存に失敗しました。', error);
    return false;
  }
}

export function pairKey(first, second) {
  return [first, second].sort().join('|');
}
