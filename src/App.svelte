<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchLessons, fetchSections, createRound } from './lib/vocab.js';
  import { logScore, getBestScore, getProgress, markPlay } from './lib/history.js';
  import { dirLabel } from './lib/theme.js';
  import ScreenLessons  from './lib/ScreenLessons.svelte';
  import ScreenSaga     from './lib/ScreenSaga.svelte';
  import ScreenComplete from './lib/ScreenComplete.svelte';

  // ── Routing ────────────────────────────────────────────────────────────────
  let screen          = $state('lessons'); // 'lessons' | 'saga' | 'game' | 'complete'
  let lessons         = $state([]);
  let sectionsMap     = $state({});        // lessonId → sections[]
  let sections        = $state([]);        // sections for selected lesson
  let selectedLesson  = $state(null);
  let selectedSection = $state(null);      // { id, wordCount } or { id: 'final', isFinal: true }
  let selectedDir     = $state(0);
  let progress        = $state({});
  let lastScore       = $state(0);
  let isNewBest       = $state(false);

  // ── Game state ─────────────────────────────────────────────────────────────
  let displayCards     = $state([]);
  let targetWords      = $state([]);
  let score            = $state(0);
  let remainingSeconds = $state(0);
  let wrongCardId      = $state(-1);
  let mistakesInSet    = $state(0);
  let wrongInRound     = $state(0);
  let showPerfectFlash = $state(false);
  let pendingRemoveCardId = $state(-1);
  let pendingRemoveTarget = $state('');
  let comboActive      = $state(false);
  let comboRestartKey  = $state(0);
  let comboDurationMs  = $state(1000);

  // ── Derived ────────────────────────────────────────────────────────────────
  const livesLeft   = $derived(Math.max(0, 3 - wrongInRound));
  const setProgress = $derived(3 - targetWords.length);

  const currentDirLabel = $derived.by(() => {
    if (!selectedLesson || selectedDir == null) return '';
    return dirLabel(selectedLesson, selectedDir);
  });

  const bottomLabel = $derived.by(() => {
    if (!selectedLesson) return 'Übersetze';
    const targetLang = selectedLesson.languages[1 - selectedDir];
    if (targetLang === 'latin')   return 'Übersetze ins Lateinische';
    if (targetLang === 'german')  return 'Übersetze ins Deutsche';
    if (targetLang === 'english') return 'Translate to English';
    return `→ ${targetLang}`;
  });

  const gameConfig = $derived.by(() => {
    if (!selectedLesson) return null;
    return {
      vocab_file:      selectedLesson.vocab_file,
      base_language:   selectedLesson.languages[selectedDir],
      target_language: selectedLesson.languages[1 - selectedDir],
      round_seconds:   selectedLesson.round_seconds ?? 60,
      combo_seconds:   selectedLesson.combo_seconds ?? 2,
    };
  });

  const sectionLabel = $derived.by(() => {
    if (!selectedSection) return '';
    if (selectedSection.isFinal) return 'Finalrunde';
    const idx = sections.findIndex(s => s.id === selectedSection.id);
    return `Abschnitt ${idx + 1}`;
  });

  let timerInterval       = null;
  let wrongTimeout        = null;
  let perfectFlashTimeout = null;

  onMount(async () => {
    lessons  = await fetchLessons();
    progress = getProgress();
    const pairs = await Promise.all(lessons.map(async l => [l.id, await fetchSections(l)]));
    sectionsMap = Object.fromEntries(pairs);
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(perfectFlashTimeout);
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  function selectLesson(lesson) {
    selectedLesson = lesson;
    sections = sectionsMap[lesson.id] || [];
    screen = 'saga';
  }

  function startGame(section, dir) {
    selectedSection = section;
    selectedDir     = dir;
    screen = 'game';
    loadRound();
  }

  function quitToSaga() {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(perfectFlashTimeout);
    displayCards = [];
    targetWords  = [];
    screen = 'saga';
  }

  function handleContinue() {
    markPlay(selectedLesson.id, selectedSection.id, selectedDir, lastScore);
    progress = getProgress();
    screen = 'saga';
  }

  function handleRetry() {
    screen = 'game';
    loadRound();
  }

  function endRound() {
    clearInterval(timerInterval);
    lastScore = score;
    const configName = `${selectedLesson.id}-${selectedSection.id}-${selectedDir}`;
    const best = getBestScore(configName);
    isNewBest = score > best && score > 0;
    logScore(score, configName);
    displayCards = [];
    targetWords  = [];
    screen = 'complete';
  }

  // ── Game logic ─────────────────────────────────────────────────────────────
  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (remainingSeconds <= 0) return;
      remainingSeconds--;
      if (remainingSeconds === 0) endRound();
    }, 1000);
  }

  async function loadRound() {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(perfectFlashTimeout);
    const config    = gameConfig;
    const sectionId = selectedSection?.isFinal ? null : selectedSection?.id;
    const data      = await createRound(config, sectionId);
    displayCards      = data.displayCards;
    targetWords       = data.targetWords;
    score             = 0;
    remainingSeconds  = config.round_seconds;
    wrongCardId       = -1;
    mistakesInSet     = 0;
    wrongInRound      = 0;
    showPerfectFlash  = false;
    pendingRemoveCardId = -1;
    pendingRemoveTarget = '';
    comboActive       = false;
    comboRestartKey   = 0;
    comboDurationMs   = Math.round(config.combo_seconds * 1000);
    startTimer();
  }

  async function loadNextRound() {
    const sectionId = selectedSection?.isFinal ? null : selectedSection?.id;
    const data      = await createRound(gameConfig, sectionId);
    displayCards    = data.displayCards;
    targetWords     = data.targetWords;
    mistakesInSet   = 0;
    comboActive     = false;
    comboRestartKey = 0;
  }

  function clickCard(card) {
    wrongCardId = -1;
    clearTimeout(wrongTimeout);

    if (!targetWords.includes(card.target)) {
      score--;
      mistakesInSet++;
      wrongInRound++;
      wrongCardId  = card.id;
      comboActive  = false;
      comboRestartKey = 0;
      wrongTimeout = setTimeout(() => { wrongCardId = -1; }, 500);
      return;
    }

    score += comboActive ? 2 : 1;
    comboActive = true;
    comboRestartKey++;
    remainingSeconds++;

    const isLastTarget = targetWords.length === 1;
    const perfectSet   = isLastTarget && mistakesInSet === 0;

    if (perfectSet) {
      showPerfectFlash    = true;
      pendingRemoveCardId = card.id;
      pendingRemoveTarget = card.target;
      perfectFlashTimeout = setTimeout(() => {
        displayCards     = displayCards.filter(c => c.id !== pendingRemoveCardId);
        targetWords      = targetWords.filter(w => w !== pendingRemoveTarget);
        showPerfectFlash = false;
        pendingRemoveCardId = -1;
        pendingRemoveTarget = '';
        loadNextRound();
      }, 800);
    } else {
      displayCards = displayCards.filter(c => c.id !== card.id);
      targetWords  = targetWords.filter(w => w !== card.target);
      if (targetWords.length === 0) loadNextRound();
    }
  }

  function comboExpired() { comboActive = false; }
