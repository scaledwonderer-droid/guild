const sceneAssets = {
  guild: new URL('../../assets/backgrounds/scenes/guild-hall.webp', import.meta.url).href,
  'old-cave': new URL('../../assets/backgrounds/scenes/old-cave.webp', import.meta.url).href,
  'trap-fort': new URL('../../assets/backgrounds/scenes/trap-fort.webp', import.meta.url).href,
  'wind-gorge': new URL('../../assets/backgrounds/scenes/wind-gorge.webp', import.meta.url).href,
  'collapsed-mine': new URL('../../assets/backgrounds/scenes/collapsed-mine.webp', import.meta.url).href,
  'trial-labyrinth': new URL('../../assets/backgrounds/trial-labyrinth.webp', import.meta.url).href
};

const campAssets = {
  'old-cave': new URL('../../assets/backgrounds/scenes/camp-old-cave.webp', import.meta.url).href,
  'trap-fort': new URL('../../assets/backgrounds/scenes/camp-trap-fort.webp', import.meta.url).href,
  'wind-gorge': new URL('../../assets/backgrounds/scenes/camp-wind-gorge.webp', import.meta.url).href,
  'collapsed-mine': new URL('../../assets/backgrounds/scenes/camp-collapsed-mine.webp', import.meta.url).href,
  'trial-labyrinth': new URL('../../assets/backgrounds/trial-camp.webp', import.meta.url).href
};

function imageStyle(image, position = 'center center') {
  return `--backdrop-image:url('${image}');--backdrop-size:cover;--backdrop-position:${position}`;
}

export function guildBackdropStyle() {
  return imageStyle(sceneAssets.guild);
}

export function dungeonBackdropStyle(dungeonId = 'old-cave') {
  return imageStyle(sceneAssets[dungeonId] || sceneAssets['old-cave']);
}

export function campBackdropStyle(dungeonId = 'old-cave') {
  const fireX = dungeonId === 'trial-labyrinth' ? '27%' : dungeonId === 'trap-fort' ? '78%' : dungeonId === 'collapsed-mine' ? '24%' : '24%';
  const position = dungeonId === 'trial-labyrinth' ? 'center center' : 'center 68%';
  return `${imageStyle(campAssets[dungeonId] || campAssets['old-cave'], position)};--camp-fire-x:${fireX}`;
}

export function activityBackdropStyle(activityType = 'guild') {
  if (activityType === 'contract' || activityType === 'gathering') return dungeonBackdropStyle('wind-gorge');
  return guildBackdropStyle();
}
