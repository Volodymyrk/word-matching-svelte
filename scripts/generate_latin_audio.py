#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = ["py-espeak-ng"]
# ///
"""
Generate WAV audio files for all Latin words in latin_1-5.json
and write an "audio" field back into each vocab entry.

Usage:
    uv run scripts/generate_latin_audio.py
"""

import json
import re
import unicodedata
from pathlib import Path

from espeakng import ESpeakNG

BASE       = Path(__file__).resolve().parent.parent
AUDIO_DIR  = BASE / "public" / "audio" / "la"
CONFIGS    = BASE / "public" / "configs"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)

espeak = ESpeakNG()
espeak.voice = "la"
espeak.speed = 130   # slightly slower than default for clarity


def slugify(word: str) -> str:
    """'cōgitāre' → 'cogitare'  |  'quid?' → 'quid'"""
    nfd = unicodedata.normalize("NFD", word)
    ascii_ = nfd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", ascii_.lower()).strip("_") or "word"


seen: dict[str, str] = {}   # slug → original word (collision guard)
total = 0

for n in range(1, 6):
    config_path = CONFIGS / f"latin_{n}.json"
    data = json.loads(config_path.read_text(encoding="utf-8"))
    dirty = False

    for lesson in data.values():
        for section in lesson.values():
            for entry in section:
                word = entry.get("latin", "").strip()
                if not word:
                    continue

                slug = slugify(word)
                # resolve collisions: same slug, different word
                if slug in seen and seen[slug] != word:
                    slug = f"{slug}_{abs(hash(word)) % 9999:04d}"
                seen[slug] = word

                filename  = f"{slug}.wav"
                out_path  = AUDIO_DIR / filename
                audio_ref = f"la/{filename}"

                if not out_path.exists():
                    print(f"  synthesising: {word:30s} → {filename}")
                    wav_bytes = espeak.synth_wav(word)
                    out_path.write_bytes(wav_bytes)
                    total += 1

                if entry.get("audio") != audio_ref:
                    entry["audio"] = audio_ref
                    dirty = True

    if dirty:
        config_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"✓  updated {config_path.name}")

print(f"\nDone — {total} new files, {len(seen)} words total → {AUDIO_DIR}")
