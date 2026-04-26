<script>
  import { dirLabel } from './theme.js';

  let { lesson, sectionLabel, dir, words = [], onBack, onStart } = $props();

  const label = $derived(dirLabel(lesson, dir));
</script>

<div class="page">
  <div class="header">
    <button class="back-btn" aria-label="Zurück" onclick={onBack}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M9 2L3 7l6 5" stroke="#1B1410" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div>
      <div class="header-eyebrow">Vokabeln</div>
      <div class="header-title">{lesson.name} · {sectionLabel}</div>
    </div>
  </div>

  <div class="dir-badge">{label}</div>

  <div class="word-list">
    {#each words as w, i}
      <div class="word-row" class:alt={i % 2 !== 0}>
        <span class="word-base">{w.base}</span>
        <span class="word-sep">→</span>
        <span class="word-target">{w.target}</span>
      </div>
    {/each}
  </div>

  <div class="footer">
    <button class="btn-start" onclick={onStart}>Jetzt starten</button>
  </div>
</div>

<style>
  .page {
    min-height: 100dvh;
    background: #FBF6EC;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 3.5rem 1.25rem 1rem;
    flex-shrink: 0;
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
    font-size: 1.4rem;
    color: #1B1410;
    line-height: 1.1;
    margin-top: 2px;
  }

  .dir-badge {
    align-self: flex-start;
    margin: 0 1.25rem 1rem;
    background: #FFFCF5;
    border: 1.5px solid #1B1410;
    border-radius: 999px;
    padding: 4px 14px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #1B1410;
    flex-shrink: 0;
  }

  .word-list {
    flex: 1;
    overflow-y: auto;
    margin: 0 1.25rem;
    border: 2px solid #1B1410;
    border-radius: 16px;
    box-shadow: 3px 3px 0 #1B1410;
    background: #FFFCF5;
    overflow: hidden;
  }

  .word-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0.75rem 1.1rem;
    font-size: 1rem;
    font-weight: 600;
    border-bottom: 1px solid #EDE5D5;
  }

  .word-row:last-child {
    border-bottom: none;
  }

  .word-row.alt {
    background: #F5F0E6;
  }

  .word-base {
    flex: 1;
    color: #1B1410;
  }

  .word-sep {
    color: #A89880;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .word-target {
    flex: 1;
    text-align: right;
    color: #2F5A3D;
    font-weight: 700;
  }

  .footer {
    padding: 1.25rem 1.25rem 2.5rem;
    flex-shrink: 0;
  }

  .btn-start {
    appearance: none;
    cursor: pointer;
    width: 100%;
    background: #E8654A;
    color: #FFF6E8;
    border: 2.5px solid #1B1410;
    border-radius: 14px;
    padding: 0.95rem;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: 1.05rem;
    box-shadow: 4px 4px 0 #1B1410;
    transition: transform 80ms, box-shadow 80ms;
  }

  .btn-start:active {
    transform: translate(4px, 4px);
    box-shadow: 0 0 0 #1B1410;
  }
</style>
