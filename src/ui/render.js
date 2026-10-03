import { JOBS, statsFor } from '../data/adventurers.js';
import { DUNGEONS, getDungeon } from '../data/dungeon.js';
import { SHOP_ITEMS, slotName } from '../data/items.js';
import { policyName } from '../systems/expedition.js';
import { availableRecruits, partyLimitForLevel } from '../systems/guild.js';
import { getSurveyRecord, surveyProgressLabel } from '../systems/survey.js';
import { createActivityPlan, nextUpkeepInfo, nextUpkeepLabel, trustLabel } from '../systems/time.js';
import { WAREHOUSE_CATEGORIES, MATERIAL_EXCHANGES, warehouseGroups, materialExchangeStatus } from '../systems/warehouse.js';
import { renderPortrait } from './portraits.js';
import { renderCampLandscape } from './camp-scene.js';
import { mountSpriteCanvases, renderCharacterSprite, renderEnemySprite } from './sprite-renderer.js';
import { activityBackdropStyle, campBackdropStyle, dungeonBackdropStyle, guildBackdropStyle } from '../data/backgrounds.js';
import { equipmentFitLabel, equipmentProfile } from '../systems/equipment.js';
import { hasTrialKeys, missingTrialKeys, ownedTrialKeys } from '../systems/trial.js';
import { TRIAL_KEY_ITEMS } from '../data/v07.js';

const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const pct = value => `${Math.max(0, Math.min(100, Math.round(value)))}%`;
const titles = { home: 'ギルド本部', adventurers: '冒険者一覧', party: '編成と遠征準備', expedition: '遠征観戦', guild: 'ギルド管理', warehouse: 'ギルド倉庫' };
const jobKey = job => job === 'warrior' ? '' : job;
const jobLabel = job => JOBS[job]?.name || '冒険者';
const damageClass = tone => tone === 'danger' ? 'danger' : tone === 'good' ? 'good' : tone === 'camp' ? 'camp' : '';
const surveyFieldLabels = {
  enemies: '確認済みの敵', hazards: '確認済みの危険', statusEffects: '確認済みの状態異常',
  environments: '確認済みの環境', skills: '確認済みの有効技能', equipment: '実際に効果を確認した装備', loot: '確認済みの戦利品',
  bosses: '確認済みのボス', specialBosses: '確認済み特殊個体', routes: '実際に通った分岐', sealedRooms: '確認済みの封印・扉', events: '確認済みの出来事', externalThreats: '確認済みの外部脅威'
};

function renderSurveyFacts(record) {
  const floors = (record.floors || []).map(floor => `第${floor}階層`).join('・') || '0';
  const facts = [`<div class="info-cell"><small>確認済み階層</small><strong>${html(floors)}</strong></div>`];
  for (const [field, label] of Object.entries(surveyFieldLabels)) {
    const values = record[field] || [];
    facts.push(`<div class="info-cell"><small>${label}</small><strong>${values.length ? html(values.join('・')) : '不明'}</strong></div>`);
  }
  return `<div class="info-grid survey-facts">${facts.join('')}</div>`;
}

function renderNewDiscoveries(discovery) {
  if (!discovery) return '';
  const groups = [
    ['floors', '今回到達した階層', value => `第${value}階層`],
    ...Object.entries(surveyFieldLabels).map(([field, label]) => [field, label, value => value])
  ].map(([field, label, format]) => {
    const values = discovery[field] || [];
    return values.length ? `<div class="survey-new-row"><small>${label}</small><strong>${html(values.map(format).join('・'))}</strong></div>` : '';
  }).join('');
  return groups ? `<div class="survey-new-facts">${groups}</div>` : '<p class="result-note">この遠征で追加の情報は確認できませんでした。</p>';
}

export function render(state) {
  document.querySelector('#page-title').textContent = titles[state.screen] || titles.home;
  document.querySelector('#day-count').textContent = `第${state.day}日`;
  document.querySelector('#date-label').textContent = state.expedition ? 'EXPEDITION IN PROGRESS' : 'GUILD RECORD';
  const funds = document.querySelector('#guild-funds');
  if (funds) funds.textContent = `${Number(state.gold || 0).toLocaleString('ja-JP')}G`;
  const upkeep = nextUpkeepInfo(state);
  const nextCost = document.querySelector('#next-upkeep');
  if (nextCost) nextCost.textContent = `次回 ${upkeep.amount}G · 第${upkeep.day}日`;
  const rank = document.querySelector('#guild-rank');
  if (rank) rank.textContent = `Lv.${state.guildLevel || 1}`;
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.screen === state.screen;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
    button.disabled = Boolean(state.expedition && button.dataset.screen !== 'expedition');
    button.title = state.expedition && button.dataset.screen !== 'expedition' ? '遠征中は観戦画面を表示します' : '';
  });
  const view = document.querySelector('#view');
  let page = state.screen === 'adventurers' ? renderAdventurers(state)
    : state.screen === 'party' ? renderParty(state)
      : state.screen === 'expedition' ? renderExpedition(state)
        : state.screen === 'guild' ? renderGuild(state)
          : state.screen === 'warehouse' ? renderWarehouse(state)
            : renderHome(state);
  let pageBackdrop = guildBackdropStyle(state.guildLevel);
  if (state.screen === 'party') pageBackdrop = dungeonBackdropStyle(state.selectedDungeonId || 'old-cave');
  if (state.screen === 'expedition' && state.expedition) {
    pageBackdrop = state.expedition.phase === 'camp'
      ? campBackdropStyle(state.expedition.dungeonId || 'old-cave')
      : dungeonBackdropStyle(state.expedition.dungeonId || 'old-cave');
  }
  if (state.screen === 'expedition' && !state.expedition && state.lastResult?.dungeonId) pageBackdrop = dungeonBackdropStyle(state.lastResult.dungeonId);
  if (view.dataset) view.dataset.screen = state.screen;
  view.innerHTML = `<div class="view-backdrop" style="${pageBackdrop}" aria-hidden="true"></div>${page}`;
  mountSpriteCanvases(view, state);
}

function renderHome(state) {
  const active = state.expedition;
  const recent = state.history[0];
  const roster = state.adventurers.slice(0, 8).map(person => `
    <div class="mini-hero">${renderPortrait(person, jobKey(person.job))}<div><strong>${html(person.name)}</strong><small>${jobLabel(person.job)} · Lv.${person.level}</small></div></div>`).join('');
  const activity = recent
    ? `<div class="recent-item"><span class="recent-mark">${recent.outcome === 'cleared' ? '✓' : '↩'}</span><div><strong>${html(recent.title)} · 第${recent.floor}階層まで</strong><small>第${recent.day}日 · ${recent.kills}体討伐</small></div></div>`
    : `<div class="empty-note">まだ遠征記録はありません。<br>まずは小さな一歩から始めましょう。</div>`;
  const action = active
    ? `<button class="button button-gold" data-action="nav-expedition">遠征の様子を見る　→</button>`
    : `<button class="button button-gold" data-action="nav-party">遠征の準備をする　→</button> <button class="button button-secondary" data-action="rest">休養日を取る</button>`;
  const nextActivities = createActivityPlan(state, { forNextDay: true }).map(group => `<div class="recent-item"><span class="recent-mark">${group.type === 'rest' ? '☾' : group.type === 'training' ? '⚔' : group.type === 'contract' ? '◇' : group.type === 'social' ? '☷' : '⌂'}</span><div><strong>${html(group.label)} · ${html(group.names.join('、'))}</strong><small>${group.type === 'rest' ? '休養を予定しています' : group.type === 'training' ? '自主訓練を予定しています' : group.type === 'contract' ? '安全な軽依頼を予定しています' : group.type === 'social' ? '仲間との交流を予定しています' : '本部の仕事を手伝います'}</small></div></div>`).join('');
  const economyNotices = [...(state.departureNotices || []), ...(state.economicNotices || [])].slice(0, 3).map(notice => `<div class="unlock-notice"><div><strong>${html(notice.title)}</strong><small>${html((notice.details || []).join('・'))}</small></div><button class="text-link" data-action="dismiss-economic" data-notice="${html(notice.id)}">確認</button></div>`).join('');
  return `
    <section class="hero-card card">
      <div class="hero-copy"><p class="section-kicker">A GUILD MASTER'S JOURNAL</p><h2>${active ? `仲間たちは、${html(getDungeon(active.dungeonId).name)}の奥へ進んでいます。` : '次の物語は、ギルドから始まる。'}</h2>
        <p>${active ? '彼らの判断を見守り、帰還の時を待ちましょう。記録は行動ごとに自動保存されています。' : '仲間を育て、遠征先に合った役割を整え、次の目標へ送り出しましょう。戦いも野営も、彼ら自身が決めて進みます。'}</p>
        <div class="hero-actions">${action}</div>
      </div><div class="hero-art guild-art" style="${guildBackdropStyle(state.guildLevel)}" aria-hidden="true"></div>
    </section>
    <section class="stat-grid">
      <article class="card stat-card"><div class="stat-top"><span>登録冒険者</span><span class="stat-icon">♙</span></div><div class="stat-value">${state.adventurers.length}<small>人</small></div></article>
      <article class="card stat-card"><div class="stat-top"><span>遠征回数</span><span class="stat-icon">⌖</span></div><div class="stat-value">${state.stats.runs}<small>回</small></div></article>
      <article class="card stat-card"><div class="stat-top"><span>調査完了</span><span class="stat-icon">✧</span></div><div class="stat-value">${state.stats.clears}<small>回</small></div></article>
      <article class="card stat-card"><div class="stat-top"><span>ギルドレベル</span><span class="stat-icon">⚜</span></div><div class="stat-value">Lv.${state.guildLevel}<small> 公認</small></div></article>
    </section>
    ${economyNotices ? `<section class="guild-notices">${economyNotices}</section>` : ''}
    <div class="two-column">
      <section><div class="section-head"><div><p class="section-kicker">YOUR ADVENTURERS</p><h2>ギルドの仲間</h2></div><button class="text-link" data-action="nav-adventurers">一覧を見る　→</button></div><div class="roster-strip">${roster}</div></section>
      <section class="card panel"><div class="panel-head"><h3>次の日の活動予定</h3><span class="pill ${active ? 'gold' : ''}">${active ? '遠征中' : `維持費 ${nextUpkeepLabel(state)}`}</span></div><div class="recent-list">${active ? `<div class="recent-item"><span class="recent-mark">⌖</span><div><strong>${html(getDungeon(active.dungeonId).name)}へ遠征中</strong><small>使い魔の観察先：${html(active.observationGroup?.label || (active.observationTargetId === 'none' ? '同行なし' : '主遠征隊'))}</small></div></div>` : nextActivities || activity}</div><button class="text-link" data-action="nav-guild">ギルド管理と人員募集　→</button></section>
    </div>
    <p class="subtle-note" style="margin-top:18px">遠征の帰還、休養、訓練、軽依頼で日数が進みます。10日ごとに維持費が発生します。活動中は透明な観察使い魔が選ばれた1組だけを見守ります。</p>`;
}

