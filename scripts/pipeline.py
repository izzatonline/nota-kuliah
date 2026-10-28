#!/usr/bin/env python3
"""Turn a YouTube lecture into notes for the app, one command per episode.

    python3 scripts/pipeline.py run https://www.youtube.com/watch?v=VIDEO_ID

Stages (each can also be run alone, and finished stages are skipped):

    fetch        download audio with yt-dlp, convert with ffmpeg      -> private/<ep>/audio.wav
    transcribe   Whisper large-v3 with a loop/gap check               -> private/<ep>/transcript.json
    draft        writes the prompt for Claude; you ask Claude in the app to
                 write the notes from it (no CLI or API key needed)       -> private/<ep>/draft.json
    build        resolve quotes to timestamps, fetch Quran text,
                 validate, write notes and update the index           -> public/lectures/<ep>/notes.json

Audio and transcripts stay in private/ (git-ignored) and the audio is deleted after transcription unless
--keep-audio is given. Only the notes are published. Requires: yt-dlp, ffmpeg, whisper-cli and the Whisper model
(see `pipeline.py model`). Standard library only. `--backend claude-cli` can call `claude -p` instead, for automation.
"""
import argparse
import collections
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / "private"          # set per series in main(): private/<slug>
LECTURES = ROOT / "public/series"   # set per series in main(): public/series/<slug>
QURAN_CACHE = ROOT / "data/quran-cache.json"
CARE_NOTE = ROOT / "data/care-note.json"
PROMPT = Path(__file__).resolve().parent / "prompts/notes.md"
MODEL = Path(os.environ.get("WHISPER_MODEL", Path.home() / ".cache/nota-kuliah/ggml-large-v3.bin"))
MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"


class PipelineError(Exception):
    pass


def log(msg):
    print(f"\033[1m==>\033[0m {msg}", flush=True)


def need(binary, hint):
    if not shutil.which(binary):
        raise PipelineError(f"`{binary}` not found. {hint}")


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


# ------------------------------------------------------------------ helpers
def video_id(arg):
    m = re.search(r"(?:v=|youtu\.be/|^)([A-Za-z0-9_-]{11})(?:[&?/]|$)", arg)
    if not m:
        raise PipelineError(f"cannot find a YouTube video id in {arg!r}")
    return m.group(1)


def clean_title(title):
    """'Ep 41: Bertemu Allah | Sirah Impak Sosial | Ustaz ...' -> 'Bertemu Allah'."""
    m = re.match(r"^Ep\s*(\d+)\s*[:|]?\s*(.*)$", title)
    body = m.group(2) if m else title
    drop = re.compile(r"^(Sirah Impak Sosial|Sirah Nabi Muhammad SAW|Ustaz Azlan Shah( NK)?|Azlan Shah NK|"
                      r"Kisah Kehidupan Nabi Muhammad SAW|Season 2 Finale.*)$", re.I)
    parts = [p.strip() for p in body.split("|") if p.strip() and not drop.match(p.strip())]
    return parts[0] if parts else title


def resolve_workdir(target):
    """`ep41` (existing private dir) or a URL/id (looked up by the video id stored in meta.json)."""
    if (PRIVATE / target / "meta.json").exists():
        return PRIVATE / target
    vid = video_id(target)
    for meta in PRIVATE.glob("*/meta.json"):
        if json.loads(meta.read_text()).get("youtubeId") == vid:
            return meta.parent
    return None


def load_meta(workdir):
    return json.loads((workdir / "meta.json").read_text())


# -------------------------------------------------------------------- model
def cmd_model(_args):
    if MODEL.exists():
        print(f"model already at {MODEL}")
        return
    log(f"downloading Whisper large-v3 (about 3 GB) to {MODEL}")
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    run(["curl", "-L", "--fail", "-o", str(MODEL), MODEL_URL])


