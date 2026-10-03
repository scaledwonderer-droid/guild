export const TRIAL_DUNGEON = {
  id: 'trial-labyrinth',
  name: '試練の迷宮',
  level: '15以上',
  recommendedLevel: 15,
  floors: 15,
  campFloors: [3, 6, 9, 12],
  enemies: '迷宮の番兵、残響の魔像、毒鱗の守り手',
  dangers: '複数地域で確認された罠・毒・強風・崩落・長距離行軍が組み合わさる。',
  recommended: '長期遠征に備え、前衛・回復・遠距離・探索・運搬の役割を整える。',
  boss: '迷宮の守護者',
  fixedTraits: ['十五の区画が連なる広大な迷宮', '分岐と行き止まりがある', '野営地点が複数ある', '最深部に封印された扉がある'],
  floorNames: [
    '石環の入口', '二叉の回廊', '沈黙の広間', '崩れた水路', '星図の間',
    '折返しの庭', '黒い橋梁', '旧い祈祷所', '鉱脈の廊下', '風の抜け道',
    '封鎖区画', '沈降する階段', '守り手の前庭', '最後の分岐', '封印の間'
  ],
  enemyGroups: {
    1: [['maze-wisp', 'maze-sentinel'], ['maze-wisp', 'maze-wisp']],
    2: [['maze-basilisk', 'maze-wisp'], ['maze-sentinel']],
    3: [['maze-sentinel', 'maze-sentinel'], ['maze-basilisk', 'maze-wisp']],
    4: [['maze-wisp', 'maze-basilisk'], ['maze-sentinel', 'maze-wisp']],
    5: [['maze-sentinel', 'maze-basilisk'], ['maze-wisp', 'maze-wisp', 'maze-sentinel']],
    6: [['maze-basilisk', 'maze-basilisk'], ['maze-sentinel', 'maze-wisp']],
    7: [['maze-sentinel', 'maze-wisp', 'maze-wisp'], ['maze-basilisk', 'maze-sentinel']],
    8: [['maze-wisp', 'maze-basilisk'], ['maze-sentinel', 'maze-sentinel']],
    9: [['maze-sentinel', 'maze-basilisk', 'maze-wisp'], ['maze-basilisk', 'maze-basilisk']],
    10: [['maze-wisp', 'maze-sentinel'], ['maze-wisp', 'maze-wisp', 'maze-basilisk']],
    11: [['maze-basilisk', 'maze-sentinel'], ['maze-sentinel', 'maze-sentinel']],
    12: [['maze-wisp', 'maze-basilisk', 'maze-sentinel'], ['maze-basilisk', 'maze-wisp']],
    13: [['maze-sentinel', 'maze-sentinel', 'maze-wisp'], ['maze-basilisk', 'maze-sentinel']],
    14: [['maze-wisp', 'maze-basilisk', 'maze-sentinel'], ['maze-sentinel', 'maze-basilisk']]
  },
  routeChoices: {
    2: [
      { name: '支柱沿いの道', type: 'safe' },
      { name: '割れ目を越える近道', type: 'danger', hazard: 'falling-rock', reward: true },
      { name: '封じられた小区画', type: 'deadEnd', hazard: 'alarm', detour: true }
    ],
    4: [
      { name: '水路の縁', type: 'safe' },
      { name: '水門を抜ける道', type: 'danger', hazard: 'poison', reward: true },
      { name: '行き止まりの貯蔵室', type: 'deadEnd', detour: true }
    ],
    5: [
      { name: '壁画に沿う回廊', type: 'safe' },
      { name: '崩れた天井の下', type: 'danger', hazard: 'cave-in', reward: true }
    ],
    7: [
      { name: '低い石橋', type: 'safe' },
      { name: '風の強い吊り橋', type: 'danger', hazard: 'gust', reward: true },
      { name: '橋下の横穴', type: 'deadEnd', hazard: 'low-visibility', detour: true }
    ],
    9: [
      { name: '支保工の残る坑道', type: 'safe' },
      { name: '鉱脈を横切る道', type: 'danger', hazard: 'dust', reward: true },
      { name: '採掘跡の袋小路', type: 'deadEnd', detour: true }
    ],
    11: [
      { name: '見張り穴を避ける道', type: 'safe' },
      { name: '仕掛けの残る区画', type: 'danger', hazard: 'blast', reward: true },
      { name: '閉鎖扉の裏側', type: 'deadEnd', hazard: 'pit', detour: true }
    ],
    14: [
      { name: '外周の回廊', type: 'safe' },
      { name: '中央の崩落路', type: 'danger', hazard: 'unstable-ground', reward: true },
      { name: '行き止まりの祭壇', type: 'deadEnd', detour: true }
    ]
  },
  enemiesById: {
    'maze-wisp': { name: '残響の魔像', hp: 92, attack: 23, defense: 7, speed: 16, xp: 32, kind: 'flying', ranged: true },
    'maze-sentinel': { name: '迷宮の番兵', hp: 148, attack: 27, defense: 15, speed: 7, xp: 38, kind: 'construct' },
    'maze-basilisk': { name: '毒鱗の守り手', hp: 116, attack: 25, defense: 10, speed: 11, xp: 36, kind: 'beast', poison: true },
    'trial-boss': {
      name: '迷宮の守護者', hp: 1850, attack: 56, defense: 19, speed: 12, xp: 260,
      kind: 'boss', boss: true, majorBoss: true, trialBoss: true,
      phaseThreshold: 0.52, phaseAttackBonus: 8, specialEvery: 2,
      specialPattern: ['sweep', 'withering-pulse', 'sweep']
    }
  },
  sideEvents: [
    { title: '残された水瓶', lines: ['壁龕の水瓶に、まだ澄んだ水が残っていた。皆で分けて喉を潤す。'], effect: 'heal' },
    { title: '古い道標', lines: ['かすれた道標に、二つの分岐を示す刻印が残っていた。'], effect: 'scout' },
    { title: '崩れた荷置き場', lines: ['荷を置くための石棚を見つけ、隊列を整え直した。'], effect: 'fatigue' }
  ],
  explorationLines: [
    '壁の刻印が少しずつ変わる。通路は、同じ場所へ戻っているようにも見えた。',
    '二つの道が先で交わっている。足跡の多い方には、何かが通った跡がある。',
    '遠くで石の動く音がした。迷宮は静かに形を変えている。'
  ],
  hazards: ['pit', 'poison', 'blast', 'alarm', 'gust', 'falling-rock', 'low-visibility', 'cave-in', 'dust', 'unstable-ground'],
  lootPool: ['weapon_mine_pick', 'armor_miner_plate', 'material_crystal_ore', 'material_iron_ore']
};

