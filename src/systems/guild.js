import { JOBS, statsFor } from '../data/adventurers.js';
import { DUNGEONS } from '../data/dungeon.js';
import { SHOP_ITEMS, STARTING_ITEMS } from '../data/items.js';
import { ensureSurveyRecords, getSurveyRecord } from './survey.js';
import { generateRecruitmentCandidates, recruitFromPool, dismissRecruitmentCandidates } from './recruitment.js';
import { recordFinance } from './finance.js';

export const GUILD_LEVEL_THRESHOLDS = [0, 35, 110, 240, 420];

export function partyLimitForLevel(level) {
  return level >= 5 ? 5 : level >= 3 ? 4 : 3;
}

export function syncGuildProgress(state) {
  const previousLevel = Math.max(1, Number(state.guildLevel || 1));
  const newLevel = Math.min(5, 1 + GUILD_LEVEL_THRESHOLDS.slice(1).filter(value => state.guildContribution >= value).length);
  state.guildLevel = Math.max(previousLevel, newLevel);
  const unlockedDungeons = ['old-cave'];
  if (state.guildLevel >= 2) unlockedDungeons.push('trap-fort');
  if (state.guildLevel >= 3) unlockedDungeons.push('wind-gorge');
  if (state.guildLevel >= 4) unlockedDungeons.push('collapsed-mine');
  if (state.guildLevel >= 5) unlockedDungeons.push('trial-labyrinth');
  state.unlockedDungeons = unlockedDungeons;
  state.unlockedJobs = ['warrior', 'mage', 'priest'];
  if (state.guildLevel >= 2) state.unlockedJobs.push('thief');
  if (state.guildLevel >= 3) state.unlockedJobs.push('archer');
  if (state.guildLevel >= 4) state.unlockedJobs.push('carrier');
  if (!unlockedDungeons.includes(state.selectedDungeonId)) state.selectedDungeonId = 'old-cave';
  ensureSurveyRecords(state);
  return state.guildLevel;
}

export function addGuildContribution(state, amount, source = '納品') {
  if (!Number.isFinite(amount) || amount <= 0) return { gained: 0, level: state.guildLevel || 1 };
  const oldLevel = state.guildLevel || 1;
  const oldDungeons = new Set(state.unlockedDungeons || ['old-cave']);
  const oldJobs = new Set(state.unlockedJobs || ['warrior', 'mage', 'priest']);
  const oldPartyLimit = partyLimitForLevel(oldLevel);
  state.guildContribution = Math.max(0, (state.guildContribution || 0) + Math.floor(amount));
  syncGuildProgress(state);
  if (state.guildLevel > oldLevel) {
    pushNotice(state, 'rank', 'ギルド公認ランクが上昇しました', ['国からの信頼が高まりました。']);
    if (partyLimitForLevel(state.guildLevel) > oldPartyLimit) {
      pushNotice(state, 'party-limit', 'パーティーの編成上限が拡大しました', [`現在は${partyLimitForLevel(state.guildLevel)}人まで編成できます。`]);
    }
    if (state.unlockedDungeons.some(id => !oldDungeons.has(id))) {
      pushNotice(state, 'region', '王国より調査許可が下りました', ['新たな地域への遠征が可能になりました。内部状況は不明です。']);
    }
    const newlyAvailableJobs = state.unlockedJobs.filter(job => !oldJobs.has(job));
    if (newlyAvailableJobs.length) {
      const jobNames = newlyAvailableJobs.map(job => JOBS[job]?.name).filter(Boolean);
      state.recruitmentBoostJobs = [...new Set([...(state.recruitmentBoostJobs || []), ...newlyAvailableJobs])];
      pushNotice(state, 'profession', '新たな職能が登録可能になりました', jobNames.map(name => `新職業：「${name}」`));
    }
  }
  return { gained: Math.floor(amount), level: state.guildLevel, leveled: state.guildLevel > oldLevel, source };
}

function pushNotice(state, kind, title, details) {
  state.guildNotices ||= [];
  const id = `guild-${kind}-${Date.now()}-${state.guildNotices.length}`;
  state.guildNotices.push({ id, title, details });
}

export function availableRecruits(state) {
  return (state.recruitmentCandidates || [])
    .filter(candidate => (state.unlockedJobs || []).includes(candidate.job))
    .map(candidate => ({ ...candidate, jobName: JOBS[candidate.job]?.name || '冒険者' }));
}

