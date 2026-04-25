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

Pure frontend Svelte 5 app (Vite). No backend — deployed as static files from `dist/`.

### Screens & routing

`App.svelte` holds all state and routes between four screens via `screen: 'lessons' | 'saga' | 'game' | 'complete'`:

| Screen | Component | Purpose |
|---|---|---|
| `lessons` | `ScreenLessons.svelte` | Flat lesson list grouped by language pair |
| `saga` | `ScreenSaga.svelte` | Hex-node section map for a selected lesson |
| `game` | (inline in App.svelte) | Card-matching gameplay |
| `complete` | `ScreenComplete.svelte` | Score + stars after a round |

### Key files

**`src/App.svelte`** — all game state. Uses Svelte 5 runes (`$state`, `$derived`, `$derived.by`). Key state:
```js
let lessons         = $state([]);          // all lessons from index.json
let sectionsMap     = $state({});          // lessonId → sections[] (preloaded on mount)
let sections        = $state([]);          // sections for currently selected lesson
let selectedLesson  = $state(null);
let selectedSection = $state(null);        // { id, wordCount } or { id: 'final', isFinal: true }
let selectedDir     = $state(0);           // 0 or 1
let progress        = $state({});          // from localStorage
```

Navigation functions: `selectLesson(lesson)` → saga, `startGame(section, dir)` → game, `handleContinue()` → back to saga.

`loadRound()` passes `sectionId = selectedSection?.isFinal ? null : selectedSection?.id` to `createRound` (null = all words = final round).

Timer via `setInterval`, combo bar via `{#key comboRestartKey}` to replay CSS `drain` animation, wrong/perfect-set flashes via `setTimeout`.

**`src/lib/vocab.js`** — pure JS data layer:
- `fetchLessons()` → loads `index.json`, returns lessons array
- `fetchSections(lesson)` → returns `[{ id: "lessonKey/sectionKey", wordCount }]`
- `createRound(config, sectionId=null)` → picks 6 random pairs; null means all words

**`src/lib/history.js`** — localStorage under key `word_matching_history`:
- `markPlay(lessonId, sectionId, dir, score)` — records play; `sectionId` is `'final'` for final round
- `lessonProgress(lesson, sections, progress)` → `{ doneSectionPlays, totalSectionPlays, finalDone }`
- `getProgress()` / `setProgress()`

**`src/lib/theme.js`** — shared constants and helpers:
- `sectionLocked(lesson, idx, sections, progress)` — section 0 always open; N+1 needs N to have ≥1 dir done
- `finalLocked(lesson, sections, progress)` — locked until every section has ≥1 dir done
- `dirLabel(lesson, dir)` → `"DE → LA"` style badge text
- `roman(n)` → Roman numeral string

**`src/lib/ScreenSaga.svelte`** — hex-node zigzag section map:
- Nodes alternate left/right (`i % 2 !== 0` → `.right`)
- Each section node: colored by state (locked=sand, untouched=cream, current=terracotta, done=sage), Roman numeral, two direction dots
- Final node: circular (`magna` class), star icon when unlocked
- Tapping an unlocked node opens a fixed bottom panel (`dir-panel`) to pick direction
- `currentId` derived: first incomplete unlocked section (or final), shown with "HIER WEITER" callout

**`src/lib/ScreenLessons.svelte`** — lesson list:
- Groups lessons by language pair for section headers
- Progress bar per lesson uses `lessonProgress(lesson, sectionsMap[lesson.id] || [], progress)`
- Roman numeral circle colored by completion %

**`src/lib/ScreenComplete.svelte`** — round-end screen:
- Props: `{ lesson, sectionLabel, dir, score, isNewBest, onContinue, onRetry }`
- Stars (0–3), score card, confetti SVG decoration

### Progress data shape (localStorage)

```js
{
  [lessonId]: {
    [sectionId]: {          // e.g. "lesson_1/section_1" or "final"
      "0": { done: bool, best: number },
      "1": { done: bool, best: number }
    }
  }
}
```

Direction index: `dir=0` → `languages[0]` on board, `languages[1]` as prompts; `dir=1` flipped.

## Config & vocab data format

All data lives under `public/configs/` and is served as static files.

**`index.json`** — flat array of 7 lessons: la1–la5 (German–Latin), de1–de2 (German–English). Each lesson:
```json
{
  "id": "la1",
  "name": "Latein Lektion 1",
  "vocab_file": "latin_1.json",
  "languages": ["german", "latin"],
  "round_seconds": 60,
  "combo_seconds": 2
}
```
`languages[dir]` = language shown on the board for that direction; `languages[1-dir]` = prompt language.

**Vocab file** (e.g. `latin_1.json`): nested `lessonKey → sectionKey → [items]`, each item has one key per language plus optional `"grammar"`:
```json
{ "latin": "esse", "grammar": "", "german": "sein" }
```

Section IDs are `"lessonKey/sectionKey"` (e.g. `"lesson_1/section_1"`). Final round uses `sectionId = null` in `createRound`.

## Design system

Neo-brutal style: thick `#1B1410` borders, offset box-shadows (`3px 3px 0 #1B1410`), cream/peach/sage palette. All tokens in `theme.js` under `T`.

Fonts (Google Fonts): DM Serif Display (headings, italic), Bricolage Grotesque (body/buttons), Geist Mono (labels/badges).

## Scoring rules

- Correct guess: +1 pt (or +2 within combo window after previous correct)
- Wrong guess: −1 pt, combo resets
- Each correct guess adds 1 bonus second to timer
- New high score triggers confetti (canvas-confetti from CDN, loaded lazily)
