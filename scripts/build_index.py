"""Build public/series/<slug>/index.json from a YouTube playlist (titles, ids, durations, view counts only).

Usage: python3 scripts/build_index.py <slug> <playlist-url> [--title T] [--speaker S]

Existing values are kept when re-run: the series description, and each episode's `notesAddedAt`.
An episode is marked `hasNotes` when public/series/<slug>/<id>/notes.json exists, where <id> is ep<number> or
prolog-<video id> for episodes without a number.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DROP = re.compile(
    r"^(Sirah Impak Sosial|Sirah Nabi Muhammad SAW|Ustaz Azlan Shah( NK)?|Azlan Shah NK|"
    r"Kisah Kehidupan Nabi Muhammad SAW|Season 2 Finale.*)$",
    re.I,
)

ap = argparse.ArgumentParser()
ap.add_argument("slug")
ap.add_argument("playlist")
ap.add_argument("--title", default="Sirah Impak Sosial")
ap.add_argument("--speaker", default="Ustaz Azlan Shah NK")
args = ap.parse_args()

base = ROOT / "public/series" / args.slug
base.mkdir(parents=True, exist_ok=True)
path = base / "index.json"
old = json.loads(path.read_text()) if path.exists() else {"series": {}, "episodes": []}
added = {e["youtubeId"]: e.get("notesAddedAt") for e in old["episodes"]}

out = subprocess.run(
    ["yt-dlp", "--flat-playlist", "--print", "%(id)s|%(title)s|%(duration)s|%(view_count)s", args.playlist],
    capture_output=True, text=True, check=True,
).stdout.strip().splitlines()

episodes = []
for line in out:
    vid, rest = line.split("|", 1)
    rest, views = rest.rsplit("|", 1)
    title, dur = rest.rsplit("|", 1)
    m = re.match(r"^Ep\s*(\d+)\s*[:|]?\s*(.*)$", title)
    number = int(m.group(1)) if m else None
    body = m.group(2) if m else title
    parts = [p.strip() for p in body.split("|") if p.strip() and not DROP.match(p.strip())]
    clean = ": ".join(parts) if number is None or (len(parts) > 1 and number == 22) else parts[0] if parts else title
    ep_id = f"ep{number}" if number else "prolog-" + vid
    has_notes = (base / ep_id / "notes.json").exists()
    entry = {
        "id": ep_id,
        "youtubeId": vid,
        "number": number,
        "title": clean,
        "season": 2 if (number or 0) >= 18 or "Musim Ke-2" in title else 1,
        "duration": int(float(dur)) if dur not in ("NA", "None") else None,
        "views": int(float(views)) if views not in ("NA", "None") else None,
        "hasNotes": has_notes,
    }
    if has_notes and added.get(vid):
        entry["notesAddedAt"] = added[vid]
    episodes.append(entry)

episodes.reverse()  # playlist is newest first
episodes.sort(key=lambda e: (e["season"], -1 if e["number"] is None else e["number"]))

series = {
    "slug": args.slug,
    "title": args.title,
    "speaker": args.speaker,
    "playlist": args.playlist,
    "description": old["series"].get("description", {"ms": "", "en": ""}),
}
path.write_text(json.dumps({"series": series, "episodes": episodes}, ensure_ascii=False, indent=1))
print(len(episodes), "episodes;", sum(e["hasNotes"] for e in episodes), "with notes")
