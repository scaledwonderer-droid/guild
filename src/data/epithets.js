export const EPITHET_OPTIONS = {
  warrior: [
    { id: 'unbroken-shield', name: '不屈の盾', skillId: 'last-wall', skillName: '最後の防壁', description: '重傷になりそうな仲間をかばいやすくなる。', tags: ['guard'] },
    { id: 'pathbreaker', name: '血路を拓く者', skillId: 'breaker-strike', skillName: '突破の一撃', description: '攻撃力が少し上がる。', tags: ['damage'] },
    { id: 'companion-shield', name: '仲間を守りし者', skillId: 'shared-guard', skillName: '庇護の誓い', description: '前衛に立つ間、味方が受ける攻撃をわずかに和らげる。', tags: ['guard', 'support'] },
    { id: 'stone-anchor', name: '礎を守りし者', skillId: 'anchor-stance', skillName: '動かぬ構え', description: '自身の防御力が少し上がる。', tags: ['guard'] },
    { id: 'last-advance', name: '退路を拓く者', skillId: 'last-advance', skillName: '突破の号令', description: '仲間が危機にあるとき、かばう力が少し高まる。', tags: ['guard', 'support'] }
  ],
  mage: [
    { id: 'abyss-flare', name: '深淵を焦がす者', skillId: 'deep-flare', skillName: '深層術式', description: '術による攻撃が少し強くなる。', tags: ['damage'] },
    { id: 'star-weaver', name: '星脈を編む者', skillId: 'wide-cast', skillName: '広域詠唱', description: '複数の敵を狙う術が少し強くなる。', tags: ['area'] },
    { id: 'quiet-flame', name: '静炎の継承者', skillId: 'quiet-flame', skillName: '静炎の集中', description: '攻撃が少し強くなり、遠征疲労も抑えやすい。', tags: ['damage', 'endurance'] },
    { id: 'ember-archivist', name: '燐光を記す者', skillId: 'ember-script', skillName: '燐光術式', description: '術攻撃が少し強くなる。', tags: ['damage'] },
    { id: 'deep-scholar', name: '深夜の術師', skillId: 'deep-scholar', skillName: '深層詠唱', description: '範囲術の威力がわずかに高まる。', tags: ['area'] }
  ],
  priest: [
    { id: 'undying-lamp', name: '灯火を絶やさぬ者', skillId: 'last-light', skillName: '残光', description: '危機に瀕した仲間への回復量が増える。', tags: ['healing'] },
    { id: 'mercy-hand', name: '癒やしを継ぐ者', skillId: 'mercy-hand', skillName: '慈しみの手', description: '回復量が少し増える。', tags: ['healing'] },
    { id: 'ward-prayer', name: '祈りの守り手', skillId: 'ward-prayer', skillName: '守護の祈り', description: '毒と遠距離攻撃への備えが少し高まる。', tags: ['ward'] },
    { id: 'dawn-healer', name: '暁を継ぐ手', skillId: 'dawn-healer', skillName: '暁の手当て', description: '回復量が少し増える。', tags: ['healing'] },
    { id: 'gentle-light', name: '穏やかな灯守', skillId: 'gentle-light', skillName: '慈光の祈り', description: '危機に瀕した仲間への回復が増える。', tags: ['healing', 'support'] }
  ],
  thief: [
    { id: 'shadow-reader', name: '影を見抜く者', skillId: 'danger-sense', skillName: '危機察知', description: '罠や野営地への接近に気づきやすくなる。', tags: ['scouting'] },
    { id: 'silent-key', name: '沈黙の鍵師', skillId: 'fine-tools', skillName: '精密な細工', description: '罠の発見・解除が少し得意になる。', tags: ['scouting'] },
    { id: 'night-step', name: '夜を渡る者', skillId: 'night-step', skillName: '夜渡り', description: '素早さが少し上がり、奇襲の被害を抑える。', tags: ['scouting', 'speed'] },
    { id: 'hidden-guide', name: '隠れ道の案内人', skillId: 'hidden-guide', skillName: '隠し道の勘', description: '罠を見つけやすくし、野営地への接近にも気づく。', tags: ['scouting'] },
    { id: 'lock-reader', name: '鍵穴を読む者', skillId: 'lock-reader', skillName: '細工の見極め', description: '罠と鍵の仕掛けを見抜きやすくなる。', tags: ['scouting'] }
  ],
  archer: [
    { id: 'far-sky', name: '遠天を射抜く者', skillId: 'skyshot', skillName: '狙撃眼', description: '飛行・遠距離の敵への攻撃が強くなる。', tags: ['ranged'] },
    { id: 'windline', name: '風筋を読む者', skillId: 'windline', skillName: '風読み', description: '遠距離攻撃を受けにくくなる。', tags: ['ward', 'scouting'] },
    { id: 'swift-volley', name: '矢継ぎの名手', skillId: 'swift-volley', skillName: '連なり射ち', description: '攻撃力が少し上がる。', tags: ['damage'] },
    { id: 'arrow-singer', name: '風音を射る者', skillId: 'arrow-singer', skillName: '風音の狙い', description: '飛行・遠距離の敵への攻撃が強くなる。', tags: ['ranged'] },
    { id: 'far-watch', name: '遠景の見張り手', skillId: 'far-watch', skillName: '遠見の警戒', description: '遠距離攻撃と夜間の接近に備えやすい。', tags: ['ward', 'scouting'] }
  ],
  carrier: [
    { id: 'last-bearer', name: '最後まで背負う者', skillId: 'last-bearer', skillName: '背負い抜く力', description: '積載量が増え、荷重による疲労を抑える。', tags: ['endurance'] },
    { id: 'steady-load', name: '揺るがぬ運び手', skillId: 'steady-load', skillName: '荷重分散', description: '遠征中の疲労増加を少し抑える。', tags: ['endurance'] },
    { id: 'stone-shoulder', name: '岩を担ぐ者', skillId: 'stone-shoulder', skillName: '崩落支え', description: '崩落や落石による被害を和らげる。', tags: ['ward'] },
    { id: 'steady-traveler', name: '歩みを止めぬ者', skillId: 'steady-traveler', skillName: '歩調を整える', description: '疲労を抑え、積載量を少し増やす。', tags: ['endurance'] },
    { id: 'burden-keeper', name: '荷影を支える者', skillId: 'burden-keeper', skillName: '荷重の守り', description: '疲労の増加を抑え、崩落にも備える。', tags: ['endurance', 'ward'] }
  ]
};