function renderAdventurers(state) {
  const cards = state.adventurers.map(person => {
    const stats = statsFor(person, state.inventory);
    const hp = Math.max(0, person.hp);
    const weapon = state.inventory.find(item => item.uid === person.weapon);
    const armor = state.inventory.find(item => item.uid === person.armor);
    const occupied = new Set(state.adventurers.filter(other => other.id !== person.id).flatMap(other => [other.weapon, other.armor]));
    const weaponOptions = state.inventory.filter(item => item.slot === 'weapon' && (!occupied.has(item.uid) || item.uid === person.weapon));
    const armorOptions = state.inventory.filter(item => item.slot === 'armor' && (!occupied.has(item.uid) || item.uid === person.armor));
    const gear = equipmentProfile(person, state.inventory);
    const weaponOption = item => `<option value="${html(item.uid)}" ${item.uid === person.weapon ? 'selected' : ''}>${html(item.name)}（攻撃 +${item.attack}${item.heal ? `・回復 +${item.heal}` : ''} · ${equipmentFitLabel(person.job, item)} · 重さ ${Number(item.weight || 0)}）</option>`;
    const armorOption = item => `<option value="${html(item.uid)}" ${item.uid === person.armor ? 'selected' : ''}>${html(item.name)}（防御 +${item.defense} · ${equipmentFitLabel(person.job, item)} · 重さ ${Number(item.weight || 0)}）</option>`;
    const canEdit = !state.expedition;
    return `<article class="card adventurer-card">
      <div class="adv-head">${renderPortrait(person, jobKey(person.job))}<div class="adv-name"><h3>${person.epithets?.length ? `<span class="epithet-title">「${html(person.epithets.at(-1).name)}」</span>` : ''}${html(person.name)}</h3><small>${jobLabel(person.job)} · ${html(person.personality)}</small></div><span class="level-badge">Lv. ${person.level}</span></div>
      <p class="adv-description">${html(person.quirk || JOBS[person.job].description)}</p>
      <div class="meter-row"><span>HP</span><span>${hp} / ${stats.maxHp}</span></div><div class="meter hp"><span style="width:${pct(hp / stats.maxHp * 100)}"></span></div>
      <div class="meter-row"><span>疲労</span><span>${person.fatigue || 0}%</span></div><div class="meter"><span style="width:${pct(person.fatigue || 0)};background:linear-gradient(90deg,#98835a,#d0ad69)"></span></div>
      <div class="stat-tags"><span class="small-stat"><b>攻</b>${stats.attack}</span><span class="small-stat"><b>守</b>${stats.defense}</span><span class="small-stat"><b>速</b>${stats.speed}</span>${stats.heal ? `<span class="small-stat"><b>癒</b>${stats.heal}</span>` : ''}<span class="small-stat"><b>経験</b>${person.exp} / ${person.level * 42}</span></div>
      ${person.epithets?.length ? `<details class="epithet-record"><summary>二つ名と固有技能</summary>${person.epithets.map(epithet => `<div class="epithet-entry"><strong>「${html(epithet.name)}」 · ${html(epithet.skillName)}</strong><small>${html(epithet.description)}</small><small>第${Number(epithet.earnedDay || 1)}日獲得</small></div>`).join('')}</details>` : ''}
      <div class="condition-row">${person.injury ? `<span class="pill red">${html(person.injury)}</span>` : `<span class="pill">状態良好</span>`}<span class="pill ${person.fatigue >= 60 ? 'gold' : ''}">疲労 ${person.fatigue || 0}%</span><span class="pill ${person.guildTrust < 40 ? 'red' : ''}">ギルドとの関係：${trustLabel(person)}</span></div>
      <div class="gear-section"><div class="gear-row"><label for="weapon-${person.id}">武器</label><select id="weapon-${person.id}" data-action="equip" data-person="${person.id}" data-slot="weapon" ${canEdit ? '' : 'disabled'}>${weaponOptions.map(weaponOption).join('')}</select></div>
      <div class="gear-row"><label for="armor-${person.id}">防具</label><select id="armor-${person.id}" data-action="equip" data-person="${person.id}" data-slot="armor" ${canEdit ? '' : 'disabled'}>${armorOptions.map(armorOption).join('')}</select></div><small class="gear-burden">装備重量 ${gear.weight} · 遠征時の重量疲労 +${gear.fatigue}${gear.unfit ? ` · 不向き装備 ${gear.unfit}点（攻撃・速度低下）` : ''}</small></div>
      <div class="adv-actions"><button class="button button-secondary button-small" data-action="adventurer-activity" data-activity="rest" data-person="${person.id}" ${canEdit ? '' : 'disabled'}>休養日</button><button class="button button-secondary button-small" data-action="adventurer-activity" data-activity="training" data-person="${person.id}" ${canEdit ? '' : 'disabled'}>訓練</button><button class="button button-secondary button-small" data-action="adventurer-activity" data-activity="contract" data-person="${person.id}" ${canEdit ? '' : 'disabled'}>軽依頼</button></div>
      <details class="activity-history"><summary>最近の行動履歴</summary>${person.activityHistory?.length ? `<ul>${person.activityHistory.slice(0, 5).map(entry => `<li><strong>第${entry.day}日 · ${html(entry.title)}</strong><span>${html(entry.summary)}</span></li>`).join('')}</ul>` : '<p class="subtle-note">まだ記録はありません。</p>'}</details>
      ${weapon || armor ? '' : ''}
    </article>`;
  }).join('');
  return `<div class="section-head"><div><p class="section-kicker">THE GUILD ROSTER</p><h2>冒険者一覧</h2><p>役割、状態、装備を確認できます。装備は帰還後に変更できます。</p></div><span class="pill">${state.adventurers.length} REGISTERED</span></div><div class="roster-grid">${cards}</div>`;
}

