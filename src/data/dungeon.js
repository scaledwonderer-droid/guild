import { TRIAL_DUNGEON } from './v07.js';

const oldCave = {
  id: 'old-cave', name: '古びた洞窟', level: '1〜3', recommendedLevel: 1, floors: 5,
  enemies: 'ゴブリン、洞窟狼、岩トカゲ', dangers: '物理攻撃が中心。罠は少ないが、狭い通路で挟み撃ちに遭うことがある。',
  recommended: '前衛1人以上、回復役1人。範囲攻撃があると複数の敵に有利。', boss: '洞窟の大ゴブリン「灰牙」',
  fixedTraits: ['ゴブリン系の敵が多い', '敵は物理攻撃が主体', '罠は少ない', '第5階層にボスがいる'],
  floorNames: ['入口の横穴', '湿った坑道', '崩れた採掘場', '古い地下水路', '灰牙の広間'],
  enemyGroups: { 1: [['goblin', 'goblin'], ['goblin', 'cave-wolf']], 2: [['goblin', 'goblin', 'goblin'], ['goblin', 'cave-wolf']], 3: [['goblin', 'rock-lizard'], ['goblin', 'goblin']], 4: [['goblin', 'goblin', 'cave-wolf'], ['rock-lizard', 'goblin']] },
  enemiesById: {
    goblin: { name: 'ゴブリン', hp: 27, attack: 8, defense: 1, speed: 7, xp: 7, kind: 'goblin' },
    'cave-wolf': { name: '洞窟狼', hp: 34, attack: 10, defense: 2, speed: 11, xp: 10, kind: 'beast' },
    'rock-lizard': { name: '岩トカゲ', hp: 43, attack: 9, defense: 4, speed: 5, xp: 12, kind: 'beast' },
    boss: { name: '灰牙', hp: 122, attack: 14, defense: 5, speed: 8, xp: 40, kind: 'boss' }
  },
  sideEvents: [
    { title: '崩れた採掘跡', lines: ['古い道具の陰から、まだ使えそうな包帯が見つかりました。', '天井から落ちた石を避け、隊列を組み直しました。'], effect: 'heal' },
    { title: '壁の引っかき傷', lines: ['壁の傷跡を見つけました。ゴブリンたちの縄張りが近いようです。', '慎重に足跡を追い、敵の奇襲を未然に避けました。'], effect: 'scout' },
    { title: '細い水脈', lines: ['岩の割れ目から清水が流れています。ひと息つき、喉を潤しました。', '水音に紛れて、奥の広間から複数の足音が聞こえました。'], effect: 'fatigue' }
  ],
  explorationLines: ['狭い通路を隊列を崩さず進みました。ゴブリンの足跡が続いています。', '崩れた坑道を抜け、ゴブリンたちが残した木箱を見つけました。', '古い採掘印をたどり、安全な道を選んで先へ進みました。'],
  hazards: [], lootPool: ['weapon_goblin_cleaver', 'armor_reinforced_leather', 'material_cave_shard']
};

const trapFort = {
  id: 'trap-fort', name: '黒峰砦跡', level: '5〜8', recommendedLevel: 5, floors: 5,
  enemies: '砦ゴブリン、番犬、廃砦の番兵', dangers: '落とし穴・毒針・爆発罠・警報装置。2・4階に鍵付き宝箱。',
  recommended: '盗賊がいると罠を解除し、鍵付き宝箱を開けやすい。神官も有効。', boss: '罠師長グロム',
  fixedTraits: ['通路の各所に罠がある', '毒針と爆発罠が確認されている', '警報装置が残っている', '第2・第4階に鍵付き宝箱'],
  floorNames: ['外壁の崩れ口', '矢狭間の回廊', '兵舎跡', '地下の保管庫', '罠師の司令室'],
  enemyGroups: { 1: [['fort-goblin', 'fort-goblin'], ['fort-hound']], 2: [['fort-goblin', 'fort-guard'], ['fort-hound', 'fort-goblin']], 3: [['fort-guard', 'fort-goblin'], ['fort-goblin', 'fort-goblin', 'fort-hound']], 4: [['fort-guard', 'fort-hound'], ['fort-guard', 'fort-goblin']] },
  enemiesById: {
    'fort-goblin': { name: '砦ゴブリン', hp: 40, attack: 12, defense: 3, speed: 8, xp: 13, kind: 'goblin' },
    'fort-hound': { name: '砦の番犬', hp: 46, attack: 13, defense: 3, speed: 12, xp: 15, kind: 'beast' },
    'fort-guard': { name: '廃砦の番兵', hp: 58, attack: 15, defense: 6, speed: 6, xp: 18, kind: 'guard' },
    boss: { name: '罠師長グロム', hp: 174, attack: 19, defense: 7, speed: 8, xp: 62, kind: 'boss' }
  },
  sideEvents: [{ title: '崩れた見張り台', lines: ['見張り台の跡から砦の古い配置図を見つけた。', '足場の崩れた場所を避け、回り道を選んだ。'], effect: 'scout' }],
  explorationLines: ['壁の継ぎ目に細い針金が走っている。罠の気配が濃い。', '床石の並びに不自然な間隔がある。足元を確かめて進む。'],
  hazards: ['pit', 'poison', 'blast', 'alarm'], lootPool: ['weapon_trapfang_dagger', 'armor_fort_guard', 'material_lockbox_relic']
};

