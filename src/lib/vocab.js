/** Load game configs and vocab, create rounds. Port of vocab.py. */

const base = import.meta.env.BASE_URL;

export async function fetchConfigs() {
  const res = await fetch(`${base}configs/index.json`);
  return res.json();
}

export async function fetchConfig(filename) {
  const res = await fetch(`${base}configs/${filename}`);
  return res.json();
}

async function loadAllPairs(config) {
  const res = await fetch(`${base}configs/${config.vocab_file}`);
  const data = await res.json();
  const baseKey = config.base_language;
  const targetKey = config.target_language;
  const pairs = [];
  for (const lesson of Object.values(data)) {
    for (const section of Object.values(lesson)) {
      for (const item of section) {
        if (item[baseKey] !== undefined && item[targetKey] !== undefined) {
          pairs.push({ base: item[baseKey], target: item[targetKey] });
        }
      }
    }
  }
  return pairs;
}

function sample(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const GRID = [
  { left: '10%', top: '15%' },
  { left: '45%', top: '12%' },
  { left: '75%', top: '18%' },
  { left: '15%', top: '45%' },
  { left: '55%', top: '42%' },
  { left: '80%', top: '48%' },
];

export async function createRound(config) {
  let pairs = await loadAllPairs(config);
  while (pairs.length < 6) pairs = [...pairs, ...pairs];
  const chosen = sample(pairs, 6);
  const targetIndices = sample([0, 1, 2, 3, 4, 5], 3).sort((a, b) => a - b);
  const targetWords = targetIndices.map(i => chosen[i].target);
  const positions = sample(GRID, 6);
  const displayCards = chosen.map((pair, i) => ({
    id: i,
    base: pair.base,
    target: pair.target,
    left: positions[i].left,
    top: positions[i].top,
  }));
  return { displayCards, targetWords };
}
