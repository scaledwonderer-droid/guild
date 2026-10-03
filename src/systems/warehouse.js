import { LOOT_ITEMS } from '../data/items.js';
import { addGuildContribution } from './guild.js';
import { recordFinance } from './finance.js';

export const WAREHOUSE_CATEGORIES = [
  { id: 'all', label: 'すべて' }, { id: 'weapon', label: '武器' }, { id: 'armor', label: '防具' },
  { id: 'material', label: '素材' }, { id: 'consumable', label: '消耗品' }, { id: 'valuable', label: '換金品' }, { id: 'important', label: '重要品' }, { id: 'other', label: 'その他' }
];

export const MATERIAL_EXCHANGES = [
  { id: 'mine-plate', name: '坑道守りの板金鎧', costs: [{ name: '鉄鉱石', qty: 5 }, { name: '晶鉱石', qty: 1 }], output: 'armor_miner_plate' },
  { id: 'feather-cloak', name: '羽織の外套', costs: [{ name: '洞晶の欠片', qty: 3 }, { name: '風切り羽根', qty: 2 }], output: 'armor_feather_cloak' },
  { id: 'trapfang-dagger', name: '罠牙の短剣', costs: [{ name: '砦の封印具', qty: 2 }, { name: '洞晶の欠片', qty: 3 }], output: 'weapon_trapfang_dagger' }
];

export function itemStackKey(item) {
  return encodeURIComponent(JSON.stringify([
    item?.name || '', item?.slot || 'other', Number(item?.attack || 0), Number(item?.defense || 0),
    Number(item?.heal || 0), item?.rarity || 'common', Number(item?.value || 0), Number(item?.guildValue || 0), Number(item?.weight || 1), item?.note || '', item?.keyId || ''
  ]));
}

function equippedOwners(state) {
  const owners = new Map();
  for (const person of state.adventurers || []) for (const uid of [person.weapon, person.armor]) {
    if (!uid) continue;
    const list = owners.get(uid) || [];
    list.push(person.name);
    owners.set(uid, list);
  }
  return owners;
}

export function warehouseGroups(state, category = 'all') {
  const owners = equippedOwners(state);
  const groups = new Map();
  for (const item of state.inventory || []) {
    const kind = item.slot === 'key' || item.protected ? 'important' : ['weapon', 'armor', 'material', 'consumable', 'valuable'].includes(item.slot) ? item.slot : 'other';
    if (category !== 'all' && kind !== category) continue;
    const key = itemStackKey(item);
    const group = groups.get(key) || { key, item, items: [], available: [], equippedOwners: new Set(), category: kind };
    group.items.push(item);
    const equippedBy = owners.get(item.uid) || [];
    if (equippedBy.length) equippedBy.forEach(name => group.equippedOwners.add(name));
    else group.available.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    const order = { weapon: 0, armor: 1, material: 2, consumable: 3, valuable: 4, important: 5, other: 6 };
    return order[a.category] - order[b.category] || a.item.name.localeCompare(b.item.name, 'ja');
  });
}

function removeAvailable(state, key, quantity) {
  const group = warehouseGroups(state).find(entry => entry.key === key);
  if (!group) return { items: [], message: '倉庫にその品物はありません。' };
  if (group.item.protected || group.item.slot === 'key') return { items: [], message: '重要品は売却・納品できません。' };
  const count = Math.max(1, Math.floor(Number(quantity || 1)));
  if (count > group.available.length) return { items: [], message: `売却・納品できる在庫は${group.available.length}個です。装備中の品は対象外です。` };
  const chosen = group.available.slice(0, count);
  const chosenIds = new Set(chosen.map(item => item.uid));
  state.inventory = state.inventory.filter(item => !chosenIds.has(item.uid));
  return { items: chosen };
}

export function sellWarehouseItems(state, key, quantity = 1, confirmed = false) {
  const group = warehouseGroups(state).find(entry => entry.key === key);
  if (!group) return { ok: false, message: '倉庫にその品物はありません。' };
  if (group.item.protected || group.item.slot === 'key') return { ok: false, message: '重要品は売却できません。' };
  const count = Math.max(1, Math.floor(Number(quantity || 1)));
  if (count > group.available.length) return { ok: false, message: `売却できる在庫は${group.available.length}個です。装備中の品は対象外です。` };
  if (!confirmed && group.available.slice(0, count).some(item => item.rarity === 'rare' || Number(item.value || 0) >= 80)) {
    const items = group.available.slice(0, count);
    return { ok: false, confirmationRequired: true, message: `希少品です。${items.length}個を本当に売却しますか？\n売却価格：${items.reduce((sum, item) => sum + Math.max(1, Number(item.value || 10)), 0)}G` };
  }
  const removed = removeAvailable(state, key, count);
  if (!removed.items.length) return { ok: false, message: removed.message };
  const proceeds = removed.items.reduce((sum, item) => sum + Math.max(1, Number(item.value || 10)), 0);
  state.gold = Math.max(0, Number(state.gold || 0) + proceeds);
  recordFinance(state, proceeds, `倉庫売却：${removed.items[0].name}${removed.items.length > 1 ? ` ×${removed.items.length}` : ''}`);
  return { ok: true, proceeds, message: `「${removed.items[0].name}」${removed.items.length > 1 ? `など${removed.items.length}個` : ''}を売却し、${proceeds}Gを得ました。` };
}

