import { createInitialState, loadGame, saveGame } from './systems/save.js';
import { startExpedition, advanceExpedition, restAtGuild } from './systems/expedition.js';
import { buyShopItem, recruitAdventurer, resolveLootChoice, refreshRecruitment, dismissRecruitment } from './systems/guild.js';
import { takeActivityDay, advanceObservedActivity } from './systems/time.js';
import { render } from './ui/render.js';
import { donateWarehouseItems, exchangeMaterials, sellWarehouseItems } from './systems/warehouse.js';
import { unlockTrialSeal } from './systems/trial.js';

let { state, loaded, corrupted, migrated } = loadGame();
const view = document.querySelector('#view');
const toast = document.querySelector('#toast');
let toastTimer;
let battlePlaybackTimer = null;
let activeBattlePlaybackId = null;

function persist() {
  const saved = saveGame(state);
  const status = document.querySelector('#save-status');
  status.textContent = saved ? '自動保存有効' : '保存に失敗';
  return saved;
}

function refresh({ persistState = true } = {}) {
  if (persistState) persist();
  render(state);
  continueBattlePlayback();
}

function continueBattlePlayback() {
  const battle = state.expedition?.currentBattle;
  if (!battle || battle.status !== 'playing') {
    clearTimeout(battlePlaybackTimer);
    battlePlaybackTimer = null;
    activeBattlePlaybackId = null;
    return;
  }
  if (activeBattlePlaybackId === battle.id) return;
  clearTimeout(battlePlaybackTimer);
  activeBattlePlaybackId = battle.id;
  const battleId = battle.id;
  const showNextBeat = () => {
    const current = state.expedition?.currentBattle;
    if (!current || current.id !== battleId || current.status !== 'playing') {
      battlePlaybackTimer = null;
      activeBattlePlaybackId = null;
      return;
    }
    if (current.playbackIndex + 1 < current.actions.length) {
      current.playbackIndex++;
      if (state.expedition?.observationTargetId && state.expedition.observationTargetId !== 'expedition') advanceObservedActivity(state.expedition);
      persist();
      render(state);
      battlePlaybackTimer = setTimeout(showNextBeat, 690);
      return;
    }
    current.status = 'finished';
    if (state.expedition?.narrative) {
      state.expedition.narrative.title = current.displayTitle;
      state.expedition.narrative.description = current.displayDescription;
      if (!current.victory) state.expedition.narrative.type = 'danger';
    }
    battlePlaybackTimer = null;
    activeBattlePlaybackId = null;
    persist();
    render(state);
  };
  battlePlaybackTimer = setTimeout(showNextBeat, 260);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function activityNotice(response) {
  const details = [
    response.result?.economic?.details?.join(' '),
    ...(response.result?.departures || [])
  ].filter(Boolean);
  return [response.message, ...details].join(' ');
}

function navigate(screen) {
  if (state.expedition && screen !== 'expedition') {
    notify('遠征中です。記録と仲間の状態は観戦画面に表示しています。');
    return;
  }
  state.screen = screen;
  refresh();
}

function beginNewGame() {
  state = createInitialState();
  state.screen = 'home';
  persist();
  render(state);
  continueBattlePlayback();
  notify('新しいギルドの記録を始めました。');
}

const app = document.querySelector('#app');

app.addEventListener('click', event => {
  try {
  // #view also carries data-screen as a styling hook; only real nav controls count here.
  const navButton = event.target.closest('.nav-item[data-screen]');
  if (navButton) {
    event.preventDefault();
    navigate(navButton.dataset.screen);
    return;
  }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action.startsWith('nav-')) {
    navigate(action.slice(4));
  } else if (action === 'start-expedition') {
    const response = startExpedition(state, state.selectedDungeonId);
    if (!response.ok) notify(response.message);
    else notify('遠征を開始しました。冒険者たちを見守りましょう。');
    refresh();
  } else if (action === 'advance-expedition') {
    const response = advanceExpedition(state);
    if (!response.ok) notify(response.message);
    else if (state.lastResult) notify(`遠征終了：${state.lastResult.title}`);
    refresh();
  } else if (action === 'rest') {
    const response = restAtGuild(state, control.dataset.person || '');
    notify(activityNotice(response));
    refresh();
  } else if (action === 'adventurer-activity') {
    const response = control.dataset.activity === 'rest'
      ? restAtGuild(state, control.dataset.person)
      : takeActivityDay(state, control.dataset.activity, control.dataset.person);
    notify(activityNotice(response));
    refresh();
  } else if (action === 'recruit-refresh') {
    const response = refreshRecruitment(state);
    notify(response.message);
    refresh();
  } else if (action === 'recruit-dismiss') {
    const response = dismissRecruitment(state);
    notify(response.message);
    refresh();
  } else if (action === 'manual-save') {
    if (persist()) notify('ギルドの記録を保存しました。');
    else notify('保存できませんでした。ブラウザの保存領域を確認してください。');
  } else if (action === 'result-home') {
    state.screen = 'home';
    refresh();
  } else if (action === 'result-prepare') {
    state.screen = 'party';
    refresh();
  } else if (action === 'result-warehouse') {
    state.screen = 'warehouse';
    refresh();
  } else if (action === 'warehouse-filter') {
    state.warehouseFilter = control.dataset.filter || 'all';
    refresh();
  } else if (action === 'warehouse-sell' || action === 'warehouse-donate') {
    const quantity = Math.max(1, Number(document.getElementById(control.dataset.input)?.value || 1));
    const execute = confirmed => action === 'warehouse-sell'
      ? sellWarehouseItems(state, control.dataset.stack, quantity, confirmed)
      : donateWarehouseItems(state, control.dataset.stack, quantity, confirmed);
    let response = execute(false);
    if (response.confirmationRequired && window.confirm(response.message)) response = execute(true);
    else if (response.confirmationRequired) return;
    notify(response.message);
    refresh();
  } else if (action === 'warehouse-exchange') {
    const response = exchangeMaterials(state, control.dataset.recipe, Number(document.getElementById(control.dataset.input)?.value || 1));
    notify(response.message);
    refresh();
  } else if (action === 'select-dungeon') {
    state.selectedDungeonId = control.dataset.dungeon;
    refresh();
  } else if (action === 'trial-unlock-seal') {
    const response = unlockTrialSeal(state);
    notify(response.message);
    refresh();
  } else if (action === 'recruit') {
    const response = recruitAdventurer(state, control.dataset.candidate);
    notify(response.message);
    refresh();
  } else if (action === 'buy-item') {
    const response = buyShopItem(state, control.dataset.item);
    notify(response.message);
    refresh();
  } else if (action === 'loot-choice') {
    const index = Number(control.dataset.index);
    const target = state.lastResult?.lootTargets?.[index] || state.party[0] || state.adventurers[0]?.id;
    const response = resolveLootChoice(state, index, control.dataset.choice, target);
    if (response.ok) notify(response.message);
    else notify(response.message);
    refresh();
  } else if (action === 'dismiss-notice') {
    state.guildNotices = (state.guildNotices || []).filter(notice => notice.id !== control.dataset.notice);
    refresh();
  } else if (action === 'dismiss-economic') {
    state.economicNotices = (state.economicNotices || []).filter(notice => notice.id !== control.dataset.notice);
    state.departureNotices = (state.departureNotices || []).filter(notice => notice.id !== control.dataset.notice);
    refresh();
  }
  } catch (error) {
    console.error('画面操作に失敗しました。', error);
    notify('操作を完了できませんでした。画面を再読み込みして、もう一度お試しください。');
  }
}, true);

