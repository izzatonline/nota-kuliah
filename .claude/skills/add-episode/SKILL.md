---
name: add-episode
description: Turn a YouTube lecture into notes for the Nota Kuliah app. Use when asked to add, process or generate notes for an episode or video URL.
---

Add an episode to Nota Kuliah. The default series is `sirah-impak-sosial`; for another series pass `--series-slug` and `--series` to the pipeline. You are the model that writes the notes, so no CLI or API key is involved.

1. **Prepare.** Run `python3 scripts/pipeline.py run <youtube-url>`. This downloads audio, transcribes it (checking for
   Whisper loops) and writes `private/<series>/<ep>/draft.prompt.md`. Downloading is a real action: confirm the video with the
   user first unless they already named it.
2. **Write the draft.** Read `private/<series>/<ep>/draft.prompt.md` and write `private/<series>/<ep>/draft.json` exactly as that prompt
   describes. You never write timestamps: every item carries a verbatim `at` quote copied from the transcript plus an
   `approx` "m:ss". Quran items carry only `surah:ayah`. Do not invent narrators, sources, names or numbers.
3. **Build.** Run `python3 scripts/pipeline.py build <ep>`. Read the report. For every item "not placed by an exact quote",
   fix its `at` in `draft.json` (copy a real phrase from the transcript block near `approx`) and build again.
4. **Report.** Tell the user the counts, any remaining warnings, and that hadith entries marked unverified need a human
   check. Do not commit or publish `private/`; transcripts and audio are never published.