function renderParty(state) {
  const partyLimit = partyLimitForLevel(state.guildLevel || 1);
  const selected = new Set(state.party);
  const members = state.adventurers.map(person => {
    const stats = statsFor(person, state.inventory);
    const hpPct = person.hp / stats.maxHp * 100;
    const disabled = (Boolean(person.injury) || state.party.length >= partyLimit && !selected.has(person.id)) && !selected.has(person.id);
    return `<label class="member-select ${selected.has(person.id) ? 'selected' : ''}" data-member-label="${person.id}">
      <input type="checkbox" data-action="party-member" value="${person.id}" ${selected.has(person.id) ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
      ${renderPortrait(person, jobKey(person.job))}<span><strong>${html(person.name)} <span style="color:#aab5a8;font-weight:400">· ${jobLabel(person.job)}</span></strong><small>${html(person.personality)} · HP ${Math.max(0, person.hp)}/${stats.maxHp} · ${person.injury ? html(person.injury) : `疲労 ${person.fatigue}%`}</small></span><span class="member-level">Lv.${person.level}</span>
    </label>`;
  }).join('');
  const leaderOptions = state.party.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean).map(person => `<option value="${person.id}" ${state.leaderId === person.id ? 'selected' : ''}>${html(person.name)}（${jobLabel(person.job)}）</option>`).join('');
  const chips = state.party.map(id => state.adventurers.find(p => p.id === id)).filter(Boolean).map(person => `<span class="pill ${jobKey(person.job) === 'priest' ? 'gold' : jobKey(person.job) === 'mage' ? 'blue' : ''}">${html(person.name)} · ${jobLabel(person.job)}</span>`).join('') || '<span class="subtle-note">メンバーを選んでください。</span>';
  const partyReady = state.party.length >= 1 && state.party.length <= partyLimit && state.party.every(id => {
    const person = state.adventurers.find(p => p.id === id);
    return person && !person.injury;
  });
  const policies = [
    { id: 'safe', name: '安全第一', text: 'HPが減ると早めに帰還を選ぶ。' },
    { id: 'balanced', name: '標準', text: '危険と報酬を見て、奥を目指す。' },
    { id: 'push', name: '攻略優先', text: '大きく消耗するまで探索を続ける。' }
  ].map(policy => `<label class="policy-option"><input type="radio" name="policy" data-action="policy" value="${policy.id}" ${state.policy === policy.id ? 'checked' : ''}><strong>${policy.name}</strong><span>${policy.text}</span></label>`).join('');
  const unlockedDungeons = Object.values(DUNGEONS).filter(dungeon => (state.unlockedDungeons || ['old-cave']).includes(dungeon.id));
  const dungeonCards = unlockedDungeons.map(dungeon => {
    const selectedDungeon = (state.selectedDungeonId || 'old-cave') === dungeon.id;
    const record = getSurveyRecord(state, dungeon.id);
    return `<article class="card dungeon-choice ${selectedDungeon ? 'selected' : ''}"><div class="dungeon-banner" style="${dungeonBackdropStyle(dungeon.id)}"><h3>${html(dungeon.name)}</h3><span class="pill ${selectedDungeon ? 'gold' : ''}">${surveyProgressLabel(record)}</span></div><div class="dungeon-content"><small>確認済み階層 ${record.floors.length}</small><button class="button ${selectedDungeon ? 'button-gold' : 'button-secondary'} full-button" data-action="select-dungeon" data-dungeon="${dungeon.id}">${selectedDungeon ? '選択中' : 'この遠征先を選ぶ'}</button></div></article>`;
  }).join('');
  const hasUnopenedRegions = unlockedDungeons.length < Object.keys(DUNGEONS).length;
  const unknownRegionCard = hasUnopenedRegions ? `<article class="card dungeon-choice locked"><div class="dungeon-banner"><h3>未確認地域</h3><span class="pill">調査許可待ち</span></div><div class="dungeon-content"><p>まだ遠征許可がありません。</p></div></article>` : '';
  const dungeon = getDungeon(state.selectedDungeonId || 'old-cave');
  const dungeonRecord = getSurveyRecord(state, dungeon.id);
  const hasPriorSurvey = dungeonRecord.runs > 0 || dungeonRecord.floors.length > 0;
  const plannedActivities = createActivityPlan(state, { primaryIds: state.party, includePrimary: true, forNextDay: true });
  const observationOptions = [...plannedActivities, { id: 'none', label: '同行なし', names: [], type: 'none' }];
  const observationSelection = observationOptions.some(group => group.id === state.observationChoice) ? state.observationChoice : 'expedition';
  const activityRows = plannedActivities.map(group => `<div class="activity-plan-row"><span class="activity-marker">${group.id === 'expedition' ? '⌖' : group.type === 'rest' ? '☾' : group.type === 'training' ? '⚔' : group.type === 'contract' ? '◇' : group.type === 'social' ? '☷' : '⌂'}</span><div><strong>${html(group.label)}</strong><small>${html(group.names.join('、') || '参加者なし')}</small></div></div>`).join('');
  const observerChoices = observationOptions.map(group => `<label class="observer-choice"><input type="radio" name="observation" data-action="observation-choice" value="${html(group.id)}" ${observationSelection === group.id ? 'checked' : ''}><span><strong>${html(group.label)}</strong><small>${group.names.length ? html(group.names.join('、')) : '視覚・聴覚の観察なし'}</small></span></label>`).join('');
  const trialEntry = dungeon.id === 'trial-labyrinth';
  const trialIntel = trialEntry && hasPriorSurvey ? `<div class="trial-intel"><div class="panel-head"><h3>最深部の封印記録</h3><span class="pill ${state.trialBossRoomUnlocked ? 'gold' : ''}">${state.trialBossRoomUnlocked ? '解放済み' : state.trialSealDiscovered ? '発見済み' : '未確認'}</span></div>${state.trialSealDiscovered ? `<p>扉には四つの異なる刻印が確認されています。取得済み ${ownedTrialKeys(state).length} / ${TRIAL_KEY_ITEMS.length} 種。</p><div class="trial-key-list">${TRIAL_KEY_ITEMS.map(item => `<span class="pill ${state.inventory.some(entry => entry.keyId === item.keyId) ? 'gold' : ''}">${state.inventory.some(entry => entry.keyId === item.keyId) ? '保管中' : '未回収'} · ${html(item.name)}</span>`).join('')}</div>${state.trialBossRoomUnlocked ? '<p class="subtle-note">扉は恒久的に開いています。</p>' : `<button class="button button-gold full-button" data-action="trial-unlock-seal" ${hasTrialKeys(state) ? '' : 'disabled'}>刻印片を捧げて封印を解く</button><small>${missingTrialKeys(state).length ? `不足している刻印片：${missingTrialKeys(state).length}種` : '必要な刻印片が揃っています。'}</small>`}` : '<p>封印された扉はまだ確認されていません。</p>'}</div>` : '';
  const trialLevelNote = trialEntry && hasPriorSurvey ? '<p class="trial-level-note">調査記録に基づく挑戦目安：Lv.15以上。安定攻略を保証する水準ではありません。</p>' : '';
  return `<div class="section-head"><div><p class="section-kicker">PREPARE THE EXPEDITION</p><h2>編成と遠征準備</h2><p>最大${partyLimit}人。遠征先に合わせて役割と体調を整えます。</p></div><span class="pill gold">${state.party.length} / ${partyLimit} MEMBERS</span></div>
    <div class="prep-layout"><section class="card prep-panel"><div class="panel-head"><h3>パーティーメンバー</h3><span class="pill">同時遠征 1組</span></div><div class="member-select-list">${members}</div>
      <div class="leader-select"><label class="field-label" for="leader-select">リーダー</label><select id="leader-select" class="field-select" data-action="leader" ${state.party.length ? '' : 'disabled'}>${leaderOptions || '<option>先にメンバーを選んでください</option>'}</select></div>
      <div class="leader-select"><span class="field-label">遠征方針</span><div class="policy-list">${policies}</div></div>
    </section>
    <section><article class="card dungeon-card selected-dungeon"><div class="dungeon-banner" style="${dungeonBackdropStyle(dungeon.id)}"><h3>${html(dungeon.name)}</h3><span class="pill gold">${surveyProgressLabel(dungeonRecord)}</span></div><div class="dungeon-content"><p>${hasPriorSurvey ? 'ここに記されているのは、帰還した遠征で確認された事実です。未確認の項目は不明のまま残ります。' : '王国より調査許可が下りた地域。内部状況はまだ不明です。'}</p>${trialLevelNote}${renderSurveyFacts(dungeonRecord)}${trialIntel}
      <div class="panel-head" style="margin:15px 0 8px"><h3>今回の隊列</h3><span class="pill">${policyName(state.policy)}</span></div><div class="party-summary">${chips}</div>
      <section class="activity-plan"><div class="panel-head"><h3>本日の活動予定</h3><span class="pill">第${state.day + 1}日</span></div><div class="activity-plan-list">${activityRows}</div><p class="subtle-note">遠征に出ない仲間も休養・訓練・軽依頼などを自分で選びます。使い魔は活動開始後に同行先を変えられません。</p><div class="observer-pick"><div class="panel-head"><h3>観察使い魔の同行先</h3><span class="familiar-token">◈ 1匹</span></div><div class="observer-choice-list">${observerChoices}</div><p class="subtle-note">透明化した使い魔は視覚と音だけを届けます。遠征を有利にする効果はありません。</p></div></section>
      <button class="button button-gold full-button" data-action="start-expedition" ${partyReady ? '' : 'disabled'}>${html(dungeon.name)}へ出発する　→</button>
      ${state.party.length > partyLimit ? `<p class="disabled-note">現在の上限は${partyLimit}人です。ギルドへの納品で上限が増えます。</p>` : ''}
      <p class="subtle-note" style="margin:10px 0 0">準備が足りなくても攻略できますが、障害対応や戦利品回収で差が出ます。遠征中はパーティーが自律的に行動します。</p>
    </div></article><div class="dungeon-list">${dungeonCards}${unknownRegionCard}</div></section></div>`;
}

