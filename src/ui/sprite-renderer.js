import { ensureSpriteAppearance, equippedWeaponType } from '../data/sprite-appearance.js';

let activeFrame = 0;

const JOB_LABELS = {
  warrior: '戦士', mage: '魔術師', priest: '神官', thief: '盗賊', archer: '弓師', carrier: '運び屋'
};

export function renderCharacterSprite(person, animation = 'idle', options = {}) {
  const id = String(person?.id || 'adventurer').replace(/[^a-zA-Z0-9_-]/g, '');
  const job = person?.job || 'warrior';
  const facing = options.facing || 'right';
  const classes = ['rpg-sprite', options.className || ''].filter(Boolean).join(' ');
  return `<canvas class="${classes}" width="48" height="64" data-sprite-person="${id}" data-sprite-animation="${animation}" data-sprite-facing="${facing}" role="img" aria-label="${escapeHtml(person?.name || '冒険者')}、${JOB_LABELS[job] || '冒険者'}"></canvas>`;
}

export function renderEnemySprite(enemy, animation = 'idle') {
  const kind = String(enemy?.kind || 'goblin').replace(/[^a-zA-Z0-9_-]/g, '');
  const id = String(enemy?.id || 'foe').replace(/[^a-zA-Z0-9_-]/g, '');
  return `<canvas class="rpg-enemy-sprite ${enemy?.boss ? 'large' : ''}" width="48" height="64" data-enemy-sprite="${kind}" data-enemy-id="${id}" data-enemy-boss="${enemy?.boss ? 'true' : 'false'}" data-sprite-animation="${animation}" role="img" aria-label="${escapeHtml(enemy?.name || '魔物')}"></canvas>`;
}

