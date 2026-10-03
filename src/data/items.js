export const STARTING_ITEMS = [
  { uid: 'weapon_iron_sword', name: '鉄の剣', slot: 'weapon', attack: 3, defense: 0, heal: 0, rarity: 'common', value: 18, guildValue: 10, weight: 3, note: '手になじむ実用的な剣。' },
  { uid: 'weapon_spear', name: '狩人の槍', slot: 'weapon', attack: 2, defense: 0, heal: 0, rarity: 'common', value: 16, guildValue: 9, weight: 4, note: '間合いを保ちやすい槍。' },
  { uid: 'weapon_oak_staff', name: '樫の杖', slot: 'weapon', attack: 4, defense: 0, heal: 0, rarity: 'common', value: 18, guildValue: 10, weight: 2, note: '魔力を通しやすい木製の杖。' },
  { uid: 'weapon_copper_wand', name: '銅の短杖', slot: 'weapon', attack: 3, defense: 0, heal: 0, rarity: 'common', value: 17, guildValue: 9, weight: 1, note: '持ち運びやすい短い杖。' },
  { uid: 'weapon_blessed_rod', name: '祝福のロッド', slot: 'weapon', attack: 1, defense: 0, heal: 4, rarity: 'uncommon', value: 32, guildValue: 18, weight: 2, note: '回復術の手応えを少し高める。' },
  { uid: 'weapon_ash_staff', name: '灰樫の杖', slot: 'weapon', attack: 2, defense: 0, heal: 1, rarity: 'common', value: 15, guildValue: 8, weight: 2, note: '灰冠の森で伐られた木の杖。' },
  { uid: 'armor_leather', name: '革の胸当て', slot: 'armor', attack: 0, defense: 2, heal: 0, rarity: 'common', value: 16, guildValue: 9, weight: 3, note: '軽く、動きやすい防具。' },
  { uid: 'armor_iron', name: '鉄の胴鎧', slot: 'armor', attack: 0, defense: 4, heal: 0, rarity: 'common', value: 24, guildValue: 14, weight: 7, note: '重いが頼りになる鎧。' },
  { uid: 'armor_travel_robe', name: '旅装のローブ', slot: 'armor', attack: 0, defense: 1, heal: 0, rarity: 'common', value: 14, guildValue: 8, weight: 2, note: '動きやすさを重視した衣服。' },
  { uid: 'armor_priest_vest', name: '神官の法衣', slot: 'armor', attack: 0, defense: 2, heal: 0, rarity: 'common', value: 18, guildValue: 10, weight: 2, note: '丈夫な布を重ねた法衣。' }
];

