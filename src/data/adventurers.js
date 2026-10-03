import { equipmentProfile } from '../systems/equipment.js';
import { epithetBonuses } from './epithets.js';

export const JOBS = {
  warrior: { id: 'warrior', name: '戦士', role: '前衛', icon: '剣', baseHp: 112, hpPerLevel: 12, attack: 16, attackPerLevel: 2, defense: 10, defensePerLevel: 1, speed: 7, description: '高い耐久力で仲間を守り、敵の注意を引きつける。' },
  mage: { id: 'mage', name: '魔術師', role: '攻撃役', icon: '術', baseHp: 70, hpPerLevel: 7, attack: 23, attackPerLevel: 3, defense: 4, defensePerLevel: 0.5, speed: 9, description: '防御は薄いが、複数の敵にも届く強力な術を使う。' },
  priest: { id: 'priest', name: '神官', role: '回復役', icon: '聖', baseHp: 84, hpPerLevel: 9, attack: 9, attackPerLevel: 1, defense: 7, defensePerLevel: 0.7, speed: 8, description: '仲間の傷を癒やし、長い探索を支える。' },
  thief: { id: 'thief', name: '盗賊', role: '罠・鍵・索敵', icon: '鍵', baseHp: 76, hpPerLevel: 8, attack: 12, attackPerLevel: 1.5, defense: 5, defensePerLevel: 0.6, speed: 13, description: '罠を見抜いて解除し、鍵付きの宝箱や安全な道を探す。' },
  archer: { id: 'archer', name: '弓師', role: '遠距離・対空', icon: '弓', baseHp: 80, hpPerLevel: 8, attack: 16, attackPerLevel: 2, defense: 5, defensePerLevel: 0.5, speed: 12, description: '後衛から飛行する敵や高所の射手を射抜く。' },
  carrier: { id: 'carrier', name: '運び屋', role: '運搬・疲労軽減', icon: '荷', baseHp: 94, hpPerLevel: 10, attack: 8, attackPerLevel: 1, defense: 7, defensePerLevel: 0.7, speed: 6, description: '荷を効率よく運び、重い遠征でも仲間の疲労を抑える。' }
};

export const STARTING_ADVENTURERS = [
  { id: 'leon', name: 'レオン', job: 'warrior', level: 2, exp: 0, personality: '勇敢', quirk: '危険の気配がすると、自然と仲間の前に立つ。', weapon: 'weapon_iron_sword', armor: 'armor_leather', fatigue: 0, injury: null, hp: null },
  { id: 'bram', name: 'ブラム', job: 'warrior', level: 1, exp: 12, personality: '慎重', quirk: '地面や壁をよく観察してから進む。', weapon: 'weapon_spear', armor: 'armor_iron', fatigue: 0, injury: null, hp: null },
  { id: 'milia', name: 'ミリア', job: 'mage', level: 2, exp: 0, personality: '強気', quirk: '難しい術ほど、試してみたくなる。', weapon: 'weapon_oak_staff', armor: 'armor_travel_robe', fatigue: 0, injury: null, hp: null },
  { id: 'cecil', name: 'セシル', job: 'mage', level: 1, exp: 8, personality: '無口', quirk: '必要なことだけを短く話す。', weapon: 'weapon_copper_wand', armor: 'armor_travel_robe', fatigue: 0, injury: null, hp: null },
  { id: 'elna', name: 'エルナ', job: 'priest', level: 2, exp: 0, personality: '温厚', quirk: '仲間の小さな変化によく気づく。', weapon: 'weapon_blessed_rod', armor: 'armor_priest_vest', fatigue: 0, injury: null, hp: null },
  { id: 'toma', name: 'トーマ', job: 'priest', level: 1, exp: 10, personality: '世話好き', quirk: '誰かの装備や荷物をつい手伝う。', weapon: 'weapon_ash_staff', armor: 'armor_priest_vest', fatigue: 0, injury: null, hp: null }
];

export function statsFor(adventurer, items) {
  const job = JOBS[adventurer.job];
  const weapon = items.find(item => item.uid === adventurer.weapon);
  const armor = items.find(item => item.uid === adventurer.armor);
  const levelBonus = Math.max(0, adventurer.level - 1);
  const tiredPenalty = Math.floor((adventurer.fatigue || 0) / 35);
  const mods = adventurer.statMods || {};
  const equipment = equipmentProfile(adventurer, items);
  const honor = epithetBonuses(adventurer);
  return {
    maxHp: Math.max(1, job.baseHp + levelBonus * job.hpPerLevel + Number(mods.hp || 0)),
    attack: Math.max(1, job.attack + levelBonus * job.attackPerLevel + (weapon?.attack || 0) + Number(mods.attack || 0) + Number(honor.attack || 0) + (job.id === 'mage' ? Number(honor.magicAttack || 0) : 0) - tiredPenalty - equipment.attackPenalty),
    defense: Math.max(0, Math.floor(job.defense + levelBonus * job.defensePerLevel + (armor?.defense || 0) + Number(mods.defense || 0) + Number(honor.defense || 0))),
    speed: Math.max(1, job.speed + Number(mods.speed || 0) + Number(honor.speed || 0) - equipment.speedPenalty),
    heal: job.id === 'priest' ? 18 + levelBonus * 3 + (weapon?.heal || 0) + Number(honor.heal || 0) : 0,
    // New thieves start as learners; trap work improves with field levels rather than unlocking fully trained.
    trapSkill: job.id === 'thief' ? Math.min(.92, .10 + adventurer.level * .048 + Number(equipment.effects.trapAssist || 0) + Number(honor.trapSkill || 0) - equipment.unfit * .06) : 0,
    // A rookie carrier helps with a small load, while an experienced one changes long expeditions materially.
    carryBonus: job.id === 'carrier' ? 12 + adventurer.level * 2.5 + Number(honor.carryBonus || 0) : 0,
    carrierFatigueRelief: job.id === 'carrier' ? Math.min(8, Math.floor(Math.max(0, adventurer.level - 1) * .6)) : 0,
    equipmentWeight: equipment.weight,
    equipmentFatigue: equipment.fatigue,
    fatigueReduction: Number(honor.fatigueReduction || 0),
    rangedDefense: Number(equipment.effects.rangedDefense || 0) + Number(honor.rangedDefense || 0),
    poisonResistance: Math.min(.82, Number(equipment.effects.poisonResistance || 0) + Number(honor.poisonResistance || 0)),
    collapseDefense: Number(equipment.effects.collapseDefense || 0) + Number(honor.collapseDefense || 0),
    areaDamage: Number(honor.areaDamage || 0),
    archerBonus: Number(honor.archerBonus || 0),
    lowHpGuard: Number(honor.lowHpGuard || 0),
    allyDefense: Number(honor.allyDefense || 0),
    criticalHeal: Number(honor.criticalHeal || 0),
    raidAwareness: Number(honor.raidAwareness || 0)
  };
}