</script>

{#if screen === 'lessons'}
  <ScreenLessons {lessons} {sectionsMap} {progress} onSelect={selectLesson} />

{:else if screen === 'saga'}
  <ScreenSaga
    lesson={selectedLesson}
    {sections}
    {progress}
    onBack={() => screen = 'lessons'}
    onStart={startGame}
  />

{:else if screen === 'game'}
  <div class="page">

    <!-- HUD -->
    <div class="hud">
      <button class="quit-btn" aria-label="Zurück zur Saga" onclick={quitToSaga}>
        <svg width="13" height="13" viewBox="0 0 13 13">
          <path d="M1 1l11 11M12 1L1 12" stroke="#1B1410" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="progress-bar">
        {#each [0, 1, 2] as i}
          <div class="chunk" class:filled={i < setProgress}></div>
        {/each}
      </div>
      <div class="hud-stats">
        <div class="pill pill-score">★ {score}</div>
        <div class="pill pill-time">{remainingSeconds}s</div>
      </div>
    </div>

    <!-- Meta bar -->
    <div class="meta-bar">
      <div class="dir-badge">{currentDirLabel}</div>
      <div class="hearts">
        {#each [0, 1, 2] as i}
          <svg width="20" height="18" viewBox="0 0 20 18">
            <path d="M10 16C10 16 2 11 2 6a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z"
              fill={i < livesLeft ? '#E8654A' : 'transparent'}
              stroke="#1B1410" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        {/each}
      </div>
    </div>

    <!-- Combo bar -->
    {#if comboRestartKey > 0}
      {#key comboRestartKey}
        <div class="combo-wrap">
          <div class="combo-bar" style="animation-duration:{comboDurationMs}ms" onanimationend={comboExpired}></div>
        </div>
      {/key}
    {/if}

    <!-- Board -->
    <div class="board">
      <div class="board-hint">TIPP · finde die 3 Paare</div>
      {#each displayCards as card (card.id)}
        <div class="card-anchor" style="left:{card.left}; top:{card.top}">
          <button
            class="board-card"
            class:wrong={wrongCardId === card.id}
            style="--rot:{card.rot || 0}deg"
            onclick={() => clickCard(card)}
          >
            {card.base}
            {#if wrongCardId === card.id}
              <span class="card-hint">{card.target}</span>
            {/if}
          </button>
        </div>
      {/each}
    </div>

    <!-- Target panel -->
    <div class="target-panel" class:perfect-flash={showPerfectFlash}>
      <div class="target-label">{bottomLabel}</div>
      <div class="target-row">
        {#each targetWords as word}
          <div class="target-card">{word}</div>
        {/each}
      </div>
    </div>

    <!-- Game footer -->
    <div class="game-footer">
      {selectedLesson?.name} · {sectionLabel}
    </div>

  </div>

{:else if screen === 'complete'}
  <ScreenComplete
    lesson={selectedLesson}
    {sectionLabel}
    dir={selectedDir}
    score={lastScore}
    {isNewBest}
    onContinue={handleContinue}
    onRetry={handleRetry}
  />
{/if}

<style>
  @keyframes drain {
    from { width: 100%; }
    to   { width: 0%; }
  }
  @keyframes vmShake {
    0%, 100% { transform: rotate(var(--rot, 0deg)) translateX(0); }
    25%       { transform: rotate(var(--rot, 0deg)) translateX(-6px); }
    75%       { transform: rotate(var(--rot, 0deg)) translateX(6px); }
  }

  :global(body) { margin: 0; background: #FBF6EC; }

  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 0.75rem;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: #FBF6EC;
  }

  /* HUD */
  .hud {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0.4rem 0 0.25rem;
  }

  .quit-btn {
    appearance: none;
    cursor: pointer;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #FFFCF5;
    border: 2px solid #1B1410;
    box-shadow: 2px 2px 0 #1B1410;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .progress-bar {
    flex: 1;
    height: 14px;
    border-radius: 999px;
    background: #FFFCF5;
    border: 2px solid #1B1410;
    box-shadow: 2px 2px 0 #1B1410;
    display: flex;
    overflow: hidden;
  }

  .chunk { flex: 1; background: transparent; transition: background 200ms; }
  .chunk:not(:last-child) { border-right: 1px solid #1B1410; }
  .chunk.filled { background: #7CA982; }

  .hud-stats { display: flex; gap: 6px; flex-shrink: 0; }

  .pill {
    border: 2px solid #1B1410;
    border-radius: 10px;
    padding: 3px 8px;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    box-shadow: 2px 2px 0 #1B1410;
    background: #FFFCF5;
    white-space: nowrap;
  }
  .pill-score { color: #E8654A; }
  .pill-time  { color: #dc2626; }

  /* Meta bar */
  .meta-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0 0.3rem;
  }

  .dir-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    background: #FFFCF5;
    border: 1.5px solid #1B1410;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #1B1410;
  }

  .hearts { display: flex; gap: 2px; align-items: center; }

  /* Combo */
  .combo-wrap {
    height: 8px;
    background: #FFFCF5;
    border-radius: 6px;
    border: 2px solid #1B1410;
    overflow: hidden;
    margin-bottom: 0.5rem;
    box-shadow: 2px 2px 0 #1B1410;
  }
  .combo-bar {
    height: 100%;
    background: #E8654A;
    border-radius: 6px;
    width: 100%;
    animation: drain linear forwards;
  }

  /* Board */
  .board {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 280px;
    background-image: repeating-linear-gradient(135deg, transparent 0 18px, rgba(27,20,16,0.04) 18px 19px);
    background-color: #FFFCF5;
    border: 2.5px solid #1B1410;
    border-radius: 18px;
    box-shadow: 4px 4px 0 #1B1410;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .board-hint {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #FBF6EC;
    border: 1.5px solid #1B1410;
    border-radius: 999px;
    padding: 3px 12px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #5A4E45;
    white-space: nowrap;
    z-index: 1;
    pointer-events: none;
  }

  .card-anchor {
    position: absolute;
    transform: translateX(-50%);
  }

  .board-card {
    appearance: none;
    cursor: pointer;
    background: #FFD9A8;
    color: #7A2715;
    border: 2.5px solid #1B1410;
    border-radius: 12px;
    padding: 10px 14px;
    box-shadow: 3px 4px 0 #1B1410;
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.1rem;
    font-weight: 400;
    letter-spacing: 0.2px;
    line-height: 1.1;
    white-space: nowrap;
    transform: rotate(var(--rot, 0deg));
    transition: box-shadow 120ms ease, background 150ms;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .board-card:hover { box-shadow: 4px 5px 0 #1B1410; }
  .board-card:active {
    box-shadow: 1px 2px 0 #1B1410;
    transform: rotate(var(--rot, 0deg)) translate(2px, 2px);
  }
  .board-card.wrong {
    background: #C44536;
    color: white;
    animation: vmShake 280ms ease-in-out;
  }

  .card-hint {
    font-size: 0.8rem;
    opacity: 0.9;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 600;
  }

  /* Target panel */
  .target-panel {
    background: #FFFCF5;
    border: 2.5px solid #1B1410;
    border-radius: 16px;
    box-shadow: 4px 4px 0 #1B1410;
    padding: 10px 12px;
    transition: background 200ms;
    margin-bottom: 0.5rem;
  }
  .target-panel.perfect-flash { background: #86efac; }

  .target-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #5A4E45;
    text-align: center;
    margin-bottom: 8px;
  }

  .target-row { display: flex; gap: 8px; }

  .target-card {
    flex: 1;
    min-width: 0;
    background: #C8E0D4;
    color: #2F5A3D;
    border: 2.5px solid #1B1410;
    border-radius: 12px;
    padding: 10px 8px;
    box-shadow: 3px 3px 0 #1B1410;
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1rem;
    font-weight: 400;
    text-align: center;
    line-height: 1.1;
  }

  /* Game footer */
  .game-footer {
    text-align: center;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 1px;
    color: #5A4E45;
    padding: 0.4rem 0 0.25rem;
  }
</style>