function renderExpedition(state) {
  if (!state.expedition) return state.lastResult ? renderResult(state.lastResult, state) : `<div class="section-head"><div><p class="section-kicker">NO ACTIVE EXPEDITION</p><h2>遠征記録</h2><p>準備ができたら、冒険者を選んだ遠征先へ送りましょう。</p></div></div><div class="card panel"><div class="empty-note">現在、遠征中のパーティーはいません。</div><button class="button button-gold full-button" data-action="nav-party">遠征を準備する　→</button></div>`;
  const expedition = state.expedition;
  const dungeon = getDungeon(expedition.dungeonId || 'old-cave');
  if ((expedition.observationTargetId || 'expedition') !== 'expedition') return renderRemoteObservation(state, expedition, dungeon);
  const runDiscovery = expedition.discovery || { floors: expedition.visitedFloors || [expedition.floor], runs: 0 };
  const narrative = expedition.narrative || { type: 'explore', title: '探索中', description: '冒険者たちは次の通路へ進んでいる。' };
  const isCamp = expedition.phase === 'camp';
  const battle = expedition.currentBattle || null;
  const battleAction = battle?.actions?.[battle.playbackIndex] || null;
  const sideSnapshot = battleAction?.snapshot || (battle && battle.playbackIndex < 0 ? battle.initialSnapshot : null);
  const members = expedition.partyIds.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean);
  const memberStatus = members.map(person => {
    const stats = statsFor(person, state.inventory);
    const playbackUnit = sideSnapshot?.allies.find(unit => unit.id === person.id);
    const hp = playbackUnit?.hp ?? Math.max(0, person.hp);
    const maxHp = playbackUnit?.maxHp ?? stats.maxHp;
    const condition = hp <= 0 ? '戦闘不能' : person.injury || '行動可能';
    return `<div class="field-member">${renderPortrait(person, jobKey(person.job))}<div><strong>${html(person.name)}</strong><small>${jobLabel(person.job)} · ${condition} · 疲労 ${person.fatigue || 0}%</small></div><span class="field-hp">HP ${hp}/${maxHp}</span><div class="meter hp"><span style="width:${pct(hp / maxHp * 100)}"></span></div></div>`;
  }).join('');
  const logEntries = battle?.status === 'playing'
    ? expedition.log.slice(Math.min(battle.logEntryCount || 0, expedition.log.length))
    : expedition.log;
  const logs = logEntries.slice(0, 13).map(entry => `<div class="log-line ${damageClass(entry.tone)}"><time>${html(entry.time)}</time><span class="log-text">${html(entry.text)}</span></div>`).join('');
  const playingBattle = battle?.status === 'playing';
  const actionLabel = playingBattle ? '行動を見守っています…' : isCamp ? '野営を切り上げる　→' : expedition.pendingBattleAdvance ? '戦闘後の探索を続ける　→' : '次の出来事を見る　→';
  const disabled = playingBattle ? 'disabled aria-disabled="true"' : '';
  const currentActionText = battleAction
    ? `${html(battleAction.actorName)}　→　${html(battleAction.targetName)}　·　${html(battleAction.label)}　${battleAction.kind === 'heal' ? `+${battleAction.amount} HP` : `${battleAction.amount} ダメージ`}`
    : battle ? '隊列が向かい合い、戦闘が始まる。' : '';
  const scene = battle
    ? renderBattleArena(state, expedition, members, battle, battleAction)
    : isCamp
      ? renderCampLandscape(members, expedition.floor, state, narrative.campScene)
      : renderExplorationScene(narrative, members, expedition.floor);
  const campStory = isCamp && narrative.campScene && !battle ? renderCampStory(narrative.campScene, members) : '';
  const narrativeHtml = html(narrative.description).replace(/\n/g, '<br>');
  const heading = battle && expedition.pendingCampRaid ? 'CAMP RAID · AUTO BATTLE' : isCamp ? 'CAMP OBSERVATION' : battle ? 'AUTO BATTLE · ACTION PLAYBACK' : 'FIELD REPORT';
  const sceneCaption = battle && expedition.pendingCampRaid ? 'CAMP RAID · 野営地への襲撃' : isCamp ? 'CAMP · 焚き火を囲む仲間たち' : battle ? 'BATTLE · 味方と魔物が対峙' : 'EXPLORATION · 地域を進む';
  const prompt = battle && expedition.pendingCampRaid ? '野営中の対応も冒険者たち自身が判断しています。' : isCamp ? '会話の言葉や、火のそばでの振る舞いを見守りましょう。' : battle ? currentActionText : '戦闘や進退は、冒険者たちが方針に沿って判断します。';
  const surveyPanel = battle
    ? `<details class="card panel survey-current battle-survey" style="margin-top:13px"><summary><strong>今回確認した事実</strong><span class="pill">遠征中</span></summary><p class="subtle-note">遭遇した内容は、結果に関わらず帰還時にギルドへ記録されます。</p>${renderSurveyFacts(runDiscovery)}</details>`
    : `<article class="card panel survey-current" style="margin-top:13px"><div class="panel-head"><h3>今回確認した事実</h3><span class="pill">遠征中</span></div><p class="subtle-note">遭遇した内容は、結果に関わらず帰還時にギルドへ記録されます。</p>${renderSurveyFacts(runDiscovery)}</article>`;
  return `<div class="expedition-top"><div class="expedition-title"><div class="dungeon-emblem">⌖</div><div><h2>${html(dungeon.name)} · 第${expedition.floor}階層</h2><p>${html(dungeon.floorNames[expedition.floor - 1])} · 遠征方針「${policyName(expedition.policy)}」 · ${members.length}人</p></div></div><div class="field-controls"><span class="pill ${isCamp ? 'gold' : ''}">${isCamp ? '野営中' : battle ? '戦闘観戦' : '観戦中'}</span><span class="pill">${expedition.kills}体討伐</span><span class="pill ${expedition.carriedWeight > expedition.carryLimit ? 'gold' : ''}">荷 ${expedition.carriedWeight || 0}/${expedition.carryLimit || 0}</span></div></div>
    <div class="field-layout ${battle ? 'battle-layout' : ''}"><section><article class="card scene-panel"><div class="scene ${isCamp ? 'scene-camp-v02' : battle ? `scene-battle ${['boss', 'rare-boss'].includes(battle.type) ? 'scene-boss-v02' : ''}` : 'scene-explore-v02'}" style="${isCamp ? campBackdropStyle(dungeon.id) : dungeonBackdropStyle(dungeon.id)}">
      <div class="scene-backdrop" aria-hidden="true"></div>
      <div class="scene-hud"><span>EXPEDITION · FLOOR ${String(expedition.floor).padStart(2, '0')}</span><strong>${html(dungeon.floorNames[expedition.floor - 1])}</strong></div>
      ${scene}<div class="scene-caption">${sceneCaption}</div></div>
      <div class="event-card"><div class="event-kicker">${heading}</div><h3>${html(narrative.title)}</h3>${campStory || `<p class="${isCamp ? 'camp-quote' : ''}">${narrativeHtml}</p>`}${battle ? `<div class="combat-action-readout" aria-live="polite"><span class="action-orb ${battleAction?.kind || ''}">${battleAction?.kind === 'heal' ? '✚' : battleAction?.kind === 'spell' ? '✧' : battleAction ? '⚔' : '·'}</span><span>${currentActionText}</span></div>` : ''}<div class="event-footer"><small>${prompt}</small><button class="button button-gold" data-action="advance-expedition" ${disabled}>${actionLabel}</button></div></div></article>
      ${battle ? `<details class="card log-panel battle-log"><summary><h3>遠征ログ <span class="pill">記録 ${expedition.elapsed}</span></h3><small>戦闘の表示領域を広く保つため、ログはここから確認できます。</small></summary><div class="log-list">${logs || '<p class="subtle-note">遠征ログがここに表示されます。</p>'}</div></details>` : `<article class="card log-panel"><h3>遠征ログ <span class="pill">記録 ${expedition.elapsed}</span></h3><div class="log-list">${logs || '<p class="subtle-note">遠征ログがここに表示されます。</p>'}</div></article>`}</section>
      <aside><article class="card expedition-stats"><h3>パーティーの状態</h3>${memberStatus}<div class="subtle-note" style="margin-top:12px">それぞれの職能がどう役立つか、実際の行動とギルド調査記録から見守れます。</div></article>
        ${surveyPanel}</aside></div>`;
}

