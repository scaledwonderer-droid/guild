import { JOBS, statsFor } from '../data/adventurers.js';
import { adjustRelation, relationValue } from './relationships.js';
import { recordFinance } from './finance.js';

const TASK_LABELS = {
  rest: '休養班', training: '訓練班', contract: '軽依頼班', gathering: '採取班', guild: 'ギルド雑務', social: '交流班'
};

function stableRoll(text) {
  let hash = 2166136261;
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296;
}

function taskFor(state, person, day, forcedType = null) {
  if (forcedType) return forcedType;
  const fatigue = Number(person.fatigue || 0);
  const hurt = Boolean(person.injury || person.hp <= 0);
  const trust = Number(person.guildTrust ?? 75);
  const roll = stableRoll(`${day}:${person.id}:${person.job}`);
  const hasClosePeer = state.adventurers.some(other => other.id !== person.id && relationValue(state, person.id, other.id) >= 67);
  const hasTensePeer = state.adventurers.some(other => other.id !== person.id && relationValue(state, person.id, other.id) <= 38);
  if (hurt || fatigue >= 76) return roll < .9 || hurt ? 'rest' : 'guild';
  if (fatigue >= 52 && roll < .68) return 'rest';
  if (hasTensePeer && person.personality === '無口' && roll > .74) return 'guild';
  if (hasClosePeer && (person.personality === '世話好き' || person.personality === '温厚') && roll > .84) return 'social';
  if (hasClosePeer && roll > .7 && roll < .86) return 'contract';
  const personalityChance = person.personality === '勇敢' ? .5 : person.personality === '強気' ? .43 : .28;
  const levelShift = person.level <= 1 ? -.06 : Math.min(.1, (person.level - 1) * .025);
  const contractChance = Math.max(.15, Math.min(.62, personalityChance + levelShift));
  if (roll < contractChance && trust >= 20 && JOBS[person.job]) return 'contract';
  if (person.personality === '世話好き' && roll > .83) return 'guild';
  if (person.job === 'carrier' && roll > .72) return 'gathering';
  if (roll < .78 || person.personality === '勇敢' || person.personality === '強気') return 'training';
  return 'guild';
}

export function createActivityPlan(state, options = {}) {
  const day = Number(state.day || 1) + (options.forNextDay ? 1 : 0);
  const primaryIds = [...(options.primaryIds || [])];
  const forcedIds = new Set(options.forcedIds || []);
  const byId = new Map(state.adventurers.map(person => [person.id, person]));
  const groups = [];
  if (options.includePrimary && primaryIds.length) {
    groups.push({ id: 'expedition', type: 'expedition', label: '主遠征隊', memberIds: primaryIds.slice(), names: primaryIds.map(id => byId.get(id)?.name).filter(Boolean) });
  }
  const grouped = new Map();
  for (const person of state.adventurers) {
    if (primaryIds.includes(person.id)) continue;
    const forcedType = forcedIds.has(person.id) ? options.forcedType || 'rest' : null;
    const type = taskFor(state, person, day, forcedType);
    const group = grouped.get(type) || { id: type, type, label: TASK_LABELS[type] || 'ギルド活動', memberIds: [], names: [] };
    group.memberIds.push(person.id);
    group.names.push(person.name);
    grouped.set(type, group);
  }
  const order = ['rest', 'contract', 'training', 'gathering', 'social', 'guild'];
  groups.push(...order.map(type => grouped.get(type)).filter(Boolean));
  return groups;
}

function pushHistory(person, day, title, summary, changes = {}) {
  person.activityHistory ||= [];
  person.activityHistory.unshift({ day, title, summary, ...changes });
  person.activityHistory = person.activityHistory.slice(0, 8);
}

function trust(person, delta) {
  person.guildTrust = Math.max(0, Math.min(100, Number(person.guildTrust ?? 75) + delta));
}

function recoverDuringRest(state, person) {
  const stats = statsFor(person, state.inventory);
  person.hp = Math.min(stats.maxHp, Math.max(0, person.hp) + Math.ceil(stats.maxHp * .24));
  person.fatigue = Math.max(0, Number(person.fatigue || 0) - 32);
  if (person.injury === '重傷') {
    person.injuryDays = (person.injuryDays || 0) + 1;
    if (person.injuryDays >= 2) {
      person.injury = '負傷';
      person.injuryDays = 0;
    }
  } else if (person.injury === '負傷') {
    person.injury = null;
    person.injuryDays = 0;
  }
}

function addExperience(person, state, amount) {
  person.exp = Math.max(0, Number(person.exp || 0) + amount);
  let levels = 0;
  while (person.level < 20 && person.exp >= person.level * 42) {
    person.exp -= person.level * 42;
    person.level++;
    levels++;
    person.hp = Math.min(statsFor(person, state.inventory).maxHp, person.hp + 8);
  }
  return levels;
}

