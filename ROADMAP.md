# Nota Kuliah roadmap

## Done
- Episode sidebar (collapsible), YouTube embed with a "now discussing" card that follows playback
- Notes for Sirah Impak Sosial Ep 41: summary, dalil, books, people, seerah era, lessons, mind map, glossary
- Quran text and Malay translation fetched from a public Quran API (`scripts/fetch_verses.py`)
- Interface switch between Malay (MS) and English (EN)
- Landing page, real URLs per series and episode (`/sirah-impak-sosial/ep41`), footer
- Ep 42 notes, produced end to end with the pipeline (in-app draft step)
- Remembers the last episode and position in this browser (local storage): continue card on the landing page and a resume banner in the notes
- Pipeline `scripts/pipeline.py`: fetch, transcribe (with loop check), draft notes with Claude, build (quotes become timestamps)

## Next
1. **More episodes.** Ep 36, Ep 1 and Ep 40 are the most watched, so they are the best next candidates.
2. **English notes.** The interface is already bilingual, but notes content is Malay only.
   Plan: generate `notes.en.json` next to `notes.json` (same ids and timestamps, translated text)
   and have the app load the file for the active language, falling back to Malay.
3. Notes for the remaining 48 episodes of the series.
4. Hadith verification: work through [docs/hadith-review.md](docs/hadith-review.md), checking Arabic text, source and
   grade against a hadith source. The checklist is generated, so it shrinks as entries are verified.
5. Contribution guide and a "how to add an episode" section in the README.

6. **Share with family.** A share button per episode and per section (WhatsApp, copy link) that sends a short summary plus
   the link, so a husband can send a lesson to his wife, a father to his children.
7. **Real logo**, and the real repository link in the footer (`src/config.ts`).
8. **Popular episodes** are ranked by YouTube views for now. Later: our own reading counts.

## Principles
- Never publish the speaker's audio or transcript. Notes only, with timestamps that link back to the YouTube video.
- Label anything that is not from the lecture (for example suggested reading) as such.