function renderRemoteObservation(state, expedition, dungeon) {
  const group = expedition.observationGroup;
  const observing = Boolean(group);
  const people = (group?.memberIds || []).map(id => state.adventurers.find(person => person.id === id)).filter(Boolean);
  const feed = (expedition.observationFeed || []).slice(-6).map(entry => `<div class="observer-feed-line"><span>◈</span><p>${html(entry.text)}</p></div>`).join('');
  const members = people.length
    ? `<div class="observer-portraits observer-sprites">${people.map((person, index) => `<div class="remote-observer-unit" style="--sprite-index:${index}">${renderCharacterSprite(person, activityPose(person, group?.type), { facing: index % 2 ? 'left' : 'right' })}<strong>${html(person.name)}</strong><small>${jobLabel(person.job)}</small></div>`).join('')}</div>`
    : observing ? `<div class="empty-note">観察先にいる冒険者はいません。</div>` : '';
  const playing = expedition.currentBattle?.status === 'playing';
  const nextLabel = playing ? (observing ? '使い魔は活動を観察中…' : '時間が進んでいます…') : expedition.pendingBattleAdvance ? '観察を続ける　→' : '時間を進める　→';
  const observerName = group?.label || '使い魔は本部で待機中';
  return `<div class="section-head"><div><p class="section-kicker">${observing ? 'FAMILIAR OBSERVATION · LIVE' : 'EXPEDITION · UNOBSERVED'}</p><h2>${observing ? '観察使い魔の視界' : '観察対象なし'}</h2><p>${observing ? '使い魔は透明なまま、視覚と音だけをギルドへ送っています。遠征隊には干渉しません。' : '今回は使い魔を同行させていません。主遠征隊も他の活動も詳しくは観察されずに進みます。'}</p></div><span class="familiar-token">${observing ? '◈ 観察中' : '◇ 同行なし'}</span></div>
    <div class="remote-observation-grid"><section class="card remote-observation-main"><div class="panel-head"><div><h3>${html(observerName)}</h3><small>${observing ? '観察対象 · 活動開始時に固定' : '現在、観察先はありません'}</small></div><span class="pill ${observing ? 'gold' : ''}">${observing ? '◈ 使い魔同行' : 'ギルドで待機'}</span></div>
      <div class="remote-scene" style="${activityBackdropStyle(group?.type || 'guild')}"><div class="remote-moon">${observing ? '☾' : '◇'}</div>${observing ? '<div class="remote-lantern"></div><div class="remote-table"></div>' : ''}${members}<span class="remote-scene-caption">GUILD DAY ${state.day + 1}</span></div>
      <div class="observer-feed" aria-live="polite">${feed || `<p class="subtle-note">${observing ? 'まだ使い魔から映像は届いていません。次の活動の様子を待ちましょう。' : '観察記録はありません。使い魔はギルドに残っています。'}</p>`}</div>
      <div class="event-footer"><small>${observing ? '同時刻、主遠征隊は別行動中です。こちらからは探索の細部や戦闘状況を確認できません。' : '遠征は自動で進みます。帰還後に簡単な結果だけ確認できます。'}</small><button class="button button-gold" data-action="advance-expedition" ${playing ? 'disabled aria-disabled="true"' : ''}>${nextLabel}</button></div>
    </section><aside class="card remote-report"><span class="pill">主遠征隊</span><h3>${html(dungeon.name)}</h3><p>冒険者たちは観察使い魔の視界の外で、自分たちの判断により探索しています。</p><div class="remote-report-note"><strong>時間は戻りません</strong><span>帰還後に分かるのは到達階層、戦利品、負傷、疲労などの簡単な報告だけです。詳細なログや会話は残りません。</span></div><div class="remote-report-note"><strong>観察の効果</strong><span>使い魔は冒険者や敵に見えず、戦闘・発見・成功率へ影響しません。</span></div></aside></div>`;
}

function renderCampStory(scene, members) {
  const dialogue = scene.dialogue.map((turn, index) => {
    const person = members.find(member => member.id === turn.speakerId);
    return `<div class="camp-turn" style="--turn-index:${index}">${renderPortrait(person || { id: turn.speakerId, name: turn.speakerName }, person ? jobKey(person.job) : '')}<div><strong>${html(turn.speakerName)}</strong><p>「${html(turn.text)}」</p></div></div>`;
  }).join('');
  const narration = scene.narration.map(line => `<p class="camp-narration">${html(line)}</p>`).join('');
  return `<div class="camp-story" aria-label="野営中の会話"><div class="camp-story-rule"><span>火のそばの会話</span><i></i></div>${dialogue}${narration}</div>`;
}

function renderExplorationScene(narrative, members, floor) {
  const icon = narrative.type === 'loot' ? '◇' : narrative.type === 'event' ? '✧' : '⌖';
  const text = `${narrative.title || ''} ${narrative.description || ''}`;
  const trapped = /罠|異常な床|仕掛け/.test(text);
  const chest = /宝箱|鍵付き|箱を/.test(text);
  const party = members.map((person, index) => {
    let pose = narrative.type === 'loot' ? 'open' : 'walk';
    if (trapped && person.job === 'thief') pose = /解除|解いた/.test(text) ? 'disarm' : 'inspect';
    else if (chest && person.job === 'thief') pose = 'open';
    else if (narrative.type === 'danger' && index === 0) pose = 'advance';
    return `<div class="explore-walker ${index % 2 ? 'rear' : ''}" style="--walker-index:${index}">${renderCharacterSprite(person, pose, { facing: 'right' })}<span>${html(person.name)}</span></div>`;
  }).join('');
  const marker = trapped ? '⌁' : narrative.type === 'loot' ? '◇' : narrative.type === 'event' ? '✧' : '⌖';
  return `<div class="explore-illustration"><div class="explore-haze"></div><div class="explore-rock rock-a"></div><div class="explore-rock rock-b"></div><div class="explore-path"></div><div class="explore-event-mark ${trapped ? 'trap-mark' : ''}">${marker}</div><div class="explore-party">${party}</div><span class="explore-depth">FLOOR ${String(floor).padStart(2, '0')}</span></div>`;
}

function activityPose(person, activityType) {
  if (person.hp <= 0) return 'down';
  if (activityType === 'rest') return 'sit';
  if (activityType === 'contract') return 'walk';
  if (activityType === 'gathering') return person.job === 'thief' ? 'inspect' : 'open';
  if (activityType === 'social') return 'talk';
  if (activityType === 'guild') return 'repair';
  if (activityType === 'training') {
    return ({ warrior: 'attack', mage: 'cast', priest: 'heal', thief: 'disarm', archer: 'bow', carrier: 'repair' })[person.job] || 'train';
  }
  return 'idle';
}