app.addEventListener('change', event => {
  try {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  if (control.dataset.action === 'party-member') {
    const personId = control.value;
    if (control.checked && !state.party.includes(personId)) {
      const partyLimit = state.guildLevel >= 5 ? 5 : state.guildLevel >= 3 ? 4 : 3;
      if (state.party.length >= partyLimit) {
        control.checked = false;
        notify(`現在のパーティー上限は${partyLimit}人です。`);
        return;
      }
      state.party.push(personId);
      if (!state.adventurers.find(person => person.id === state.leaderId && state.party.includes(person.id))) state.leaderId = personId;
    } else if (!control.checked) {
      state.party = state.party.filter(id => id !== personId);
      if (state.leaderId === personId) state.leaderId = state.party[0] || '';
    }
    refresh();
  } else if (control.dataset.action === 'leader') {
    state.leaderId = control.value;
    refresh();
  } else if (control.dataset.action === 'policy') {
    state.policy = control.value;
    refresh();
  } else if (control.dataset.action === 'observation-choice') {
    state.observationChoice = control.value;
    refresh();
  } else if (control.dataset.action === 'equip') {
    const person = state.adventurers.find(item => item.id === control.dataset.person);
    if (person && (control.dataset.slot === 'weapon' || control.dataset.slot === 'armor')) {
      person[control.dataset.slot] = control.value;
      refresh();
    }
  } else if (control.dataset.action === 'loot-target') {
    state.lastResult.lootTargets ||= {};
    state.lastResult.lootTargets[control.dataset.index] = control.value;
    refresh();
  }
  } catch (error) {
    console.error('入力の反映に失敗しました。', error);
    notify('入力を反映できませんでした。画面を再読み込みして、もう一度お試しください。');
  }
}, true);

const dialog = document.querySelector('#confirm-dialog');
document.querySelector('#new-game').addEventListener('click', () => {
  document.querySelector('#dialog-title').textContent = 'ニューゲームを始めますか？';
  document.querySelector('#dialog-copy').textContent = '現在の冒険者、装備、遠征記録を初期状態に戻します。新しい記録を始める場合は実行してください。';
  dialog.showModal();
});
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'confirm') beginNewGame();
});

if (!loaded || migrated) persist();
render(state);
continueBattlePlayback();
if (corrupted) notify('保存データを読み込めなかったため、新しい記録を開始しました。');
else if (loaded) notify(state.expedition ? '保存した遠征の続きから再開しました。' : 'ギルドの記録を読み込みました。');