export const EPITHET_SKILLS = {
  'last-wall': { lowHpGuard: 0.22, defense: 1 },
  'breaker-strike': { attack: 4 },
  'shared-guard': { allyDefense: 3 },
  'deep-flare': { magicAttack: 5 },
  'wide-cast': { areaDamage: 0.2 },
  'quiet-flame': { magicAttack: 3, fatigueReduction: 1 },
  'last-light': { criticalHeal: 9 },
  'mercy-hand': { heal: 5 },
  'ward-prayer': { poisonResistance: 0.12, rangedDefense: 1 },
  'danger-sense': { trapSkill: 0.15, raidAwareness: 0.08 },
  'fine-tools': { trapSkill: 0.12 },
  'night-step': { speed: 1, raidAwareness: 0.06 },
  skyshot: { archerBonus: 0.28 },
  windline: { rangedDefense: 2 },
  'swift-volley': { attack: 3 },
  'last-bearer': { carryBonus: 12, fatigueReduction: 2 },
  'steady-load': { carryBonus: 6, fatigueReduction: 3 },
  'stone-shoulder': { collapseDefense: 6 },
  'anchor-stance': { defense: 3 },
  'last-advance': { lowHpGuard: 0.12 },
  'ember-script': { magicAttack: 3 },
  'deep-scholar': { magicAttack: 2, areaDamage: 0.14 },
  'dawn-healer': { heal: 4 },
  'gentle-light': { heal: 2, criticalHeal: 6 },
  'hidden-guide': { trapSkill: 0.09, raidAwareness: 0.05 },
  'lock-reader': { trapSkill: 0.13 },
  'arrow-singer': { archerBonus: 0.17 },
  'far-watch': { rangedDefense: 1, raidAwareness: 0.05 },
  'steady-traveler': { carryBonus: 4, fatigueReduction: 2 },
  'burden-keeper': { fatigueReduction: 2, collapseDefense: 2 }
};

export function epithetBonuses(person) {
  const result = {};
  for (const epithet of person?.epithets || []) {
    const effect = EPITHET_SKILLS[epithet.skillId] || {};
    for (const [key, value] of Object.entries(effect)) result[key] = (result[key] || 0) + Number(value || 0);
  }
  return result;
}
