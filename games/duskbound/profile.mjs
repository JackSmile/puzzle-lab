const KEY = 'puzzleLab.duskbound.v1';
const integer = (value, max = 100000000) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export function readProfile(storage) {
  let saved = {};
  try { const value = JSON.parse(storage?.getItem(KEY) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch { /* A blocked or corrupt store must not prevent a new run. */ }
  return {
    bestScore: integer(saved.bestScore), bestKills: integer(saved.bestKills), bestTime: integer(saved.bestTime, 36000),
    wins: integer(saved.wins), runs: integer(saved.runs),
    hero: ['warden', 'witch', 'seer'].includes(saved.hero) ? saved.hero : 'witch',
    classId: ['scion','marauder','ranger','witch','duelist','templar','shadow'].includes(saved.classId) ? saved.classId : 'witch',
    sound: saved.sound === true, lowEffects: saved.lowEffects === true,
  };
}
export function saveProfile(storage, profile) {
  try { storage?.setItem(KEY, JSON.stringify(profile)); return Boolean(storage); } catch { return false; }
}