# -------------------------------------------------------------------- fetch
def stage_fetch(target, args):
    need("yt-dlp", "brew install yt-dlp")
    need("ffmpeg", "brew install ffmpeg")
    workdir = resolve_workdir(target)
    if workdir is None:
        vid = video_id(target)
        log(f"reading video info for {vid}")
        info = json.loads(run(["yt-dlp", "--no-playlist", "--dump-single-json", f"https://www.youtube.com/watch?v={vid}"],
                              capture_output=True, text=True).stdout)
        m = re.match(r"^Ep\s*(\d+)", info["title"])
        ep = f"ep{int(m.group(1))}" if m else f"prolog-{vid}"
        workdir = PRIVATE / (args.id or ep)
        workdir.mkdir(parents=True, exist_ok=True)
        meta = {
            "id": workdir.name,
            "youtubeId": vid,
            "number": int(m.group(1)) if m else None,
            "rawTitle": info["title"],
            "title": clean_title(info["title"]),
            "channel": info.get("channel") or info.get("uploader"),
            "duration": int(info["duration"]),
        }
        (workdir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    meta = load_meta(workdir)
    log(f"{meta['id']}: {meta['title']} ({meta['duration'] // 60} min)")

    if (workdir / "transcript.json").exists() and not args.force:
        log("transcript already exists, skipping download")
        return workdir
    wav = workdir / "audio.wav"
    if wav.exists() and not args.force:
        return workdir
    mp3 = workdir / "audio.mp3"
    if not mp3.exists():
        log("downloading audio")
        run(["yt-dlp", "--no-playlist", "-x", "--audio-format", "mp3", "-o", str(workdir / "audio.%(ext)s"),
             f"https://www.youtube.com/watch?v={meta['youtubeId']}"])
    log("converting to 16 kHz mono wav")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "16000", "-ac", "1", str(wav)])
    return workdir


# --------------------------------------------------------------- transcript
def load_segments(path):
    data = json.loads(Path(path).read_text())["transcription"]
    segs = [(s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000, s["text"].strip()) for s in data]
    return [s for s in segs if s[2]]


def check_transcript(segs, duration):
    """Return a list of problems. An empty list means the transcript looks usable."""
    problems = []
    if not segs:
        return ["transcript is empty"]
    coverage = segs[-1][1] / duration
    if coverage < 0.93:
        problems.append(f"transcript only reaches {coverage:.0%} of the audio")
    run_len = best = 1
    for a, b in zip(segs, segs[1:]):
        run_len = run_len + 1 if a[2] == b[2] else 1
        best = max(best, run_len)
    if best > 3:
        problems.append(f"a segment repeats {best} times in a row (Whisper loop)")
    common = collections.Counter(s[2] for s in segs if len(s[2]) > 8).most_common(1)
    if common and common[0][1] >= 20:
        problems.append(f"the line {common[0][0]!r} appears {common[0][1]} times")
    gap = max((b[0] - a[1] for a, b in zip(segs, segs[1:])), default=0)
    if gap > 180:
        problems.append(f"{gap / 60:.0f} minute gap with no speech recognised")
    return problems


def whisper(wav, out_base, lang, extra=()):
    run(["whisper-cli", "-m", str(MODEL), "-f", str(wav), "-l", lang, "-mc", "0", "-sns", "-oj", "-of", str(out_base), *extra],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Path(f"{out_base}.json")


def transcribe_chunked(wav, workdir, lang, minutes=10):
    """Fallback: transcribe independent chunks so a loop cannot run on past one chunk."""
    merged, step = [], minutes * 60
    chunks = workdir / "chunks"
    chunks.mkdir(exist_ok=True)
    total = int(float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)],
                          capture_output=True, text=True).stdout))
    for i, start in enumerate(range(0, total, step)):
        piece = chunks / f"{i:03d}.wav"
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-t", str(step), "-i", str(wav), "-c", "copy", str(piece)])
        log(f"  chunk {i + 1}/{-(-total // step)}")
        out = whisper(piece, chunks / f"{i:03d}", lang)
        for a, b, text in load_segments(out):
            merged.append({"offsets": {"from": int((a + start) * 1000), "to": int((b + start) * 1000)}, "text": text})
    shutil.rmtree(chunks)
    return {"transcription": merged}


