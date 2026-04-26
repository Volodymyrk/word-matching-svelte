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

// Is a specific level (sectionIdx, dir) locked?
// Order: (0,dir=1) → (0,dir=0) → (1,dir=1) → (1,dir=0) → …
// Unlocks only when the prerequisite level achieved ≥ 2 stars (best >= starThresholds[1]).
export function levelLocked(lesson, sectionIdx, dir, sections, progress, starThresholds = [1, 10, 20]) {
  if (sectionIdx === 0 && dir === 1) return false;
  const lp = progress[lesson.id] || {};
  const twoStar = starThresholds[1];
  if (dir === 0) {
    const sp = lp[sections[sectionIdx].id] || {};
    return (sp['1']?.best ?? -1) < twoStar;
  } else {
    const pp = lp[sections[sectionIdx - 1].id] || {};
    return (pp['0']?.best ?? -1) < twoStar;
  }
}

// Final round unlocks when every section has both directions with ≥ 2 stars.
export function finalLocked(lesson, sections, progress, starThresholds = [1, 10, 20]) {
  const lp = progress[lesson.id] || {};
  const twoStar = starThresholds[1];
  return !sections.every(s => {
    const sp = lp[s.id] || {};
    return (sp['0']?.best ?? -1) >= twoStar && (sp['1']?.best ?? -1) >= twoStar;
  });
}
