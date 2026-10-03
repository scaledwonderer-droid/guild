import { JOBS, statsFor } from '../data/adventurers.js';
import { createSpriteAppearance } from '../data/sprite-appearance.js';
import { ensurePortraitAppearance, ensureUniquePortraitAppearances } from '../data/portrait-appearance.js';
import { recordFinance } from './finance.js';

const NAMES = [
  'ネラ', 'ロビン', 'パヴェル', 'ユノ', 'フェン', 'カヤ', 'オスカー', 'ニナ', 'ラウル', 'イリス',
  'マルク', 'リゼ', 'ガレス', 'ソフィ', 'エミル', 'サラ', 'ルカ', 'ヴィオラ', 'ハル', 'ミレイ',
  'ダリオ', 'ノア', 'エダ', 'フィン', 'セラ', 'ヨナ', 'アルマ', 'コリン', 'ティア', 'レム',
  'シオン', 'マーヤ', 'オルガ', 'テオ', 'リーナ', 'イアン', 'メル', 'カイル', 'エル', 'セナ'
];
const SURNAME_PARTS = ['アッシュ', 'リード', 'ヴェイル', 'ノール', 'フェル', 'ロウ', 'ベル', 'エイン', 'クロウ', 'ミル'];
const PERSONALITIES = ['慎重', '勇敢', '強気', '温厚', '無口', '世話好き'];
const QUIRKS = {
  warrior: ['いざという時は、迷わず仲間の前へ出る。', '訓練の後に必ず剣の手入れをする。'],
  mage: ['古い魔術書の余白に、独自の記号を書き込む。', '火花の形から術の調子を確かめる。'],
  priest: ['仲間の声色の違いによく気づく。', '薬草の匂いを覚えるのが得意。'],
  thief: ['床板の継ぎ目を指先で確かめて進む。', '錠前の音を聞き分ける癖がある。'],
  archer: ['風向きの変化を頬で感じ取る。', '矢羽根の並びを几帳面に整える。'],
  carrier: ['荷を種類ごとに結び直すのが早い。', '帰り道に必要な水や布を先に数える。']
};

function availableNames(state) {
  const used = new Set([
    ...state.adventurers.map(person => person.name),
    ...(state.departedAdventurers || []).map(person => person.name),
    ...(state.passedRecruitCandidates || []).map(person => person.name),
    ...(state.recruitmentCandidates || []).map(person => person.name)
  ]);
  const available = NAMES.filter(name => !used.has(name));
  if (available.length >= 3) return available;
  for (const base of NAMES) {
    for (const surname of SURNAME_PARTS) {
      const name = `${base}・${surname}`;
      if (!used.has(name) && !available.includes(name)) available.push(name);
    }
  }
  return available;
}

function choose(list, rng) { return list[Math.floor(rng() * list.length)]; }

function chooseJob(state, rng) {
  const jobs = (state.unlockedJobs || ['warrior', 'mage', 'priest']).filter(job => JOBS[job]);
  const boosted = new Set(state.recruitmentBoostJobs || []);
  const weights = jobs.map(job => ({ job, weight: boosted.has(job) ? 2.7 : 1 }));
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.job;
  }
  return jobs.at(-1) || 'warrior';
}

function equipmentFor(job, uid) {
  const weaponByJob = {
    warrior: { name: '登録用の片手剣', slot: 'weapon', attack: 2, defense: 0, heal: 0, weight: 3 },
    mage: { name: '登録用の木杖', slot: 'weapon', attack: 3, defense: 0, heal: 0, weight: 2 },
    priest: { name: '登録用の癒し杖', slot: 'weapon', attack: 1, defense: 0, heal: 2, weight: 2 },
    thief: { name: '旅人の短剣', slot: 'weapon', attack: 2, defense: 0, heal: 0, weight: 1 },
    archer: { name: '訓練用の弓', slot: 'weapon', attack: 4, defense: 0, heal: 0, weight: 3 },
    carrier: { name: '旅程の杖', slot: 'weapon', attack: 1, defense: 0, heal: 0, weight: 2 }
  };
  const armorByJob = {
    warrior: { name: '革の胸当て', slot: 'armor', attack: 0, defense: 2, heal: 0, weight: 3 },
    mage: { name: '旅装のローブ', slot: 'armor', attack: 0, defense: 1, heal: 0, weight: 2 },
    priest: { name: '神官の法衣', slot: 'armor', attack: 0, defense: 2, heal: 0, weight: 2 },
    thief: { name: '斥候の上着', slot: 'armor', attack: 0, defense: 2, heal: 0, weight: 2 },
    archer: { name: '斥候の上着', slot: 'armor', attack: 0, defense: 2, heal: 0, weight: 2 },
    carrier: { name: '運び屋の革当て', slot: 'armor', attack: 0, defense: 2, heal: 0, weight: 3 }
  };
  const common = { rarity: 'common', value: 12, guildValue: 7, note: '新加入した冒険者の初期装備。' };
  return [
    { ...common, ...weaponByJob[job], uid: `${uid}-weapon` },
    { ...common, ...armorByJob[job], uid: `${uid}-armor` }
  ];
}

