<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { fetchGlobals, fetchLessons, fetchSections, fetchSectionWords, createRound } from './lib/vocab.js';
  import { logScore, getBestScore, getProgress, markPlay } from './lib/history.js';
  import { dirLabel, roman } from './lib/theme.js';
  import ScreenLessons  from './lib/ScreenLessons.svelte';
  import ScreenSaga     from './lib/ScreenSaga.svelte';
  import ScreenPreview  from './lib/ScreenPreview.svelte';
  import ScreenComplete from './lib/ScreenComplete.svelte';

  // ── Routing ────────────────────────────────────────────────────────────────
  let screen          = $state('lessons'); // 'lessons' | 'saga' | 'preview' | 'game' | 'complete'
  let lessons         = $state([]);
  let sectionsMap     = $state({});        // lessonId → sections[]
  let sections        = $state([]);        // sections for selected lesson
  let selectedLesson  = $state(null);
  let selectedSection = $state(null);      // { id, wordCount } or { id: 'final', isFinal: true }
  let selectedDir     = $state(0);
  let progress        = $state({});
  let previewWords    = $state([]);
  let lastScore       = $state(0);
  let lastBaseScore   = $state(0);
  let lastBonusSecs   = $state(0);
  let lastNextLabel   = $state('');
  let isNewBest       = $state(false);
  let globals         = $state(null);

  // ── Game state ─────────────────────────────────────────────────────────────
  const BG_COUNT = 6;
  function randomBg() {
    const i = Math.floor(Math.random() * BG_COUNT) + 1;
    return `${import.meta.env.BASE_URL}images/bg_${String(i).padStart(2, '0')}.webp`;
  }
  let boardBg          = $state(randomBg());
  let displayCards     = $state([]);
  let targetWords      = $state([]);
  let score            = $state(0);
  let remainingSeconds = $state(0);
  let wrongCardId      = $state(-1);
  let mistakesInSet    = $state(0);
  let wrongInRound     = $state(0);
  let correctClicks    = $state(0);
  let wrongWords          = $state([]);  // { clicked, correct }[]
  let previewTargetWord   = $state(null);
  let setsCompleted    = $state(0);
  let comboActive      = $state(false);
  let comboPrimed      = $state(false);
  let comboRestartKey  = $state(0);
  let comboDurationMs  = $state(1000);

  // ── Derived ────────────────────────────────────────────────────────────────
  const livesLeft   = $derived(Math.max(0, (globals?.lives ?? 3) - wrongInRound));
  const livesRange  = $derived(Array.from({ length: globals?.lives ?? 3 }, (_, i) => i));
  const setsPerRound = $derived(globals?.sets_per_round ?? 6);
  const setProgress  = $derived(setsCompleted);

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
    };
  });

  const sectionLabel = $derived.by(() => {
    if (!selectedSection) return '';
    if (selectedSection.isFinal) return 'Finalrunde';
    const idx = sections.findIndex(s => s.id === selectedSection.id);
    return `Abschnitt ${idx + 1}`;
  });

  let timerInterval        = null;
  let wrongTimeout         = null;
  let comboPrimedTimeout   = null;
  let targetPreviewTimeout = null;

  onMount(async () => {
    [globals, lessons] = await Promise.all([fetchGlobals(), fetchLessons()]);
    progress = getProgress();
    const pairs = await Promise.all(lessons.map(async l => [l.id, await fetchSections(l)]));
    sectionsMap = Object.fromEntries(pairs);
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(comboPrimedTimeout);
    clearTimeout(targetPreviewTimeout);
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  function selectLesson(lesson) {
    selectedLesson = lesson;
    sections = sectionsMap[lesson.id] || [];
    screen = 'saga';
  }

  async function startGame(section, dir) {
    selectedSection = section;
    selectedDir     = dir;
    const sectionId = section.isFinal ? null : section.id;
    const config = {
      vocab_file:      selectedLesson.vocab_file,
      base_language:   selectedLesson.languages[dir],
      target_language: selectedLesson.languages[1 - dir],
    };
    previewWords = await fetchSectionWords(config, sectionId);
    screen = 'preview';
  }

  function startGameFromPreview() {
    screen = 'game';
    loadRound();
  }

  function quitToSaga() {
    clearInterval(timerInterval);
    clearTimeout(wrongTimeout);
    clearTimeout(targetPreviewTimeout);
    displayCards      = [];
    targetWords       = [];
    previewTargetWord = null;
    screen = 'saga';
  }

  function handleContinue() {
    const configName = `${selectedLesson.id}-${selectedSection.id}-${selectedDir}`;
    logScore(lastScore, configName);
    markPlay(selectedLesson.id, selectedSection.id, selectedDir, lastScore);
    progress = getProgress();
    screen = 'saga';
  }

  function handleRetry() {
    screen = 'game';
    loadRound();
  }

  function computeNextLabel() {
    if (selectedSection?.isFinal) return '';
    const idx = sections.findIndex(s => s.id === selectedSection?.id);
    if (idx === -1) return '';
    if (selectedDir === 1) {
      return `${roman(idx)} · ${dirLabel(selectedLesson, 0)}`;
    } else if (idx + 1 < sections.length) {
      return `${roman(idx + 1)} · ${dirLabel(selectedLesson, 1)}`;
    }
    return 'Finalrunde';
  }

  function endRound() {
    clearInterval(timerInterval);
    lastBonusSecs = remainingSeconds;
    lastBaseScore = score;
    lastScore     = score + Math.floor(remainingSeconds / 5);
    lastNextLabel = computeNextLabel();
    const configName = `${selectedLesson.id}-${selectedSection.id}-${selectedDir}`;
    const best = getBestScore(configName);
    isNewBest = lastScore > best && lastScore > 0;
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
    const config    = gameConfig;
    const sectionId = selectedSection?.isFinal ? null : selectedSection?.id;
    const data      = await createRound(config, sectionId);
    displayCards      = data.displayCards;
    targetWords       = data.targetWords;
    score             = 0;
    setsCompleted     = 0;
    remainingSeconds  = globals?.round_seconds ?? 60;
    boardBg           = randomBg();
    wrongCardId       = -1;
    mistakesInSet     = 0;
    wrongInRound      = 0;
    correctClicks     = 0;
    wrongWords        = [];
    previewTargetWord = null;
    clearTimeout(targetPreviewTimeout);
    comboActive       = false;
    comboPrimed       = false;
    comboRestartKey   = 0;
    comboDurationMs   = Math.round((globals?.combo_seconds ?? 2) * 1000);
    clearTimeout(comboPrimedTimeout);
    startTimer();
  }

  async function loadNextRound() {
    setsCompleted++;
    if (setsCompleted >= setsPerRound) { endRound(); return; }
    await tick();
    const sectionId = selectedSection?.isFinal ? null : selectedSection?.id;
    const data      = await createRound(gameConfig, sectionId);
    displayCards    = data.displayCards;
    targetWords     = data.targetWords;
    mistakesInSet   = 0;
    comboPrimed     = false;
    clearTimeout(comboPrimedTimeout);
    if (comboActive) {
      comboDurationMs = Math.round((globals?.combo_seconds ?? 2) * 1000 + (globals?.combo_new_set_bonus_seconds ?? 5) * 1000);
      comboRestartKey++;
    }
  }

  function clickCard(card) {
    wrongCardId = -1;
    clearTimeout(wrongTimeout);

    if (!targetWords.includes(card.target)) {
      score += globals?.score_wrong ?? -1;
      mistakesInSet++;
      wrongInRound++;
      wrongCardId  = card.id;
      comboActive  = false;
      comboPrimed  = false;
      comboRestartKey = 0;
      clearTimeout(comboPrimedTimeout);
      wrongTimeout = setTimeout(() => { wrongCardId = -1; }, globals?.wrong_flash_ms ?? 500);
      if (!wrongWords.some(w => w.clicked === card.base)) {
        wrongWords = [...wrongWords, { clicked: card.base, correct: card.target }];
      }
      return;
    }

    correctClicks++;
    const boardLang  = selectedLesson?.languages?.[selectedDir];
    const targetLang = selectedLesson?.languages?.[1 - selectedDir];
    if (boardLang === 'german')       speakWord(card.base,   card.grammar, 'german');
    else if (targetLang === 'german') speakWord(card.target, card.grammar, 'german');

    const inCombo     = comboPrimed || comboActive;
    const comboDurMs  = Math.round((globals?.combo_seconds ?? 2) * 1000);
    score += inCombo ? (globals?.score_combo ?? 2) : (globals?.score_correct ?? 1);
    clearTimeout(comboPrimedTimeout);
    if (inCombo) {
      comboActive     = true;
      comboPrimed     = true;
      comboDurationMs = comboDurMs;
      comboRestartKey++;
    } else {
      comboPrimed = true;
      comboPrimedTimeout = setTimeout(() => { comboPrimed = false; }, comboDurMs);
    }
    remainingSeconds += globals?.timer_bonus_per_correct ?? 1;

    displayCards = displayCards.filter(c => c.id !== card.id);
    targetWords  = targetWords.filter(w => w !== card.target);
    if (targetWords.length === 0) loadNextRound();
  }

  function comboExpired() { comboActive = false; comboPrimed = false; }

  function speakWord(word, grammar, lang) {
    if (!window.speechSynthesis) return;
    const article = lang === 'german'
      ? (grammar === 'm' ? 'der' : grammar === 'f' ? 'die' : grammar === 'n' ? 'das' : '')
      : '';
    const utt = new SpeechSynthesisUtterance(article ? `${article} ${word}` : word);
    utt.lang = lang === 'german' ? 'de-DE' : '';
    utt.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  }

  function clickTargetWord(word) {
    clearTimeout(targetPreviewTimeout);
    previewTargetWord = word;
    comboActive     = false;
    comboPrimed     = false;
    comboRestartKey = 0;
    clearTimeout(comboPrimedTimeout);
    targetPreviewTimeout = setTimeout(() => { previewTargetWord = null; }, globals?.wrong_flash_ms ?? 2000);
  }
</script>

{#if screen === 'lessons'}
  <ScreenLessons {lessons} {sectionsMap} {progress} onSelect={selectLesson} />

{:else if screen === 'saga'}
  <ScreenSaga
    lesson={selectedLesson}
    {sections}
    {progress}
    starThresholds={globals?.star_thresholds ?? [1, 10, 20]}
    onBack={() => screen = 'lessons'}
    onStart={startGame}
  />

{:else if screen === 'preview'}
  <ScreenPreview
    lesson={selectedLesson}
    {sectionLabel}
    dir={selectedDir}
    words={previewWords}
    onBack={() => screen = 'saga'}
    onStart={startGameFromPreview}
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
        {#each Array.from({ length: setsPerRound }, (_, i) => i) as i}
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
        {#each livesRange as i}
          <svg width="20" height="18" viewBox="0 0 20 18">
            <path d="M10 16C10 16 2 11 2 6a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z"
              fill={i < livesLeft ? '#E8654A' : 'transparent'}
              stroke="#1B1410" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        {/each}
      </div>
    </div>

    <!-- Combo bar -->
    <div class="combo-wrap">
      {#key comboRestartKey}
        <div
          class="combo-bar"
          class:active={comboRestartKey > 0}
          style={comboRestartKey > 0 ? `animation-duration:${comboDurationMs}ms` : ''}
          onanimationend={comboExpired}
        ></div>
      {/key}
    </div>

    <!-- Board -->
    <div class="board">
      <div class="board-bg" style="background-image: url('{boardBg}')"></div>
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
    <div class="target-panel">
      <div class="target-label">{bottomLabel}</div>
      <div class="target-row">
        {#each targetWords as word}
          <button class="target-card" class:peeking={previewTargetWord === word} onclick={() => clickTargetWord(word)}>
            {word}
            {#if previewTargetWord === word}
              <span class="card-hint">{displayCards.find(c => c.target === word)?.base ?? ''}</span>
            {/if}
          </button>
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
    baseScore={lastBaseScore}
    bonusSecs={lastBonusSecs}
    roundSeconds={globals?.round_seconds ?? 60}
    wrongWords={wrongWords}
    correctClicks={correctClicks}
    wrongClicks={wrongInRound}
    {isNewBest}
    starThresholds={globals?.star_thresholds ?? [1, 10, 20]}
    nextLabel={lastNextLabel}
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
    background: transparent;
    border-radius: 6px;
    width: 0%;
  }
  .combo-bar.active {
    background: #E8654A;
    width: 100%;
    animation: drain linear forwards;
  }

  /* Board */
  .board {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 280px;
    background-color: #FFFCF5;
    border: 2.5px solid #1B1410;
    border-radius: 18px;
    box-shadow: 4px 4px 0 #1B1410;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .board-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }

  .board-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(251, 246, 236, 0.5);
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
    appearance: none;
    cursor: pointer;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: background 120ms;
  }

  .target-card.peeking {
    background: #E8654A;
    color: #FFF6E8;
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
