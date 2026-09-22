---
name: book-scan-lesson
description: Turn photographed vocabulary pages from the "book scans" folder into a new lesson's vocab JSON and index.json entry for this word-matching app. Use when the user says they added new scans/photos of a book lesson (Latin, German, or any language pair) and wants the assets/vocab generated, or asks to process "book scans".
---

# Book scan → lesson assets

Converts phone scans of a textbook vocabulary page (`book scans/*.HEIC` or similar)
into a `public/configs/<lang>_<n>.json` vocab file plus an `index.json` entry,
matching this repo's existing lesson format.

## Steps

1. **Find the new scans.** Look in the `book scans/` folder at the project root
   for image files not yet processed (HEIC/JPG/PNG). Filenames are usually a
   hint at the lesson number, e.g. `l6_1.HEIC`, `l6_2.HEIC` → lesson 6.

2. **Convert HEIC to a readable format.** The Read tool can't open HEIC directly.
   Convert with macOS `sips` into the session scratchpad directory:
   ```bash
   sips -s format jpeg "book scans/lX_N.HEIC" --out <scratchpad>/lX_N.jpg
   ```

3. **Read each converted image** with the Read tool and transcribe the
   vocabulary table. Textbook "Wortschatz" pages typically have:
   - A **Wiederholungswortschatz** (review words) block at the very top with
     no box number — **skip this**, it's not new vocabulary for this lesson.
   - A **Lernwörter** (new words) section below, broken into numbered boxes
     (e.g. `1`, `2`, `3`...) in the left margin. Each numbered box becomes one
     `section_N` in the vocab JSON.
   - Columns: base-language word (e.g. Latin), grammar info (genitive form,
     principal parts, case, "Adv.", "Präp. m. Akk.", etc.), and the German
     translation. Ignore the rightmost cognate/flag column (e.g. "akzeptieren",
     "bonus") — it's just a mnemonic aid, not part of the pair data.

4. **Determine the language pair and next lesson id.**
   - Check `public/configs/index.json` for the existing pattern (`la1..laN`
     for German↔Latin using `latin_N.json`, `de1..deN` for German↔English
     using `german_N.json`).
   - New lesson id/number = existing max + 1 for that language family.

5. **Write the vocab JSON** to `public/configs/<latin|german>_<N>.json`,
   following the existing nested shape:
   ```json
   {
     "lesson_<N>": {
       "section_1": [
         { "latin": "...", "grammar": "...", "german": "..." },
         ...
       ],
       "section_2": [ ... ]
     }
   }
   ```
   - Use the same language keys as sibling files (`latin`/`german` or
     `german`/`english`).
   - `grammar` is optional per item — use `""` if the book gives nothing (bare
     particles, adverbs without forms, etc.), otherwise copy the book's
     second-column text verbatim (case markers, principal parts, "nachgestellt", "Adv.", ...).
   - Preserve macrons and special characters exactly as printed.
   - Keep the book's numbered-box boundaries as section boundaries — don't
     regroup or resize sections. Sections with fewer than 6 words still work
     (the app pads by repeating pairs), but flag it to the user if a section
     looks unusually short — it may mean a box was misread.

6. **Add the entry to `public/configs/index.json`** (append, don't touch
   `index copy.json` — that's a personal scratch/backup file), matching the
   existing shape:
   ```json
   {
     "id": "la6",
     "name": "Latein Lektion 6",
     "vocab_file": "latin_6.json",
     "languages": ["german", "latin"]
   }
   ```
   `name` follows the book's numbering ("Latein Lektion N" / "Deutsch Lektion N").
   `languages[0]` is the base/prompt language, `languages[1]` is the board
   language — match sibling entries for that language pair.

7. **Validate** both JSON files parse:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('public/configs/<file>.json'))"
   ```

8. **Report back** a summary: lesson id, number of sections, word count per
   section, and anything you weren't fully confident reading (blurry text,
   ambiguous macrons) so the user can double-check against the physical page.

## Notes

- This is a pure data task — no Svelte/JS code changes are needed; the app
  picks up new lessons automatically from `index.json` and the vocab file.
- Never delete the original scan files in `book scans/` unless the user asks.
- If a page has multiple grammar note callouts with example sentences (bold
  Latin sentence + German translation), those are usage examples, not vocab
  pairs — don't add them as separate entries.