export const LOOT_ITEMS = [
  { template: 'weapon_goblin_cleaver', name: 'ゴブリンの鉈', slot: 'weapon', attack: 4, defense: 0, heal: 0, rarity: 'uncommon', value: 28, guildValue: 16, weight: 4, note: '荒削りだが、刃はよく研がれている。' },
  { template: 'weapon_glow_crystal', name: '灯晶の杖', slot: 'weapon', attack: 5, defense: 0, heal: 1, rarity: 'rare', value: 55, guildValue: 32, weight: 3, note: '洞窟の灯晶を埋め込んだ杖。' },
  { template: 'armor_scale_vest', name: '洞窟獣の鱗鎧', slot: 'armor', attack: 0, defense: 5, heal: 0, rarity: 'rare', value: 58, guildValue: 34, weight: 5, effects: { poisonResistance: .28 }, note: 'しなやかな鱗を編み込んだ軽鎧。毒への抵抗を高める。' },
  { template: 'armor_reinforced_leather', name: '補強革鎧', slot: 'armor', attack: 0, defense: 3, heal: 0, rarity: 'uncommon', value: 32, guildValue: 18, weight: 4, note: '要所に金具を加えた革鎧。' },
  { template: 'weapon_trapfang_dagger', name: '罠牙の短剣', slot: 'weapon', attack: 7, defense: 0, heal: 0, rarity: 'rare', value: 78, guildValue: 48, weight: 1, effects: { trapAssist: .08 }, note: '罠師の廃砦で見つかった軽い短剣。罠の細工を見抜きやすい。' },
  { template: 'armor_fort_guard', name: '砦番の鎖帷子', slot: 'armor', attack: 0, defense: 7, heal: 0, rarity: 'rare', value: 86, guildValue: 52, weight: 8, note: '重さに見合う防護力を持つ。' },
  { template: 'weapon_gale_bow', name: '風読みの弓', slot: 'weapon', attack: 8, defense: 0, heal: 0, rarity: 'rare', value: 92, guildValue: 56, weight: 3, note: '高所の敵にも狙いを定めやすい弓。' },
  { template: 'armor_feather_cloak', name: '羽織の外套', slot: 'armor', attack: 0, defense: 5, heal: 0, rarity: 'uncommon', value: 62, guildValue: 38, weight: 1, effects: { rangedDefense: 2, fatigue: -1 }, note: '風を受け流す軽い外套。遠距離攻撃を和らげ、疲労も少し抑える。' },
  { template: 'weapon_mine_pick', name: '鉱脈砕き', slot: 'weapon', attack: 9, defense: 0, heal: 0, rarity: 'rare', value: 105, guildValue: 64, weight: 8, note: '鉱山守りの戦鎚を兼ねる採掘具。' },
  { template: 'armor_miner_plate', name: '坑道守りの板金鎧', slot: 'armor', attack: 0, defense: 9, heal: 0, rarity: 'rare', value: 118, guildValue: 72, weight: 12, effects: { collapseDefense: 4 }, note: '崩落にも耐える重装備。落石や崩落の衝撃を和らげる。' },
  { template: 'material_cave_shard', name: '洞晶の欠片', slot: 'material', attack: 0, defense: 0, heal: 0, rarity: 'common', value: 11, guildValue: 7, weight: 1, note: '町の工房で短剣や外套との交換に使える。売却・国への納品も可能。' },
  { template: 'material_lockbox_relic', name: '砦の封印具', slot: 'material', attack: 0, defense: 0, heal: 0, rarity: 'uncommon', value: 38, guildValue: 24, weight: 1, note: '町の工房で罠牙の短剣との交換に使える。売却・国への納品も可能。' },
  { template: 'material_harpy_feather', name: '風切り羽根', slot: 'material', attack: 0, defense: 0, heal: 0, rarity: 'common', value: 24, guildValue: 15, weight: 1, note: '町の工房で軽い外套との交換に使える。売却・国への納品も可能。' },
  { template: 'material_iron_ore', name: '鉄鉱石', slot: 'material', attack: 0, defense: 0, heal: 0, rarity: 'common', value: 28, guildValue: 17, weight: 5, note: '町の工房で重装鎧との交換に使える。売却・国への納品も可能。' },
  { template: 'material_crystal_ore', name: '晶鉱石', slot: 'material', attack: 0, defense: 0, heal: 0, rarity: 'uncommon', value: 48, guildValue: 30, weight: 4, note: '町の工房で重装鎧との交換に使える。売却・国への納品も可能。' }
];

export const SHOP_ITEMS = [
  { template: 'weapon_steel_sword', name: '鋼の剣', slot: 'weapon', attack: 6, defense: 0, heal: 0, rarity: 'uncommon', value: 48, guildValue: 24, weight: 4, price: 42, note: '扱いやすく、少し鋭い鋼剣。' },
  { template: 'armor_scout_coat', name: '斥候の上着', slot: 'armor', attack: 0, defense: 4, heal: 0, rarity: 'uncommon', value: 42, guildValue: 22, weight: 2, price: 38, effects: { trapAssist: .035, fatigue: -1 }, note: '軽さを保ったまま要所を守る。足元の罠にも気づきやすい。' },
  { template: 'weapon_travel_bow', name: '訓練用の弓', slot: 'weapon', attack: 5, defense: 0, heal: 0, rarity: 'common', value: 30, guildValue: 16, weight: 3, price: 28, note: '新しく加わった弓師にも扱いやすい。' }
];

export const slotName = slot => ({ weapon: '武器', armor: '防具', material: '素材', consumable: '消耗品', valuable: '換金品', key: '重要品', misc: 'その他' })[slot] || 'その他';
