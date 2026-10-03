// Curated recruit portraits share the painted anime-fantasy treatment of the
// original roster. The portrait ID is saved on each recruit so art and sprite
// appearance remain stable across reloads and future content additions.
const definitions = {
  warrior: [
    { id: 'warrior-1', file: 'warrior-1.webp', look: { hairColor: '#d5c39e', hairStyle: 'shaggy', skinTone: '#edc9a5', outfitPrimary: '#34483a', outfitSecondary: '#a58b5d', accessory: 'headband', bodyType: 'athletic' } },
    { id: 'warrior-2', file: 'warrior-2.webp', look: { hairColor: '#a54f37', hairStyle: 'long', skinTone: '#c99069', outfitPrimary: '#514638', outfitSecondary: '#a07b4c', accessory: 'scarf', bodyType: 'athletic' } },
    { id: 'warrior-3', file: 'warrior-3.webp', look: { hairColor: '#292a32', hairStyle: 'curly', skinTone: '#b98262', outfitPrimary: '#514638', outfitSecondary: '#8d5144', accessory: 'earring', bodyType: 'athletic', eyeColor: '#d4a76f', faceShape: 'round', ageBand: 'adult', expression: 'steady' } },
    { id: 'warrior-4', file: 'warrior-4.webp', look: { hairColor: '#a54f37', hairStyle: 'braid', skinTone: '#ecc7aa', outfitPrimary: '#34483a', outfitSecondary: '#a58b5d', accessory: 'scarf', bodyType: 'athletic', eyeColor: '#a7b081', faceShape: 'long', ageBand: 'adult', expression: 'confident' } },
    { id: 'warrior-5', file: 'warrior-5.webp', look: { hairColor: '#292a32', hairStyle: 'curly', skinTone: '#b98262', outfitPrimary: '#514638', outfitSecondary: '#a07b4c', accessory: 'earring', bodyType: 'athletic', eyeColor: '#caab71', faceShape: 'round', ageBand: 'adult', expression: 'calm' } },
    { id: 'warrior-6', file: 'warrior-6.webp', look: { hairColor: '#a54f37', hairStyle: 'braid', skinTone: '#ecc7aa', outfitPrimary: '#34483a', outfitSecondary: '#a58b5d', accessory: 'headband', bodyType: 'athletic', eyeColor: '#829174', faceShape: 'long', ageBand: 'adult', expression: 'confident' } },
    { id: 'warrior-7', file: 'warrior-7.webp', look: { hairColor: '#c0c2bd', hairStyle: 'short', skinTone: '#ecc7aa', outfitPrimary: '#566348', outfitSecondary: '#8da073', accessory: 'scarf', bodyType: 'average', eyeColor: '#899b9e', faceShape: 'round', ageBand: 'mature', expression: 'warm' } },
    { id: 'warrior-8', file: 'warrior-8.webp', look: { hairColor: '#242932', hairStyle: 'long', skinTone: '#c99069', outfitPrimary: '#514638', outfitSecondary: '#a07b4c', accessory: 'beard', bodyType: 'athletic', eyeColor: '#aa8b63', faceShape: 'long', ageBand: 'adult', expression: 'stern' } }
  ],
  mage: [
    { id: 'mage-1', file: 'mage-1.webp', look: { hairColor: '#a54f37', hairStyle: 'long', skinTone: '#efc6ad', outfitPrimary: '#24504c', outfitSecondary: '#c0a66b', accessory: 'starpin', bodyType: 'slim' } },
    { id: 'mage-2', file: 'mage-2.webp', look: { hairColor: '#292a32', hairStyle: 'tousled', skinTone: '#f0cfb2', outfitPrimary: '#4d3e58', outfitSecondary: '#b78353', accessory: 'brooch', bodyType: 'slim' } },
    { id: 'mage-3', file: 'mage-3.webp', look: { hairColor: '#292a32', hairStyle: 'bob', skinTone: '#e6c4a7', outfitPrimary: '#283248', outfitSecondary: '#75849a', accessory: 'starpin', bodyType: 'slim', eyeColor: '#8397c4', faceShape: 'heart', ageBand: 'young', expression: 'thoughtful' } },
    { id: 'mage-4', file: 'mage-4.webp', look: { hairColor: '#e4ca91', hairStyle: 'tousled', skinTone: '#edc9a5', outfitPrimary: '#4d3e58', outfitSecondary: '#b78353', accessory: 'brooch', bodyType: 'slim', eyeColor: '#9a87b8', faceShape: 'long', ageBand: 'young', expression: 'composed' } }
  ],
  priest: [
    { id: 'priest-1', file: 'priest-1.webp', look: { hairColor: '#e4ca91', hairStyle: 'braid', skinTone: '#f2d8c3', outfitPrimary: '#eee5d2', outfitSecondary: '#bd9d5d', accessory: 'circlet', bodyType: 'slim' } },
    { id: 'priest-2', file: 'priest-2.webp', look: { hairColor: '#d5c39e', hairStyle: 'tousled', skinTone: '#f0cfb2', outfitPrimary: '#eee5d2', outfitSecondary: '#bd9d5d', accessory: 'circlet', bodyType: 'slim' } },
    { id: 'priest-3', file: 'priest-3.webp', look: { hairColor: '#a54f37', hairStyle: 'braid', skinTone: '#ecc7aa', outfitPrimary: '#eee5d2', outfitSecondary: '#bd9d5d', accessory: 'circlet', bodyType: 'slim', eyeColor: '#96aa7f', faceShape: 'heart', ageBand: 'adult', expression: 'kind' } },
    { id: 'priest-4', file: 'priest-4.webp', look: { hairColor: '#292a32', hairStyle: 'tousled', skinTone: '#efc6ad', outfitPrimary: '#435767', outfitSecondary: '#bd9d5d', accessory: 'headband', bodyType: 'average', eyeColor: '#8c9d8c', faceShape: 'long', ageBand: 'adult', expression: 'gentle' } }
  ],
  thief: [
    { id: 'thief-1', file: 'thief-1.webp', look: { hairColor: '#d5c39e', hairStyle: 'long', skinTone: '#e6c4a7', outfitPrimary: '#283248', outfitSecondary: '#75849a', accessory: 'brooch', bodyType: 'slim' } },
    { id: 'thief-2', file: 'thief-2.webp', look: { hairColor: '#292a32', hairStyle: 'bob', skinTone: '#c99069', outfitPrimary: '#283248', outfitSecondary: '#75849a', accessory: 'brooch', bodyType: 'slim' } },
    { id: 'thief-3', file: 'thief-3.webp', look: { hairColor: '#292a32', hairStyle: 'braid', skinTone: '#b98262', outfitPrimary: '#283248', outfitSecondary: '#75849a', accessory: 'earring', bodyType: 'average', eyeColor: '#be9a67', faceShape: 'long', ageBand: 'adult', expression: 'wary' } },
    { id: 'thief-4', file: 'thief-4.webp', look: { hairColor: '#a54f37', hairStyle: 'bob', skinTone: '#e4bd98', outfitPrimary: '#514638', outfitSecondary: '#a07b4c', accessory: 'none', bodyType: 'slim', eyeColor: '#8b9a71', faceShape: 'heart', ageBand: 'young', expression: 'playful' } }
  ],
  archer: [
    { id: 'archer-1', file: 'archer-1.webp', look: { hairColor: '#a54f37', hairStyle: 'long', skinTone: '#efc6ad', outfitPrimary: '#24504c', outfitSecondary: '#c0a66b', accessory: 'starpin', bodyType: 'athletic' } },
    { id: 'archer-2', file: 'archer-2.webp', look: { hairColor: '#765740', hairStyle: 'shaggy', skinTone: '#ecc7aa', outfitPrimary: '#566348', outfitSecondary: '#8da073', accessory: 'scarf', bodyType: 'athletic' } },
    { id: 'archer-3', file: 'archer-3.webp', look: { hairColor: '#d5c39e', hairStyle: 'braid', skinTone: '#e6c4a7', outfitPrimary: '#566348', outfitSecondary: '#8da073', accessory: 'scarf', bodyType: 'slim', eyeColor: '#90a4b2', faceShape: 'long', ageBand: 'adult', expression: 'focused' } },
    { id: 'archer-4', file: 'archer-4.webp', look: { hairColor: '#a54f37', hairStyle: 'long', skinTone: '#efc6ad', outfitPrimary: '#435767', outfitSecondary: '#8da073', accessory: 'headband', bodyType: 'athletic', eyeColor: '#91a479', faceShape: 'heart', ageBand: 'young', expression: 'determined' } }
  ],
  carrier: [
    { id: 'carrier-1', file: 'carrier-1.webp', look: { hairColor: '#765740', hairStyle: 'tousled', skinTone: '#e9c7a3', outfitPrimary: '#66704c', outfitSecondary: '#ddd0b2', accessory: 'scarf', bodyType: 'average' } },
    { id: 'carrier-2', file: 'carrier-2.webp', look: { hairColor: '#a54f37', hairStyle: 'braid', skinTone: '#c99069', outfitPrimary: '#64513b', outfitSecondary: '#d4c6a6', accessory: 'scarf', bodyType: 'average' } },
    { id: 'carrier-3', file: 'carrier-3.webp', look: { hairColor: '#292a32', hairStyle: 'curly', skinTone: '#b98262', outfitPrimary: '#64513b', outfitSecondary: '#d4c6a6', accessory: 'earring', bodyType: 'average', eyeColor: '#b88755', faceShape: 'round', ageBand: 'adult', expression: 'warm' } },
    { id: 'carrier-4', file: 'carrier-4.webp', look: { hairColor: '#e4ca91', hairStyle: 'curly', skinTone: '#efc6ad', outfitPrimary: '#66704c', outfitSecondary: '#ddd0b2', accessory: 'scarf', bodyType: 'average', eyeColor: '#92a17c', faceShape: 'round', ageBand: 'adult', expression: 'cheerful' } }
  ]
};