def stage_transcribe(workdir, args):
    need("whisper-cli", "brew install whisper-cpp")
    meta = load_meta(workdir)
    out = workdir / "transcript.json"
    if out.exists() and not args.force:
        problems = check_transcript(load_segments(out), meta["duration"])
        if not problems:
            log("transcript already exists and looks fine, skipping")
            return
        log("existing transcript has problems, redoing: " + "; ".join(problems))
    if not MODEL.exists():
        raise PipelineError(f"Whisper model not found at {MODEL}. Run: python3 scripts/pipeline.py model")
    wav = workdir / "audio.wav"
    if not wav.exists():
        raise PipelineError("audio.wav is missing. Run the fetch stage first.")

    log("transcribing (about 1/10 of the audio length on an M-series Mac)")
    path = whisper(wav, workdir / "transcript", args.lang)
    problems = check_transcript(load_segments(path), meta["duration"])
    if problems:
        log("transcript check failed: " + "; ".join(problems))
        log("retrying in 10 minute chunks")
        path.write_text(json.dumps(transcribe_chunked(wav, workdir, args.lang), ensure_ascii=False))
        problems = check_transcript(load_segments(path), meta["duration"])
        if problems:
            raise PipelineError("transcript still looks wrong: " + "; ".join(problems))
    log(f"transcript ok: {len(load_segments(path))} segments")
    if not args.keep_audio:
        for f in (wav, workdir / "audio.mp3"):
            f.unlink(missing_ok=True)
        log("deleted audio (use --keep-audio to keep it)")


def blocks_text(segs, every=45):
    out, cur = [], None
    for start, _, text in segs:
        if cur is None or start - cur[0] >= every:
            if cur:
                out.append(cur)
            cur = [start, text]
        else:
            cur[1] += " " + text
    out.append(cur)
    return "\n".join(f"[{int(s // 60)}:{int(s % 60):02d}] {t}" for s, t in out)


# -------------------------------------------------------------------- draft
def extract_json(text):
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no JSON object in the reply")
    return json.loads(text[start:end + 1])


def stage_draft(workdir, args):
    """Returns True when draft.json exists afterwards, False when it is waiting for you to supply it."""
    meta = load_meta(workdir)
    out = workdir / "draft.json"
    if out.exists() and not args.force:
        log("draft already exists, skipping (use --force to redo)")
        return True
    if not (workdir / "transcript.json").exists():
        raise PipelineError("transcript.json is missing. Run the transcribe stage first.")
    segs = load_segments(workdir / "transcript.json")
    prompt = (
        PROMPT.read_text()
        + f"\n\n## Lecture\nTitle: {meta['title']}\nSeries: {args.series}\nSpeaker: {args.speaker}\n"
        + f"Episode: {meta.get('number')}\nLength: {meta['duration'] // 60} minutes\n\n"
        + "## Transcript\n" + blocks_text(segs) + "\n"
    )
    prompt_file = workdir / "draft.prompt.md"
    prompt_file.write_text(prompt)
    by_hand = (
        f"The full prompt is saved in {prompt_file.relative_to(ROOT)}. Give it to any Claude, save the JSON reply as "
        f"{out.relative_to(ROOT)}, then run: python3 scripts/pipeline.py build {meta['id']}"
    )
    if args.backend == "file":
        log(f"prompt ready: {prompt_file.relative_to(ROOT)} (about {len(prompt) // 4000}k tokens)")
        print(
            f"\nNext: in the Claude app, ask:\n"
            f"  Write {out.relative_to(ROOT)} from {prompt_file.relative_to(ROOT)}\n"
            f"then run:\n  python3 scripts/pipeline.py build {meta['id']}\n"
        )
        return False

    need("claude", "install Claude Code, or use the default --backend file")
    cmd = ["claude", "-p", "--tools", "", "--no-session-persistence", "--output-format", "text"]
    if args.model:
        cmd += ["--model", args.model]
    error = ""
    for attempt in (1, 2):
        log(f"asking Claude for notes (attempt {attempt}, about {len(prompt) // 4000}k tokens in)")
        extra = f"\n\nYour previous reply was not valid JSON ({error}). Reply with the JSON object only." if error else ""
        with tempfile.TemporaryDirectory() as tmp:  # neutral cwd: no project files in scope
            res = subprocess.run(cmd, input=prompt + extra, capture_output=True, text=True, cwd=tmp, timeout=1800)
        if res.returncode != 0:
            # the CLI prints some errors (such as billing) on stdout, so show both
            detail = (res.stderr.strip() or res.stdout.strip() or "no output")[:300]
            raise PipelineError(f"claude failed: {detail}\n{by_hand}")
        (workdir / "draft.raw.txt").write_text(res.stdout)
        try:
            out.write_text(json.dumps(extract_json(res.stdout), ensure_ascii=False, indent=1))
            log(f"draft saved to {out.relative_to(ROOT)}")
            return True
        except ValueError as e:
            error = str(e)
    raise PipelineError(f"Claude did not return valid JSON twice: {error}. See {workdir / 'draft.raw.txt'}\n{by_hand}")


