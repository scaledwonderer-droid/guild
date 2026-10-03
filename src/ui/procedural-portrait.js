const safeColor = (value, fallback) => /^#[\da-f]{6}$/i.test(String(value || '')) ? value : fallback;
const hashText = value => {
  let hash = 2166136261;
  for (const char of String(value || '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

export function proceduralPortraitData(person = {}) {
  const look = person.portraitAppearance || person.spriteAppearance || {};
  const hair = safeColor(look.hairColor, '#604536');
  const skin = safeColor(look.skinTone, '#e4bd98');
  const outfit = safeColor(look.outfitPrimary, '#34483a');
  const trim = safeColor(look.outfitSecondary, '#a58b5d');
  const eye = safeColor(look.eyeColor, '#718a82');
  const seed = hashText(person.id || person.name || 'adventurer');
  const facePath = look.faceShape === 'long'
    ? 'M48 42 Q72 26 96 42 L93 78 Q87 101 72 105 Q57 101 51 78 Z'
    : look.faceShape === 'heart'
      ? 'M48 42 Q72 28 96 42 L92 72 Q87 91 72 104 Q57 91 52 72 Z'
      : 'M48 43 Q72 27 96 43 L94 73 Q90 98 72 103 Q54 98 50 73 Z';
  const hairTop = look.hairStyle === 'curly'
    ? '<path d="M43 57 Q36 32 53 31 Q55 18 68 27 Q82 16 89 31 Q106 27 101 51 L96 62 Q93 45 82 43 Q67 52 50 44 Z"/>'
    : look.hairStyle === 'braid'
      ? '<path d="M45 57 Q37 31 56 30 Q68 15 82 28 Q102 27 101 53 L93 60 Q84 45 72 43 Q57 49 49 63 Z"/><path d="M94 57 Q107 66 100 81 Q111 91 98 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>'
      : look.hairStyle === 'short'
        ? '<path d="M44 58 Q37 30 58 30 Q76 18 91 32 Q104 40 99 61 L91 54 Q78 45 64 50 L51 63 Z"/>'
        : look.hairStyle === 'bob'
          ? '<path d="M43 58 Q37 29 58 29 Q76 18 92 31 Q105 43 99 72 L91 82 L92 55 Q72 46 52 57 L51 80 L44 74 Z"/>'
          : look.hairStyle === 'long'
            ? '<path d="M43 59 Q36 29 57 29 Q77 17 93 32 Q105 42 100 79 L94 97 L88 59 Q72 48 53 58 L50 94 L44 80 Z"/>'
            : '<path d="M43 58 Q36 31 57 30 Q77 18 92 32 Q103 42 99 63 L91 59 Q81 47 70 49 Q59 53 51 63 Z"/>';
  const mouth = ['stern', 'wary', 'focused', 'determined'].includes(look.expression)
    ? 'M64 86 Q72 88 80 86'
    : ['warm', 'kind', 'cheerful'].includes(look.expression)
      ? 'M63 84 Q72 93 82 84'
      : 'M65 86 Q72 89 79 86';
  const professionMark = person.job === 'mage' ? '✧' : person.job === 'priest' ? '✚' : person.job === 'thief' ? '◇' : person.job === 'archer' ? '➶' : person.job === 'carrier' ? '⌂' : '⚔';
  const accessories = {
    circlet: `<path d="M52 39 Q72 26 92 39" fill="none" stroke="${trim}" stroke-width="3"/><circle cx="72" cy="34" r="3.5" fill="${trim}"/>`,
    headband: `<path d="M51 43 Q72 35 93 43" fill="none" stroke="${trim}" stroke-width="4"/>`,
    starpin: `<path d="M94 42 L97 48 L103 49 L98 53 L99 59 L94 56 L89 59 L90 53 L85 49 L91 48 Z" fill="${trim}"/>`,
    brooch: `<circle cx="94" cy="51" r="5" fill="${trim}" stroke="#efe0bb" stroke-width="1"/>`,
    earring: `<circle cx="97" cy="69" r="3" fill="${trim}"/>`,
    scarf: `<path d="M53 100 Q72 109 92 99 L100 126 Q76 118 47 128 Z" fill="${trim}" opacity=".95"/>`,
    beard: '<path d="M54 75 Q72 89 90 75 L84 96 Q72 107 60 94 Z" fill="#594033"/>',
    none: ''
  }[look.accessory] || '';
  const freckles = seed % 3 === 0 ? '<g fill="#8c5f4b" opacity=".56"><circle cx="58" cy="73" r="1.1"/><circle cx="63" cy="75" r=".9"/><circle cx="82" cy="75" r=".9"/><circle cx="86" cy="72" r="1"/></g>' : '';
  const sparkles = Array.from({ length: 3 }, (_, index) => {
    const x = 13 + ((seed >>> (index * 5)) % 118);
    const y = 13 + ((seed >>> (index * 7 + 3)) % 118);
    return `<circle cx="${x}" cy="${y}" r="1.1" fill="#e8d4a7" opacity=".45"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#647263"/><stop offset="1" stop-color="#1e2b25"/></linearGradient><linearGradient id="coat" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${trim}"/><stop offset=".35" stop-color="${outfit}"/><stop offset="1" stop-color="#17211c"/></linearGradient><radialGradient id="light"><stop stop-color="#f0d7a5" stop-opacity=".38"/><stop offset="1" stop-color="#f0d7a5" stop-opacity="0"/></radialGradient></defs><rect width="144" height="144" fill="url(#bg)"/><rect width="144" height="144" fill="url(#light)"/>${sparkles}<circle cx="72" cy="70" r="58" fill="none" stroke="#d8c08b" stroke-opacity=".27"/><path d="M16 144 Q20 110 43 103 L58 96 L86 96 L102 104 Q126 111 130 144Z" fill="url(#coat)"/><path d="M60 94 L60 111 L84 111 L84 94" fill="${skin}"/><path d="${facePath}" fill="${skin}" stroke="#3d312b" stroke-width="2"/><path d="M45 66 Q47 57 53 64 M91 64 Q97 58 99 67" fill="none" stroke="${skin}" stroke-width="4"/><path d="M57 67 Q63 63 68 67 M77 67 Q83 63 88 67" fill="none" stroke="#4d3b35" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="63" cy="70" rx="3.4" ry="2.4" fill="#faf0d7"/><ellipse cx="82" cy="70" rx="3.4" ry="2.4" fill="#faf0d7"/><circle cx="63" cy="70" r="1.7" fill="${eye}"/><circle cx="82" cy="70" r="1.7" fill="${eye}"/><path d="M72 70 L69 79 L73 80" fill="none" stroke="#9d705b" stroke-width="1.4" stroke-linecap="round"/><path d="${mouth}" fill="none" stroke="#8f5448" stroke-width="2" stroke-linecap="round"/>${freckles}<g style="color:${hair}" fill="${hair}">${hairTop}</g>${accessories}<path d="M50 109 L72 122 L94 109" fill="none" stroke="${trim}" stroke-width="3"/><circle cx="117" cy="116" r="12" fill="#111914b8" stroke="${trim}"/><text x="117" y="120" text-anchor="middle" font-size="11" fill="#e6d3a3">${professionMark}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
