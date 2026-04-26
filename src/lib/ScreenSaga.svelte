<script>
  import { roman, dirLabel, levelLocked, finalLocked } from './theme.js';

  let { lesson, sections, progress, starThresholds = [1, 10, 20], onBack, onStart } = $props();

  let finalSelected = $state(false);
  const FINAL = 'final';

  function isDone(sectionId, dir) {
    return !!progress[lesson.id]?.[sectionId]?.[String(dir)]?.done;
  }

  function bestScore(sectionId, dir) {
    return progress[lesson.id]?.[sectionId]?.[String(dir)]?.best ?? -1;
  }

  function starsFor(sectionId, dir) {
    const b = bestScore(sectionId, dir);
    return b >= starThresholds[2] ? 3 : b >= starThresholds[1] ? 2 : b >= starThresholds[0] ? 1 : 0;
  }

  function hasEnoughStars(sectionId, dir) {
    return bestScore(sectionId, dir) >= starThresholds[1];
  }

  const isFinalUnlocked = $derived(!finalLocked(lesson, sections, progress, starThresholds));

  // Flat level list: for each section, dir=1 first (target→source), then dir=0 (source→target)
  const levels = $derived(sections.flatMap((section, i) => [
    { section, sectionIdx: i, dir: 1 },
    { section, sectionIdx: i, dir: 0 },
  ]));

  const currentLevelKey = $derived.by(() => {
    for (const lv of levels) {
      if (levelLocked(lesson, lv.sectionIdx, lv.dir, sections, progress, starThresholds)) continue;
      if (!hasEnoughStars(lv.section.id, lv.dir)) return `${lv.section.id}:${lv.dir}`;
    }
    if (isFinalUnlocked && (!isDone(FINAL, 0) || !isDone(FINAL, 1))) return FINAL;
    return null;
  });

  const fd0      = $derived(isDone(FINAL, 0));
  const fd1      = $derived(isDone(FINAL, 1));
  const fAllDone = $derived(fd0 && fd1);
  const fCurrent = $derived(currentLevelKey === FINAL);
  const fFill    = $derived(!isFinalUnlocked ? '#D9D0BD' : fAllDone ? '#7CA982' : fCurrent ? '#E8654A' : '#FFFCF5');
  const fRow     = $derived(levels.length % 2 !== 0);
</script>