export function mountSpriteCanvases(root, state) {
  if (activeFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(activeFrame);
  activeFrame = 0;
  if (!root?.querySelectorAll) return;
  const people = new Map((state?.adventurers || []).map(person => [person.id, person]));
  const canvases = [...root.querySelectorAll('canvas.rpg-sprite, canvas.rpg-enemy-sprite')];
  if (!canvases.length) return;
  const entries = canvases.map(canvas => ({
    canvas,
    person: people.get(canvas.dataset.spritePerson),
    started: performance.now(),
    weapon: people.has(canvas.dataset.spritePerson) ? equippedWeaponType(people.get(canvas.dataset.spritePerson), state?.inventory || []) : 'sword'
  }));
  let lastDraw = -Infinity;
  const tick = now => {
    if (now - lastDraw >= 90) {
      lastDraw = now;
      for (const entry of entries) {
        const { canvas } = entry;
        if (!canvas.isConnected) continue;
        const ctx = canvas.getContext?.('2d');
        if (!ctx) continue;
        const animation = canvas.dataset.spriteAnimation || 'idle';
        const age = Math.max(0, now - entry.started);
        const phase = now / 150;
        if (canvas.dataset.enemySprite) drawEnemy(ctx, canvas, animation, phase, age);
        else if (entry.person) drawAdventurer(ctx, entry.person, ensureSpriteAppearance(entry.person), entry.weapon, animation, canvas.dataset.spriteFacing || 'right', phase, age);
      }
    }
    activeFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(tick) : 0;
  };
  if (typeof requestAnimationFrame === 'function') activeFrame = requestAnimationFrame(tick);
  else tick(performance.now());
}

function drawAdventurer(ctx, person, look, weapon, animation, facing, phase, age) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 48, 64);
  const down = animation === 'down';
  const sitting = animation === 'sit' || animation === 'talk' || animation === 'repair';
  const walk = animation === 'walk' || animation === 'contract' || animation === 'train';
  const step = Math.sin(phase) * (walk ? 2.3 : .8);
  const bob = sitting ? 1 : Math.abs(Math.sin(phase * .55)) * (walk ? 1.2 : 1.2);
  ctx.save();
  if (facing === 'left') { ctx.translate(48, 0); ctx.scale(-1, 1); }
  if (down) {
    ctx.translate(24, 42);
    ctx.rotate(.95);
    ctx.translate(-24, -42);
    ctx.filter = 'grayscale(.8) brightness(.76)';
  }
  if (animation === 'hit' && age < 430) ctx.translate(Math.sin(age / 22) * 2, 0);
  if (sitting) ctx.translate(0, 4);
  if (animation === 'advance' || ['attack', 'bow', 'cast', 'heal'].includes(animation)) {
    const reach = Math.sin(Math.min(1, age / 520) * Math.PI) * (animation === 'bow' ? 1 : 2.2);
    ctx.translate(reach, 0);
  }
  const cx = 24;
  const bodyWidth = look.bodyType === 'broad' ? 20 : look.bodyType === 'slim' ? 14 : look.bodyType === 'athletic' ? 18 : 16;
  const bodyX = cx - bodyWidth / 2;
  const legSwing = walk ? step : animation === 'attack' ? Math.sin(Math.min(1, age / 300) * Math.PI) * 1.5 : 0;
  ctx.fillStyle = '#0b100d99';
  ctx.beginPath(); ctx.ellipse(cx, 58, down ? 14 : 11, 3.2, 0, 0, Math.PI * 2); ctx.fill();

  // Boots and legs
  ctx.fillStyle = shade(look.outfitPrimary, -.25);
  if (sitting) {
    rect(ctx, cx - 6, 43 + bob, 11, 4);
    rect(ctx, cx + 1, 47 + bob, 10, 4);
    ctx.fillStyle = '#302820'; rect(ctx, cx + 8, 48 + bob, 7, 4); rect(ctx, cx - 7, 45 + bob, 6, 4);
  } else {
    rect(ctx, cx - 7 + legSwing, 42 + bob, 6, 12);
    rect(ctx, cx + 1 - legSwing, 42 + bob, 6, 12);
    ctx.fillStyle = '#302820';
    rect(ctx, cx - 8 + legSwing, 53 + bob, 8, 4);
    rect(ctx, cx + legSwing, 53 + bob, 8, 4);
  }

  // Cloak/backpack silhouette.
  if (person.job === 'carrier') {
    ctx.fillStyle = shade(look.outfitSecondary, -.2);
    rect(ctx, bodyX - 4, 26 + bob, bodyWidth + 8, 18);
    ctx.fillStyle = shade(look.outfitPrimary, -.1);
    rect(ctx, bodyX - 2, 29 + bob, bodyWidth + 4, 16);
    ctx.fillStyle = look.outfitSecondary;
    rect(ctx, cx - 5, 28 + bob, 10, 2);
  } else {
    ctx.fillStyle = shade(look.outfitPrimary, -.25);
    poly(ctx, [[bodyX - 2, 28 + bob], [bodyX + bodyWidth + 2, 28 + bob], [cx + 7, 48 + bob], [cx - 8, 48 + bob]]);
  }
  // Tunic/armor body, belt and trim.
  ctx.fillStyle = look.outfitPrimary;
  rect(ctx, bodyX, 27 + bob, bodyWidth, 17);
  ctx.fillStyle = look.outfitSecondary;
  rect(ctx, bodyX + 1, 29 + bob, 2, 12);
  rect(ctx, bodyX + bodyWidth - 3, 29 + bob, 2, 12);
  rect(ctx, bodyX - 1, 40 + bob, bodyWidth + 2, 3);
  ctx.fillStyle = '#332c22'; rect(ctx, cx - 2, 40 + bob, 4, 3);

  // Arms pose for activity/attack and the job's hand prop.
  const armY = animation === 'cast' || animation === 'heal' ? 27 : animation === 'inspect' || animation === 'disarm' || animation === 'open' ? 35 : 31;
  const armLift = animation === 'talk' ? Math.sin(phase) * 2 : 0;
  ctx.fillStyle = look.outfitPrimary;
  rect(ctx, bodyX - 3, 29 + bob, 4, 11);
  rect(ctx, bodyX + bodyWidth - 1, armY + bob + armLift, 4, 10);
  ctx.fillStyle = look.skinTone;
  rect(ctx, bodyX - 3, 38 + bob, 4, 4);
  rect(ctx, bodyX + bodyWidth - 1, armY + 8 + bob + armLift, 4, 4);
  if (person.job === 'warrior') {
    ctx.fillStyle = shade(look.outfitSecondary, -.05);
    poly(ctx, [[bodyX - 4, 31], [bodyX + 2, 29], [bodyX + 4, 35], [bodyX, 39]]);
    ctx.fillStyle = '#8b9a8d';
    poly(ctx, [[bodyX - 7, 34], [bodyX - 2, 31], [bodyX + 1, 38], [bodyX - 3, 43]]);
  }
  drawWeapon(ctx, weapon, animation, age, look);

  // Neck and face.
  ctx.fillStyle = look.skinTone; rect(ctx, cx - 4, 22 + bob, 8, 7);
  ctx.fillStyle = shade(look.skinTone, -.06);
  rect(ctx, cx - 7, 12 + bob, 14, 12);
  rect(ctx, cx - 5, 10 + bob, 11, 13);
  ctx.fillStyle = '#231c18'; rect(ctx, cx + 2, 16 + bob, 2, 2);
  ctx.fillStyle = '#f0e4c5'; rect(ctx, cx + 2, 16 + bob, 1, 1);

  // Hair silhouettes are individually legible at sprite scale.
  ctx.fillStyle = look.hairColor;
  if (look.hairStyle === 'long') {
    rect(ctx, cx - 8, 9 + bob, 18, 16);
    rect(ctx, cx - 8, 18 + bob, 4, 12);
    rect(ctx, cx + 7, 18 + bob, 4, 13);
  } else if (look.hairStyle === 'braid') {
    poly(ctx, [[cx - 8, 17 + bob], [cx - 7, 8 + bob], [cx, 5 + bob], [cx + 9, 11 + bob], [cx + 8, 17 + bob], [cx + 2, 13 + bob], [cx - 3, 17 + bob]]);
    rect(ctx, cx - 9, 17 + bob, 3, 8);
    rect(ctx, cx + 8, 19 + bob, 2, 9);
  } else if (look.hairStyle === 'tousled' || look.hairStyle === 'shaggy') {
    poly(ctx, [[cx - 8, 17 + bob], [cx - 9, 10 + bob], [cx - 4, 11 + bob], [cx - 3, 5 + bob], [cx + 1, 10 + bob], [cx + 6, 6 + bob], [cx + 8, 13 + bob], [cx + 11, 12 + bob], [cx + 8, 20 + bob], [cx + 3, 14 + bob], [cx - 2, 18 + bob]]);
    if (look.hairStyle === 'shaggy') rect(ctx, cx - 9, 17 + bob, 3, 8);
  } else if (look.hairStyle === 'curly') {
    for (const [x, y, radius] of [[-7, 13, 4], [-2, 8, 4], [4, 8, 4], [9, 13, 4], [-8, 19, 3], [8, 19, 3]]) {
      ctx.beginPath(); ctx.arc(cx + x, y + bob, radius, 0, Math.PI * 2); ctx.fill();
    }
    rect(ctx, cx - 8, 16 + bob, 3, 9); rect(ctx, cx + 6, 16 + bob, 3, 8);
  } else {
    poly(ctx, [[cx - 8, 17 + bob], [cx - 7, 9 + bob], [cx - 2, 6 + bob], [cx + 6, 8 + bob], [cx + 9, 15 + bob], [cx + 6, 18 + bob], [cx + 1, 13 + bob], [cx - 4, 17 + bob]]);
    if (look.hairStyle === 'bob') rect(ctx, cx + 7, 16 + bob, 3, 10);
  }
  if (look.accessory === 'headband' || look.accessory === 'circlet') {
    ctx.fillStyle = look.outfitSecondary; rect(ctx, cx - 7, 12 + bob, 15, 2);
    if (look.accessory === 'circlet') rect(ctx, cx - 1, 10 + bob, 3, 3);
  } else if (look.accessory === 'starpin' || look.accessory === 'brooch') {
    ctx.fillStyle = look.outfitSecondary; rect(ctx, cx + 6, 12 + bob, 3, 3);
  } else if (look.accessory === 'scarf') {
    ctx.fillStyle = look.outfitSecondary; rect(ctx, cx - 6, 25 + bob, 12, 3);
  } else if (look.accessory === 'beard') {
    ctx.fillStyle = '#72513e'; poly(ctx, [[cx - 4, 21 + bob], [cx + 5, 21 + bob], [cx + 3, 25 + bob], [cx - 1, 26 + bob]]);
  }
  drawJobHeadgear(ctx, person.job, look, cx, bob);
  // Put the face marks back over the fringe so the tiny sprite still reads as a person.
  ctx.fillStyle = '#30221e'; rect(ctx, cx + 2, 16 + bob, 2, 2);
  ctx.fillStyle = '#f5e9cc'; rect(ctx, cx + 2, 16 + bob, 1, 1);
  ctx.fillStyle = look.eyeColor || '#8b8b72'; rect(ctx, cx + 3, 16 + bob, 1, 1);
  ctx.fillStyle = shade(look.skinTone, -.18); rect(ctx, cx + 5, 19 + bob, 1, 1);

  // Action marks remain light and short so the character stays readable.
  if (animation === 'cast') {
    ctx.fillStyle = '#b7e7ef'; ctx.globalAlpha = .68 + Math.sin(phase) * .2;
    rect(ctx, cx + 11, 20, 3, 3); rect(ctx, cx + 14, 16, 2, 2); ctx.globalAlpha = 1;
  } else if (animation === 'heal') {
    ctx.strokeStyle = '#ccefa8'; ctx.lineWidth = 1.5; ctx.globalAlpha = .68;
    ctx.beginPath(); ctx.arc(cx, 31, 11 + Math.sin(phase) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#ddf6bc'; rect(ctx, cx + 8, 24, 2, 7); rect(ctx, cx + 6, 26, 6, 2);
  }
  ctx.restore();
}

