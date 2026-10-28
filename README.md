# Nota Kuliah

Notes you read while you listen. Open a lecture from YouTube next to a page that shows what the speaker is
discussing right now: topics, dalil, books and scholars mentioned, where it sits in the Prophet's life, lessons, and a
mind map. Every timestamp in the notes jumps the embedded YouTube player to that moment.

The first series is **Sirah Impak Sosial** by Ustaz Azlan Shah NK.

## Principles

- **Notes only.** The app never hosts or redistributes a speaker's audio or transcript. Lectures play from YouTube's own
  embedded player, so views and ads still go to the channel.
- **Transcripts are scratch work.** They stay in `private/` (git-ignored) and exist only to generate notes.
- **Say where things come from.** Quran text and translation come from a Quran source. Hadith text that has not been
  verified is flagged. Anything that is not from the lecture, such as suggested reading, is labelled.
- Please get the speaker's blessing before publishing notes for their lectures publicly.

## Run the app

```bash
npm install
npm run dev
```

Pages: `/` is the landing page, `/<series>` opens a series at its newest notes, `/<series>/<episode>` opens one episode, for
example `/sirah-impak-sosial/ep41`. The app reads `public/series/index.json` (list of series),
`public/series/<series>/index.json` (episodes) and `public/series/<series>/<ep>/notes.json` (the notes). When you deploy,
the host must serve `index.html` for unknown paths (a single-page-app rewrite). `public/_redirects` covers Cloudflare Pages and Netlify, and `vercel.json` covers Vercel.

## Add an episode

One command turns a YouTube lecture into notes:

```bash
python3 scripts/pipeline.py run https://www.youtube.com/watch?v=VIDEO_ID
```

For another series add `--series-slug my-series --series "My Series"`. Work files go to `private/<series>/<ep>/`.

| Stage        | What happens                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------- |
| `fetch`      | Downloads the audio (`yt-dlp`) and converts it (`ffmpeg`). Audio is deleted after step 2.    |
| `transcribe` | Whisper large-v3 (`whisper.cpp`) with a check for repetition loops and gaps. Retries in chunks. |
| `draft`      | Writes the prompt (`scripts/prompts/notes.md` plus the transcript). You ask Claude in the app to write the notes JSON from it. |
| `build`      | Looks up each quote to get an exact timestamp, fetches Quran text, validates, writes the notes. |

The `draft` stage needs no CLI and no API key. The pipeline stops after writing `private/<ep>/draft.prompt.md` and tells you
what to say to Claude in the app (or use the `add-episode` skill in this repo to do the whole flow in one go):

> Write private/sirah-impak-sosial/ep42/draft.json from private/sirah-impak-sosial/ep42/draft.prompt.md

Then run `python3 scripts/pipeline.py build ep42`. Claude never writes timestamps. It quotes the transcript and the build
step finds the time, so a quote that cannot be found is reported instead of silently producing a wrong timestamp.

For hands-off automation you can use `--backend claude-cli`, which calls `claude -p`.

Each stage can run alone (`fetch`, `transcribe`, `draft`, `build`), and finished stages are skipped. Useful flags:
`--force` to redo a stage, `--backend claude-cli` to automate the notes step, `--out file.json` to write somewhere else without
touching the index, `--strict` to fail on any warning, `--keep-audio` to keep the audio.

### Requirements

```bash
brew install yt-dlp ffmpeg whisper-cpp   # macOS
python3 scripts/pipeline.py model        # downloads the Whisper model (about 3 GB) to ~/.cache/nota-kuliah
```

Python 3.9 or newer, standard library only. To write the notes you need any Claude you can chat with.

### Add or refresh a series

This also records YouTube view counts, which the landing page uses for "most watched".


```bash
python3 scripts/build_index.py sirah-impak-sosial "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

## Review before publishing

The pipeline gives a good draft, not a finished work. Before sharing notes, read them against the video, check the
hadith entries marked "Teks perlu disemak", and check any numbers or statistics the speaker quoted.

## Project layout

```
src/                 React app (Vite, React Router, Tailwind, shadcn/ui)
scripts/pipeline.py  the pipeline
scripts/prompts/     the prompt that tells Claude what notes to write
public/series/       series list, one index.json per series, one notes.json per episode (published)
data/quran-cache.json  Quran text fetched so far (public text)
private/             audio and transcripts, per series (git-ignored)
```

See [ROADMAP.md](ROADMAP.md) for what is planned and [CONTRIBUTING.md](CONTRIBUTING.md) for how to help, including the commit message style (Conventional Commits).