# -------------------------------------------------------------------- build
def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", s.lower())).strip()


class Locator:
    """Turns a quoted phrase into a time in seconds, using the transcript."""

    def __init__(self, segs):
        self.text, self.spans = "", []
        for start, _, t in segs:
            n = norm(t)
            if n:
                self.spans.append((len(self.text), start))
                self.text += n + " "
        self.report = []  # (where, quote, how)

    def time_at(self, index):
        t = 0
        for pos, ts in self.spans:
            if pos <= index:
                t = ts
            else:
                break
        return t

    @staticmethod
    def parse(approx):
        if not approx:
            return None
        m = re.match(r"^(?:(\d+):)?(\d+):(\d+)$", str(approx).strip())
        if not m:
            return None
        return int(m.group(1) or 0) * 3600 + int(m.group(2)) * 60 + int(m.group(3))

    def find(self, where, at, approx):
        near = self.parse(approx)
        q = norm(at or "")
        hits = []
        if q and len(q.split()) < 2:
            self.report.append((where, at, "quote is shorter than 2 words, ignored"))
            q = ""
        if q:
            # match whole words only: pad both sides so 'x' cannot match inside another word
            padded, needle = " " + self.text, f" {q} "
            i = padded.find(needle)
            while i >= 0:
                hits.append(self.time_at(i))  # i is the index of the space before the quote, which is the quote start in self.text
                i = padded.find(needle, i + 1)
        if hits:
            best = min(hits, key=lambda h: abs(h - near)) if near is not None else hits[0]
            if near is not None and abs(best - near) > 180:
                self.report.append((where, at, f"quote found at {int(best)}s but approx says {int(near)}s, kept quote"))
            return int(best)
        if q and near is not None:  # fuzzy match within 90 seconds of the hint
            words, qn = self.text.split(), len(q.split())
            best, score = None, 0
            idx = 0
            for w_i in range(max(0, len(words) - qn + 1)):
                pos = idx
                idx += len(words[w_i]) + 1
                if abs(self.time_at(pos) - near) > 90:
                    continue
                r = difflib.SequenceMatcher(None, " ".join(words[w_i:w_i + qn]), q).ratio()
                if r > score:
                    best, score = self.time_at(pos), r
            if best is not None and score >= 0.8:
                self.report.append((where, at, f"fuzzy match ({score:.0%})"))
                return int(best)
        if near is not None:
            self.report.append((where, at, "quote not found, used approx"))
            return int(near)
        self.report.append((where, at, "no quote and no approx"))
        return None


def fetch_quran(refs):
    cache = json.loads(QURAN_CACHE.read_text()) if QURAN_CACHE.exists() else {}
    missing = [r for r in refs if r not in cache]
    for ref in missing:
        try:
            url = f"https://api.alquran.cloud/v1/ayah/{ref}/editions/quran-uthmani,ms.basmeih"
            with urllib.request.urlopen(url, timeout=20) as r:
                data = {e["edition"]["identifier"]: e for e in json.load(r)["data"]}
            a, m = data["quran-uthmani"], data["ms.basmeih"]
            cache[ref] = {"surah": a["surah"]["englishName"], "surahArabic": a["surah"]["name"], "ayah": a["numberInSurah"],
                          "arabic": a["text"], "translation": m["text"]}
        except Exception as e:  # offline or bad reference: keep going, flagged later
            print(f"  could not fetch Quran {ref}: {e}")
    if missing:
        QURAN_CACHE.parent.mkdir(exist_ok=True)
        QURAN_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return cache


