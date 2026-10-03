import { statsFor } from '../data/adventurers.js';
import { getDungeon } from '../data/dungeon.js';
import { recordSupport } from './relationships.js';
import { recordDiscovery } from './survey.js';

const between = (rng, min, max) => min + rng() * (max - min);
const live = person => person.hp > 0;

function makeSnapshot(state, expedition, party, foes) {
  const allies = expedition.partyIds
    .map(id => state.adventurers.find(person => person.id === id))
    .filter(Boolean)
    .map(person => ({
      id: person.id,
      name: person.name,
      job: person.job,
      hp: Math.max(0, person.hp),
      maxHp: statsFor(person, state.inventory).maxHp,
      alive: person.hp > 0
    }));
  const enemies = foes.map(foe => ({
    id: foe.id,
    name: foe.name,
    kind: foe.kind,
    boss: Boolean(foe.boss || foe.kind === 'boss'),
    ranged: Boolean(foe.ranged),
    hp: Math.max(0, foe.hp),
    maxHp: foe.maxHp,
    alive: foe.hp > 0
  }));
  return { allies, enemies };
}

function recordEffectiveEquipment(state, expedition, person, use) {
  const weapon = state.inventory.find(item => item.uid === person.weapon);
  const armor = state.inventory.find(item => item.uid === person.armor);
  if ((use === 'attack' && Number(weapon?.attack || 0) > 0) || (use === 'heal' && Number(weapon?.heal || 0) > 0)) {
    recordDiscovery(expedition, 'equipment', `${weapon.name}（武器）`);
  }
  if (use === 'defense' && Number(armor?.defense || 0) > 0) recordDiscovery(expedition, 'equipment', `${armor.name}（防具）`);
}

