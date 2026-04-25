# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

There are no tests or linter config in this project.

## Architecture

Pure frontend Svelte 5 app (Vite). No backend — can be deployed as static files from `dist/`.

**`src/App.svelte`** — the entire game in one file (UI + all state). Uses Svelte 5 runes (`$state`, `$derived`). Key patterns:
- Timer runs via a real `setInterval` (started/cleared in `loadRound`/`onDestroy`)
- Combo bar restart uses a `{#key comboRestartKey}` block to destroy/recreate the element and replay the CSS `drain` animation on each correct guess
- Wrong-card flash and perfect-set flash are driven by `setTimeout` + reactive state, not CSS transitions

**`src/lib/vocab.js`** — pure JS data layer (no Svelte imports). Fetches config and vocab JSON from `/configs/` at runtime. `createRound` picks 6 random pairs, assigns 3 as targets, places cards at fixed grid positions.

**`src/lib/history.js`** — score history backed by `localStorage` under the key `word_matching_history`.

## Config & vocab data format

All data lives under `public/configs/` and is served as static files.

**`index.json`** — array of all game configs; loaded once on mount to populate the selector.

**Game config** (one JSON per game mode, e.g. `latin_german_1.json`):
```json
{
  "file": "latin_german_1.json",
  "name": "Latin – German 1",
  "vocab_file": "latin_1.json",
  "base_language": "german",
  "target_language": "latin",
  "round_seconds": 60,
  "combo_seconds": 2
}
```
`base_language` = language shown on the clickable board cards; `target_language` = language shown as targets at the bottom.

**Vocab file** (e.g. `latin_1.json`): nested `lesson → section → [items]`, each item a dict with one key per language plus optional `"grammar"`:
```json
{"latin": "esse", "grammar": "", "german": "sein"}
```
`vocab.js` flattens this into `[{base, target}]` using `base_language`/`target_language` as keys.

## Scoring rules

- Correct guess: +1 pt (or +2 if within the combo window after the previous correct guess)
- Wrong guess: −1 pt, combo resets
- Each correct guess adds 1 bonus second to the timer
- New high score for that config triggers confetti (canvas-confetti loaded from CDN on first trigger)