def assemble(draft, meta, loc, args):
    warnings = []
    T = lambda where, it: loc.find(where, it.get("at"), it.get("approx"))
    duration = meta["duration"]

    # chapters
    chapters = []
    for i, c in enumerate(draft.get("chapters", [])):
        t = T(f"chapters[{i}]", c)
        chapters.append({"title": c["title"], "summary": c.get("summary", ""), "start": 0 if i == 0 else t})
    chapters = [c for c in chapters if c["start"] is not None]
    chapters.sort(key=lambda c: c["start"])
    if chapters:
        chapters[0]["start"] = 0
    for i, c in enumerate(chapters):
        c["id"] = f"c{i + 1}"
        c["end"] = chapters[i + 1]["start"] if i + 1 < len(chapters) else duration
    chapters = [{k: c[k] for k in ("id", "title", "start", "end", "summary")} for c in chapters]

    # dalil
    refs = [d["quran"] for d in draft.get("dalil", []) if d.get("kind") == "quran" and d.get("quran")]
    quran = fetch_quran(sorted(set(refs)))
    dalil = []
    for i, d in enumerate(draft.get("dalil", [])):
        t = T(f"dalil[{i}]", d)
        if t is None:
            continue
        if d.get("kind") == "quran":
            q = quran.get(d.get("quran", ""))
            if not q:
                warnings.append(f"dalil[{i}]: Quran reference {d.get('quran')!r} could not be resolved, dropped")
                continue
            note = " (rujukan dikenal pasti, nombor ayat tidak disebut)" if d.get("inferred") else ""
            dalil.append({
                "id": f"q{d['quran'].replace(':', '-')}", "kind": "quran", "ref": f"{q['surah']} {d['quran']}", "t": t,
                "arabic": q["arabic"].replace("۞ ", ""), "translation": q["translation"],
                "context": d.get("context", "") + note,
                "source": "api.alquran.cloud: quran-uthmani + ms.basmeih (Abdullah Basmeih)", "verified": True,
            })
        else:
            dalil.append({
                "id": f"h{i}", "kind": "hadith", "ref": d.get("ref") or "Hadis", "t": t, "arabic": d.get("arabic"),
                "translation": d.get("translation", ""), "context": d.get("context", ""),
                "narrator": d.get("narrator") or "Tidak disebut dalam kuliah",
                "source": d.get("source") or "Sumber tidak disebut dalam kuliah", "grade": d.get("grade"), "verified": False,
            })
    seen, unique = set(), []
    for d in sorted(dalil, key=lambda x: x["t"]):
        if d["id"] in seen:
            if d["kind"] == "quran":
                warnings.append(f"{d['ref']} is listed twice, kept the first mention at {d['t'] // 60}:{d['t'] % 60:02d}")
                continue
            d["id"] += f"-{d['t']}"
        seen.add(d["id"])
        unique.append(d)
    dalil = unique

    # books (+ suggested)
    books = []
    for i, b in enumerate(draft.get("books", [])):
        t = T(f"books[{i}]", b)
        books.append({"id": f"b{i + 1}", "title": b["title"], "author": b.get("author"), "kind": b.get("kind", "Lain-lain"),
                      "t": t, "context": b.get("context", ""), **({"note": b["note"]} if b.get("note") else {})})
    for i, b in enumerate(draft.get("suggested", [])):
        books.append({"id": f"s{i + 1}", "title": b["title"], "author": b.get("author"), "kind": b.get("kind", "Lain-lain"),
                      "t": None, "suggested": True, "context": b.get("context", "")})

    people = [{"id": f"p{i + 1}", "name": p["name"], "role": p.get("role", ""), "t": T(f"people[{i}]", p), "context": p.get("context", "")}
              for i, p in enumerate(draft.get("people", []))]
    people = sorted((p for p in people if p["t"] is not None), key=lambda p: p["t"])

    sirah_src = draft.get("sirah", {})
    events = []
    for i, e in enumerate(sirah_src.get("events", [])):
        has = e.get("at") or e.get("approx")
        events.append({"id": f"e{i}", "label": e.get("label", ""), "title": e["title"], "desc": e.get("desc", ""),
                       "t": T(f"sirah.events[{i}]", e) if has else None})
    sirah = {"era": sirah_src.get("era", ""), "summary": sirah_src.get("summary", ""), "events": events}

    lessons = [{"id": f"l{i + 1}", "title": l["title"], "kind": l.get("kind", "Lain-lain"), "body": l.get("body", ""),
                "t": T(f"lessons[{i}]", l)} for i, l in enumerate(draft.get("lessons", []))]
    lessons = [l for l in lessons if l["t"] is not None]

    glossary = [{"id": f"g{i + 1}", "term": g["term"], "arabic": g.get("arabic"), "meaning": g.get("meaning", ""),
                 "t": T(f"glossary[{i}]", g)} for i, g in enumerate(draft.get("glossary", []))]
    glossary = sorted((g for g in glossary if g["t"] is not None), key=lambda g: g["t"])

    def node(n, nid, where):
        out = {"id": nid, "label": n["label"], "t": T(where, n) or 0, "detail": n.get("detail", "")}
        kids = [node(k, f"{nid}{chr(97 + j)}" if nid != "root" else f"m{j + 1}", f"{where}.children[{j}]")
                for j, k in enumerate(n.get("children", []))]
        if kids:
            out["children"] = kids
        return out

    mindmap = node(draft["mindmap"], "root", "mindmap")
    mindmap["t"] = 0

    notes = {
        "id": meta["id"], "youtubeId": meta["youtubeId"], "title": meta["title"], "speaker": args.speaker, "series": args.series,
        "episode": meta.get("number") or 0, "duration": duration, "summary": draft.get("summary", ""),
        "keyPoints": draft.get("keyPoints", []), "chapters": chapters, "dalil": dalil, "books": books, "people": people,
        "sirah": sirah, "lessons": lessons, "glossary": glossary, "mindmap": mindmap,
    }
    if draft.get("careNote"):  # vetted helpline text, never written by the model
        notes["careNote"] = json.loads(CARE_NOTE.read_text())

    # sanity checks
    def expect(cond, msg):
        if not cond:
            warnings.append(msg)

    expect(8 <= len(chapters) <= 16, f"{len(chapters)} chapters (expected 8 to 16)")
    expect(len(lessons) >= 5, f"only {len(lessons)} lessons")
    expect(len(mindmap.get("children", [])) >= 3, "mind map has fewer than 3 branches")
    expect(bool(notes["summary"]) and len(notes["keyPoints"]) >= 3, "summary or key points are thin")
    longest = max((c["end"] - c["start"] for c in chapters), default=0)
    expect(longest < duration * 0.35, f"one chapter covers {longest // 60} minutes, chapters look too coarse")
    return notes, warnings