function renderBattleArena(state, expedition, members, battle, currentAction) {
  const snapshot = currentAction?.snapshot || (battle.playbackIndex < 0 ? battle.initialSnapshot : battle.actions.at(-1)?.snapshot) || battle.initialSnapshot;
  const actionActor = currentAction?.actorId;
  const actionTarget = currentAction?.targetId;
  const statusByAlly = new Map((snapshot?.allies || []).map(unit => [unit.id, unit]));
  const foes = snapshot?.enemies || [];
  const bossName = foes.find(foe => foe.boss || foe.kind === 'boss')?.name || 'BOSS';
  const hostileLabel = battle.type === 'raid' ? '襲撃者' : '魔物';
  const warriors = members.filter(person => person.job === 'warrior');
  const leader = members.find(person => person.id === expedition.leaderId && person.hp > 0);
  const frontline = warriors.length ? warriors : leader ? [leader] : members.slice(0, 1);
  const frontIds = new Set(frontline.map(person => person.id));
  const backline = members.filter(person => !frontIds.has(person.id));
  const allyUnit = (person, rank) => {
    const unit = statusByAlly.get(person.id) || { hp: person.hp, maxHp: statsFor(person, state.inventory).maxHp, alive: person.hp > 0 };
    const target = actionTarget === person.id;
    const actor = actionActor === person.id;
    const hit = target && ['enemyStrike', 'bossSpecial'].includes(currentAction?.kind);
    const healed = (target || actor) && currentAction?.kind === 'heal';
    const defeated = !unit.alive;
    const animation = defeated ? 'down' : hit ? 'hit' : actor ? (currentAction.kind === 'heal' ? 'heal' : currentAction.kind === 'arrow' ? 'bow' : ['spell', 'holy'].includes(currentAction.kind) ? 'cast' : 'attack') : healed ? 'heal' : 'idle';
    const amount = target ? `<span class="battle-number ${healed ? 'heal' : 'damage'}">${healed ? '+' : '−'}${currentAction.amount}${defeated ? '<small>DOWN</small>' : ''}</span>` : '';
    return `<article class="combat-unit ally-unit ${jobKey(person.job)} ${rank} ${actor ? 'is-acting' : ''} ${target ? 'is-target' : ''} ${hit ? 'took-hit' : ''} ${healed ? 'is-healed' : ''} ${defeated ? 'is-downed' : ''}" data-character-id="${person.id}">
      <div class="unit-rank">${rank === 'front' ? '前衛' : '後衛'}</div><div class="unit-portrait sprite-holder">${renderCharacterSprite(person, animation, { facing: 'right' })}<span class="unit-glint"></span>${amount}</div>
      <div class="unit-name">${html(person.name)}<small>${jobLabel(person.job)} · ${defeated ? '戦闘不能' : person.injury || `疲${person.fatigue || 0}%`}</small></div><div class="unit-health"><span style="width:${pct(unit.hp / unit.maxHp * 100)}"></span></div><div class="unit-hp">${unit.hp} / ${unit.maxHp}</div>
    </article>`;
  };
  const counts = new Map();
  for (const foe of foes) counts.set(foe.name, (counts.get(foe.name) || 0) + 1);
  const foeSeen = new Map();
  const enemyUnits = foes.map(foe => {
    const count = (foeSeen.get(foe.name) || 0) + 1;
    foeSeen.set(foe.name, count);
    const target = actionTarget === foe.id;
    const actor = actionActor === foe.id;
    const defeated = !foe.alive;
    const animation = defeated ? 'down' : target ? 'hit' : actor ? 'attack' : 'idle';
    const amount = target ? `<span class="battle-number damage">−${currentAction.amount}${defeated ? '<small>DOWN</small>' : ''}</span>` : '';
    return `<article class="combat-unit enemy-unit ${foe.boss || foe.kind === 'boss' ? 'boss-unit' : ''} ${actor ? 'is-acting' : ''} ${target ? 'is-target' : ''} ${defeated ? 'is-downed' : ''}" data-enemy-id="${foe.id}">
      <div class="unit-rank">${foe.boss || foe.kind === 'boss' ? 'BOSS' : 'ENEMY'}</div><div class="enemy-portrait sprite-holder ${foe.kind} ${foe.boss ? 'boss' : ''}">${renderEnemySprite(foe, animation)}${amount}</div>
      <div class="unit-name">${html(foe.name)}${counts.get(foe.name) > 1 ? `<small>群れの ${count} 体目 · ${defeated ? '撃破' : '交戦中'}</small>` : `<small>${foe.boss || foe.kind === 'boss' ? '最深部の主' : battle.type === 'raid' ? '野営地への襲撃者' : `${html(getDungeon(expedition.dungeonId).name)}の魔物`} · ${defeated ? '撃破' : '交戦中'}</small>`}</div><div class="unit-health enemy-health"><span style="width:${pct(foe.hp / foe.maxHp * 100)}"></span></div><div class="unit-hp">${foe.hp} / ${foe.maxHp}</div>
    </article>`;
  }).join('');
  const beatLabel = currentAction ? `${html(currentAction.actorName)}　→　${html(currentAction.targetName)}　·　${html(currentAction.label)}` : '戦闘開始';
  const rangedFx = currentAction?.kind === 'arrow' ? 'shot-arrow' : ['spell', 'holy'].includes(currentAction?.kind) ? 'shot-magic' : currentAction?.kind === 'heal' ? 'shot-heal' : currentAction?.kind === 'bossSpecial' ? 'shot-boss' : '';
  const bossBattle = ['boss', 'rare-boss'].includes(battle.type);
  const dense = members.length > 3 || foes.length > 3;
  return `<div class="combat-arena ${bossBattle ? 'boss-arena' : ''} ${dense ? 'dense-arena' : ''} ${rangedFx}" data-ally-count="${members.length}" data-enemy-count="${foes.length}">
    <div class="arena-embers"></div><div class="arena-floor"></div>
    <div class="combat-team allies-team"><div class="team-label"><span>GUILD PARTY</span><strong>冒険者</strong></div><div class="ally-rank rank-front">${frontline.map(person => allyUnit(person, 'front')).join('')}</div>${backline.length ? `<div class="ally-rank rank-back">${backline.map(person => allyUnit(person, 'back')).join('')}</div>` : ''}</div>
    <div class="combat-center ${currentAction ? `beat-${currentAction.kind}` : ''}"><div class="versus-mark">${bossBattle ? html(bossName) : 'VS'}</div><div class="clash-spark">✧</div><div class="battle-particles ${currentAction ? `effect-${currentAction.kind}` : ''}"><i>✦</i><i>✧</i><i>·</i></div><div class="combat-beat-label" aria-live="polite">${beatLabel}</div></div>
    <div class="combat-team enemies-team"><div class="team-label"><span>${bossBattle ? (battle.type === 'rare-boss' ? 'SPECIAL INDIVIDUAL' : 'REGION BOSS') : battle.type === 'raid' ? 'NIGHT RAID' : 'HOSTILES'}</span><strong>${bossBattle ? html(bossName) : hostileLabel}</strong></div><div class="enemy-rank">${enemyUnits}</div></div>
  </div>`;
}

function renderResult(result, state) {
  const outcomePill = result.outcome === 'cleared' ? '調査完了' : result.outcome === 'defeat' ? '緊急帰還' : result.outcome === 'sealed' ? '封印を確認' : '撤退';
  const loot = result.loot.length ? result.loot.map((item, index) => {
    const equipSelect = ['weapon', 'armor'].includes(item.slot)
      ? `<select class="field-select loot-target" data-action="loot-target" data-index="${index}">${state.adventurers.map(person => `<option value="${person.id}" ${(state.lastResult?.lootTargets?.[index] || state.party[0]) === person.id ? 'selected' : ''}>${html(person.name)}</option>`).join('')}</select>` : '';
    const choices = item.resolved
      ? `<span class="pill gold">${html(item.resolved)}</span>`
      : `<div class="loot-choice-actions"><button class="button button-secondary" data-action="loot-choice" data-index="${index}" data-choice="store">保管</button>${equipSelect ? `<button class="button button-secondary" data-action="loot-choice" data-index="${index}" data-choice="equip">装備</button>` : ''}<button class="button button-secondary" data-action="loot-choice" data-index="${index}" data-choice="sell">売却 ${Number(item.value || 10)}G</button><button class="button button-gold" data-action="loot-choice" data-index="${index}" data-choice="donate">国へ納品 +${Number(item.guildValue || 6)}pt</button></div>`;
    return `<div class="loot-item loot-item-v03"><div class="loot-main"><strong>${html(item.name)} <span class="pill ${item.rarity === 'rare' ? 'gold' : ''}">${slotName(item.slot)}</span></strong><small>${html(item.note || '')} · 重さ ${Number(item.weight || 1)} · 売却 ${Number(item.value || 10)}G · 納品 ${Number(item.guildValue || 6)}pt</small></div><div class="loot-resolution">${choices}</div></div>`;
  }).join('') : '<p class="result-note">戦利品はありませんでした。経験は次の遠征に活きます。</p>';
  const pendingLoot = result.loot.some(item => !item.resolved);
  const kills = result.observed
    ? (result.defeated.length ? result.defeated.slice(0, 10).join('、') + (result.defeated.length > 10 ? ' …' : '') : '討伐記録なし')
    : result.kills ? `${result.kills}体を討伐（個別の記録なし）` : '討伐記録なし';
  const level = result.levelUps.length ? result.levelUps.map(item => `${html(item.name)}がLv.${item.level}に上がりました`).join('。') : '今回はレベルアップなし';
  const injuries = result.injuries.length ? result.injuries.map(item => `${html(item.name)}：${html(item.kind)}`).join('、') : '負傷者はいません';
  const relation = result.relationHints.length ? result.relationHints.join('<br>') : '仲間同士の関係に目立った変化はありませんでした。';
  const unlockNotices = (state.guildNotices || []).map(notice => `<div class="unlock-notice"><div><strong>${html(notice.title)}</strong><small>${html((notice.details || []).join('・'))}</small></div><button class="text-link" data-action="dismiss-notice" data-notice="${html(notice.id)}">確認</button></div>`).join('');
  const party = result.partyIds?.length
    ? result.partyIds.map(id => state.adventurers.find(person => person.id === id)).filter(Boolean)
    : (result.partyNames || []).map(name => state.adventurers.find(person => person.name === name)).filter(Boolean);
  const crew = party.length ? `<div class="result-crew">${party.map(person => `<div>${renderPortrait(person, jobKey(person.job))}<span>${html(person.name)}</span></div>`).join('')}</div>` : '';
  const timeEvents = [
    ...(result.economicEvents || []).map(event => `<div class="unlock-notice"><div><strong>${html(event.title)}</strong><small>${html((event.details || []).join('・'))}</small></div></div>`),
    ...(result.departures || []).map(text => `<div class="unlock-notice"><div><strong>ギルドを去った冒険者</strong><small>${html(text)}</small></div></div>`)
  ].join('');
  const autonomous = (result.autonomousActivities || []).map(item => `<div class="recent-item"><span class="recent-mark">⌂</span><div><strong>${html(item.label)}</strong><small>${html(item.summary)}</small></div></div>`).join('');
  const fatigue = (result.fatigueChanges || []).map(item => `${html(item.name)} ${item.before}% → ${item.after}%（基本 +${item.basic || 0}${item.damage ? `・被害 +${item.damage}` : ''}${item.equipment ? `・装備重量 +${item.equipment}` : ''}${item.honor ? `・二つ名技能 −${item.honor}` : ''}）`).join('、') || '記録なし';
  const raids = (result.raidReports || []).map(report => `<div class="recent-item"><span class="recent-mark">☾</span><div><strong>${html(report.label)} · 野営中の襲撃</strong><small>${html(report.summary)}</small></div></div>`).join('');
  const discoveryReport = result.observed
    ? renderNewDiscoveries(result.discoveries)
    : `<p class="result-note">使い魔は別の活動に同行しました。未観察の遠征ログや遭遇の細部は後から再生できません。</p>${result.discoveries?.externalThreats?.length ? `<div class="survey-new-row"><small>帰還時に確認した外部脅威</small><strong>${html(result.discoveries.externalThreats.join('・'))}</strong></div>` : ''}`;
  const bossAwards = result.bossAwards?.length ? `<section class="trial-honors"><div class="honors-seal">✧</div><div><p class="section-kicker">A NAME CARVED IN THE RECORD</p><h3>迷宮の守護者を討伐</h3><p>生還した討伐隊に、ギルドの記録へ残る二つ名と固有技能が刻まれました。</p><div class="honor-award-list">${result.bossAwards.map(award => `<div><strong>「${html(award.epithet)}」 ${html(award.adventurer)}</strong><small>${html(award.skill)} · ${html(award.description)}</small></div>`).join('')}</div></div></section>` : '';
  return `<div class="section-head"><div><p class="section-kicker">EXPEDITION REPORT · DAY ${result.day}</p><h2>帰還報告</h2><p>今回の遠征で得たものを記録しました。</p></div><span class="pill ${result.outcome === 'cleared' ? 'gold' : result.outcome === 'sealed' ? '' : 'red'}">${outcomePill}</span></div>
    <article class="card result-card"><div class="result-banner"><div class="result-seal">${result.outcome === 'cleared' ? '✧' : '↩'}</div><div><h2>${html(result.title)}</h2><p>${html(result.reason)}</p></div></div>
      ${bossAwards}
      ${unlockNotices ? `<section class="guild-notices">${unlockNotices}</section>` : ''}
      ${timeEvents ? `<section class="guild-notices">${timeEvents}</section>` : ''}
      ${crew}
      <div class="result-grid"><div class="result-stat"><small>到達階層</small><strong>第${result.reachedFloor}階層${result.outcome === 'cleared' && result.floors ? ` · 全${result.floors}階層` : ''}</strong></div><div class="result-stat"><small>討伐した敵</small><strong>${result.kills}<small style="font-size:10px">体</small></strong></div><div class="result-stat"><small>獲得経験値（各人）</small><strong>${result.xp}</strong></div><div class="result-stat"><small>持ち帰った重さ</small><strong>${result.carriedWeight || 0}<small style="font-size:10px"> / ${result.carryLimit || 0}</small></strong></div></div>
      <div class="result-columns"><section class="result-section result-loot-section"><h3>戦利品の扱いを決める</h3><p class="subtle-note">保管品は装備画面で使えます。売却は所持金、納品はギルドの成長に役立ちます。</p><div class="loot-list">${loot}</div></section><section class="result-section"><h3>${result.observed ? '今回の遠征で確認した事実' : '帰還した冒険者からの概要'}</h3>${discoveryReport}</section>${raids ? `<section class="result-section"><h3>野営中の外部脅威</h3><div class="recent-list">${raids}</div></section>` : ''}<section class="result-section"><h3>討伐記録</h3><p class="result-note">${html(kills)}</p></section><section class="result-section"><h3>成長・負傷・疲労</h3><p class="result-note">${html(level)}<br>${injuries}<br>疲労：${fatigue}</p></section><section class="result-section"><h3>仲間たちの様子</h3><p class="result-note">${relation}</p></section>${autonomous ? `<section class="result-section"><h3>他の冒険者の活動報告</h3><div class="recent-list">${autonomous}</div></section>` : ''}</div>
      <div class="event-footer"><small>${pendingLoot ? '戦利品ごとに保管・売却・納品を決めてください。' : `所持金 ${state.gold || 0}G · 公認ポイント ${state.guildContribution || 0}`}</small><div class="hero-actions"><button class="button button-secondary" data-action="result-warehouse" ${pendingLoot ? 'disabled title="戦利品の扱いを決めてください"' : ''}>倉庫を確認</button><button class="button button-secondary" data-action="result-home" ${pendingLoot ? 'disabled title="戦利品の扱いを決めてください"' : ''}>ギルド本部へ</button><button class="button button-gold" data-action="result-prepare" ${pendingLoot ? 'disabled title="戦利品の扱いを決めてください"' : ''}>次の遠征を準備　→</button></div></div>
    </article>`;
}

