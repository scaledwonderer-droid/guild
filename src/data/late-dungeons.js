// Post-Trial locations. These definitions carry the authored world facts;
// the UI reveals only observations recorded by a returning expedition.
export const LATE_DUNGEONS = {
  'aldina-road': {
    id: 'aldina-road', name: 'アルディナ旧街道', level: '15〜19', recommendedLevel: 15, floors: 8,
    enemies: '街道の残党、石殻の番兵、夜渡り',
    dangers: '古い防衛設備、罠付きの収納箱、毒と警報。', boss: '街道守備長',
    lateGame: true,
    fixedTraits: ['分岐と行き止まりがある', '保管箱に仕掛けが残っている', '毒と警報を伴う危険がある'],
    floorNames: ['石標の門', '崩れた関所', '荷車置き場', '白い回廊', '旧宿駅', '地下の詰所', '三叉路の広場', '街道守備長の間'],
    campFloors: [2, 4, 6], marchFatigue: 1,
    enemyGroups: {
      1: [['road-raider', 'road-sentinel'], ['road-raider', 'road-raider']],
      2: [['road-sentinel', 'road-sentinel'], ['road-raider', 'road-stalker']],
      3: [['road-stalker', 'road-raider'], ['road-sentinel', 'road-stalker']],
      4: [['road-raider', 'road-sentinel', 'road-raider']],
      5: [['road-stalker', 'road-sentinel'], ['road-raider', 'road-stalker']],
      6: [['road-sentinel', 'road-sentinel'], ['road-stalker', 'road-raider']],
      7: [['road-raider', 'road-stalker', 'road-sentinel']]
    },
    enemiesById: {
      'road-raider': { name: '街道の残党', hp: 178, attack: 34, defense: 12, speed: 13, xp: 42, kind: 'ranged', ranged: true, inflict: '裂傷' },
      'road-sentinel': { name: '石殻の番兵', hp: 260, attack: 31, defense: 23, speed: 6, xp: 48, kind: 'construct', counterMelee: true },
      'road-stalker': { name: '夜渡り', hp: 164, attack: 36, defense: 10, speed: 18, xp: 46, kind: 'assassin', inflict: '恐慌' },
      boss: { name: '街道守備長', hp: 980, attack: 49, defense: 22, speed: 12, xp: 190, kind: 'boss', boss: true, specialEvery: 2, specialPattern: ['trap-snap', 'withering-pulse'] }
    },
    sideEvents: [
      { title: '旧い道標', lines: ['崩れた道標の向きを直し、次の分岐で迷わないよう印を残した。'], effect: 'scout' },
      { title: '破れた荷札', lines: ['路肩で古い荷札を見つけた。隊列を整えて、周囲の気配を確かめる。'], effect: 'fatigue' }
    ],
    explorationLines: ['街道の石畳は所々で途切れ、古い足跡と新しい傷が重なっている。', 'いくつもの脇道が伸びている。見通しの悪い場所では足音を抑えた。'],
    hazards: ['pit', 'poison', 'alarm', 'laceration', 'low-visibility'],
    routeChoices: {
      3: [{ name: '外壁沿いの道', type: 'safe' }, { name: '荷車跡の近道', type: 'danger', hazard: 'alarm', reward: true }],
      5: [{ name: '崩れた宿駅を回る', type: 'safe' }, { name: '地下荷捌き場を抜ける', type: 'danger', hazard: 'poison', reward: true }]
    },
    lootPool: ['weapon_wayfarer_blade', 'armor_surveyor_coat', 'material_road_seal', 'weapon_gale_bow']
  },
  'fergran-ruins': {
    id: 'fergran-ruins', name: 'フェルグラン遺構', level: '16〜20', recommendedLevel: 16, floors: 9,
    enemies: '岩棚の射手、風切りの守り手、石翼の狩人',
    dangers: '崩れた足場、高所からの射撃、接近への反撃。', boss: '遺構の監視者',
    lateGame: true,
    fixedTraits: ['上下に分かれた狭い通路がある', '遠距離と接近戦の敵が混在する', '足場の崩れた区画がある'],
    floorNames: ['前庭の石段', '折れた回廊', '低い橋梁', '風抜けの間', '沈んだ中庭', '東の見張り場', '石翼の通路', '上層の回廊', '監視者の円堂'],
    campFloors: [2, 4, 6, 8], marchFatigue: 1,
    enemyGroups: {
      1: [['ruin-harrier', 'ruin-guard'], ['ruin-harrier', 'ruin-harrier']],
      2: [['ruin-guard', 'ruin-archer'], ['ruin-harrier', 'ruin-guard']],
      3: [['ruin-harrier', 'ruin-archer'], ['ruin-guard', 'ruin-guard']],
      4: [['ruin-harrier', 'ruin-guard', 'ruin-archer']],
      5: [['ruin-archer', 'ruin-guard'], ['ruin-harrier', 'ruin-harrier']],
      6: [['ruin-guard', 'ruin-archer', 'ruin-harrier']],
      7: [['ruin-harrier', 'ruin-guard'], ['ruin-archer', 'ruin-archer']],
      8: [['ruin-guard', 'ruin-harrier', 'ruin-archer']]
    },
    enemiesById: {
      'ruin-harrier': { name: '石翼の狩人', hp: 186, attack: 39, defense: 13, speed: 19, xp: 48, kind: 'flying', ranged: true, inflict: '転倒' },
      'ruin-guard': { name: '風切りの守り手', hp: 292, attack: 37, defense: 24, speed: 7, xp: 52, kind: 'counter', counterMelee: true },
      'ruin-archer': { name: '岩棚の射手', hp: 178, attack: 38, defense: 12, speed: 15, xp: 49, kind: 'ranged', ranged: true, inflict: '裂傷' },
      boss: { name: '遺構の監視者', hp: 1120, attack: 53, defense: 24, speed: 14, xp: 220, kind: 'flying', ranged: true, boss: true, specialEvery: 2, specialPattern: ['gale-sweep', 'sweep'] }
    },
    sideEvents: [
      { title: '欠けた欄干', lines: ['欄干の亀裂を確かめ、狭い足場を一列で渡った。'], effect: 'scout' },
      { title: '風の反響', lines: ['壁のすき間を抜ける風が、上階の物音を運んできた。'], effect: 'fatigue' }
    ],
    explorationLines: ['通路は高低差のある小部屋で途切れ、見えない場所から羽音が返ってくる。', '足場の端を確かめながら進む。遠くの射手と上空の影を同時に警戒した。'],
    hazards: ['gust', 'falling-rock', 'unstable-ground', 'narrow-ledge', 'low-visibility'],
    lootPool: ['weapon_ridgepiercer', 'armor_windward_vest', 'material_ruin_core', 'armor_feather_cloak']
  },
  'north-expanse': {
    id: 'north-expanse', name: '北境外縁地', level: '17〜21', recommendedLevel: 17, floors: 10,
    enemies: '外縁の獣、採掘跡の守り手、追跡者',
    dangers: '長い移動、重量、負傷の蓄積、野営地への接近。', boss: '外縁の主',
    lateGame: true,
    fixedTraits: ['長距離の移動が続く', '重い戦利品の置き場が複数ある', '安全な野営地点は限られる'],
    floorNames: ['境界標', '石ころ道', '風除けの窪地', '古い荷揚場', '深い谷筋', '倒木の斜面', '砕石の段丘', '忘れられた宿営地', '北の外壁', '外縁の主の巣'],
    campFloors: [2, 4, 6, 8], marchFatigue: 3,
    enemyGroups: {
      1: [['expanse-beast', 'expanse-scout'], ['expanse-beast', 'expanse-beast']],
      2: [['expanse-guard', 'expanse-scout'], ['expanse-beast', 'expanse-guard']],
      3: [['expanse-beast', 'expanse-scout', 'expanse-beast']],
      4: [['expanse-guard', 'expanse-guard'], ['expanse-scout', 'expanse-beast']],
      5: [['expanse-beast', 'expanse-guard'], ['expanse-beast', 'expanse-scout']],
      6: [['expanse-guard', 'expanse-scout', 'expanse-beast']],
      7: [['expanse-beast', 'expanse-beast', 'expanse-scout']],
      8: [['expanse-guard', 'expanse-scout'], ['expanse-guard', 'expanse-beast']],
      9: [['expanse-beast', 'expanse-guard', 'expanse-scout']]
    },
    enemiesById: {
      'expanse-beast': { name: '北境の獣', hp: 218, attack: 40, defense: 16, speed: 13, xp: 52, kind: 'beast', inflict: '裂傷' },
      'expanse-guard': { name: '採掘跡の守り手', hp: 332, attack: 38, defense: 27, speed: 5, xp: 57, kind: 'construct', counterMelee: true },
      'expanse-scout': { name: '追跡者', hp: 192, attack: 41, defense: 12, speed: 17, xp: 55, kind: 'ranged', ranged: true, inflict: '恐慌' },
      boss: { name: '外縁の主', hp: 1280, attack: 57, defense: 25, speed: 9, xp: 250, kind: 'beast', boss: true, specialEvery: 2, specialPattern: ['cave-slam', 'howl'] }
    },
    sideEvents: [
      { title: '風を避ける石棚', lines: ['崩れにくい石棚を見つけ、荷を下ろして手早く結び直した。'], effect: 'fatigue' },
      { title: '忘れられた荷置き場', lines: ['古い荷置き場に残った包帯と水を分け合った。'], effect: 'heal' }
    ],
    explorationLines: ['見通しのきかない起伏が続く。後ろの仲間の歩調を確かめながら距離を詰めた。', '荷の重みが肩に残る。先の野営地まで、休める場所は見当たらない。'],
    hazards: ['long-haul', 'dust', 'unstable-ground', 'laceration', 'low-visibility'],
    lootPool: ['weapon_northstar_hammer', 'armor_wayfarer_mail', 'material_northstone', 'material_crystal_ore']
  }
};