const gorge = {
  id: 'wind-gorge', name: 'ヴァルデン峡谷', level: '8〜11', recommendedLevel: 8, floors: 5,
  enemies: '崖トカゲ、風切りハーピー、岩棚の射手', dangers: '高所からの矢と飛行敵。強風で隊列が乱れ、視界が悪い。',
  recommended: '弓師が飛行敵や高所の射手を抑える。前衛と回復役も重要。', boss: '嵐翼のハーピー「ヴァルカ」',
  fixedTraits: ['飛行する敵が多い', '敵が高所から遠距離攻撃を行う', '強風で疲労が増えやすい', '第5階層に嵐翼のボスがいる'],
  floorNames: ['風穴の入口', '細い崖道', '折れた吊り橋', '風鳴きの棚', '嵐翼の巣'],
  enemyGroups: { 1: [['cliff-harpy', 'cliff-lizard'], ['cliff-harpy', 'cliff-harpy']], 2: [['ridge-archer', 'cliff-harpy'], ['cliff-lizard', 'ridge-archer']], 3: [['cliff-harpy', 'ridge-archer'], ['cliff-harpy', 'cliff-lizard', 'cliff-harpy']], 4: [['ridge-archer', 'cliff-harpy'], ['cliff-harpy', 'ridge-archer']] },
  enemiesById: {
    'cliff-harpy': { name: '風切りハーピー', hp: 52, attack: 16, defense: 3, speed: 14, xp: 19, kind: 'flying', ranged: true, archerWeakpoint: true },
    'cliff-lizard': { name: '崖トカゲ', hp: 62, attack: 17, defense: 7, speed: 8, xp: 20, kind: 'beast', meleeRetaliation: true, retaliationDamage: .42, retaliationEffect: '転倒' },
    'ridge-archer': { name: '岩棚の射手', hp: 48, attack: 18, defense: 3, speed: 12, xp: 21, kind: 'ranged', magicResistance: .48, archerWeakpoint: true },
    boss: { name: 'ヴァルカ', hp: 218, attack: 23, defense: 8, speed: 15, xp: 78, kind: 'flying', ranged: true, boss: true, meleeRetaliation: true, retaliationDamage: .48, retaliationEffect: '出血', magicResistance: .3, archerWeakpoint: true }
  },
  sideEvents: [{ title: '崖道の風', lines: ['突風が吹き抜け、荷紐が激しく鳴った。隊列を組み直す。', '風の弱まる岩陰を見つけ、ひと息ついた。'], effect: 'fatigue' }],
  explorationLines: ['風に混じる羽音が頭上を横切った。遠くの岩棚にも動く影がある。', '崖沿いの細道を選び、吹き上げる風に身を低くして進む。'],
  hazards: ['gust', 'falling-rock', 'low-visibility'], lootPool: ['weapon_gale_bow', 'armor_feather_cloak', 'material_harpy_feather']
};

const mine = {
  id: 'collapsed-mine', name: '北境採掘区', level: '10〜13', recommendedLevel: 10, floors: 5,
  enemies: '坑道ゴーレム、鉱山コウモリ、鉄殻の甲虫', dangers: '崩落・粉塵・狭い足場。鉱石と重い装備が多く、積載超過に注意。',
  recommended: '運び屋が積載量を増やして疲労を抑える。戦士は崩落時の救助に向く。', boss: '坑道守護ゴーレム',
  fixedTraits: ['鉱石と重量装備が豊富', '天井の崩落が起こりやすい', '粉塵で疲労が増加する', '重い戦利品は積載量を圧迫する'],
  floorNames: ['坑口の選鉱場', '支柱の坑道', '鉱脈の交差点', '崩れた縦坑', '守護像の採掘室'],
  enemyGroups: { 1: [['mine-bat', 'mine-beetle'], ['mine-beetle', 'mine-beetle']], 2: [['mine-golem'], ['mine-bat', 'mine-bat', 'mine-beetle']], 3: [['mine-golem', 'mine-beetle'], ['mine-golem', 'mine-bat']], 4: [['mine-golem', 'mine-beetle'], ['mine-golem', 'mine-golem']] },
  enemiesById: {
    'mine-bat': { name: '鉱山コウモリ', hp: 58, attack: 17, defense: 4, speed: 15, xp: 21, kind: 'flying' },
    'mine-beetle': { name: '鉄殻の甲虫', hp: 78, attack: 18, defense: 10, speed: 5, xp: 23, kind: 'beast' },
    'mine-golem': { name: '坑道ゴーレム', hp: 100, attack: 22, defense: 11, speed: 4, xp: 28, kind: 'construct' },
    boss: { name: '坑道守護ゴーレム', hp: 286, attack: 28, defense: 13, speed: 5, xp: 105, kind: 'boss' }
  },
  sideEvents: [{ title: '鉱脈のきらめき', lines: ['壁の鉱脈から良質な鉱石を掘り出した。', '粉塵が落ち着くまで、荷物をまとめ直した。'], effect: 'loot' }],
  explorationLines: ['鉱脈の先で足場が狭くなった。重い荷を分けて運ぶ。', '新しい鉱脈が見つかった。運べる量を考えて採掘する。'],
  hazards: ['cave-in', 'dust', 'unstable-ground'], lootPool: ['weapon_mine_pick', 'armor_miner_plate', 'material_iron_ore', 'material_crystal_ore']
};

export const DUNGEONS = { 'old-cave': oldCave, 'trap-fort': trapFort, 'wind-gorge': gorge, 'collapsed-mine': mine, 'trial-labyrinth': TRIAL_DUNGEON };
export const DUNGEON = oldCave;
export const getDungeon = id => DUNGEONS[id] || oldCave;
