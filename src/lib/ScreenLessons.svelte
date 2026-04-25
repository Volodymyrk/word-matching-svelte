<script>
  import { roman } from './theme.js';
  import { lessonProgress } from './history.js';

  let { lessons, sectionsMap, progress, onSelect } = $props();

  // Group by language pair for section headers
  const groups = $derived.by(() => {
    const map = new Map();
    for (const l of lessons) {
      const key = l.languages.join('-');
      if (!map.has(key)) map.set(key, { langs: l.languages, items: [] });
      map.get(key).items.push(l);
    }
    return [...map.values()];
  });

  function groupLabel(langs) {
    const names = { german: 'Deutsch', latin: 'Latein', english: 'Englisch' };
    return langs.map(l => names[l] || l).join(' & ');
  }
</script>

<div class="page">
  <div class="header">
    <div class="brand-eyebrow">VOCABULA</div>
    <div class="brand-title">Maxima</div>
  </div>

  {#each groups as group}
    <div class="group-label">{groupLabel(group.langs)}</div>
    <div class="lesson-list">
      {#each group.items as lesson, localIdx}
        {@const prog = lessonProgress(lesson, sectionsMap[lesson.id] || [], progress)}
        {@const pct  = prog.totalSectionPlays
            ? Math.round((prog.doneSectionPlays / prog.totalSectionPlays) * 100)
            : 0}
        <button class="lesson-card" onclick={() => onSelect(lesson)}>
          <div class="numeral-circle"
            style="background:{pct === 100 ? '#7CA982' : pct > 0 ? '#E8654A' : '#D9D0BD'};
                   color:{pct > 0 ? '#FFF6E8' : '#8A8070'}">
            {roman(localIdx)}
          </div>
          <div class="lesson-info">
            <div class="lesson-name">{lesson.name}</div>
            {#if prog.totalSectionPlays > 0}
              <div class="lesson-meta">
                {prog.doneSectionPlays}/{prog.totalSectionPlays} Runden
                {#if prog.finalDone}&nbsp;· ★ Abgeschlossen{/if}
              </div>
            {/if}
            <div class="prog-track">
              <div class="prog-fill" style="width:{pct}%"></div>
            </div>
          </div>
          <svg class="chevron" width="10" height="16" viewBox="0 0 10 16">
            <path d="M2 2l6 6-6 6" stroke="#5A4E45" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .page {
    min-height: 100dvh;
    background: #FBF6EC;
    padding: 0 1rem 3rem;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  }

  .header {
    padding: 3.5rem 0.25rem 1.25rem;
  }

  .brand-eyebrow {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #5A4E45;
  }

  .brand-title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 3rem;
    font-style: italic;
    color: #E8654A;
    line-height: 1;
    margin-top: 2px;
  }

  .group-label {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #5A4E45;
    margin: 1.25rem 0.25rem 0.5rem;
  }

  .lesson-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .lesson-card {
    appearance: none;
    cursor: pointer;
    text-align: left;
    background: #FFFCF5;
    border: 2.5px solid #1B1410;
    border-radius: 16px;
    padding: 0.9rem 1rem;
    box-shadow: 3px 3px 0 #1B1410;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    transition: transform 80ms, box-shadow 80ms;
  }

  .lesson-card:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 #1B1410;
  }

  .numeral-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2.5px solid #1B1410;
    box-shadow: 2px 2px 0 #1B1410;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.2rem;
    font-style: italic;
    flex-shrink: 0;
    transition: background 200ms;
  }

  .lesson-info {
    flex: 1;
    min-width: 0;
  }

  .lesson-name {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.15rem;
    color: #1B1410;
    line-height: 1.15;
  }

  .lesson-meta {
    font-size: 0.72rem;
    color: #5A4E45;
    margin: 3px 0 6px;
  }

  .prog-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(0,0,0,0.07);
    border: 1px solid #1B1410;
    overflow: hidden;
  }

  .prog-fill {
    height: 100%;
    background: #E8654A;
    border-radius: 999px;
    transition: width 400ms ease;
  }

  .chevron { flex-shrink: 0; }
</style>
