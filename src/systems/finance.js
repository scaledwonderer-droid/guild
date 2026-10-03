export function recordFinance(state, delta, label, day = state.day) {
  state.financeHistory ||= [];
  state.financeHistory.unshift({ day: Number(day || 1), delta: Math.floor(Number(delta || 0)), label: String(label || '収支') });
  state.financeHistory = state.financeHistory.slice(0, 50);
}