function applyDailyGroup(state, group, day) {
  const people = group.memberIds.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean);
  if (!people.length || group.id === 'expedition') return { label: group.label, summary: '' };
  let earned = 0;
  const notices = [];
  for (const person of people) {
    const wasInjured = Boolean(person.injury);
    if (group.type === 'rest' || wasInjured) {
      recoverDuringRest(state, person);
      const text = wasInjured ? '手当てと休養を取り、傷の回復に努めた。' : '宿舎で休み、疲労を和らげた。';
      pushHistory(person, day, '休養', text, { fatigueDelta: -32 });
      trust(person, 1);
      notices.push(`${person.name}は休養した`);
      continue;
    }
    if (group.type === 'training') {
      const xp = 10 + Math.min(5, person.level);
      const levels = addExperience(person, state, xp);
      person.fatigue = Math.min(100, Number(person.fatigue || 0) + 5);
      pushHistory(person, day, '訓練', `訓練場で基礎を磨き、経験値を${xp}得た。`, { xp, fatigueDelta: 5, levels });
      notices.push(`${person.name}は訓練した`);
      continue;
    }
    if (group.type === 'contract') {
      const xp = 5 + Math.min(3, person.level);
      const pay = 12 + person.level * 4 + (person.job === 'thief' || person.job === 'archer' ? 3 : 0);
      const levels = addExperience(person, state, xp);
      person.fatigue = Math.min(100, Number(person.fatigue || 0) + 8);
      state.gold = Math.max(0, Number(state.gold || 0) + pay);
      earned += pay;
      pushHistory(person, day, '軽依頼', `街道の荷運びを手伝い、${pay}Gと経験値${xp}を得た。`, { xp, gold: pay, fatigueDelta: 8, levels });
      notices.push(`${person.name}は街道の軽依頼を終えた`);
      continue;
    }
    if (group.type === 'gathering') {
      const pay = 9 + person.level * 3;
      const xp = 4;
      const levels = addExperience(person, state, xp);
      person.fatigue = Math.min(100, Number(person.fatigue || 0) + 4);
      state.gold = Math.max(0, Number(state.gold || 0) + pay);
      earned += pay;
      pushHistory(person, day, '採取', `近郊で薬草と薪を集め、${pay}G相当の報酬と経験値${xp}を得た。`, { xp, gold: pay, fatigueDelta: 4, levels });
      notices.push(`${person.name}は近郊で採取した`);
      continue;
    }
    if (group.type === 'social') {
      person.fatigue = Math.max(0, Number(person.fatigue || 0) - 2);
      trust(person, 1);
      pushHistory(person, day, '交流', '仲間と休憩時間を過ごし、近況を話した。', { fatigueDelta: -2 });
      notices.push(`${person.name}は仲間と話した`);
      continue;
    }
    person.fatigue = Math.max(0, Number(person.fatigue || 0) - 3);
    trust(person, 1);
    pushHistory(person, day, 'ギルド雑務', '道具や備品を整え、仲間の手伝いをした。', { fatigueDelta: -3 });
    notices.push(`${person.name}はギルドの雑務を手伝った`);
  }
  if (people.length > 1 && group.type !== 'rest') {
    const first = people[0];
    const second = people[1];
    adjustRelation(state, first.id, second.id, group.type === 'contract' || group.type === 'social' ? 1 : 0.5);
  }
  if (earned > 0) recordFinance(state, earned, `${group.label}の報酬`, day);
  return { label: group.label, summary: notices.slice(0, 3).join('。') + (notices.length > 3 ? '。ほかの仲間も活動した。' : '。'), gold: earned };
}

export function upkeepCost(state) {
  return Math.max(24, state.adventurers.length * 4 + Math.max(1, Number(state.guildLevel || 1)) * 7 + 3);
}

function forcedSaleOrder(state) {
  const equipped = new Set(state.adventurers.flatMap(person => [person.weapon, person.armor]).filter(Boolean));
  const inventory = state.inventory || [];
  const gearCounts = new Map();
  for (const item of inventory) if (item.slot === 'weapon' || item.slot === 'armor') gearCounts.set(item.slot, (gearCounts.get(item.slot) || 0) + 1);
  const sellable = inventory.filter(item => !equipped.has(item.uid) && !item.protected && item.slot !== 'key');
  const rank = item => {
    if (item.slot === 'material' || item.slot === 'misc') return 0;
    if ((item.slot === 'weapon' || item.slot === 'armor') && gearCounts.get(item.slot) > 1) return 1;
    return 2;
  };
  return sellable.sort((a, b) => rank(a) - rank(b) || Number(a.value || 0) - Number(b.value || 0));
}

