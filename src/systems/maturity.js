const LATE_IDS = ['aldina-road', 'fergran-ruins', 'north-expanse'];

export function lateDungeonClears(state) {
  return [...new Set((state.lateDungeonClears || []).filter(id => LATE_IDS.includes(id)))];
}

export function guildMaturityTier(state) {
  if (!state.trialBossDefeated) return 0;
  const count = lateDungeonClears(state).length;
  return count >= 3 ? 3 : count >= 1 ? 2 : 1;
}

export function guildMaturityLabel(state) {
  return ['公認ギルド', '広域遠征ギルド', '経験を束ねるギルド', '成熟した遠征組織'][guildMaturityTier(state)];
}

export function rosterCapacity(state) {
  const base = [8, 10, 12, 14, 16][Math.max(0, Math.min(4, Number(state.guildLevel || 1) - 1))];
  return base + guildMaturityTier(state) * 2;
}

export function recruitmentLevelBonus(state) {
  return guildMaturityTier(state);
}

export function recordLateDungeonClear(state, dungeonId) {
  if (!LATE_IDS.includes(dungeonId)) return { changed: false, tier: guildMaturityTier(state) };
  const before = guildMaturityTier(state);
  state.lateDungeonClears = lateDungeonClears(state);
  if (state.lateDungeonClears.includes(dungeonId)) return { changed: false, tier: before };
  state.lateDungeonClears.push(dungeonId);
  const after = guildMaturityTier(state);
  if (after > before) {
    state.guildNotices ||= [];
    const details = after === 2
      ? ['新たな土地から依頼と募集が届き始めました。ベテランは新人の訓練を支援します。運営費も増えます。']
      : ['ギルドの経験が日々の活動へ根付きました。新人の支援と交代編成の育成がしやすくなり、維持負担も増えています。'];
    state.guildNotices.unshift({
      id: `maturity-${after}-${Number(state.day || 1)}`,
      title: after === 2 ? 'ギルドの活動範囲が広がりました' : 'ギルドが成熟しました',
      details
    });
  }
  return { changed: true, tier: after };
}