function itemStatsText(item) {
  if (item.slot === 'weapon') return `攻撃 +${Number(item.attack || 0)}${item.heal ? ` · 回復 +${item.heal}` : ''}`;
  if (item.slot === 'armor') return `防御 +${Number(item.defense || 0)}`;
  return item.note || '売却または国への納品に使えます。';
}

function renderWarehouse(state) {
  const filter = state.warehouseFilter || 'all';
  const groups = warehouseGroups(state, filter);
  const tabs = WAREHOUSE_CATEGORIES.map(category => `<button class="warehouse-tab ${category.id === filter ? 'active' : ''}" data-action="warehouse-filter" data-filter="${category.id}" aria-pressed="${category.id === filter}">${category.label}</button>`).join('');
  const rows = groups.length ? groups.map((group, index) => {
    const { item } = group;
    const canManage = group.available.length > 0;
    const inputId = `warehouse-count-${index}`;
    const equipped = group.equippedOwners.size ? `<span class="pill blue">装備中：${html([...group.equippedOwners].join('・'))}</span>` : '';
    const protectedItem = Boolean(item.protected || item.slot === 'key');
    const use = protectedItem ? (state.trialSealDiscovered ? '封印解除に関わる刻印片。倉庫に保管します' : '用途不明の重要品。売却・納品はできません') : ['weapon', 'armor'].includes(item.slot) ? '全職業の装備枠に使用可能' : item.slot === 'material' ? '素材交換・売却・国への納品に使用可能' : '倉庫から売却・納品できます';
    const actions = protectedItem ? '<small class="warehouse-equipped-note">重要品は売却・納品できません。</small>' : canManage ? `<div class="warehouse-actions"><label class="warehouse-quantity">数量 <input id="${inputId}" type="number" min="1" max="${group.available.length}" value="1" aria-label="${html(item.name)}の操作数量"></label><button class="button button-secondary button-small" data-action="warehouse-sell" data-stack="${group.key}" data-input="${inputId}">売却</button><button class="button button-gold button-small" data-action="warehouse-donate" data-stack="${group.key}" data-input="${inputId}">国へ納品</button></div>` : '<small class="warehouse-equipped-note">所持品はすべて装備中です。装備解除後に操作できます。</small>';
    return `<article class="warehouse-item"><div class="warehouse-item-main"><div class="warehouse-item-title"><strong>${html(item.name)}</strong><span class="pill ${item.rarity === 'rare' ? 'gold' : ''}">${slotName(item.slot)}</span><span class="warehouse-count">×${group.items.length}</span></div><p>${html(item.note || 'ギルドが保管している品物。')}</p><div class="warehouse-item-meta"><span>${html(itemStatsText(item))}</span><span>${use}</span>${protectedItem ? '<span>売却不可 · 納品不可</span>' : `<span>売却 ${Math.max(1, Number(item.value || 10))}G / 個</span><span>納品 +${Math.max(1, Number(item.guildValue || 6))}pt / 個</span>`}<span>重さ ${Number(item.weight || 1)}</span>${equipped}</div></div>${actions}</article>`;
  }).join('') : '<div class="empty-note">この分類の品物は倉庫にありません。</div>';
  const recipes = MATERIAL_EXCHANGES.map(recipe => {
    const output = recipe.name;
    const ingredients = recipe.costs.map(cost => `${html(cost.name)} ×${cost.qty}`).join(' ＋ ');
    const ready = materialExchangeStatus(state, recipe);
    return `<article class="exchange-recipe"><div><strong>${html(output)}</strong><small>${ingredients} → ${html(output)}</small></div><button class="button button-secondary button-small" data-action="warehouse-exchange" data-recipe="${recipe.id}" ${ready ? '' : 'disabled'}>素材を交換</button></article>`;
  }).join('');
  const history = (state.financeHistory || []).slice(0, 10).map(entry => `<div class="finance-row"><span>第${Number(entry.day || 1)}日</span><strong>${html(entry.label)}</strong><b class="${entry.delta > 0 ? 'positive' : entry.delta < 0 ? 'negative' : ''}">${entry.delta > 0 ? '+' : ''}${Number(entry.delta || 0).toLocaleString('ja-JP')}G</b></div>`).join('') || '<p class="subtle-note">この記録を始めてからの収支履歴はまだありません。</p>';
  const upkeep = nextUpkeepInfo(state);
  return `<div class="section-head"><div><p class="section-kicker">GUILD WAREHOUSE</p><h2>ギルド倉庫</h2><p>保管品の売却・納品と素材交換を行えます。装備中の品は売却できません。</p></div><span class="pill">${(state.inventory || []).length}点を保管・装備中</span></div>
    <section class="warehouse-treasury"><div><small>ギルド金庫</small><strong>${Number(state.gold || 0).toLocaleString('ja-JP')}G</strong><span>公認ポイント ${Number(state.guildContribution || 0).toLocaleString('ja-JP')} · ギルド Lv.${state.guildLevel || 1}</span></div><div><small>次回維持費</small><strong>${upkeep.amount}G</strong><span>第${upkeep.day}日（あと${upkeep.daysRemaining}日）</span></div></section>
    <div class="warehouse-layout"><section class="card warehouse-panel"><div class="warehouse-tabs" role="tablist" aria-label="倉庫の分類">${tabs}</div><div class="warehouse-list">${rows}</div></section>
      <aside class="warehouse-side"><section class="card warehouse-panel"><div class="panel-head"><div><h3>町の工房・素材交換</h3><small>素材を渡すと完成品を受け取れます。</small></div><span class="pill">簡易交換</span></div><div class="exchange-list">${recipes}</div><p class="subtle-note">素材は交換のほか、売却や国への納品にも使えます。</p></section><section class="card warehouse-panel"><div class="panel-head"><h3>金庫の収支履歴</h3><span class="pill">直近10件</span></div><div class="finance-list">${history}</div></section></aside></div>`;
}

