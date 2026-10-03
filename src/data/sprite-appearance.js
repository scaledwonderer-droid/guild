const STARTING_LOOKS = {
  leon:  { hairColor: '#d5c39e', hairStyle: 'shaggy', skinTone: '#edc9a5', outfitPrimary: '#34483a', outfitSecondary: '#a58b5d', accessory: 'headband', bodyType: 'athletic' },
  bram:  { hairColor: '#604536', hairStyle: 'short', skinTone: '#c99069', outfitPrimary: '#514638', outfitSecondary: '#a07b4c', accessory: 'beard', bodyType: 'broad' },
  milia: { hairColor: '#a54f37', hairStyle: 'long', skinTone: '#efc6ad', outfitPrimary: '#24504c', outfitSecondary: '#c0a66b', accessory: 'starpin', bodyType: 'slim' },
  cecil: { hairColor: '#242932', hairStyle: 'long', skinTone: '#e6c4a7', outfitPrimary: '#283248', outfitSecondary: '#75849a', accessory: 'brooch', bodyType: 'slim' },
  elna:  { hairColor: '#e4ca91', hairStyle: 'braid', skinTone: '#f2d8c3', outfitPrimary: '#eee5d2', outfitSecondary: '#bd9d5d', accessory: 'circlet', bodyType: 'slim' },
  toma:  { hairColor: '#765740', hairStyle: 'tousled', skinTone: '#e9c7a3', outfitPrimary: '#66704c', outfitSecondary: '#ddd0b2', accessory: 'scarf', bodyType: 'average' }
};

const HAIR = ['#292a32', '#604536', '#765740', '#a54f37', '#d5c39e', '#e4ca91', '#8c6246', '#b98262'];
const SKIN = ['#f0cfb2', '#e4bd98', '#c99069', '#ecc7aa', '#d9a982'];
const OUTFITS = ['#34483a', '#283248', '#24504c', '#64513b', '#566348', '#4d3e58', '#435767', '#766046'];
const TRIMS = ['#a58b5d', '#c0a66b', '#8ba0a2', '#d4c6a6', '#b78353', '#8da073'];
const STYLES = ['short', 'tousled', 'shaggy', 'long', 'bob', 'braid'];
const ACCESSORIES = ['headband', 'circlet', 'brooch', 'scarf', 'none'];
const EYES = ['#667b9b', '#78916f', '#9b7655', '#8d805f', '#8b6e83', '#657f7c', '#a28c66'];

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function pick(list, seed, salt) { return list[(hashText(`${seed}:${salt}`) >>> 0) % list.length]; }

export function createSpriteAppearance(personOrId, jobOverride) {
  const person = typeof personOrId === 'object' && personOrId ? personOrId : null;
  const id = String(person?.id || personOrId || 'adventurer');
  const job = person?.job || jobOverride || 'warrior';
  const base = STARTING_LOOKS[id];
  const appearance = base ? { ...base } : {
    hairColor: pick(HAIR, id, 'hair'),
    hairStyle: pick(STYLES, id, 'style'),
    skinTone: pick(SKIN, id, 'skin'),
    outfitPrimary: pick(OUTFITS, id, 'outfit'),
    outfitSecondary: pick(TRIMS, id, 'trim'),
    accessory: pick(ACCESSORIES, id, 'accessory'),
    bodyType: pick(['slim', 'average', 'athletic', 'broad'], id, 'body'),
    eyeColor: pick(EYES, id, 'eyes'),
    faceShape: pick(['round', 'long', 'heart'], id, 'face'),
    ageBand: pick(['young', 'adult', 'mature'], id, 'age'),
    expression: pick(['calm', 'warm', 'focused', 'confident', 'thoughtful'], id, 'expression')
  };
  return {
    version: 1,
    ...appearance,
    weaponType: ({ warrior: 'sword', mage: 'staff', priest: 'holy-staff', thief: 'dagger', archer: 'bow', carrier: 'walking-staff' })[job] || 'sword'
  };
}

export function ensureSpriteAppearance(person) {
  if (!person) return createSpriteAppearance('adventurer', 'warrior');
  if (!person.spriteAppearance || typeof person.spriteAppearance !== 'object') {
    person.spriteAppearance = createSpriteAppearance(person);
  } else if (person.spriteAppearance.version === 1 && ['hairColor', 'hairStyle', 'skinTone', 'outfitPrimary', 'outfitSecondary', 'accessory', 'bodyType', 'weaponType', 'eyeColor', 'faceShape', 'ageBand', 'expression'].every(key => person.spriteAppearance[key])) {
    return person.spriteAppearance;
  } else {
    // Fill newly introduced fields without changing a saved character's look.
    person.spriteAppearance = { ...createSpriteAppearance(person), ...person.spriteAppearance, version: 1 };
  }
  return person.spriteAppearance;
}

export function equippedWeaponType(person, inventory = []) {
  const name = inventory.find(item => item.uid === person?.weapon)?.name || '';
  if (/弓|ボウ/.test(name)) return 'bow';
  if (/短剣|ダガー|ナイフ/.test(name)) return 'dagger';
  if (/杖|ロッド|ワンド/.test(name)) return person?.job === 'priest' ? 'holy-staff' : 'staff';
  if (/槍|スピア/.test(name)) return 'spear';
  if (/槌|ハンマー|つるはし/.test(name)) return 'hammer';
  if (/剣|ソード|ブレード/.test(name)) return 'sword';
  return ensureSpriteAppearance(person).weaponType;
}
