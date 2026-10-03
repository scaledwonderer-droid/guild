import { pairKey } from './save.js';
import { statsFor } from '../data/adventurers.js';
import { CAMP_COMBAT_MOMENTS, CAMP_DIALOGUE, CAMP_PERSONALITY_BEATS, CAMP_PERSONALITY_LINES } from '../data/camp-dialogue.js';

export function relationValue(state, first, second) {
  return state.relationships[pairKey(first, second)] ?? 50;
}

export function adjustRelation(state, first, second, amount) {
  const key = pairKey(first, second);
  state.relationships[key] = Math.max(0, Math.min(100, relationValue(state, first, second) + amount));
}

export function relationTier(state, first, second) {
  const value = relationValue(state, first, second);
  if (value >= 67) return 'close';
  if (value <= 38) return 'distant';
  return 'ordinary';
}

export function recordSupport(state, helperId, helpedId) {
  if (helperId && helpedId && helperId !== helpedId) adjustRelation(state, helperId, helpedId, 1);
}

const choose = (rng, list) => list[Math.floor(rng() * list.length)];

function fill(text, names) {
  return text.replace(/\{([abc])\}/g, (_, key) => names[key] || names.a || '仲間');
}

function addPersonalityLine(dialogue, living, rng) {
  if (dialogue.length >= 4 || (dialogue.length === 3 && rng() > 0.28)) return;
  const alreadySpeaking = new Set(dialogue.map(turn => turn.speakerId));
  const listeners = living.filter(person => !alreadySpeaking.has(person.id));
  const speaker = choose(rng, listeners.length ? listeners : living);
  const spokenCount = dialogue.filter(turn => turn.speakerId === speaker.id).length;
  if (speaker.personality === '無口' && spokenCount > 0) return;
  const lines = CAMP_PERSONALITY_LINES[speaker.personality] || CAMP_PERSONALITY_LINES['温厚'];
  dialogue.push({ speakerId: speaker.id, speakerName: speaker.name, text: choose(rng, lines), personalityBeat: true });
}

function chooseTemplate(expedition, rng, templates) {
  const used = expedition.campTemplateHistory || [];
  const fresh = templates.filter(template => !used.includes(template.id));
  const template = choose(rng, fresh.length ? fresh : templates);
  expedition.campTemplateHistory = [...used.slice(-2), template.id];
  return template;
}

function currentBattlePair(state, expedition, people) {
  const memory = expedition.campMemory;
  if (!memory?.actorId || !memory?.targetId) return null;
  const actor = people.find(person => person.id === memory.actorId);
  const target = people.find(person => person.id === memory.targetId);
  if (!actor || !target || actor.id === target.id) return null;
  if (memory.type === 'support' && (actor.hp <= 0 || target.hp <= 0)) return null;
  if (memory.type === 'wounded' && (actor.hp <= 0 || target.hp > 0 || people.filter(person => person.hp > 0).length < 2)) return null;
  return { memory, actor, target };
}

function selectPair(state, expedition, rng, people, living) {
  const memoryPair = currentBattlePair(state, expedition, people);
  if (memoryPair) return memoryPair;
  const pairs = [];
  for (let i = 0; i < living.length; i++) {
    for (let j = i + 1; j < living.length; j++) {
      pairs.push({ actor: living[i], target: living[j], value: relationValue(state, living[i].id, living[j].id) });
    }
  }
  if (!pairs.length) return null;
  pairs.sort((a, b) => a.value - b.value);
  const candidates = pairs.length === 1 ? pairs : [pairs[0], pairs[pairs.length - 1]];
  const selected = choose(rng, candidates);
  return { ...selected, memory: null };
}

function sceneTemplate(state, expedition, pair, rng) {
  const tier = relationTier(state, pair.actor.id, pair.target.id);
  if (pair.memory?.type === 'support') {
    return { tier, template: chooseTemplate(expedition, rng, CAMP_COMBAT_MOMENTS.support[tier]) };
  }
  if (pair.memory?.type === 'wounded') {
    return { tier, template: chooseTemplate(expedition, rng, CAMP_COMBAT_MOMENTS.wounded[tier]) };
  }
  return { tier, template: chooseTemplate(expedition, rng, CAMP_DIALOGUE[tier]) };
}