def update_index(meta, notes):
    path = LECTURES / "index.json"
    if not path.exists():
        return log("index.json not found, skipped (run scripts/build_index.py <slug> <playlist> first)")
    index = json.loads(path.read_text())
    ep = next((e for e in index["episodes"] if e["youtubeId"] == meta["youtubeId"]), None)
    if ep is None:
        n = meta.get("number")
        index["episodes"].append({"id": meta["id"], "youtubeId": meta["youtubeId"], "number": n, "title": meta["title"],
                                  "season": 2 if (n or 0) >= 18 else 1, "duration": meta["duration"], "views": None,
                                  "hasNotes": True, "notesAddedAt": datetime.now().isoformat(timespec="seconds")})
        index["episodes"].sort(key=lambda e: (e["season"], -1 if e["number"] is None else e["number"]))
    else:
        ep["hasNotes"] = True
        ep["notesAddedAt"] = datetime.now().isoformat(timespec="seconds")
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1))


def stage_build(workdir, args):
    meta = load_meta(workdir)
    for f in ("draft.json", "transcript.json"):
        if not (workdir / f).exists():
            raise PipelineError(f"{f} is missing. Run the earlier stages first.")
    draft = json.loads((workdir / "draft.json").read_text())
    loc = Locator(load_segments(workdir / "transcript.json"))
    notes, warnings = assemble(draft, meta, loc, args)

    out = Path(args.out) if args.out else LECTURES / meta["id"] / "notes.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(notes, ensure_ascii=False, indent=1))
    if not args.out:
        update_index(meta, notes)

    counts = {k: len(notes[k]) for k in ("chapters", "dalil", "books", "people", "lessons", "glossary")}
    log(f"wrote {out}  {counts}")
    if loc.report:
        log(f"{len(loc.report)} item(s) were not placed by an exact quote:")
        for where, quote, how in loc.report[:25]:
            print(f"   - {where}: {quote!r}: {how}")
    for w in warnings:
        print(f"   ! {w}")
    unverified = sum(1 for d in notes["dalil"] if not d["verified"])
    if unverified:
        print(f"   ! {unverified} hadith entries are unverified. Check the Arabic and sources before publishing.")
    if args.strict and (warnings or loc.report):
        raise PipelineError("strict mode: fix the issues above")
    return notes