function payUpkeep(state, day) {
  const due = upkeepCost(state);
  const notice = { id: `upkeep-${day}`, title: `第${day}日のギルド維持費`, details: [], day };
  const fundsBefore = Number(state.gold || 0);
  if (fundsBefore >= due) {
    state.gold = fundsBefore - due;
    recordFinance(state, -due, `第${day}日 ギルド維持費` , day);
    notice.details.push(`建物・寝床・備品の維持費として${due}Gを支払いました。`);
    for (const person of state.adventurers) if (person.guildTrust < 100) trust(person, 1);
  } else {
    let shortage = due - fundsBefore;
    state.gold = 0;
    if (fundsBefore > 0) recordFinance(state, -fundsBefore, `第${day}日 維持費の支払い` , day);
    notice.details.push(`維持費${due}Gに対して${fundsBefore}Gしかなく、不足額は${shortage}Gです。`);
    const sold = [];
    for (const item of forcedSaleOrder(state)) {
      if (shortage <= 0) break;
      const value = Math.max(1, Number(item.value || 10));
      state.inventory = state.inventory.filter(entry => entry.uid !== item.uid);
      recordFinance(state, value, `維持費補填の売却：${item.name}`, day);
      sold.push(`${item.name}（${value}G）`);
      state.gold += value;
      shortage -= value;
    }
    const proceeds = state.gold;
    const amountUsed = Math.min(due, proceeds);
    state.gold = Math.max(0, proceeds - amountUsed);
    if (amountUsed > 0) recordFinance(state, -amountUsed, `第${day}日 ギルド維持費`, day);
    notice.details.push(sold.length ? `倉庫内の物資を強制売却：${sold.join('、')}。補填額 ${amountUsed}G。` : '倉庫内に売却できる物資がなく、強制売却では不足を補えませんでした。');
    if (shortage > 0) notice.details.push(`物資売却後も${shortage}G不足しています。`);
    for (const person of state.adventurers) trust(person, -12);
  }
  state.economicNotices ||= [];
  state.economicNotices.unshift(notice);
  state.economicNotices = state.economicNotices.slice(0, 6);
  return notice;
}

function handleDepartures(state, day) {
  const departing = state.adventurers.filter(person => Number(person.guildTrust ?? 75) <= 0);
  if (!departing.length) return [];
  const notices = [];
  for (const person of departing) {
    const oldRoster = state.adventurers.slice();
    state.adventurers = state.adventurers.filter(entry => entry.id !== person.id);
    state.party = (state.party || []).filter(id => id !== person.id);
    if (state.leaderId === person.id) state.leaderId = state.party[0] || '';
    state.departedAdventurers ||= [];
    if (!state.departedAdventurers.some(entry => entry.id === person.id)) state.departedAdventurers.push({ id: person.id, name: person.name, day });
    const closeFriends = oldRoster.filter(other => other.id !== person.id && relationValue(state, person.id, other.id) >= 75);
    for (const friend of closeFriends) if (Number(friend.guildTrust ?? 75) > 2) trust(friend, -2);
    notices.push(`${person.name}がギルドを去りました。「ここではもうやっていけない。」${person.name}は荷物をまとめ、二度とギルドへ戻ることはありません。`);
  }
  state.departureNotices ||= [];
  state.departureNotices.unshift(...notices.map((text, index) => ({ id: `departure-${day}-${index}`, title: text })));
  state.departureNotices = state.departureNotices.slice(0, 6);
  return notices;
}

export function advanceDay(state, options = {}) {
  state.day = Math.max(1, Number(state.day || 1)) + 1;
  const earlyDepartures = handleDepartures(state, state.day);
  const plan = options.activityPlan || createActivityPlan(state, {
    primaryIds: options.lockedIds || [],
    forcedIds: options.forcedIds || [],
    forcedType: options.forcedType,
    forNextDay: false
  });
  const locked = new Set(options.lockedIds || []);
  const activities = [];
  const restingIds = new Set();
  for (const group of plan) {
    if (group.id === 'expedition') continue;
    const available = group.memberIds.filter(id => !locked.has(id));
    for (const id of available) {
      const person = state.adventurers.find(entry => entry.id === id);
      if (group.type === 'rest' || person?.injury || person?.hp <= 0) restingIds.add(id);
    }
    const result = applyDailyGroup(state, { ...group, memberIds: available }, state.day);
    if (result.summary) activities.push(result);
  }
  for (const id of options.forcedIds || []) {
    const person = state.adventurers.find(entry => entry.id === id);
    if (person && !plan.some(group => group.memberIds.includes(id))) {
      restingIds.add(id);
      const result = applyDailyGroup(state, { id: 'rest', type: 'rest', label: '休養', memberIds: [id] }, state.day);
      activities.push(result);
    }
  }
  for (const person of state.adventurers) {
    if (restingIds.has(person.id)) continue;
    if (person.injury || person.hp <= 0) trust(person, -1);
    if (Number(person.fatigue || 0) >= 90 && state.day % 3 === 0) trust(person, -1);
  }
  const strainDepartures = handleDepartures(state, state.day);
  const economic = state.day % 10 === 0 ? payUpkeep(state, state.day) : null;
  const departures = [...earlyDepartures, ...strainDepartures, ...handleDepartures(state, state.day)];
  state.dayActivitySummary = activities.map(({ label, summary }) => ({ label, summary, day: state.day })).slice(0, 8);
  return { day: state.day, activities, economic, departures };
}

