<script>
  import { onMount, onDestroy } from 'svelte';
  import { dirLabel } from './theme.js';

  let {
    lesson, sectionLabel, dir,
    baseScore, bonusSecs, roundSeconds = 60,
    wrongWords = [], correctClicks, wrongClicks,
    isNewBest, starThresholds = [1, 10, 20],
    nextLabel = '',
    onContinue, onRetry,
  } = $props();

  const label      = $derived(dirLabel(lesson, dir));
  const totalScore = $derived(baseScore + Math.floor(bonusSecs / 5));
  const accuracy   = $derived(
    correctClicks + wrongClicks > 0
      ? Math.round(correctClicks / (correctClicks + wrongClicks) * 100)
      : 100
  );
  const elapsedStart = $derived(roundSeconds - bonusSecs);

  let displayScore = $state(0);
  let displaySecs  = $state(0);
  let showStars    = $state(false);
  let starsVal     = $state(0);

  function formatTime(/** @type {number} */ s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  let animInterval;
  let starTimeout;

  onMount(() => {
    displayScore = baseScore;
    displaySecs  = elapsedStart;

    if (bonusSecs <= 0) {
      showStars = true;
      starsVal  = totalScore >= starThresholds[2] ? 3
                : totalScore >= starThresholds[1] ? 2
                : totalScore >= starThresholds[0] ? 1 : 0;
      return;
    }

    let tick = 0;
    animInterval = setInterval(() => {
      tick++;
      displaySecs = Math.min(roundSeconds, displaySecs + 1);
      if (tick % 5 === 0 && displayScore < totalScore) displayScore++;
      if (tick >= bonusSecs) {
        displayScore = totalScore;
        displaySecs  = roundSeconds;
        clearInterval(animInterval);
        starTimeout = setTimeout(() => {
          starsVal  = totalScore >= starThresholds[2] ? 3
                    : totalScore >= starThresholds[1] ? 2
                    : totalScore >= starThresholds[0] ? 1 : 0;
          showStars = true;
        }, 350);
      }
    }, 50);
  });

  onDestroy(() => {
    clearInterval(animInterval);
    clearTimeout(starTimeout);
  });
</script>

<div class="page">
  <!-- Confetti dots -->
  <svg class="confetti" width="100%" height="100%" aria-hidden="true">
    {#each Array.from({length: 22}) as _, i}
      {@const colors = ['#E8654A','#F0B83D','#7CA982','#FFD9A8','#C8E0D4']}
      {@const x = (i * 73 + 11) % 100}
      {@const y = (i * 47 + 5) % 90 + 5}
      {@const c = colors[i % colors.length]}
      {@const r = i % 3 === 0 ? 12 : 7}
      <circle cx="{x}%" cy="{y}%" r={r} fill={c} stroke="#1B1410" stroke-width="1.5" opacity="0.7"/>
    {/each}
  </svg>

  <div class="content">
    <div class="eyebrow">GESCHAFFT!</div>
    <div class="title">Optime!</div>

    <div class="badge-row">
      <div class="badge">{lesson.name} · {sectionLabel}</div>
      <div class="badge">{label}</div>
    </div>

    <!-- Stars — appear after bonus animation -->
    <div class="stars">
      {#each [0, 1, 2] as i}
        <div
          class="star-wrap"
          style="transform: translateY({i === 1 ? '-10px' : '0'}) rotate({i === 0 ? '-8deg' : i === 2 ? '8deg' : '0deg'})"
        >
          <div
            class="star-slam"
            class:earned={showStars && i < starsVal}
            style={showStars && i < starsVal ? `animation-delay:${(i * 0.28 + 0.05).toFixed(2)}s` : ''}
          >
            <svg width="52" height="52" viewBox="0 0 24 24">
              <path
                d="M12 2.5l2.95 6.3 6.55.85-4.85 4.6 1.25 6.95L12 17.95 6.1 21.2l1.25-6.95L2.5 9.65l6.55-.85L12 2.5z"
                fill={showStars && i < starsVal ? '#F0B83D' : '#EDE5D5'}
                stroke={showStars && i < starsVal ? '#1B1410' : '#A89880'}
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      {/each}
    </div>

    <!-- Stats cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">PUNKTE</div>
        <div class="stat-value">{displayScore}</div>
        {#if isNewBest}<div class="new-best">★ Rekord</div>{/if}
      </div>
      <div class="stat-card">
        <div class="stat-label">ZEIT</div>
        <div class="stat-value">{formatTime(displaySecs)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">TREFFER</div>
        <div class="stat-value">{accuracy}%</div>
      </div>
    </div>

    <!-- Wrong words -->
    {#if wrongWords.length > 0}
      <div class="wrong-section">
        <div class="wrong-title">SCHWIERIGE WÖRTER</div>
        {#each wrongWords as w}
          <div class="wrong-pair">
            <span class="wrong-clicked">{w.clicked}</span>
            <span class="wrong-arrow">→</span>
            <span class="wrong-correct">{w.correct}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Plant decorations -->
    <div class="plants">
      <svg width="54" height="70" viewBox="0 0 54 70" fill="none" aria-hidden="true">
        <ellipse cx="27" cy="65" rx="12" ry="5" fill="#C8E0D4" stroke="#1B1410" stroke-width="1.5"/>
        <path d="M27 64 Q27 40 15 28" stroke="#7CA982" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="12" cy="22" rx="11" ry="8" fill="#7CA982" stroke="#1B1410" stroke-width="1.5" transform="rotate(-25 12 22)"/>
        <path d="M27 55 Q27 38 38 30" stroke="#7CA982" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="41" cy="26" rx="9" ry="7" fill="#7CA982" stroke="#1B1410" stroke-width="1.5" transform="rotate(20 41 26)"/>
        <path d="M27 48 Q20 38 20 28" stroke="#7CA982" stroke-width="2" stroke-linecap="round" fill="none"/>
        <circle cx="20" cy="24" r="6" fill="#A8D5B8" stroke="#1B1410" stroke-width="1.4"/>
      </svg>
      <svg width="54" height="70" viewBox="0 0 54 70" fill="none" aria-hidden="true" style="transform:scaleX(-1)">
        <ellipse cx="27" cy="65" rx="12" ry="5" fill="#C8E0D4" stroke="#1B1410" stroke-width="1.5"/>
        <path d="M27 64 Q27 40 15 28" stroke="#7CA982" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="12" cy="22" rx="11" ry="8" fill="#7CA982" stroke="#1B1410" stroke-width="1.5" transform="rotate(-25 12 22)"/>
        <path d="M27 55 Q27 38 38 30" stroke="#7CA982" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="41" cy="26" rx="9" ry="7" fill="#7CA982" stroke="#1B1410" stroke-width="1.5" transform="rotate(20 41 26)"/>
        <path d="M27 48 Q20 38 20 28" stroke="#7CA982" stroke-width="2" stroke-linecap="round" fill="none"/>
        <circle cx="20" cy="24" r="6" fill="#A8D5B8" stroke="#1B1410" stroke-width="1.4"/>
      </svg>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn btn-primary" onclick={onContinue}>
        Weiter{nextLabel ? ` · ${nextLabel}` : ''}
      </button>
      <button class="btn btn-secondary" onclick={onRetry}>Wiederholen</button>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100dvh;
    background: #FBF6EC;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .confetti {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 1.5rem 3rem;
    text-align: center;
  }

  .eyebrow {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #5A4E45;
  }

  .title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 3.5rem;
    font-style: italic;
    color: #E8654A;
    line-height: 1;
    margin-top: 4px;
  }

  .badge-row {
    display: flex;
    gap: 8px;
    margin-top: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .badge {
    background: #FFFCF5;
    border: 1.5px solid #1B1410;
    border-radius: 999px;
    padding: 4px 12px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #1B1410;
  }

  .stars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    margin: 1.5rem 0 1.25rem;
    min-height: 56px;
  }

  .star-wrap { display: flex; }

  .star-slam { display: flex; }

  .star-slam.earned {
    opacity: 0;
    animation: star-slam 0.44s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  @keyframes star-slam {
    0%   { opacity: 0; transform: scale(0) rotate(-25deg); }
    55%  { opacity: 1; transform: scale(1.55) rotate(7deg); filter: drop-shadow(0 0 12px #F5C518); }
    80%  { transform: scale(0.88) rotate(-3deg); filter: none; }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  /* Stats */
  .stats-row {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 360px;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    flex: 1;
    background: #FFFCF5;
    border: 2px solid #1B1410;
    border-radius: 16px;
    box-shadow: 3px 3px 0 #1B1410;
    padding: 0.75rem 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #5A4E45;
  }

  .stat-value {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.65rem;
    font-style: italic;
    color: #1B1410;
    line-height: 1.1;
  }

  .new-best {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.55rem;
    font-weight: 700;
    color: #E8654A;
    letter-spacing: 0.5px;
  }

  /* Wrong words */
  .wrong-section {
    width: 100%;
    max-width: 360px;
    background: #FFFCF5;
    border: 2px solid #1B1410;
    border-radius: 16px;
    box-shadow: 3px 3px 0 #1B1410;
    padding: 0.85rem 1rem;
    margin-bottom: 1.25rem;
    text-align: left;
  }

  .wrong-title {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #5A4E45;
    margin-bottom: 0.5rem;
  }

  .wrong-pair {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .wrong-clicked {
    color: #E8654A;
    text-decoration: line-through;
    text-decoration-color: #E8654A;
  }

  .wrong-arrow {
    color: #A89880;
    font-size: 0.85rem;
  }

  .wrong-correct {
    color: #2F5A3D;
    font-weight: 700;
  }

  /* Plants */
  .plants {
    display: flex;
    gap: 3rem;
    margin: 0.5rem 0 1rem;
    opacity: 0.9;
  }

  /* Actions */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 360px;
  }

  .btn {
    appearance: none;
    cursor: pointer;
    border-radius: 14px;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: 1rem;
    padding: 0.9rem 1.2rem;
    transition: transform 80ms, box-shadow 80ms;
    border: 2.5px solid #1B1410;
  }

  .btn:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 #1B1410 !important;
  }

  .btn-primary {
    background: #E8654A;
    color: #FFF6E8;
    box-shadow: 4px 4px 0 #1B1410;
  }

  .btn-secondary {
    background: transparent;
    color: #5A4E45;
    box-shadow: none;
    border-color: transparent;
    font-size: 0.95rem;
  }
</style>
