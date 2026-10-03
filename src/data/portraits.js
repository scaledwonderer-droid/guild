// Resolve from this module so portrait assets keep working on GitHub Pages
// project sites as well as when served from the project root.
export const PORTRAIT_SHEET = new URL('../../assets/characters/adventurers-v02.png', import.meta.url).href;

// One shared sprite sheet keeps every screen on the same portrait source.
// Cells are read left-to-right, top-to-bottom in a 3 × 2 grid.
export const PORTRAIT_CELLS = {
  leon: 0,
  bram: 1,
  milia: 2,
  cecil: 3,
  elna: 4,
  toma: 5
};
