import { createSpriteAppearance, ensureSpriteAppearance } from './sprite-appearance.js';
import { PORTRAIT_CELLS } from './portraits.js';
import { RECRUIT_PORTRAITS, findRecruitPortrait, firstUnusedRecruitPortrait } from './recruit-portraits.js';

const weaponTypes = { warrior: 'sword', mage: 'staff', priest: 'holy-staff', thief: 'dagger', archer: 'bow', carrier: 'walking-staff' };

function appearanceFromLook(person, look) {
  return {
    version: 3,
    hairColor: look.hairColor,
    hairStyle: look.hairStyle,
    skinTone: look.skinTone,
    outfitPrimary: look.outfitPrimary,
    outfitSecondary: look.outfitSecondary,
    accessory: look.accessory,
    bodyType: look.bodyType,
    eyeColor: look.eyeColor,
    faceShape: look.faceShape,
    ageBand: look.ageBand,
    expression: look.expression,
    job: person?.job || 'warrior'
  };
}

function syncLook(person, appearance) {
  const current = ensureSpriteAppearance(person);
  person.spriteAppearance = {
    ...current,
    hairColor: appearance.hairColor || current.hairColor,
    hairStyle: appearance.hairStyle || current.hairStyle,
    skinTone: appearance.skinTone || current.skinTone,
    outfitPrimary: appearance.outfitPrimary || current.outfitPrimary,
    outfitSecondary: appearance.outfitSecondary || current.outfitSecondary,
    accessory: appearance.accessory || current.accessory,
    bodyType: appearance.bodyType || current.bodyType,
    eyeColor: appearance.eyeColor || current.eyeColor,
    faceShape: appearance.faceShape || current.faceShape,
    ageBand: appearance.ageBand || current.ageBand,
    expression: appearance.expression || current.expression,
    weaponType: current.weaponType || weaponTypes[person.job] || 'sword',
    version: 1
  };
}

function appearanceKey(look) {
  return ['hairColor', 'hairStyle', 'skinTone', 'outfitPrimary', 'outfitSecondary', 'accessory', 'bodyType', 'eyeColor', 'faceShape', 'ageBand', 'expression']
    .map(key => String(look?.[key] || '')).join('|');
}

function uniqueFallbackAppearance(person, usedPortraitIds) {
  let look = ensureSpriteAppearance(person);
  if (!usedPortraitIds.has(`look:${appearanceKey(look)}`)) return look;
  // Keep each procedural portrait recognizably individual after the curated
  // image pool is exhausted, and apply exactly the same look to its 2D sprite.
  for (let attempt = 1; attempt <= 256; attempt++) {
    const candidate = createSpriteAppearance(`${person.id}:portrait-${attempt}`, person.job);
    if (!usedPortraitIds.has(`look:${appearanceKey(candidate)}`)) {
      person.spriteAppearance = candidate;
      return candidate;
    }
  }
  return look;
}

// The first six characters keep their original portrait sheet cells. Recruits
// use an individual painted portrait, with a saved appearance shared by their
// field sprite so the same hair, skin and clothing colors carry across scenes.
export function createPortraitAppearance(person) {
  const look = ensureSpriteAppearance(person);
  if (Object.hasOwn(PORTRAIT_CELLS, person?.id)) return appearanceFromLook(person, look);
  const portrait = firstUnusedRecruitPortrait(person);
  return portrait
    ? { version: 3, portraitId: portrait.id, ...portrait.appearance, job: person?.job || 'warrior' }
    : { ...appearanceFromLook(person, look), portraitId: `generated:${person?.id || 'unknown'}` };
}

export function ensurePortraitAppearance(person, usedPortraitIds = new Set()) {
  if (!person) return createPortraitAppearance({ id: 'unknown' });
  if (Object.hasOwn(PORTRAIT_CELLS, person.id)) {
    const look = ensureSpriteAppearance(person);
    person.portraitAppearance = appearanceFromLook(person, look);
    usedPortraitIds.add(`look:${appearanceKey(look)}`);
    return person.portraitAppearance;
  }

  ensureSpriteAppearance(person);
  const currentId = person.portraitAppearance?.portraitId;
  const savedPortrait = findRecruitPortrait(currentId);
  const canKeepSavedImage = savedPortrait && !usedPortraitIds.has(savedPortrait.id);
  if (person.portraitAppearance?.portraitId?.startsWith('generated:') && !usedPortraitIds.has(currentId)) {
    const look = uniqueFallbackAppearance(person, usedPortraitIds);
    person.portraitAppearance = { ...person.portraitAppearance, ...appearanceFromLook(person, look), portraitId: currentId, version: 3, job: person.job || 'warrior' };
  } else {
    const portrait = canKeepSavedImage ? savedPortrait : firstUnusedRecruitPortrait(person, usedPortraitIds);
    if (portrait) {
      person.portraitAppearance = { version: 3, portraitId: portrait.id, ...portrait.appearance, job: person.job || 'warrior' };
    } else {
      const look = uniqueFallbackAppearance(person, usedPortraitIds);
      person.portraitAppearance = { ...appearanceFromLook(person, look), portraitId: `generated:${person.id}`, version: 3, job: person.job || 'warrior' };
    }
  }
  const id = person.portraitAppearance.portraitId;
  if (id) usedPortraitIds.add(id);
  usedPortraitIds.add(`look:${appearanceKey(person.portraitAppearance)}`);
  syncLook(person, person.portraitAppearance);
  return person.portraitAppearance;
}

export function ensureUniquePortraitAppearances(people = []) {
  const usedPortraitIds = new Set();
  for (const person of people) ensurePortraitAppearance(person, usedPortraitIds);
  return usedPortraitIds;
}

export function usedPortraitIdsFor(people = []) {
  return new Set(people.map(person => person?.portraitAppearance?.portraitId).filter(Boolean));
}
