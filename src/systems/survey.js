const FACT_FIELDS = ['enemies', 'hazards', 'statusEffects', 'environments', 'skills', 'equipment', 'loot', 'bosses', 'specialBosses', 'routes', 'sealedRooms', 'events', 'externalThreats'];

export function createSurveyRecord() {
  return {
    runs: 0,
    lastOutcome: null,
    floors: [],
    enemies: [],
    hazards: [],
    statusEffects: [],
    environments: [],
    skills: [],
    equipment: [],
    loot: [],
    bosses: [],
    specialBosses: [],
    routes: [],
    sealedRooms: [],
    events: [],
    externalThreats: []
  };
}

export function createExpeditionDiscovery(firstFloor = 1) {
  const discovery = createSurveyRecord();
  discovery.floors = firstFloor ? [firstFloor] : [];
  delete discovery.runs;
  delete discovery.lastOutcome;
  return discovery;
}

export function ensureSurveyRecords(state) {
  state.surveyRecords ||= {};
  for (const id of state.unlockedDungeons || ['old-cave']) {
    state.surveyRecords[id] = normalizeRecord(state.surveyRecords[id]);
  }
  return state.surveyRecords;
}

export function getSurveyRecord(state, dungeonId) {
  return normalizeRecord(state.surveyRecords?.[dungeonId]);
}

export function recordDiscovery(expedition, field, value) {
  if (!FACT_FIELDS.includes(field) && field !== 'floors') return;
  if (value === null || value === undefined || value === '') return;
  expedition.discovery ||= createExpeditionDiscovery();
  const values = Array.isArray(value) ? value : [value];
  const current = new Set(expedition.discovery[field] || []);
  for (const entry of values) current.add(field === 'floors' ? Number(entry) : String(entry));
  expedition.discovery[field] = [...current].sort(field === 'floors' ? (a, b) => a - b : (a, b) => String(a).localeCompare(String(b), 'ja'));
}

export function mergeExpeditionSurvey(state, expedition, outcome, options = {}) {
  ensureSurveyRecords(state);
  const record = state.surveyRecords[expedition.dungeonId] ||= createSurveyRecord();
  const discovery = normalizeRecord(expedition.discovery);
  const fields = options.summaryOnly ? ['floors', 'externalThreats'] : ['floors', ...FACT_FIELDS];
  for (const field of fields) {
    record[field] = mergeUnique(record[field], discovery[field]);
  }
  record.runs = (record.runs || 0) + 1;
  record.lastOutcome = outcome;
  return { ...record, floors: [...record.floors], ...Object.fromEntries(FACT_FIELDS.map(field => [field, [...record[field]]])) };
}

export function surveyProgressLabel(record) {
  const facts = FACT_FIELDS.reduce((count, field) => count + (record?.[field]?.length || 0), 0);
  const floorCount = record?.floors?.length || 0;
  if (!record?.runs && !floorCount) return '未調査';
  if (floorCount <= 1 && facts <= 1) return '調査開始';
  if (floorCount <= 2 && facts <= 4) return '一部判明';
  if (floorCount >= 5 && (record?.bosses?.length || 0) > 0) return '詳細判明';
  return '調査進行';
}

function normalizeRecord(record) {
  const normalized = createSurveyRecord();
  if (!record || typeof record !== 'object') return normalized;
  normalized.runs = Math.max(0, Number(record.runs || 0));
  normalized.lastOutcome = typeof record.lastOutcome === 'string' ? record.lastOutcome : null;
  for (const field of ['floors', ...FACT_FIELDS]) normalized[field] = mergeUnique([], record[field]);
  return normalized;
}

function mergeUnique(existing, incoming) {
  const values = new Set(Array.isArray(existing) ? existing : []);
  for (const value of Array.isArray(incoming) ? incoming : []) {
    if (value === null || value === undefined || value === '') continue;
    values.add(typeof value === 'number' ? value : String(value));
  }
  return [...values].sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'ja'));
}
