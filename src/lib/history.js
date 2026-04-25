/** Score history and play progress backed by localStorage. */

const HISTORY_KEY  = 'word_matching_history';
const PROGRESS_KEY = 'vm_progress';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

export function logScore(score, label) {
  const h = loadHistory();
  h.push({ timestamp: new Date().toISOString(), score, config: label });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function getBestScore(label) {
  return loadHistory()
    .filter(e => e.config === label)
    .reduce((best, e) => Math.max(best, e.score), 0);
}

// ── Progress ───────────────────────────────────────────────────────────────
// Shape: { [lessonId]: { [sectionId]: { "0": {done,best}, "1": {done,best} } } }
// sectionId is either "lessonKey/sectionKey" or the special string "final"

export function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}

export function markPlay(lessonId, sectionId, dir, score) {
  const p = getProgress();
  if (!p[lessonId])            p[lessonId] = {};
  if (!p[lessonId][sectionId]) p[lessonId][sectionId] = {};
  const key  = String(dir);
  const prev = p[lessonId][sectionId][key] || {};
  p[lessonId][sectionId][key] = { done: true, best: Math.max(score, prev.best ?? 0) };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function isPlayDone(lessonId, sectionId, dir) {
  const p = getProgress();
  return !!p[lessonId]?.[sectionId]?.[String(dir)]?.done;
}

export function lessonProgress(lesson, sections, progress) {
  const lp = progress[lesson.id] || {};
  const totalSectionPlays = sections.length * 2;
  const doneSectionPlays  = sections.reduce((s, sec) => {
    const sp = lp[sec.id] || {};
    return s + (sp['0']?.done ? 1 : 0) + (sp['1']?.done ? 1 : 0);
  }, 0);
  const finalDone = (lp['final']?.['0']?.done || lp['final']?.['1']?.done) ? 1 : 0;
  return { doneSectionPlays, totalSectionPlays, finalDone };
}