export function takeActivityDay(state, type, adventurerId) {
  if (state.expedition) return { ok: false, message: '遠征中は別の活動を始められません。' };
  const person = state.adventurers.find(entry => entry.id === adventurerId);
  if (!person) return { ok: false, message: '冒険者が見つかりません。' };
  if (!['training', 'contract'].includes(type)) return { ok: false, message: 'その活動は指定できません。' };
  const activityPlan = createActivityPlan(state, { forcedIds: [person.id], forcedType: type, forNextDay: true });
  const result = advanceDay(state, { activityPlan });
  if (!state.adventurers.some(entry => entry.id === person.id)) return { ok: true, result, message: `${person.name}は活動を始める前にギルドを去りました。` };
  const label = type === 'training' ? '訓練' : '軽依頼';
  return { ok: true, message: `第${result.day}日。${person.name}の${label}を含むギルドの活動が進みました。`, result };
}

export function advanceObservedActivity(expedition) {
  if (!expedition?.observationGroup || expedition.observationGroup.type === 'expedition') return;
  const group = expedition.observationGroup;
  group.cursor = Number(group.cursor || 0) + 1;
  const names = group.names || [];
  const name = names[(group.cursor - 1) % Math.max(1, names.length)] || '仲間';
  const partner = names.find(value => value !== name);
  const lines = group.type === 'training' ? [
    `${name}は訓練場で身のこなしを繰り返し確かめている。`,
    `${name}は教官の木剣を受け止め、次の一撃へ備えた。`,
    `${name}は息を整え、昨日より長く型を続けた。`
  ] : group.type === 'rest' ? [
    `${name}は宿舎で傷の手当てを受け、静かに休んでいる。`,
    `${name}は食堂で温かいスープを飲み、肩の力を抜いた。`,
    `${name}は装備を脇へ置き、窓辺で休息を取っている。`
  ] : group.type === 'contract' ? [
    `${name}${partner ? `と${partner}` : ''}は街道の荷を運び、依頼人の話を聞いている。`,
    `${name}は荷車の車輪を直し、依頼人から礼を受け取った。`,
    `${name}は街道の見張りを交代し、周囲の安全を確かめた。`
  ] : group.type === 'gathering' ? [
    `${name}は町外れで薬草を選り分けている。`,
    `${name}は採取籠を整え、見つけた素材を丁寧に包んだ。`,
    `${name}は薪束を背負い、ギルドへ戻る支度をした。`
  ] : group.type === 'social' ? [
    `${name}は${partner || '仲間'}に今日の出来事を話し、相手は静かに耳を傾けている。`,
    `${partner || '仲間'}が短い冗談を言うと、${name}の表情が少し和らいだ。`,
    `${name}は休憩時間に${partner || '仲間'}へ声を掛け、二人はしばらく話をした。`
  ] : [
    `${name}はギルドの道具を整え、使いやすい場所へ戻した。`,
    `${name}は${partner || '仲間'}の装備を手伝い、留め具を締め直した。`,
    `${name}は掲示板の依頼札を整理し、次の仕事を探している。`
  ];
  const text = lines[(group.cursor - 1) % lines.length];
  expedition.observationFeed ||= [];
  expedition.observationFeed.push({ cursor: group.cursor, text });
  expedition.observationFeed = expedition.observationFeed.slice(-8);
}

export function trustLabel(person) {
  const value = Number(person.guildTrust ?? 75);
  if (value >= 82) return '非常に信頼している';
  if (value >= 62) return '信頼している';
  if (value >= 40) return '普通';
  if (value >= 20) return '不満がある';
  return '強い不信';
}

export function nextUpkeepLabel(state) {
  const target = (Math.floor(Number(state.day || 1) / 10) + 1) * 10;
  return `第${target}日`;
}

export function nextUpkeepInfo(state) {
  const day = (Math.floor(Number(state.day || 1) / 10) + 1) * 10;
  return { day, amount: upkeepCost(state), daysRemaining: day - Number(state.day || 1) };
}
