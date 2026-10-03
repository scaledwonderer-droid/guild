import { relationTier } from '../systems/relationships.js';
import { renderCharacterSprite } from './sprite-renderer.js';
import { campBackdropStyle } from '../data/backgrounds.js?v=0.7fix6';
import { getDungeon } from '../data/dungeon.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function renderCampLandscape(people, floor, state, scene) {
  state ||= { relationships: {} };
  const speakers = (scene?.speakers || []).map(id => people.find(person => person.id === id)).filter(Boolean).slice(0, 2);
  const coordinates = new Map();
  let openSlots = people.map((_, index) => 8 + ((index + 1) / (people.length + 1)) * 84);
  if (speakers.length === 2) {
    const tier = relationTier(state, speakers[0].id, speakers[1].id);
    const pairX = tier === 'close' ? [43, 57] : tier === 'distant' ? [9, 91] : [35, 65];
    speakers.forEach((person, index) => coordinates.set(person.id, pairX[index]));
    openSlots = tier === 'close' ? [15, 85, 25, 75] : tier === 'distant' ? [38, 62, 30, 70] : [12, 88, 24, 76];
  }
  for (const person of people) {
    if (coordinates.has(person.id)) continue;
    coordinates.set(person.id, openSlots.shift() ?? 50);
  }
  const party = people.map((person, index) => {
    const speaking = (scene?.speakers || []).includes(person.id);
    const support = scene?.campActivity?.carrierId === person.id ? scene.campActivity.type : '';
    const pose = person.hp <= 0 ? 'down' : support === 'cook' ? 'cook' : support === 'play' ? 'play' : speaking ? 'talk' : scene?.narration?.some(line => /手入れ|整え|装備/.test(line)) && index % 2 ? 'repair' : 'sit';
    const x = coordinates.get(person.id) ?? (8 + ((index + 1) / (people.length + 1)) * 84);
    return `
    <div class="camp-observer ${person.hp <= 0 ? 'down' : ''} ${speaking ? 'speaking' : ''} ${support ? `camp-support-${support}` : ''}" style="--observer-index:${index};--observer-x:${x}%" title="${escape(person.name)}">
      ${renderCharacterSprite(person, pose, { facing: x < 48 ? 'right' : 'left' })}${support ? `<i class="camp-support-prop ${support}" aria-hidden="true">${support === 'cook' ? '♨' : '♫'}</i>` : ''}
      <span>${escape(person.name)}</span>
    </div>`;
  }).join('');
  const dungeonId = state.expedition?.dungeonId || 'old-cave';
  return `<div class="camp-landscape" style="${campBackdropStyle(dungeonId)}" role="img" aria-label="${getDungeon(dungeonId).name}の第${floor}階層、野営地で休む冒険者たち">
    <div class="camp-night-sky"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="cave-ridge ridge-back"></div><div class="cave-ridge ridge-front"></div>
    <div class="tent-rope rope-left"></div><div class="tent-rope rope-right"></div>
    <div class="camp-tent"><div class="tent-flap"></div><div class="tent-door"></div><span>GUILD</span></div>
    <div class="camp-lantern"><i></i></div>
    <div class="camp-pack pack-one"></div><div class="camp-pack pack-two"></div>
    <div class="camp-spear"></div><div class="camp-ground"></div>
    <div class="camp-glow"></div>
    <div class="campfire" aria-hidden="true"><span class="flame flame-back"></span><span class="flame flame-main"></span><span class="flame flame-tip"></span><span class="firewood wood-a"></span><span class="firewood wood-b"></span><span class="fire-spark spark-a"></span><span class="fire-spark spark-b"></span></div>
    <div class="camp-observers">${party}</div>
    <div class="camp-scene-label"><span>FIELD REST</span><strong>${getDungeon(dungeonId).name} · 野営地</strong></div>
  </div>`;
}