function drawWeapon(ctx, weapon, animation, age, look) {
  const swing = ['attack', 'bow', 'cast', 'heal'].includes(animation) && age < 520;
  if (weapon === 'bow') {
    ctx.strokeStyle = '#b68f56'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(37, 26); ctx.quadraticCurveTo(43, 34, 37, 42); ctx.stroke();
    ctx.strokeStyle = '#e4d8bd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(37, 26); ctx.lineTo(37, 42); ctx.stroke();
    if (animation === 'bow' && age < 500) {
      ctx.strokeStyle = '#e8d8ad'; ctx.beginPath(); ctx.moveTo(36, 33); ctx.lineTo(47, 29 + age / 100); ctx.stroke();
    }
  } else if (weapon === 'staff' || weapon === 'holy-staff' || weapon === 'walking-staff') {
    ctx.strokeStyle = weapon === 'holy-staff' ? '#d6c17f' : '#9b7744'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(39, 44); ctx.lineTo(36, 14); ctx.stroke();
    ctx.fillStyle = weapon === 'holy-staff' ? '#f4e2a5' : '#a8d8e5';
    ctx.beginPath(); ctx.arc(36, 13, weapon === 'holy-staff' ? 3.2 : 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (weapon === 'dagger') {
    ctx.fillStyle = '#7c543b'; rect(ctx, 36, 34, 3, 8);
    ctx.fillStyle = '#c5d0cc';
    poly(ctx, swing ? [[35, 32], [44, 23], [41, 35]] : [[35, 32], [41, 24], [39, 35]]);
  } else {
    ctx.fillStyle = '#73533a'; rect(ctx, 36, 33, 3, 8);
    ctx.fillStyle = weapon === 'hammer' ? '#8c9387' : '#c6d1cb';
    if (weapon === 'spear') rect(ctx, swing ? 40 : 37, 13, 2, 23);
    else if (weapon === 'hammer') rect(ctx, swing ? 37 : 35, 23, 8, 6);
    else poly(ctx, swing ? [[37, 31], [46, 17], [43, 33]] : [[37, 30], [42, 18], [41, 33]]);
  }
  // Held weapon gleam mirrors the trim palette of the portrait.
  if (swing) { ctx.strokeStyle = look.outfitSecondary; ctx.globalAlpha = .68; ctx.beginPath(); ctx.moveTo(36, 30); ctx.lineTo(45, 21); ctx.stroke(); ctx.globalAlpha = 1; }
}

function drawJobHeadgear(ctx, job, look, cx, bob) {
  if (job === 'mage') {
    ctx.fillStyle = look.outfitSecondary;
    poly(ctx, [[cx - 8, 10 + bob], [cx - 1, 1 + bob], [cx + 1, 7 + bob], [cx + 8, 10 + bob]]);
    ctx.fillStyle = look.outfitPrimary; rect(ctx, cx - 9, 9 + bob, 19, 2);
  } else if (job === 'thief') {
    ctx.fillStyle = shade(look.outfitPrimary, -.2);
    poly(ctx, [[cx - 9, 11 + bob], [cx - 4, 5 + bob], [cx + 8, 8 + bob], [cx + 10, 13 + bob], [cx + 2, 11 + bob], [cx - 5, 15 + bob]]);
  } else if (job === 'archer') {
    ctx.fillStyle = look.outfitSecondary; rect(ctx, cx - 8, 9 + bob, 17, 2);
    rect(ctx, cx + 4, 7 + bob, 4, 3);
  } else if (job === 'warrior') {
    ctx.fillStyle = shade(look.outfitSecondary, -.18); rect(ctx, cx - 7, 10 + bob, 15, 2);
  } else if (job === 'priest') {
    ctx.fillStyle = shade(look.outfitPrimary, .06);
    poly(ctx, [[cx - 9, 12 + bob], [cx - 5, 5 + bob], [cx + 5, 5 + bob], [cx + 9, 12 + bob]]);
  }
}

function drawEnemy(ctx, canvas, animation, phase, age) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 48, 64);
  const kind = canvas.dataset.enemySprite || 'goblin';
  const boss = canvas.dataset.enemyBoss === 'true';
  const flying = kind === 'flying' || /bat|wing/i.test(kind);
  const undead = kind === 'undead' || /skeleton|wraith/i.test(kind);
  const bob = Math.sin(phase * .7) * 1.1;
  const color = undead ? '#b8c0b0' : flying ? '#586958' : '#738352';
  ctx.save();
  if (animation === 'hit' && age < 420) ctx.translate(Math.sin(age / 20) * 2, 0);
  if (animation === 'down') { ctx.translate(24, 43); ctx.rotate(-.9); ctx.translate(-24, -43); ctx.filter = 'grayscale(.8) brightness(.65)'; }
  const y = 24 + bob;
  ctx.fillStyle = '#0b100d99'; ctx.beginPath(); ctx.ellipse(24, 57, boss ? 15 : 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (flying) {
    ctx.fillStyle = '#788b77';
    poly(ctx, [[18, y + 4], [4, y - 3 + Math.sin(phase) * 4], [12, y + 13], [21, y + 10]]);
    poly(ctx, [[30, y + 4], [44, y - 3 - Math.sin(phase) * 4], [36, y + 13], [27, y + 10]]);
  }
  ctx.fillStyle = color;
  const width = boss ? 24 : 18;
  const x = 24 - width / 2;
  poly(ctx, [[x, y + 7], [x + 4, y], [x + width - 4, y], [x + width, y + 8], [x + width - 1, y + 24], [x + 2, y + 24]]);
  ctx.fillStyle = undead ? '#d0d4c5' : '#869260';
  rect(ctx, 17, y - 10, 15, 14);
  if (!undead) {
    ctx.fillStyle = color;
    poly(ctx, [[17, y - 6], [12, y - 17], [21, y - 11]]);
    poly(ctx, [[31, y - 6], [37, y - 17], [28, y - 11]]);
  }
  ctx.fillStyle = '#e6c778'; rect(ctx, 20, y - 4, 2, 2); rect(ctx, 28, y - 4, 2, 2);
  ctx.fillStyle = '#d0bd9b'; rect(ctx, 23, y + 13, 3, 2);
  ctx.fillStyle = '#333229'; rect(ctx, 17, y + 23, 6, 10); rect(ctx, 26, y + 23, 6, 10);
  ctx.fillStyle = '#574838'; rect(ctx, 16, y + 32, 8, 3); rect(ctx, 25, y + 32, 8, 3);
  if (animation === 'attack' && age < 460) {
    ctx.strokeStyle = '#df9d67'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, y + 7); ctx.lineTo(44, y + 17); ctx.stroke();
  }
  if (boss) {
    ctx.strokeStyle = '#a97252'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(17, y - 7); ctx.lineTo(12, y - 17); ctx.lineTo(20, y - 12); ctx.moveTo(31, y - 7); ctx.lineTo(37, y - 18); ctx.lineTo(29, y - 12); ctx.stroke();
  }
  ctx.restore();
}

function rect(ctx, x, y, width, height) { ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height)); }
function poly(ctx, points) { ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
function shade(hex, amount) {
  const value = hex.startsWith('#') ? hex.slice(1) : hex;
  const number = parseInt(value.length === 3 ? value.split('').map(x => x + x).join('') : value, 16);
  if (!Number.isFinite(number)) return hex;
  const adjust = channel => Math.max(0, Math.min(255, Math.round(channel + 255 * amount))).toString(16).padStart(2, '0');
  return `#${adjust((number >> 16) & 255)}${adjust((number >> 8) & 255)}${adjust(number & 255)}`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
