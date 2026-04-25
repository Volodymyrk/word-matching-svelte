/** Score history backed by localStorage. Port of history functions in vocab.py. */

const KEY = 'word_matching_history';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function logScore(score, configName) {
  const history = load();
  history.push({
    timestamp: new Date().toISOString(),
    score,
    config: configName,
  });
  localStorage.setItem(KEY, JSON.stringify(history));
}

export function getTopScores(n = 10) {
  const history = load();
  return history
    .slice()
    .sort((a, b) => b.score - a.score || a.timestamp.localeCompare(b.timestamp))
    .slice(0, n)
    .map(e => ({ score: e.score, config: e.config, date: e.timestamp.slice(0, 10) }));
}

export function getBestScore(configName) {
  return load()
    .filter(e => e.config === configName)
    .reduce((best, e) => Math.max(best, e.score), 0);
}
