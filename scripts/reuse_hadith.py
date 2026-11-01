#!/usr/bin/env python3
"""Reuse a hadith that is already verified in another episode, so it is checked once and not once per series.

Run: python3 scripts/reuse_hadith.py <series>/<ep> <dalil id> <from series>/<ep> <from dalil id>

Copies the checked fields (title, Arabic, translation, narrator, source, sourceUrl, grade, verified) into the
episode's notes.json, and the English translation into its notes.en.json when that exists. The episode keeps its
own `context` and timestamp, because those describe what the ustaz said in this lecture. Run it after
`pipeline.py build`, which marks every hadith it writes as unverified.
"""
import json
import sys
from pathlib import Path

SERIES = Path(__file__).resolve().parent.parent / "public" / "series"
FIELDS = ["ref", "arabic", "translation", "narrator", "source", "sourceUrl", "grade", "verified"]


def find(notes, dalil_id):
    return next(d for d in notes["dalil"] if d["id"] == dalil_id)


def main(argv):
    if len(argv) != 5:
        print(__doc__)
        return 2
    dest, dest_id, src, src_id = argv[1:]
    src_notes = json.loads((SERIES / src / "notes.json").read_text())
    source = find(src_notes, src_id)
    if source["kind"] != "hadith" or not source.get("verified"):
        print(f"{src}:{src_id} is not a verified hadith", file=sys.stderr)
        return 1
    path = SERIES / dest / "notes.json"
    notes = json.loads(path.read_text())
    target = find(notes, dest_id)
    for k in FIELDS:
        if k in source:
            target[k] = source[k]
    path.write_text(json.dumps(notes, ensure_ascii=False, indent=1) + "\n")
    print(f"ok {dest}:{dest_id} <- {src}:{src_id}")

    en_src, en_dest = SERIES / src / "notes.en.json", SERIES / dest / "notes.en.json"
    if en_src.exists() and en_dest.exists():
        en = json.loads(en_src.read_text())
        overlay = json.loads(en_dest.read_text())
        theirs = find(en, src_id)
        mine = find(overlay, dest_id)
        for k in ("translation", "source", "grade", "ref"):
            if k in theirs:
                mine[k] = theirs[k]
        en_dest.write_text(json.dumps(overlay, ensure_ascii=False, indent=1) + "\n")
        print(f"ok {dest}/notes.en.json:{dest_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