const weaponTypes = { warrior: 'sword', mage: 'staff', priest: 'holy-staff', thief: 'dagger', archer: 'bow', carrier: 'walking-staff' };
const byId = new Map();
export const RECRUIT_PORTRAITS = Object.fromEntries(Object.entries(definitions).map(([job, variants]) => [
  job,
  variants.map(variant => {
    const result = {
      ...variant,
      job,
      src: new URL(`../../assets/characters/recruits/${variant.file}`, import.meta.url).href,
      appearance: { ...variant.look, weaponType: weaponTypes[job] || 'sword' }
    };
    byId.set(result.id, result);
    return result;
  })
]));

function stableIndex(value, length) {
  let hash = 2166136261;
  for (const char of String(value || 'new-recruit')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % length;
}

export function findRecruitPortrait(portraitId) {
  return byId.get(String(portraitId || '')) || null;
}

export function chooseRecruitPortrait(person, portraitId = person?.portraitAppearance?.portraitId) {
  const options = RECRUIT_PORTRAITS[person?.job] || RECRUIT_PORTRAITS.warrior;
  return options.find(entry => entry.id === portraitId) || options[stableIndex(`${person?.id || person?.name || 'new-recruit'}:${person?.job || 'warrior'}`, options.length)];
}

export function firstUnusedRecruitPortrait(person, usedPortraitIds = new Set()) {
  const options = RECRUIT_PORTRAITS[person?.job] || RECRUIT_PORTRAITS.warrior;
  return options.find(entry => !usedPortraitIds.has(entry.id)) || null;
}
