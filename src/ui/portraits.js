import { PORTRAIT_CELLS, PORTRAIT_SHEET } from '../data/portraits.js';
import { ensurePortraitAppearance } from '../data/portrait-appearance.js';
import { findRecruitPortrait } from '../data/recruit-portraits.js';
import { proceduralPortraitData } from './procedural-portrait.js';

const positions = [
  { left: '0%', top: '0%' }, { left: '-100%', top: '0%' }, { left: '-200%', top: '0%' },
  { left: '0%', top: '-100%' }, { left: '-100%', top: '-100%' }, { left: '-200%', top: '-100%' }
];

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function fallback(name) {
  return `<span class="portrait-fallback" aria-hidden="true">${escape(name.slice(0, 2))}</span>`;
}

export function renderPortrait(person, variant = '') {
  const cell = PORTRAIT_CELLS[person?.id];
  const position = positions[cell];
  const name = person?.name || '冒険者';
  const classes = ['portrait', variant].filter(Boolean).join(' ');
  const fallbackSrc = escape(proceduralPortraitData(person));
  if (position) {
    return `<span class="${classes}" role="img" aria-label="${escape(name)}のポートレート">${fallback(name)}<img class="portrait-sheet-cell" src="${escape(PORTRAIT_SHEET)}" alt="" aria-hidden="true" style="left:${position.left};top:${position.top}" onerror="this.onerror=null;this.className='portrait-procedural';this.src='${fallbackSrc}'"></span>`;
  }
  const look = ensurePortraitAppearance(person);
  const portrait = findRecruitPortrait(look.portraitId);
  if (portrait) {
    return `<span class="${classes}" role="img" aria-label="${escape(name)}のポートレート">${fallback(name)}<img class="portrait-recruit-image" src="${escape(portrait.src)}" alt="" aria-hidden="true" onerror="this.onerror=null;this.className='portrait-procedural';this.src='${fallbackSrc}'"></span>`;
  }
  return `<span class="${classes}" role="img" aria-label="${escape(name)}のポートレート"><img class="portrait-procedural" src="${fallbackSrc}" alt="" aria-hidden="true"></span>`;
}
