export const T = {
  bg:           '#FBF6EC',
  panel:        '#FFFCF5',
  ink:          '#1B1410',
  inkSoft:      '#5A4E45',
  primary:      '#E8654A',
  primaryInk:   '#FFF6E8',
  accent:       '#F0B83D',
  correct:      '#7CA982',
  correctInk:   '#2F5A3D',
  cardBoard:    '#FFD9A8',
  cardBoardInk: '#7A2715',
  cardTarget:   '#C8E0D4',
  cardTargetInk:'#2F5A3D',
  locked:       '#D9D0BD',
  lockedInk:    '#8A8070',
};

const LANG_CODES = { german: 'DE', latin: 'LA', english: 'EN', french: 'FR', spanish: 'ES' };
export const langCode = l => LANG_CODES[l] || l.slice(0, 2).toUpperCase();

const NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
export const roman = n => NUMERALS[n] ?? String(n + 1);

// Badge text for a play direction: prompt language → board language
export function dirLabel(lesson, dir) {
  const board  = lesson.languages[dir];
  const prompt = lesson.languages[1 - dir];
  return `${langCode(prompt)} → ${langCode(board)}`;
}

// Is sectionIndex locked? Section 0 always open; N+1 needs N to have ≥1 direction done.
export function sectionLocked(lesson, sectionIndex, sections, progress) {
  if (sectionIndex === 0) return false;
  const lp   = progress[lesson.id] || {};
  const prev = sections[sectionIndex - 1];
  const pp   = lp[prev.id] || {};
  return !pp['0']?.done && !pp['1']?.done;
}

// Final round unlocks when every section has ≥1 direction done.
export function finalLocked(lesson, sections, progress) {
  const lp = progress[lesson.id] || {};
  return !sections.every(s => {
    const sp = lp[s.id] || {};
    return sp['0']?.done || sp['1']?.done;
  });
}