# ---------------------------------------------------------------------- CLI
def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("stage", choices=["run", "fetch", "transcribe", "draft", "build", "check", "model"])
    p.add_argument("target", nargs="?", help="YouTube URL or video id, or an existing episode id such as ep41")
    p.add_argument("--id", help="episode id to use for a new video (default: ep<number> from the title)")
    p.add_argument("--lang", default="ms", help="Whisper language (default: ms)")
    p.add_argument("--model", help="Claude model alias for the notes step (default: the CLI's default)")
    p.add_argument("--speaker", default="Ustaz Azlan Shah NK")
    p.add_argument("--series", default="Sirah Impak Sosial", help="series title shown in the notes")
    p.add_argument("--series-slug", default="sirah-impak-sosial", help="folder and URL name of the series")
    p.add_argument("--backend", choices=["file", "claude-cli"], default="file",
                   help="notes step: write a prompt file for you to hand to Claude in the app (default), "
                        "or run `claude -p` for hands-off automation")
    p.add_argument("--force", action="store_true", help="redo finished stages")
    p.add_argument("--keep-audio", action="store_true", help="do not delete audio after transcription")
    p.add_argument("--out", help="write notes here instead of public/lectures/<ep>/notes.json (does not touch the index)")
    p.add_argument("--strict", action="store_true", help="fail the build on any warning")
    args = p.parse_args()
    global PRIVATE, LECTURES
    PRIVATE = ROOT / "private" / args.series_slug
    LECTURES = ROOT / "public/series" / args.series_slug

    try:
        if args.stage == "model":
            return cmd_model(args)
        if not args.target:
            p.error("a target is required")
        if args.stage in ("run", "fetch"):
            workdir = stage_fetch(args.target, args)
        else:
            workdir = resolve_workdir(args.target)
            if workdir is None:
                raise PipelineError(f"no working folder for {args.target!r}. Run `fetch` first.")
        if args.stage in ("run", "transcribe"):
            stage_transcribe(workdir, args)
        if args.stage == "check":
            if not (workdir / "transcript.json").exists():
                raise PipelineError("transcript.json is missing. Run the transcribe stage first.")
            problems = check_transcript(load_segments(workdir / "transcript.json"), load_meta(workdir)["duration"])
            print("transcript looks fine" if not problems else "\n".join(problems))
        if args.stage in ("run", "draft"):
            if not stage_draft(workdir, args) and args.stage == "run":
                return  # waiting for draft.json
        if args.stage in ("run", "build"):
            stage_build(workdir, args)
    except PipelineError as e:
        sys.exit(f"error: {e}")
    except subprocess.CalledProcessError as e:
        sys.exit(f"error: command failed: {' '.join(map(str, e.cmd))[:200]}")


if __name__ == "__main__":
    main()
