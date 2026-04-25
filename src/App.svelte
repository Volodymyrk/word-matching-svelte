<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchConfigs, fetchConfig, createRound } from './lib/vocab.js';
  import { logScore, getTopScores, getBestScore } from './lib/history.js';

  let configs = $state([]);
  let selectedFile = $state('');
  let displayCards = $state([]);
  let targetWords = $state([]);
  let score = $state(0);
  let remainingSeconds = $state(0);
  let showEndPopup = $state(false);
  let wrongCardId = $state(-1);
  let mistakesInSet = $state(0);
  let showPerfectFlash = $state(false);
  let pendingRemoveCardId = $state(-1);
  let pendingRemoveTarget = $state('');
  let comboActive = $state(false);
  let comboRestartKey = $state(0);
  let comboDurationMs = $state(1000);
  let topScores = $state([]);

  let gameActive = $derived(displayCards.length > 0);
  let currentConfig = $derived(configs.find(c => c.file === selectedFile));
  let timerInterval = null;
  let wrongTimeout = null;
  let perfectFlashTimeout = null;

  onMount(async () => {
    configs = await fetchConfigs();
    if (configs.length) selectedFile = configs[0].file;
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(perfectFlashTimeout);
  });

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (remainingSeconds <= 0) return;
      remainingSeconds--;
      if (remainingSeconds === 0) {
        clearInterval(timerInterval);
        const configName = currentConfig?.name ?? '';
        const best = getBestScore(configName);
        logScore(score, configName);
        if (score > best) fireConfetti();
        topScores = getTopScores(10);
        showEndPopup = true;
      }
    }, 1000);
  }

  async function loadRound() {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(perfectFlashTimeout);
    const config = await fetchConfig(selectedFile);
    const data = await createRound(config);
    displayCards = data.displayCards;
    targetWords = data.targetWords;
    score = 0;
    remainingSeconds = config.round_seconds ?? 60;
    showEndPopup = false;
    wrongCardId = -1;
    mistakesInSet = 0;
    showPerfectFlash = false;
    pendingRemoveCardId = -1;
    pendingRemoveTarget = '';
    comboActive = false;
    comboRestartKey = 0;
    comboDurationMs = Math.round((config.combo_seconds ?? 1) * 1000);
    startTimer();
  }

  async function loadNextRound() {
    const config = await fetchConfig(selectedFile);
    const data = await createRound(config);
    displayCards = data.displayCards;
    targetWords = data.targetWords;
    mistakesInSet = 0;
    comboActive = false;
    comboRestartKey = 0;
  }

  function clickCard(card) {
    wrongCardId = -1;
    clearTimeout(wrongTimeout);

    if (!targetWords.includes(card.target)) {
      score--;
      mistakesInSet++;
      wrongCardId = card.id;
      comboActive = false;
      comboRestartKey = 0;
      wrongTimeout = setTimeout(() => { wrongCardId = -1; }, 500);
      return;
    }

    score += comboActive ? 2 : 1;
    comboActive = true;
    comboRestartKey++;
    remainingSeconds++;

    const isLastTarget = targetWords.length === 1;
    const perfectSet = isLastTarget && mistakesInSet === 0;

    if (perfectSet) {
      showPerfectFlash = true;
      pendingRemoveCardId = card.id;
      pendingRemoveTarget = card.target;
      perfectFlashTimeout = setTimeout(() => {
        displayCards = displayCards.filter(c => c.id !== pendingRemoveCardId);
        targetWords = targetWords.filter(w => w !== pendingRemoveTarget);
        showPerfectFlash = false;
        pendingRemoveCardId = -1;
        pendingRemoveTarget = '';
        loadNextRound();
      }, 800);
    } else {
      displayCards = displayCards.filter(c => c.id !== card.id);
      targetWords = targetWords.filter(w => w !== card.target);
      if (targetWords.length === 0) loadNextRound();
    }
  }

  function comboExpired() {
    comboActive = false;
  }

  function closeEndPopup() {
    showEndPopup = false;
    displayCards = [];
    targetWords = [];
  }

  function fireConfetti() {
    function run() {
      window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    if (window.confetti) { run(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
    s.onload = run;
    document.head.appendChild(s);
  }
</script>

<div class="page">
  {#if gameActive}
    <div class="top-bar">
      <span>Score: <strong class="score-val">{score}</strong></span>
      <span>Time: <strong class="time-val">{remainingSeconds}s</strong></span>
    </div>

    {#if comboRestartKey > 0}
      {#key comboRestartKey}
        <div class="combo-wrap">
          <div
            class="combo-bar"
            style="animation-duration:{comboDurationMs}ms"
            onanimationend={comboExpired}
          ></div>
        </div>
      {/key}
    {/if}

    <div class="board">
      {#each displayCards as card (card.id)}
        <button
          class="card base-card"
          class:wrong={wrongCardId === card.id}
          style="left:{card.left}; top:{card.top}"
          onclick={() => clickCard(card)}
        >
          <span class="card-word">{card.base}</span>
          {#if wrongCardId === card.id}
            <span class="card-hint">{card.target}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="target-row" class:perfect-flash={showPerfectFlash}>
      {#each targetWords as word}
        <div class="card target-card">{word}</div>
      {/each}
    </div>

    <div class="bottom-bar">
      <select bind:value={selectedFile} onchange={() => loadRound()}>
        {#each configs as c}
          <option value={c.file}>{c.name}</option>
        {/each}
      </select>
      <button class="btn" onclick={loadRound}>New round</button>
    </div>

    {#if showEndPopup}
      <div class="overlay" onclick={closeEndPopup}>
        <div class="dialog" onclick={e => e.stopPropagation()}>
          <h2>Round over</h2>
          <p>Your score: <strong style="font-size:1.5rem;color:#059669">{score}</strong></p>
          <h3>Top 10 scores</h3>
          {#if topScores.length}
            <div class="score-list">
              {#each topScores as entry}
                <div class="score-row">
                  <strong style="min-width:2.5rem">{entry.score}</strong>
                  <span style="color:#6b7280;font-size:.9rem">{entry.config}</span>
                  <span style="color:#9ca3af;font-size:.8rem">{entry.date}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p style="color:#6b7280;font-size:.9rem">No scores yet.</p>
          {/if}
          <button class="btn" onclick={closeEndPopup} style="margin-top:1rem">OK</button>
        </div>
      </div>
    {/if}

  {:else}
    <div class="start-screen">
      <select bind:value={selectedFile}>
        {#each configs as c}
          <option value={c.file}>{c.name}</option>
        {/each}
      </select>
      <button class="btn" onclick={loadRound}>Start game</button>
    </div>
  {/if}
</div>

<style>
  :global(body) { margin: 0; }

  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 0.75rem;
    font-family: system-ui, sans-serif;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  h2 { margin: 0 0 .5rem; }
  h3 { margin: 1rem 0 .5rem; font-size: 1rem; }

  .top-bar {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    padding: .4rem 0 .5rem;
    font-size: 1rem;
  }

  .score-val { color: #059669; }
  .time-val  { color: #dc2626; }

  .start-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .bottom-bar {
    display: flex;
    gap: .75rem;
    align-items: center;
    padding-top: .75rem;
    flex-wrap: wrap;
  }

  .bottom-bar select { flex: 1; min-width: 0; }

  .combo-wrap {
    height: 10px;
    background: #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .combo-bar {
    height: 100%;
    background: #059669;
    border-radius: 6px;
    width: 100%;
    animation: drain linear forwards;
  }

  @keyframes drain {
    from { width: 100%; }
    to   { width: 0%; }
  }

  .board {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 280px;
    margin-bottom: 1rem;
  }

  .card {
    border: none;
    border-radius: 12px;
    padding: .9rem 1.4rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    box-shadow: 0 4px 14px rgba(0,0,0,.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .25rem;
  }

  .base-card {
    position: absolute;
    cursor: pointer;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    transition: box-shadow .15s;
  }

  .base-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.3); }

  .base-card.wrong {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    box-shadow: 0 0 0 3px rgba(220,38,38,.6);
  }

  .card-word { font-size: 1.25rem; }
  .card-hint { font-size: .9rem; opacity: .95; }

  .target-row {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    background: #f3f4f6;
    border-radius: 12px;
    transition: background .2s ease;
  }

  .target-row.perfect-flash { background: #86efac; }

  .target-card {
    background: linear-gradient(135deg, #059669, #047857);
    min-width: 80px;
    text-align: center;
    cursor: default;
  }

  .btn {
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    padding: .65rem 1.4rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
  }

  .btn:hover { background: #4338ca; }

  select {
    padding: .45rem .75rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: .95rem;
    width: 100%;
    max-width: 320px;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    min-width: 320px;
    max-width: 480px;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
  }

  .score-list {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: .25rem;
  }

  .score-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: .2rem 0;
  }
</style>