function makeCandidate(state, seq, rng, name, usedPortraitIds) {
  const id = `candidate-${seq}`;
  const job = chooseJob(state, rng);
  const equipment = equipmentFor(job, id);
  const personality = choose(PERSONALITIES, rng);
  const statMods = {
    hp: Math.floor(rng() * 13) - 6,
    attack: Math.floor(rng() * 3) - 1,
    defense: rng() < .35 ? 1 : 0,
    speed: rng() < .25 ? 1 : 0
  };
  const person = {
    id, name, job, level: rng() < .18 ? 2 : 1, exp: 0, personality,
    quirk: choose(QUIRKS[job], rng), statMods,
    spriteAppearance: createSpriteAppearance(id, job),
    portraitAppearance: null,
    weapon: equipment[0].uid, armor: equipment[1].uid,
    equipment, fatigue: 0, injury: null, hp: 1, guildTrust: 78, activityHistory: [],
    cost: 20 + Math.floor(rng() * 15)
  };
  person.portraitAppearance = ensurePortraitAppearance(person, usedPortraitIds);
  person.hp = statsFor(person, [...state.inventory, ...equipment]).maxHp;
  return person;
}

export function generateRecruitmentCandidates(state, random = Math.random) {
  const nameList = availableNames(state);
  if (nameList.length < 3) return [];
  const seq = Number(state.recruitmentSequence || 0);
  const candidates = [];
  const usedPortraitIds = ensureUniquePortraitAppearances([
    ...(state.adventurers || []), ...(state.departedAdventurers || []), ...(state.recruitmentCandidates || [])
  ]);
  for (let index = 0; index < 3; index++) {
    const nameIndex = Math.floor(random() * nameList.length);
    const [name] = nameList.splice(nameIndex, 1);
    candidates.push(makeCandidate(state, seq + index, random, name, usedPortraitIds));
  }
  state.recruitmentSequence = seq + candidates.length;
  state.recruitmentCandidates = candidates;
  state.recruitmentBoostJobs = [];
  state.recruitmentReadyOn = Number(state.day || 1) + 3;
  return candidates;
}

export function recruitFromPool(state, candidateId) {
  const candidate = (state.recruitmentCandidates || []).find(person => person.id === candidateId);
  if (!candidate) return { ok: false, message: 'この候補は今回の募集にはいません。' };
  if (!(state.unlockedJobs || []).includes(candidate.job)) return { ok: false, message: 'この職業はまだ登録できません。' };
  if ((state.departedAdventurers || []).some(person => person.id === candidate.id)) return { ok: false, message: 'この人物は以前ギルドを去っています。' };
  if (Number(state.gold || 0) < candidate.cost) return { ok: false, message: `登録費用 ${candidate.cost}G が不足しています。` };
  state.gold -= candidate.cost;
  recordFinance(state, -candidate.cost, `冒険者登録：${candidate.name}`);
  const person = { ...candidate, equipment: undefined, activityHistory: [], guildTrust: 78 };
  state.inventory.push(...(candidate.equipment || []));
  person.hp = statsFor(person, state.inventory).maxHp;
  state.adventurers.push(person);
  state.relationships ||= {};
  for (const other of state.adventurers) {
    if (other.id !== person.id) state.relationships[[other.id, person.id].sort().join('|')] = 50;
  }
  state.passedRecruitCandidates ||= [];
  state.passedRecruitCandidates.push(...(state.recruitmentCandidates || []).filter(entry => entry.id !== candidate.id).map(({ id, name }) => ({ id, name })));
  state.recruitmentCandidates = [];
  return { ok: true, person, message: `${person.name}がギルドに加入しました。訓練や軽い依頼で経験を積ませましょう。` };
}

export function dismissRecruitmentCandidates(state) {
  if (!(state.recruitmentCandidates || []).length) return false;
  state.passedRecruitCandidates ||= [];
  state.passedRecruitCandidates.push(...state.recruitmentCandidates.map(({ id, name }) => ({ id, name })));
  state.recruitmentCandidates = [];
  state.recruitmentReadyOn = Math.max(Number(state.recruitmentReadyOn || 0), Number(state.day || 1) + 1);
  return true;
}
