const STORAGE_KEY = 'csse_schedules_v1';

export function getSeedSchedules(baseDate = new Date()) {
  return [];
}

function reviver(key, value) {
  if (key === 'date') return new Date(value);
  return value;
}

export function loadSchedules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeds = getSeedSchedules(new Date());
      saveSchedules(seeds);
      return seeds;
    }
    const parsed = JSON.parse(raw);
    // convert date strings to Date
    return parsed.map(s => ({ ...s, date: new Date(s.date) }));
  } catch (e) {
    console.error('Failed to load schedules', e);
    return getSeedSchedules(new Date());
  }
}

export function saveSchedules(schedules) {
  try {
    const toStore = schedules.map(s => ({ ...s, date: s.date instanceof Date ? s.date.toISOString() : s.date }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.error('Failed to save schedules', e);
  }
}

export function addSchedule(schedule) {
  const list = loadSchedules();
  const next = [...list, schedule];
  saveSchedules(next);
  return next;
}

export function removeScheduleById(id) {
  const list = loadSchedules();
  const next = list.filter(s => s.id !== id);
  saveSchedules(next);
  return next;
}