export const TRIAL_KEY_ITEMS = [
  { keyId: 'seal-ashen-loop', name: '灰色の環片', slot: 'key', rarity: 'rare', value: 0, guildValue: 0, weight: 0, protected: true, note: '用途不明。表面に古い刻印がある。' },
  { keyId: 'seal-iron-mark', name: '鈍い鉄の刻片', slot: 'key', rarity: 'rare', value: 0, guildValue: 0, weight: 0, protected: true, note: '用途不明。刃物では削れない硬さを持つ。' },
  { keyId: 'seal-feather-glyph', name: '羽紋の石片', slot: 'key', rarity: 'rare', value: 0, guildValue: 0, weight: 0, protected: true, note: '用途不明。風にさらされたような模様が残る。' },
  { keyId: 'seal-deep-vein', name: '晶脈の封片', slot: 'key', rarity: 'rare', value: 0, guildValue: 0, weight: 0, protected: true, note: '用途不明。内部に淡い光が見える。' }
];

export const RARE_BOSSES = {
  'old-cave': {
    id: 'rare-ashen-horn', name: '灰角の喰らい手',
    template: { name: '灰角の喰らい手', hp: 202, attack: 21, defense: 8, speed: 12, xp: 82, kind: 'boss', boss: true, rareBoss: true, specialEvery: 3, specialPattern: ['howl'] },
    keyId: 'seal-ashen-loop'
  },
  'trap-fort': {
    id: 'rare-black-warden', name: '黒鎧の番人',
    template: { name: '黒鎧の番人', hp: 248, attack: 24, defense: 13, speed: 8, xp: 96, kind: 'boss', boss: true, rareBoss: true, specialEvery: 2, specialPattern: ['trap-snap'] },
    keyId: 'seal-iron-mark'
  },
  'wind-gorge': {
    id: 'rare-storm-eater', name: '嵐喰らい',
    template: { name: '嵐喰らい', hp: 274, attack: 27, defense: 10, speed: 17, xp: 112, kind: 'flying', boss: true, rareBoss: true, ranged: true, specialEvery: 2, specialPattern: ['gale-sweep'] },
    keyId: 'seal-feather-glyph'
  },
  'collapsed-mine': {
    id: 'rare-vein-colossus', name: '鉱脈喰らい',
    template: { name: '鉱脈喰らい', hp: 352, attack: 31, defense: 17, speed: 5, xp: 140, kind: 'boss', boss: true, rareBoss: true, specialEvery: 2, specialPattern: ['cave-slam'] },
    keyId: 'seal-deep-vein'
  }
};

export const TRIAL_REQUIRED_KEY_IDS = TRIAL_KEY_ITEMS.map(item => item.keyId);