export function donateWarehouseItems(state, key, quantity = 1, confirmed = false) {
  const group = warehouseGroups(state).find(entry => entry.key === key);
  if (!group) return { ok: false, message: '倉庫にその品物はありません。' };
  if (group.item.protected || group.item.slot === 'key') return { ok: false, message: '重要品は国へ納品できません。' };
  const count = Math.max(1, Math.floor(Number(quantity || 1)));
  if (count > group.available.length) return { ok: false, message: `納品できる在庫は${group.available.length}個です。装備中の品は対象外です。` };
  if (!confirmed && group.available.slice(0, count).some(item => item.rarity === 'rare' || Number(item.value || 0) >= 80)) {
    return { ok: false, confirmationRequired: true, message: `希少品です。${count}個を国へ納品しますか？\n公認ポイント：${group.available.slice(0, count).reduce((sum, item) => sum + Math.max(1, Number(item.guildValue || Math.ceil(Number(item.value || 10) * .6))), 0)}pt` };
  }
  const removed = removeAvailable(state, key, count);
  if (!removed.items.length) return { ok: false, message: removed.message };
  const points = removed.items.reduce((sum, item) => sum + Math.max(1, Number(item.guildValue || Math.ceil(Number(item.value || 10) * .6))), 0);
  const names = removed.items[0].name + (removed.items.length > 1 ? ` ×${removed.items.length}` : '');
  const before = state.guildLevel || 1;
  const result = addGuildContribution(state, points, '倉庫から納品');
  return { ok: true, points, message: `「${names}」を国へ納品し、公認ポイントを${points}得ました。${result.level > before ? 'ギルド公認ランクが上がりました。' : ''}` };
}

export function exchangeMaterials(state, recipeId, quantity = 1) {
  const recipe = MATERIAL_EXCHANGES.find(entry => entry.id === recipeId);
  if (!recipe) return { ok: false, message: 'その交換品はありません。' };
  const count = Math.max(1, Math.floor(Number(quantity || 1)));
  for (const cost of recipe.costs) {
    const owned = (state.inventory || []).filter(item => item.slot === 'material' && item.name === cost.name && !equippedOwners(state).has(item.uid)).length;
    if (owned < cost.qty * count) return { ok: false, message: `${cost.name}が不足しています（必要 ${cost.qty * count}個）。` };
  }
  for (const cost of recipe.costs) {
    let remaining = cost.qty * count;
    for (let index = state.inventory.length - 1; index >= 0 && remaining > 0; index--) {
      const item = state.inventory[index];
      if (item.slot === 'material' && item.name === cost.name && !equippedOwners(state).has(item.uid)) {
        state.inventory.splice(index, 1);
        remaining--;
      }
    }
  }
  const template = LOOT_ITEMS.find(item => item.template === recipe.output);
  if (!template) return { ok: false, message: '交換品のデータが見つかりません。' };
  state.warehouseExchangeSequence = Math.max(0, Number(state.warehouseExchangeSequence || 0)) + count;
  for (let index = 0; index < count; index++) {
    const item = { ...template, uid: `exchange-${recipe.id}-${state.day || 1}-${state.warehouseExchangeSequence}-${index}` };
    delete item.template;
    state.inventory.push(item);
  }
  state.warehouseExchangeHistory ||= [];
  state.warehouseExchangeHistory.unshift({ day: state.day || 1, recipe: recipe.name, quantity: count });
  state.warehouseExchangeHistory = state.warehouseExchangeHistory.slice(0, 20);
  return { ok: true, message: `素材を渡し、「${recipe.name}」${count}個と交換しました。` };
}

export function materialExchangeStatus(state, recipe) {
  const counts = new Map();
  const owners = equippedOwners(state);
  for (const item of state.inventory || []) if (item.slot === 'material' && !owners.has(item.uid)) counts.set(item.name, (counts.get(item.name) || 0) + 1);
  return recipe.costs.every(cost => (counts.get(cost.name) || 0) >= cost.qty);
}
