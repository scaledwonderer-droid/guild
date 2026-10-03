import { EPITHET_OPTIONS } from '../data/epithets.js';
import { TRIAL_REQUIRED_KEY_IDS, TRIAL_KEY_ITEMS } from '../data/v07.js';

export function ownedTrialKeys(state) {
  const ids = new Set((state.inventory || []).filter(item => item.slot === 'key').map(item => item.keyId));
  return TRIAL_REQUIRED_KEY_IDS.filter(id => ids.has(id));
}

export function missingTrialKeys(state) {
  const owned = new Set(ownedTrialKeys(state));
  return TRIAL_KEY_ITEMS.filter(item => !owned.has(item.keyId));
}

export function hasTrialKeys(state) {
  return missingTrialKeys(state).length === 0;
}

export function unlockTrialSeal(state) {
  if (!state.trialSealDiscovered) return { ok: false, message: '封印された扉は、まだギルドで確認されていません。' };
  if (state.trialBossRoomUnlocked) return { ok: false, message: '最深部の封印はすでに解かれています。' };
  const missing = missingTrialKeys(state);
  if (missing.length) return { ok: false, message: `封印に必要な刻印片が不足しています（残り${missing.length}種）。` };
  const consumed = [];
  for (const keyId of TRIAL_REQUIRED_KEY_IDS) {
    const index = (state.inventory || []).findIndex(item => item.keyId === keyId);
    if (index >= 0) consumed.push(state.inventory.splice(index, 1)[0]);
  }
  state.trialBossRoomUnlocked = true;
  state.trialKeyHistory ||= [];
  state.trialKeyHistory.push({ day: Number(state.day || 1), event: 'seal-unlocked', items: consumed.map(item => item.name) });
  state.guildNotices ||= [];
  state.guildNotices.push({
    id: `trial-seal-${Date.now()}`,
    title: '試練の迷宮・最深部の封印が解かれました',
    details: ['四つの刻印片が封印に反応し、奥の扉が開きました。']
  });
  return { ok: true, message: '四つの刻印片を封印へ捧げ、最深部の扉を開きました。' };
}

function performanceFor(result, personId) {
  const actions = result?.actions || [];
  return actions.reduce((value, action) => {
    if (action.actorId === personId) {
      if (action.kind === 'heal') value.healing += Number(action.amount || 0);
      else value.damage += Number(action.amount || 0);
      value.actions++;
    }
    if (action.targetId === personId && action.actorId && String(action.actorId).startsWith('foe-')) value.incoming++;
    return value;
  }, { damage: 0, healing: 0, incoming: 0, actions: 0 });
}

function pickEpithet(person, performance, used) {
  const choices = EPITHET_OPTIONS[person.job] || EPITHET_OPTIONS.warrior;
  const existing = new Set((person.epithets || []).map(entry => entry.id));
  let scored = choices.map((entry, index) => {
    let score = 0;
    if (entry.tags.includes('guard')) score += performance.incoming * 2;
    if (entry.tags.includes('damage')) score += performance.damage / 24;
    if (entry.tags.includes('healing')) score += performance.healing / 12;
    if (entry.tags.includes('support')) score += person.personality === '温厚' || person.personality === '世話好き' ? 3 : 0;
    if (entry.tags.includes('endurance')) score += person.personality === '慎重' || person.job === 'carrier' ? 2 : 0;
    if (entry.tags.includes('scouting')) score += person.personality === '慎重' || person.job === 'thief' ? 2 : 0;
    if (person.personality === '勇敢' && entry.tags.includes('damage')) score += 2;
    if (person.personality === '無口' && entry.tags.includes('scouting')) score += 1;
    return { entry, score, index };
  }).filter(item => !existing.has(item.entry.id) && !used.has(item.entry.name));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  if (!scored.length) scored = choices.map((entry, index) => ({ entry, score: 0, index })).filter(item => !used.has(item.entry.name));
  return scored[0]?.entry || choices[0];
}

export function awardTrialHonors(state, expedition, result) {
  const party = expedition.partyIds.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean);
  const used = new Set();
  const awards = [];
  for (const person of party) {
    person.epithets ||= [];
    const performance = performanceFor(result, person.id);
    const chosen = pickEpithet(person, performance, used);
    used.add(chosen.name);
    const epithet = {
      id: chosen.id,
      name: chosen.name,
      skillId: chosen.skillId,
      skillName: chosen.skillName,
      description: chosen.description,
      bossId: 'trial-warden',
      earnedDay: Number(state.day || 1)
    };
    person.epithets.push(epithet);
    person.guildTrust = Math.min(100, Number(person.guildTrust ?? 75) + 2);
    awards.push({ personId: person.id, adventurer: person.name, epithet: chosen.name, skill: chosen.skillName, description: chosen.description });
  }
  state.trialBossRecords ||= [];
  state.trialBossRecords.unshift({
    day: Number(state.day || 1),
    boss: '迷宮の守護者',
    partyIds: party.map(person => person.id),
    partyNames: party.map(person => person.name),
    honors: awards.map(entry => ({ ...entry }))
  });
  state.trialBossRecords = state.trialBossRecords.slice(0, 20);
  return awards;
}