export function simulateBattle(state, expedition, enemyIds, floor, rng) {
  const dungeon = getDungeon(expedition.dungeonId);
  const party = expedition.partyIds.map(id => state.adventurers.find(person => person.id === id)).filter(person => person && live(person));
  const foes = enemyIds.map((id, index) => {
    const template = expedition.raidTemplates?.[id] || dungeon.enemiesById[id] || getDungeon('old-cave').enemiesById.goblin;
    const scale = template.trialBoss ? 1 : id === 'boss' ? 1 + Math.max(0, floor - 5) * .04 : 1 + Math.max(0, floor - 1) * .055;
    const hp = Math.round(template.hp * scale * between(rng, .94, 1.08));
    const alerted = expedition.alerted ? 1.15 : 1;
    return {
      ...template,
      id: `foe-${index}`,
      sourceId: id,
      hp,
      maxHp: hp,
      attack: Math.round(template.attack * between(rng, .94, 1.08) * alerted * (expedition.raidAttackScale || 1))
    };
  });
  const hasArcher = party.some(person => person.job === 'archer');
  const pressure = Boolean(expedition.rangedPressure);
  expedition.alerted = false;
  expedition.rangedPressure = false;
  const lines = [];
  const actions = [];
  const relationEvents = [];
  const staggered = new Set();
  const turnLimit = foes.some(foe => foe.rareBoss) ? 6 : 10;
  let campMemory = null;
  const initialSnapshot = makeSnapshot(state, expedition, party, foes);
  let rounds = 0;

  function recordAction(action) {
    actions.push({
      id: `beat-${actions.length}`,
      ...action,
      snapshot: makeSnapshot(state, expedition, party, foes)
    });
  }

  lines.push(`${party.map(person => person.name).join('・')}は隊列を整えた。`);
  while (party.some(live) && foes.some(live) && rounds < turnLimit) {
    rounds++;
    lines.push(`第${rounds}ラウンド。`);
    const turnOrder = party.filter(live).slice().sort((a, b) => statsFor(b, state.inventory).speed - statsFor(a, state.inventory).speed);
    for (const actor of turnOrder) {
      if (!live(actor) || !foes.some(live)) continue;
      if ((expedition.sleepingIds || []).includes(actor.id)) {
        expedition.sleepingIds = expedition.sleepingIds.filter(id => id !== actor.id);
        lines.push(`${actor.name}は罠の眠り粉で一度だけ動けなかった。`);
        recordAction({ actorId: actor.id, actorName: actor.name, targetId: actor.id, targetName: actor.name, kind: 'status', amount: 0, label: '眠り粉', defeated: false });
        continue;
      }
      const stats = statsFor(actor, state.inventory);
      if ((expedition.cursedIds || []).includes(actor.id)) stats.attack = Math.max(1, Math.floor(stats.attack * .78));
      if (staggered.delete(actor.id)) stats.attack = Math.max(1, Math.floor(stats.attack * .76));
      if (actor.job === 'priest') {
        const candidates = party.filter(live).sort((a, b) => a.hp / statsFor(a, state.inventory).maxHp - b.hp / statsFor(b, state.inventory).maxHp);
        const target = candidates[0];
        const targetStats = target ? statsFor(target, state.inventory) : null;
        if (target && target.hp / targetStats.maxHp < .76) {
          const criticalHeal = target.hp / targetStats.maxHp < .3 ? Number(stats.criticalHeal || 0) : 0;
          const healed = Math.min(targetStats.maxHp - target.hp, stats.heal + criticalHeal + Math.floor(between(rng, -2, 5)));
          if (healed > 0) {
            recordEffectiveEquipment(state, expedition, actor, 'heal');
            target.hp += healed;
            lines.push(`${actor.name}が祈りを捧げ、${target.name}のHPを${healed}回復。`);
            relationEvents.push({ helper: actor.id, helped: target.id });
            campMemory = { type: 'support', actorId: actor.id, targetId: target.id };
            recordSupport(state, actor.id, target.id);
            recordAction({
              actorId: actor.id,
              actorName: actor.name,
              targetId: target.id,
              targetName: target.name,
              kind: 'heal',
              amount: healed,
              label: '祈りの手当て'
            });
            continue;
          }
        }
      }

      const targets = foes.filter(live);
      if (actor.job === 'mage' && targets.length > 1) {
        const damageEach = Math.max(2, Math.floor(stats.attack * between(rng, .48, .66) * (1 + stats.areaDamage)));
        recordEffectiveEquipment(state, expedition, actor, 'attack');
        lines.push(`${actor.name}が広がる術を放ち、敵の群れを打った。`);
        for (const foe of targets) {
          const damage = Math.max(1, Math.floor(damageEach * (1 - Number(foe.magicResistance || 0)) - Math.floor(foe.defense * .25)));
          foe.hp = Math.max(0, foe.hp - damage);
          lines.push(`${foe.name}に${damage}ダメージ${foe.hp === 0 ? '。倒した' : '。'}`);
          if (foe.hp === 0) recordKill(expedition, foe);
          recordAction({
            actorId: actor.id,
            actorName: actor.name,
            targetId: foe.id,
            targetName: foe.name,
            kind: 'spell',
            amount: damage,
            label: '広がる術',
            defeated: foe.hp === 0
          });
        }
      } else {
        const priorityTargets = targets.filter(foe => foe.kind === 'flying' || foe.kind === 'ranged' || foe.ranged);
        const targetPool = actor.job === 'archer' && priorityTargets.length ? priorityTargets : targets;
        const target = targetPool[Math.floor(rng() * targetPool.length)];
        const personalityBonus = actor.personality === '強気' || actor.personality === '勇敢' ? 2 : 0;
        const archerBonus = actor.job === 'archer' && target.archerWeakpoint ? 1.8 + stats.archerBonus
          : actor.job === 'archer' && (target.kind === 'flying' || target.kind === 'ranged' || target.ranged) ? 1.45 + stats.archerBonus : 1;
        if (actor.job === 'archer' && archerBonus > 1) recordDiscovery(expedition, 'skills', target.kind === 'flying' ? '対空射撃' : '遠距離射撃');
        const thiefBonus = actor.job === 'thief' && rng() < .2 ? 1.3 : 1;
        const magicFactor = actor.job === 'mage' ? 1 - Number(target.magicResistance || 0) : 1;
        const damage = Math.max(2, Math.floor((stats.attack * between(rng, .72, 1.13) * archerBonus * thiefBonus + personalityBonus) * magicFactor - target.defense * .55));
        const kind = actor.job === 'archer' ? 'arrow' : actor.job === 'warrior' || actor.job === 'thief' || actor.job === 'carrier' ? 'strike' : actor.job === 'mage' ? 'spell' : 'holy';
        const verb = kind === 'arrow' ? '矢を放ち' : kind === 'strike' ? actor.job === 'thief' ? '急所を突き' : '斬りかかり' : kind === 'holy' ? '光を放ち' : '術を放ち';
        lines.push(`${actor.name}が${target.name}に${verb}、${damage}ダメージ。`);
        recordEffectiveEquipment(state, expedition, actor, 'attack');
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp === 0) recordKill(expedition, target);
        recordAction({
          actorId: actor.id,
          actorName: actor.name,
          targetId: target.id,
          targetName: target.name,
          kind,
          amount: damage,
          label: kind === 'arrow' ? target.kind === 'flying' || target.ranged ? '対空射撃' : '遠距離射撃' : kind === 'strike' ? actor.job === 'thief' ? '急所突き' : '剣撃' : kind === 'holy' ? '聖光' : '魔法攻撃',
          defeated: target.hp === 0
        });
        if (kind === 'strike' && target.hp > 0 && target.meleeRetaliation) {
          const retaliation = Math.max(2, Math.floor(target.attack * Number(target.retaliationDamage || .38) - stats.defense * .2));
          actor.hp = Math.max(0, actor.hp - retaliation);
          if (actor.hp === 0) {
            actor.injury = '重傷';
            if (!expedition.casualties.includes(actor.name)) expedition.casualties.push(actor.name);
          } else staggered.add(actor.id);
          const effect = target.retaliationEffect || '反撃';
          lines.push(`${target.name}が近接攻撃へ${effect}で応じ、${actor.name}は${retaliation}ダメージを受けた${actor.hp === 0 ? '。戦闘不能' : '。次の攻撃が鈍る。'}`);
          recordAction({ actorId: target.id, actorName: target.name, targetId: actor.id, targetName: actor.name, kind: 'enemyStrike', amount: retaliation, label: effect, defeated: actor.hp === 0 });
        }
      }
    }

    for (const foe of foes.filter(live)) {
      const activeParty = party.filter(live);
      if (!activeParty.length) break;
      const special = foe.specialEvery && rounds % foe.specialEvery === 0
        ? foe.specialPattern?.[((rounds / foe.specialEvery) - 1) % foe.specialPattern.length]
        : null;
      if (special) {
        const phase = foe.phaseThreshold && foe.hp / foe.maxHp <= foe.phaseThreshold;
        const specialNames = {
          sweep: phase ? '覚醒の大薙ぎ払い' : '薙ぎ払い',
          'withering-pulse': '衰弱の波動',
          'trap-snap': '罠鎧の挟撃',
          'gale-sweep': '嵐の連射',
          'cave-slam': '坑道砕き',
          howl: '威圧の咆哮'
        };
        let targets = activeParty;
        if (special === 'trap-snap' || special === 'gale-sweep') {
          const count = special === 'gale-sweep' ? Math.min(2, activeParty.length) : 1;
          targets = activeParty.slice().sort((a, b) => statsFor(a, state.inventory).defense - statsFor(b, state.inventory).defense).slice(0, count);
        }
        lines.push(`${foe.name}が${specialNames[special] || '特殊攻撃'}を放った。`);
        for (const target of targets) {
          const targetStats = statsFor(target, state.inventory);
          const multiTarget = targets.length > 1 || ['sweep', 'withering-pulse', 'cave-slam', 'howl'].includes(special);
          const ratio = special === 'trap-snap' ? .72 : special === 'gale-sweep' ? .54 : special === 'withering-pulse' ? .35 : special === 'howl' ? .28 : special === 'cave-slam' ? .5 : multiTarget ? .48 : .68;
          const phaseBonus = phase ? Number(foe.phaseAttackBonus || 0) : 0;
          const bleedDamage = (expedition.bleedingIds || []).includes(target.id) ? 4 : 0;
          const damage = Math.max(2, Math.floor((foe.attack + phaseBonus) * ratio - targetStats.defense * .22) + bleedDamage);
          target.hp = Math.max(0, target.hp - damage);
          if (target.hp === 0) {
            target.injury = '重傷';
            expedition.casualties.push(target.name);
          }
          if (special === 'withering-pulse' || special === 'howl' || special === 'cave-slam') target.fatigue = Math.min(100, target.fatigue + (special === 'cave-slam' ? 4 : 6));
          lines.push(`${target.name}は${specialNames[special] || '特殊攻撃'}で${damage}ダメージ${target.hp === 0 ? '。戦闘不能' : '。'}${special === 'withering-pulse' ? '疲労も深まった。' : ''}`);
          recordAction({ actorId: foe.id, actorName: foe.name, targetId: target.id, targetName: target.name, kind: 'bossSpecial', amount: damage, label: specialNames[special] || '特殊攻撃', defeated: target.hp === 0 });
        }
        continue;
      }
      const tanks = activeParty.filter(person => person.job === 'warrior');
      const rear = activeParty.filter(person => person.job !== 'warrior');
      const rangedTarget = (foe.ranged || pressure) && rear.length && rng() < .5;
      const markedTarget = foe.kind === 'assassin' && expedition.assassinationTargetId
        ? activeParty.find(person => person.id === expedition.assassinationTargetId)
        : null;
      let target = markedTarget || (tanks.length && rng() < (foe.boss || foe.kind === 'boss' ? .53 : .69)
        ? tanks[Math.floor(rng() * tanks.length)]
        : rangedTarget ? rear[Math.floor(rng() * rear.length)] : activeParty[Math.floor(rng() * activeParty.length)]);
      if (!markedTarget && target && target.hp / statsFor(target, state.inventory).maxHp < .35) {
        const guardians = activeParty.filter(person => person.job === 'warrior' && person.id !== target.id && statsFor(person, state.inventory).lowHpGuard > 0);
        const guardian = guardians.find(person => rng() < Math.min(.65, statsFor(person, state.inventory).lowHpGuard));
        if (guardian) {
          lines.push(`${guardian.name}が傷ついた${target.name}の前へ割り込んだ。`);
          target = guardian;
        }
      }
      if (markedTarget) expedition.assassinationTargetId = null;
      const targetStats = statsFor(target, state.inventory);
      const guard = target.job === 'warrior' ? 1.25 : 0;
      const bold = target.personality === '勇敢' && target.job !== 'warrior' ? .7 : 0;
      const roleMitigation = hasArcher && (foe.kind === 'flying' || foe.kind === 'ranged' || foe.ranged) ? .88 : 1;
      const rawDamage = Math.floor(foe.attack * between(rng, .72, 1.06) * roleMitigation - targetStats.defense * .38 - guard + bold);
      const specialDefense = foe.ranged || foe.kind === 'ranged' ? targetStats.rangedDefense : 0;
      const partyWard = activeParty.reduce((value, person) => value + statsFor(person, state.inventory).allyDefense, 0);
      const lowHpGuard = target.hp / targetStats.maxHp < .35 ? targetStats.lowHpGuard * 5 : 0;
      const bleedingPenalty = (expedition.bleedingIds || []).includes(target.id) ? 4 : 0;
      const damage = Math.max(1, rawDamage - specialDefense - Math.min(4, partyWard) - lowHpGuard + bleedingPenalty);
      recordEffectiveEquipment(state, expedition, target, 'defense');
      target.hp = Math.max(0, target.hp - damage);
      lines.push(`${foe.name}の攻撃。${target.name}が${damage}ダメージを受けた${target.hp === 0 ? '。戦闘不能' : '。'}`);
      if (target.hp === 0) {
        target.injury = '重傷';
        expedition.casualties.push(target.name);
        const helper = activeParty.filter(person => person !== target && live(person)).sort((a, b) => a.hp - b.hp)[0];
        if (helper) campMemory = { type: 'wounded', actorId: helper.id, targetId: target.id };
      }
      recordAction({
        actorId: foe.id,
        actorName: foe.name,
        targetId: target.id,
        targetName: target.name,
        kind: 'enemyStrike',
        amount: damage,
        label: '敵の攻撃',
        defeated: target.hp === 0
      });
    }
  }

  const victory = !foes.some(live);
  if (rounds >= turnLimit && !victory) lines.push(foes.some(foe => foe.rareBoss)
    ? '特殊個体を押し返せず、冒険者たちは隊列を保てるうちに退路を探した。'
    : '長い戦闘で隊列が崩れ、冒険者たちは距離を取って撤退した。');
  else if (victory) lines.push('敵の気配が消えた。全員の状態を確かめてから先へ進む。');
  const survivors = party.filter(live);
  if (survivors.length) {
    for (const person of survivors) {
      if (person.job === 'warrior' && party.some(other => other !== person && other.hp <= 0)) {
        const helped = party.find(other => other !== person && other.hp <= 0);
        if (helped) relationEvents.push({ helper: person.id, helped: helped.id });
      }
    }
  }
  return {
    victory,
    lines,
    rounds,
    enemies: enemyIds.length,
    relationEvents,
    actions,
    initialSnapshot,
    foes: makeSnapshot(state, expedition, party, foes).enemies,
    campMemory
  };
}

function recordKill(expedition, foe) {
  expedition.kills += 1;
  expedition.xpEarned += foe.xp;
  expedition.defeated.push(foe.name);
  if (foe.trialBoss) expedition.trialBossVictory = true;
  if (!foe.rareBoss && (foe.majorBoss || foe.trialBoss || foe.sourceId === 'boss')) expedition.bossDefeated = true;
}