<div class="page">
  <div class="header">
    <button class="back-btn" aria-label="Zurück zur Lektionsauswahl" onclick={onBack}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M9 2L3 7l6 5" stroke="#1B1410" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div>
      <div class="header-eyebrow">Lernpfad</div>
      <div class="header-title">{lesson.name}</div>
    </div>
  </div>

  <div class="saga">
    {#each levels as lv, i}
      {@const locked    = levelLocked(lesson, lv.sectionIdx, lv.dir, sections, progress, starThresholds)}
      {@const cleared   = hasEnoughStars(lv.section.id, lv.dir)}
      {@const isCurrent = `${lv.section.id}:${lv.dir}` === currentLevelKey}
      {@const fill      = locked ? '#D9D0BD' : cleared ? '#7CA982' : isCurrent ? '#E8654A' : '#FFFCF5'}
      {@const numColor  = cleared ? '#2F5A3D' : isCurrent ? '#FFF6E8' : '#1B1410'}
      {@const stars     = starsFor(lv.section.id, lv.dir)}

      <div class="node-row" class:right={i % 2 !== 0}>
        {#if isCurrent}
          <div class="callout">HIER WEITER<div class="callout-arrow"></div></div>
        {/if}
        <button
          class="node-btn"
          class:locked
          onclick={() => !locked && onStart(lv.section, lv.dir)}
        >
          <div class="hex-wrap">
            <svg width="88" height="96" viewBox="0 0 100 110" style="overflow:visible">
              <polygon
                points="50,2 96,26 96,84 50,108 4,84 4,26"
                fill={fill}
                stroke="#1B1410"
                stroke-width="2.5"
                stroke-linejoin="round"
                stroke-dasharray={locked ? '4 5' : 'none'}
                filter={locked ? '' : 'drop-shadow(3px 4px 0 #1B1410)'}
              />
            </svg>
            <div class="hex-content">
              {#if locked}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="9" rx="2" fill="#8A8070"/>
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#8A8070" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
              {:else}
                <div class="hex-numeral" style="color:{numColor}">{roman(lv.sectionIdx)}</div>
              {/if}
            </div>
          </div>
          <div class="node-label" style="color:{locked ? '#8A8070' : '#1B1410'}">
            {dirLabel(lesson, lv.dir)}
          </div>
          {#if !locked}
            <div class="level-stars">
              {#each [0, 1, 2] as s}
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path
                    d="M12 2.5l2.95 6.3 6.55.85-4.85 4.6 1.25 6.95L12 17.95 6.1 21.2l1.25-6.95L2.5 9.65l6.55-.85L12 2.5z"
                    fill={s < stars ? '#F0B83D' : '#EDE5D5'}
                    stroke={s < stars ? '#1B1410' : '#A89880'}
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                </svg>
              {/each}
            </div>
          {/if}
        </button>
      </div>
    {/each}

    <!-- Final node -->
    <div class="node-row" class:right={fRow}>
      {#if fCurrent}
        <div class="callout">HIER WEITER<div class="callout-arrow"></div></div>
      {/if}
      <button
        class="node-btn"
        class:locked={!isFinalUnlocked}
        onclick={() => { if (isFinalUnlocked) finalSelected = !finalSelected; }}
      >
        <div class="magna" style="background:{fFill}">
          {#if !isFinalUnlocked}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" fill="#8A8070"/>
              <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#8A8070" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          {:else}
            <span class="magna-star" style="color:{fAllDone ? '#2F5A3D' : '#1B1410'}">★</span>
          {/if}
        </div>
        <div class="node-label" style="color:{!isFinalUnlocked ? '#8A8070' : '#1B1410'}">
          Finalrunde
        </div>
        {#if isFinalUnlocked}
          <div class="level-stars">
            {#each [0, 1, 2] as s}
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path
                  d="M12 2.5l2.95 6.3 6.55.85-4.85 4.6 1.25 6.95L12 17.95 6.1 21.2l1.25-6.95L2.5 9.65l6.55-.85L12 2.5z"
                  fill={s < Math.max(starsFor(FINAL, 0), starsFor(FINAL, 1)) ? '#F0B83D' : '#EDE5D5'}
                  stroke={s < Math.max(starsFor(FINAL, 0), starsFor(FINAL, 1)) ? '#1B1410' : '#A89880'}
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
              </svg>
            {/each}
          </div>
        {/if}
      </button>
    </div>
  </div>

  <!-- Direction picker panel (final round only) -->
  {#if finalSelected}
    <div class="dir-panel">
      <div class="dir-panel-label">Finalrunde · Richtung wählen</div>
      <div class="dir-btns">
        {#each [0, 1] as dir}
          {@const done = isDone(FINAL, dir)}
          <button
            class="dir-btn"
            class:dir-done={done}
            onclick={() => { onStart({ id: FINAL, isFinal: true }, dir); finalSelected = false; }}
          >
            <span class="dir-btn-label">{dirLabel(lesson, dir)}</span>
            {#if done}<span class="dir-check">✓</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    min-height: 100dvh;
    background: #FBF6EC;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    padding-bottom: 7rem;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 3.5rem 1.1rem 1rem;
  }

  .back-btn {
    appearance: none;
    cursor: pointer;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #FFFCF5;
    border: 2px solid #1B1410;
    box-shadow: 2px 2px 0 #1B1410;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-eyebrow {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #5A4E45;
  }

  .header-title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.5rem;
    color: #1B1410;
    line-height: 1.1;
    margin-top: 1px;
  }

  .saga {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2.5rem;
    padding: 1.5rem 0 1rem;
    position: relative;
  }

  .node-row {
    padding-left: 2rem;
    position: relative;
  }

  .node-row.right {
    align-self: flex-end;
    padding-left: 0;
    padding-right: 2rem;
  }

  .callout {
    position: absolute;
    top: -34px;
    left: 50%;
    transform: translateX(-50%);
    background: #1B1410;
    color: #FBF6EC;
    padding: 4px 10px;
    border-radius: 8px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    z-index: 2;
  }

  .callout-arrow {
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #1B1410;
  }

  .node-btn {
    appearance: none;
    cursor: pointer;
    background: transparent;
    border: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 0;
  }

  .node-btn.locked { cursor: default; opacity: 0.7; }

  .hex-wrap {
    position: relative;
    width: 88px;
    height: 96px;
  }

  .hex-wrap svg { position: absolute; inset: 0; }

  .hex-content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hex-numeral {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.8rem;
    font-style: italic;
    line-height: 1;
  }

  .magna {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 3px solid #1B1410;
    box-shadow: 4px 5px 0 #1B1410;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .magna-star {
    font-size: 2.2rem;
    line-height: 1;
  }

  .node-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .level-stars {
    display: flex;
    gap: 3px;
  }

  .dir-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFCF5;
    border-top: 2.5px solid #1B1410;
    box-shadow: 0 -4px 0 #1B1410;
    padding: 1rem 1.25rem 2rem;
    z-index: 10;
    max-width: 600px;
    margin: 0 auto;
  }

  .dir-panel-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #5A4E45;
    text-align: center;
    margin-bottom: 0.75rem;
  }

  .dir-btns { display: flex; gap: 0.75rem; }

  .dir-btn {
    flex: 1;
    appearance: none;
    cursor: pointer;
    background: #E8654A;
    color: #FFF6E8;
    border: 2.5px solid #1B1410;
    border-radius: 14px;
    padding: 0.85rem;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    box-shadow: 3px 3px 0 #1B1410;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: transform 80ms, box-shadow 80ms;
  }

  .dir-btn:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 #1B1410;
  }

  .dir-btn.dir-done {
    background: #7CA982;
    color: #2F5A3D;
  }

  .dir-btn-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .dir-check { font-size: 1rem; font-weight: 700; }
</style>
