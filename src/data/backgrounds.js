const environmentAtlas = new URL('../../assets/backgrounds/v06-environments.webp', import.meta.url).href;
const campAtlas = new URL('../../assets/backgrounds/v06-camps.webp', import.meta.url).href;
const trialEnvironment = new URL('../../assets/backgrounds/trial-labyrinth.webp', import.meta.url).href;
const trialCamp = new URL('../../assets/backgrounds/trial-camp.webp', import.meta.url).href;

const environments = {
  'old-cave': [2, 0],
  'trap-fort': [0, 1],
  'wind-gorge': [1, 1],
  'collapsed-mine': [2, 1],
  'trial-labyrinth': [2, 0]
};

const camps = {
  'old-cave': [0, 0, '24%'],
  'trap-fort': [1, 0, '78%'],
  'wind-gorge': [0, 1, '24%'],
  'collapsed-mine': [1, 1, '24%'],
  'trial-labyrinth': [1, 0, '78%']
};

function pos(index, columns) {
  return `${columns === 3 ? [0, 50, 100][index] : index * 100}%`;
}

export function guildBackdropStyle(level = 1) {
  return `--backdrop-image:url("${environmentAtlas}");--backdrop-size:300% 200%;--backdrop-position:0% 0%`;
}

export function dungeonBackdropStyle(dungeonId = 'old-cave') {
  if (dungeonId === 'trial-labyrinth') return `--backdrop-image:url("${trialEnvironment}");--backdrop-size:cover;--backdrop-position:center center`;
  const [column, row] = environments[dungeonId] || environments['old-cave'];
  return `--backdrop-image:url("${environmentAtlas}");--backdrop-size:300% 200%;--backdrop-position:${pos(column, 3)} ${row * 100}%`;
}

export function campBackdropStyle(dungeonId = 'old-cave') {
  if (dungeonId === 'trial-labyrinth') return `--backdrop-image:url("${trialCamp}");--backdrop-size:cover;--backdrop-position:center center;--camp-fire-x:27%`;
  const [column, row, fireX] = camps[dungeonId] || camps['old-cave'];
  return `--backdrop-image:url("${campAtlas}");--backdrop-size:200% 200%;--backdrop-position:${column * 100}% ${row * 100}%;--camp-fire-x:${fireX}`;
}

export function activityBackdropStyle(activityType = 'guild') {
  if (activityType === 'contract' || activityType === 'gathering') return dungeonBackdropStyle('wind-gorge');
  return guildBackdropStyle();
}
