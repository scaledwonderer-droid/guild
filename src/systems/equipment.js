const JOB_FITS = {
  warrior: { weapon: ['sword', 'spear', 'heavy'], armor: ['light', 'medium', 'heavy'] },
  mage: { weapon: ['staff', 'wand'], armor: ['light'] },
  priest: { weapon: ['staff', 'wand', 'holy'], armor: ['light', 'medium'] },
  thief: { weapon: ['dagger', 'sword'], armor: ['light'] },
  archer: { weapon: ['bow', 'spear'], armor: ['light'] },
  carrier: { weapon: ['staff', 'spear', 'hammer'], armor: ['light', 'medium', 'heavy'] }
};

const JOB_STANDARD = {
  warrior: { weapon: ['hammer'], armor: [] },
  mage: { weapon: [], armor: ['medium'] },
  priest: { weapon: ['sword', 'spear'], armor: [] },
  thief: { weapon: ['spear'], armor: ['medium'] },
  archer: { weapon: ['sword', 'dagger'], armor: ['medium'] },
  carrier: { weapon: ['sword', 'dagger', 'bow'], armor: [] }
};

function weaponType(item) {
  const name = `${item?.name || ''} ${item?.template || ''} ${item?.uid || ''}`.toLowerCase();
  if (/弓|bow/.test(name)) return 'bow';
  if (/短剣|dagger|knife/.test(name)) return 'dagger';
  if (/杖|ロッド|ワンド|staff|wand|rod/.test(name)) return /祝福|holy/.test(name) ? 'holy' : 'staff';
  if (/槍|spear/.test(name)) return 'spear';
  if (/槌|鎚|pick|hammer|つるはし/.test(name)) return 'hammer';
  if (/剣|sword|blade|鉈|cleaver/.test(name)) return 'sword';
  return 'unknown';
}

export function equipmentWeightClass(item) {
  const weight = Math.max(0, Number(item?.weight || 0));
  return weight <= 2 ? 'light' : weight <= 5 ? 'medium' : 'heavy';
}

export function equipmentFit(jobId, item) {
  if (!item || !['weapon', 'armor'].includes(item.slot)) return 'standard';
  const type = item.slot === 'weapon' ? weaponType(item) : equipmentWeightClass(item);
  if (type === 'unknown') return 'standard';
  const fits = JOB_FITS[jobId]?.[item.slot] || [];
  if (fits.includes(type)) return 'fit';
  const standard = JOB_STANDARD[jobId]?.[item.slot] || [];
  return standard.includes(type) ? 'standard' : 'unfit';
}

export function equipmentFitLabel(jobId, item) {
  return ({ fit: '適性あり', standard: '標準', unfit: '不向き' })[equipmentFit(jobId, item)];
}

export function equipmentProfile(person, items = []) {
  const weapon = items.find(item => item.uid === person?.weapon && item.slot === 'weapon');
  const armor = items.find(item => item.uid === person?.armor && item.slot === 'armor');
  const gear = [weapon, armor].filter(Boolean);
  const fits = gear.map(item => equipmentFit(person?.job, item));
  const unfit = fits.filter(value => value === 'unfit').length;
  const weight = gear.reduce((sum, item) => sum + Math.max(0, Number(item.weight || 0)), 0);
  const effects = gear.reduce((all, item) => {
    for (const [key, value] of Object.entries(item.effects || {})) all[key] = (all[key] || 0) + Number(value || 0);
    return all;
  }, {});
  const carrierRelief = person?.job === 'carrier' ? 2 : 0;
  return {
    weapon, armor, weight, unfit,
    speedPenalty: unfit * 2,
    attackPenalty: unfit * 2,
    fatigue: Math.max(0, Math.ceil(Math.max(0, weight - 4) * 0.65 + unfit * 2 + (effects.fatigue || 0) - carrierRelief)),
    effects
  };
}