function renderGuild(state) {
  const level = Math.max(1, state.guildLevel || 1);
  const thresholds = [0, 35, 110, 240, 420];
  const next = level >= 5 ? 420 : thresholds[level];
  const previous = thresholds[level - 1] || 0;
  const progress = level >= 5 ? 100 : Math.max(0, Math.min(100, (state.guildContribution - previous) / Math.max(1, next - previous) * 100));
  const hires = availableRecruits(state);
  const unlockedJobs = state.unlockedJobs || ['warrior', 'mage', 'priest'];
  const roles = unlockedJobs.map(jobId => {
    const role = JOBS[jobId];
    if (!role) return '';
    const joined = state.adventurers.some(person => person.job === jobId);
    return `<div class="guild-role"><div><strong>${html(role.name)}</strong><small>${html(role.description)}</small></div><span class="pill ${joined ? 'gold' : ''}">${joined ? '加入中' : '候補から採用'}</span></div>`;
  }).join('');
  const hasUnregisteredProfessions = unlockedJobs.length < Object.keys(JOBS).length;
  const unknownProfession = hasUnregisteredProfessions ? `<div class="guild-role locked"><div><strong>未登録職業</strong><small>新たな職能の登録状況は、公認ランクの更新時に確認できます。</small></div><span class="pill">未確認</span></div>` : '';
  const shop = SHOP_ITEMS.map(item => `<div class="shop-item"><div><strong>${html(item.name)}</strong><small>${slotName(item.slot)} · ${item.slot === 'weapon' ? `攻撃 +${item.attack}` : `防御 +${item.defense}`} · 重さ ${item.weight}</small></div><button class="button button-secondary" data-action="buy-item" data-item="${item.template}" ${state.gold < item.price ? 'disabled' : ''}>${item.price}G</button></div>`).join('');
  const notices = (state.guildNotices || []).map(notice => `<div class="unlock-notice"><div><strong>${html(notice.title)}</strong><small>${html((notice.details || []).join('・'))}</small></div><button class="text-link" data-action="dismiss-notice" data-notice="${html(notice.id)}">確認</button></div>`).join('');
  const economyNotices = [...(state.departureNotices || []), ...(state.economicNotices || [])].map(notice => `<div class="unlock-notice"><div><strong>${html(notice.title)}</strong><small>${html((notice.details || []).join('・'))}</small></div><button class="text-link" data-action="dismiss-economic" data-notice="${html(notice.id)}">確認</button></div>`).join('');
  const candidateCards = hires.map(candidate => {
    const candidateStats = statsFor(candidate, [...state.inventory, ...(candidate.equipment || [])]);
    return `<article class="recruit-candidate"><div class="recruit-candidate-head">${renderPortrait(candidate, jobKey(candidate.job))}<div><strong>${html(candidate.name)}</strong><small>${html(JOBS[candidate.job]?.name || '冒険者')} · Lv.${candidate.level}</small></div><span class="pill">${html(candidate.personality)}</span></div><p>${html(candidate.quirk)}</p><div class="candidate-stats"><span>HP ${candidateStats.maxHp}</span><span>攻 ${candidateStats.attack}</span><span>守 ${candidateStats.defense}</span></div><button class="button button-secondary full-button" data-action="recruit" data-candidate="${html(candidate.id)}" ${state.gold < candidate.cost ? 'disabled' : ''}>${candidate.cost}Gで採用</button></article>`;
  }).join('');
  const canRecruit = !hires.length && Number(state.day || 1) >= Number(state.recruitmentReadyOn || 1);
  const recruitmentPanel = `<article class="card guild-panel recruitment-panel"><div class="panel-head"><div><h3>冒険者募集</h3><small>候補は毎回3人。採用できるのは1人です。</small></div><span class="pill gold">登録費用 ${hires.length ? `${Math.min(...hires.map(person => person.cost))}〜${Math.max(...hires.map(person => person.cost))}G` : '個別表示'}</span></div>${hires.length
      ? `<div class="recruit-candidate-grid">${candidateCards}</div><div class="event-footer"><small>採用しなかった候補は今回の募集終了時に去ります。</small><button class="button button-quiet" data-action="recruit-dismiss">今回は見送る</button></div>`
      : `<div class="recruit-empty"><p>${canRecruit ? '新しい候補を探せます。解禁済み職業から個性の異なる3人が集まります。' : `次の募集は第${state.recruitmentReadyOn}日からです。`}</p><button class="button button-gold" data-action="recruit-refresh" ${canRecruit ? '' : 'disabled'}>3人の候補を探す</button></div>`}</article>`;
  const unlockedDungeons = Object.values(DUNGEONS).filter(dungeon => (state.unlockedDungeons || ['old-cave']).includes(dungeon.id));
  const surveyCards = unlockedDungeons.map(dungeon => {
    const record = getSurveyRecord(state, dungeon.id);
    return `<details class="survey-entry"><summary><span><strong>${html(dungeon.name)}</strong><small>確認した事実を表示</small></span><span class="pill gold">${surveyProgressLabel(record)}</span></summary>${renderSurveyFacts(record)}</details>`;
  }).join('');
  const unknownRegion = unlockedDungeons.length < Object.keys(DUNGEONS).length
    ? `<div class="guild-dungeon locked"><strong>未確認地域</strong><small>王国からの調査許可を待っています。</small><span class="pill">不明</span></div>`
    : '';
  const bossRecords = (state.trialBossRecords || []).map(record => `<article class="trial-record-entry"><div><strong>第${Number(record.day || 1)}日 · ${html(record.boss || '迷宮の守護者')}を討伐</strong><small>${html((record.partyNames || []).join('、'))}</small></div><div class="trial-record-honors">${(record.honors || []).map(honor => `<span>「${html(honor.epithet)}」 ${html(honor.adventurer)} · ${html(honor.skill)}</span>`).join('')}</div></article>`).join('');
  const bossRecordPanel = bossRecords ? `<article class="card guild-panel trial-record-panel"><div class="panel-head"><h3>迷宮討伐のギルド記録</h3><span class="pill gold">恒久記録</span></div><div class="trial-record-list">${bossRecords}</div></article>` : '';
  return `<div class="section-head"><div><p class="section-kicker">GUILD CHARTER</p><h2>ギルド管理</h2><p>国へ品を納め、公認を得ると人材や遠征許可が段階的に広がります。</p></div><span class="pill gold">ギルド Lv.${level}</span></div>
    <section class="guild-hall-banner card" style="${guildBackdropStyle(level)}"><div><span>THE ADVENTURERS' GUILD</span><strong>${level >= 4 ? '広がる冒険者ギルド' : '冒険者ギルド本部'}</strong><small>${level >= 4 ? '公認を重ね、受付と掲示板が整えられた。' : '木と石で築かれた、遠征の記録が集まる場所。'}</small></div></section>
    ${notices || economyNotices ? `<section class="guild-notices">${notices}${economyNotices}</section>` : ''}
    <div class="guild-overview"><article class="card guild-progress-card"><div class="panel-head"><h3>国の公認とギルド成長</h3><span class="pill">所持金 ${state.gold || 0}G</span></div><div class="guild-level-line"><strong>ギルド Lv.${level}</strong><span>${level >= 5 ? '最高位に到達' : `${state.guildContribution || 0} / ${next} 公認ポイント`}</span></div><div class="meter guild-meter"><span style="width:${progress}%"></span></div><p>${level >= 5 ? '国から十分な信頼を得ました。' : `次の昇格まであと ${Math.max(0, next - (state.guildContribution || 0))} ポイント。戦利品の納品で加算されます。`}</p><div class="guild-unlocks"><span>現在のパーティー上限 ${partyLimitForLevel(level)}人</span><span>遠征許可 ${unlockedDungeons.length}地域</span><span>登録冒険者 ${state.adventurers.length}人</span><span>次回維持費 ${nextUpkeepLabel(state)}</span></div></article>
      <article class="card guild-panel"><div class="panel-head"><h3>職業登録</h3><span class="pill">現在確認できる職能</span></div><div class="guild-role-list">${roles}${unknownProfession}</div></article></div>
    <div class="guild-columns"><div class="guild-column-stack">${recruitmentPanel}<article class="card guild-panel"><div class="panel-head"><h3>ギルド調査記録</h3><button class="text-link" data-action="nav-party">遠征準備へ</button></div><p class="subtle-note">冒険者が実際に持ち帰った情報だけを記録しています。</p><div class="survey-record-list">${surveyCards}${unknownRegion}</div></article>${bossRecordPanel}</div><article class="card guild-panel"><div class="panel-head"><h3>補給品の売店</h3><span class="pill">売却益を装備に</span></div><div class="shop-list">${shop}</div></article></div>`;
}
