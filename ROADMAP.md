# Nota Kuliah roadmap

## Done
- Episode sidebar (collapsible), YouTube embed with a "now discussing" card that follows playback
- Notes for Sirah Impak Sosial Ep 41: summary, dalil, books, people, seerah era, lessons, mind map, glossary
- Quran text and Malay translation fetched from a public Quran API (`scripts/fetch_verses.py`)
- Interface switch between Malay (MS) and English (EN)
- Landing page, real URLs per series and episode (`/sirah-impak-sosial/ep41`), footer
- Ep 42 notes, produced end to end with the pipeline (in-app draft step)
- Remembers the last episode and position in this browser (local storage): continue card on the landing page and a resume banner in the notes
- Hadith cards link a verified hadith to its sunnah.com page (`sourceUrl`); search runs on one prebuilt index per language (`scripts/search-index.mjs`)
- Pipeline `scripts/pipeline.py`: fetch, transcribe (with loop check), draft notes with Claude, build (quotes become timestamps)

## Next
1. **More episodes.** Ep 11 and Ep 34 now have notes (27 of 49 episodes). Next candidates: the most watched episodes without notes (see `views` in `public/series/sirah-impak-sosial/index.json`).
2. **English notes.** The interface is bilingual. Notes are translated per episode as `notes.en.json` (`scripts/english_notes.py`); every episode so far has one; new episodes need theirs added.
3. Notes for the remaining 22 episodes of the series (27 of 49 done).
4. Hadith verification: work through [docs/hadith-review.md](docs/hadith-review.md), checking Arabic text, source and
   grade against a hadith source. The checklist is generated, so it shrinks as entries are verified.
5. Contribution guide and a "how to add an episode" section in the README.

6. **Share with family.** A share button per episode and per section (WhatsApp, copy link) that sends a short summary plus
   the link, so a husband can send a lesson to his wife, a father to his children.
7. **Search visibility (SEO).** Every URL serves one empty HTML shell today, so search engines and WhatsApp previews see almost nothing.
   Done: custom domain (notakuliah.com, www redirects to it) and the repo website field. Done: prerendering (`scripts/prerender.mjs`, run by `npm run build`), `sitemap.xml`, `robots.txt` and canonical URLs. Done: JSON-LD (WebSite, BreadcrumbList, Article), landing copy naming the series and speaker, and a share image (`public/og.jpg`). Still to do: Search Console and Bing (need the owner's accounts); a share image per episode. Original plan: prerender one HTML page per series and episode at build time (keyword title, description, canonical, Open Graph,
   and the summary and topic list as plain text); generate `sitemap.xml` and `robots.txt`; add JSON-LD; rewrite the landing page copy
   around "Nota Sirah Impak Sosial, Ustaz Azlan Shah NK"; then Search Console and Bing, the repo website field, and a custom domain
   (decide the domain first, since canonical and sitemap URLs use it).
8. **Popular episodes** are ranked by YouTube views for now. Later: our own reading counts.

## Principles
- Never publish the speaker's audio or transcript. Notes only, with timestamps that link back to the YouTube video.
- Label anything that is not from the lecture (for example suggested reading) as such.