export function createCampScene(state, expedition, rng, floor) {
  const people = expedition.partyIds
    .map(id => state.adventurers.find(person => person.id === id))
    .filter(Boolean);
  const living = people.filter(person => person.hp > 0);
  if (!living.length) {
    return {
      title: `第${floor}階層の野営`,
      dialogue: [],
      narration: ['焚き火が小さく揺れる。冒険者たちは互いの呼吸を確かめながら、夜を越えた。'],
      changes: [],
      speakers: []
    };
  }

  const pair = selectPair(state, expedition, rng, people, living);
  if (!pair) {
    const person = living[0];
    const template = chooseTemplate(expedition, rng, [
      { id: 'solo-route', lines: [{ speaker: 'a', text: '明日の進路を、もう一度だけ確かめておこう。' }, { speaker: 'a', text: 'よし。朝になったら、みんなに伝えよう。' }], narration: '一人は仲間の眠る場所を確かめ、焚き火のそばで見張りを続けた。' },
      { id: 'solo-supplies', lines: [{ speaker: 'a', text: '包帯は残り二つ。朝に数を伝えて、使いどころを決めよう。' }, { speaker: 'a', text: '水筒も近くに置いた。これなら夜明けまで持つ。' }], narration: '一人は荷物を静かに並べ替え、眠る仲間の足元へ水筒を置いた。' },
      { id: 'solo-watch', lines: [{ speaker: 'a', text: '火が消える前に、もう一度だけ通路を見回ろう。' }, { speaker: 'a', text: '異常なし。今夜はこのまま見張りを続けよう。' }], narration: '焚き火の向こうで仲間の寝息が続く。見張り役は外套を引き寄せた。' }
    ]);
    const dialogue = template.lines.map(line => ({ speakerId: person.id, speakerName: person.name, text: line.text }));
    addPersonalityLine(dialogue, living, rng);
    return {
      title: `第${floor}階層の野営`,
      dialogue,
      narration: [template.narration, (CAMP_PERSONALITY_BEATS[person.personality] || CAMP_PERSONALITY_BEATS['温厚'])(person.name)],
      changes: [],
      speakers: [person.id]
    };
  }

  const { tier, template } = sceneTemplate(state, expedition, pair, rng);
  const names = { a: pair.actor.name, b: pair.target.name };
  let third = null;
  if (pair.memory?.type === 'wounded') {
    third = living.find(person => person.id !== pair.actor.id) || pair.actor;
    names.c = third.name;
  }
  const idsByToken = { a: pair.actor.id, b: pair.target.id, c: third?.id || pair.actor.id };
  const dialogue = template.lines.map(line => {
    const speakerId = idsByToken[line.speaker] || pair.actor.id;
    const speaker = people.find(person => person.id === speakerId) || pair.actor;
    return { speakerId, speakerName: speaker.name, text: fill(line.text, names) };
  });
  addPersonalityLine(dialogue, living, rng);
  const speakers = [...new Set(dialogue.map(line => line.speakerId))];
  const listener = living.find(person => !speakers.includes(person.id)) || pair.actor;
  const narration = [
    fill(template.narration, names),
    (CAMP_PERSONALITY_BEATS[listener.personality] || CAMP_PERSONALITY_BEATS['温厚'])(listener.name)
  ];

  const changes = [];
  if (tier === 'close' && rng() < 0.55) {
    adjustRelation(state, pair.actor.id, pair.target.id, 1);
    changes.push(`${pair.actor.name}と${pair.target.name}の関係が少し深まったようです。`);
  } else if (tier === 'distant' && rng() < 0.38) {
    adjustRelation(state, pair.actor.id, pair.target.id, 1);
    changes.push(`${pair.actor.name}と${pair.target.name}のあいだに、小さな歩み寄りがあったようです。`);
  } else if (tier === 'ordinary' && rng() < 0.40) {
    adjustRelation(state, pair.actor.id, pair.target.id, 1);
    changes.push(`${pair.actor.name}と${pair.target.name}のあいだに、小さな理解が生まれたようです。`);
  } else if (tier === 'ordinary' && rng() < 0.12) {
    adjustRelation(state, pair.actor.id, pair.target.id, -1);
    changes.push(`${pair.actor.name}と${pair.target.name}の会話に、少し棘が残ったようです。`);
  }

  for (const person of living) {
    const base = person.job === 'warrior' ? 8 : 6;
    person.hp = Math.min(statsFor(person, state.inventory).maxHp, person.hp + base);
    person.fatigue = Math.max(0, person.fatigue - 7);
  }
  expedition.campMemory = null;
  return { title: `第${floor}階層の野営`, dialogue, narration, changes, speakers };
}