export function recruitAdventurer(state, candidateId) {
  return recruitFromPool(state, candidateId);
}

export function refreshRecruitment(state) {
  if ((state.recruitmentCandidates || []).length) return { ok: false, message: '今回の候補が残っています。採用するか、見送ってください。' };
  if (Number(state.day || 1) < Number(state.recruitmentReadyOn || 1)) return { ok: false, message: `次の募集は第${state.recruitmentReadyOn}日から行えます。` };
  const candidates = generateRecruitmentCandidates(state);
  return candidates.length === 3
    ? { ok: true, message: '3人の冒険者候補が集まりました。今回の募集で採用できるのは1人です。', candidates }
    : { ok: false, message: '募集候補を集められませんでした。' };
}

export function dismissRecruitment(state) {
  const candidates = availableRecruits(state);
  if (!candidates.length) return { ok: false, message: '見送る候補がいません。' };
  dismissRecruitmentCandidates(state);
  return { ok: true, message: '今回の候補は見送り、ギルドを離れました。次の募集は少し後に行えます。' };
}

export function buyShopItem(state, templateId) {
  const template = SHOP_ITEMS.find(item => item.template === templateId);
  if (!template) return { ok: false, message: 'その品物は現在仕入れていません。' };
  if ((state.gold || 0) < template.price) return { ok: false, message: `${template.price}G 必要です。所持金が足りません。` };
  state.gold -= template.price;
  recordFinance(state, -template.price, `売店購入：${template.name}`);
  const item = { ...template, uid: `${template.template}_${Date.now()}_${Math.floor(Math.random() * 99999)}` };
  delete item.template;
  state.inventory.push(item);
  return { ok: true, item, message: `「${item.name}」を購入しました。` };
}

function saleValue(item) { return Math.max(1, Number(item.value || 10)); }
function donationValue(item) { return Math.max(1, Number(item.guildValue || Math.ceil(saleValue(item) * .6))); }

export function resolveLootChoice(state, lootIndex, choice, adventurerId = '') {
  const loot = state.lastResult?.loot;
  const item = loot?.[lootIndex];
  if (!item || item.resolved) return { ok: false, message: 'この戦利品はすでに処理済みです。' };
  if (choice === 'store') {
    state.inventory.push(item);
    item.resolved = '保管';
    return { ok: true, message: `「${item.name}」を保管しました。` };
  }
  if (choice === 'equip') {
    if (!['weapon', 'armor'].includes(item.slot)) return { ok: false, message: '素材は装備できません。' };
    const person = state.adventurers.find(entry => entry.id === adventurerId);
    if (!person) return { ok: false, message: '装備する冒険者を選んでください。' };
    state.inventory.push(item);
    person[item.slot] = item.uid;
    item.resolved = `${person.name}が装備`;
    return { ok: true, message: `${person.name}が「${item.name}」を装備しました。` };
  }
  if (choice === 'sell') {
    state.gold = (state.gold || 0) + saleValue(item);
    recordFinance(state, saleValue(item), `戦利品売却：${item.name}`);
    item.resolved = `売却 +${saleValue(item)}G`;
    return { ok: true, message: `「${item.name}」を売却し、${saleValue(item)}Gを得ました。` };
  }
  if (choice === 'donate') {
    const amount = donationValue(item);
    const progress = addGuildContribution(state, amount);
    item.resolved = `国へ納品 +${amount}`;
    const unlocked = progress.leveled ? ' ギルド公認ランクが上がりました。新たに登録可能な人材や遠征許可は本部で確認できます。' : '';
    return { ok: true, message: `「${item.name}」を国へ納品し、公認ポイントを${amount}得ました。${unlocked}` };
  }
  return { ok: false, message: '処理方法を選択してください。' };
}

export function resolvePendingLoot(state) {
  return !(state.lastResult?.loot || []).some(item => !item.resolved);
}

export function gearInventory(state) {
  return state.inventory.filter(item => item.slot === 'weapon' || item.slot === 'armor');
}

export function dungeonUnlockInfo(state) {
  return Object.values(DUNGEONS)
    .filter(dungeon => (state.unlockedDungeons || ['old-cave']).includes(dungeon.id))
    .map(dungeon => ({ id: dungeon.id, name: dungeon.name, unlocked: true, survey: getSurveyRecord(state, dungeon.id) }));
}

// Kept for save migration and authored item data validation.
export function itemTemplateExists(uid) {
  return STARTING_ITEMS.some(item => item.uid === uid);
}
