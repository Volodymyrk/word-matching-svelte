<script>
  import { dirLabel } from './theme.js';

  let { lesson, sectionLabel, dir, score, isNewBest, onContinue, onRetry } = $props();

  const label = $derived(dirLabel(lesson, dir));
  const stars = $derived(score >= 20 ? 3 : score >= 10 ? 2 : score >= 1 ? 1 : 0);
</script>

<div class="page">
  <!-- Confetti dots -->
  <svg class="confetti" width="100%" height="100%">
    {#each Array.from({length: 24}) as _, i}
      {@const colors = ['#E8654A','#F0B83D','#7CA982','#FFD9A8','#C8E0D4']}
      {@const x = (i * 73) % 100}
      {@const y = (i * 47) % 92 + 4}
      {@const c = colors[i % colors.length]}
      {@const r = i % 3 === 0 ? 14 : 9}
      <circle cx="{x}%" cy="{y}%" r={r} fill={c} stroke="#1B1410" stroke-width="1.5" opacity="0.85"/>
    {/each}
  </svg>

  <div class="content">
    <div class="eyebrow">Geschafft!</div>
    <div class="title">Optime!</div>

    <div class="badge-row">
      <div class="lesson-badge">{lesson.name} · {sectionLabel}</div>
      <div class="dir-badge">{label}</div>
    </div>

    <!-- Stars -->
    <div class="stars">
      {#each [0, 1, 2] as i}
        <div class="star-wrap" style="transform: translateY({i === 1 ? '-10px' : '0'}) rotate({i === 0 ? '-8deg' : i === 2 ? '8deg' : '0deg'})">
          <div
            class="star-slam"
            class:earned={i < stars}
            style={i < stars ? `animation-delay: ${(i * 0.3 + 0.35).toFixed(2)}s` : ''}
          >
            <svg width="52" height="52" viewBox="0 0 24 24">
              <path
                d="M12 2.5l2.95 6.3 6.55.85-4.85 4.6 1.25 6.95L12 17.95 6.1 21.2l1.25-6.95L2.5 9.65l6.55-.85L12 2.5z"
                fill={i < stars ? '#F0B83D' : '#EDE5D5'}
                stroke={i < stars ? '#1B1410' : '#A89880'}
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      {/each}
    </div>

    <!-- Score card -->
    <div class="score-card">
      {#if isNewBest}
        <div class="new-best">★ Neuer Rekord!</div>
      {/if}
      <div class="score-num">{score}</div>
      <div class="score-label">Punkte</div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn btn-primary" onclick={onContinue}>Weiter</button>
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
    padding: 5rem 1.5rem 3rem;
    text-align: center;
  }

  .eyebrow {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
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

  .lesson-badge, .dir-badge {
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
    margin: 2rem 0 1.5rem;
  }

  .star-wrap { display: flex; }

  .star-slam {
    display: flex;
  }

  .star-slam.earned {
    opacity: 0;
    animation: star-slam 0.44s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  @keyframes star-slam {
    0%   { opacity: 0; transform: scale(0) rotate(-25deg); }
    55%  { opacity: 1; transform: scale(1.55) rotate(7deg); filter: drop-shadow(0 0 12px #F5C518); }
    80%  { transform: scale(0.88) rotate(-3deg); filter: drop-shadow(0 0 0 transparent); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  .score-card {
    background: #FFFCF5;
    border: 2.5px solid #1B1410;
    border-radius: 20px;
    box-shadow: 4px 4px 0 #1B1410;
    padding: 1.5rem 3rem;
    margin-bottom: 2.5rem;
  }

  .new-best {
    font-size: 0.75rem;
    font-weight: 700;
    color: #E8654A;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }

  .score-num {
    font-size: 3.5rem;
    font-weight: 700;
    color: #E8654A;
    line-height: 1;
  }

  .score-label {
    font-size: 0.9rem;
    color: #5A4E45;
    font-weight: 600;
    margin-top: 2px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 320px;
  }

  .btn {
    appearance: none;
    cursor: pointer;
    border-radius: 14px;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: 1.05rem;
    padding: 0.9rem 1.5rem;
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
