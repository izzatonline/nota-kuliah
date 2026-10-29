#!/usr/bin/env python3
"""English notes are an overlay: notes.en.json holds only the translated text, keyed by id.

Run: python3 scripts/english_notes.py skeleton <ep>   # Malay text to translate, as JSON on stdout
     python3 scripts/english_notes.py quran [<ep>]    # fill in the English Quran translation of each verse
     python3 scripts/english_notes.py check [<ep>]    # validate overlays against the Malay notes

Times, Arabic, sources and every id come from notes.json, so a translation can never move a
timestamp. Quran translations are never written by the model: `quran` fetches them from
api.quran.com (M.A.S. Abdel Haleem, the English edition quran-slide uses) into the overlay.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERIES = ROOT / "public" / "series"

# Translatable fields of each list that is merged by id.
LISTS = {
    "chapters": ["title", "summary"],
    "books": ["context", "note"],
    "people": ["role", "context"],
    "lessons": ["title", "body"],
    "glossary": ["meaning"],
}
QURAN_CACHE = ROOT / "data" / "quran-cache-en.json"
QURAN_API = "https://api.quran.com/api/v4/verses/by_key/{ref}?translations=85&language=en"
QURAN_SOURCE = "api.quran.com: M.A.S. Abdel Haleem (English)"
SIRAH_EVENTS = ["label", "title", "desc"]
SIRAH = ["era", "summary"]
MINDMAP = ["label", "detail"]


def pick(item, fields):
    return {k: item[k] for k in fields if item.get(k)}


def dalil_fields(d, quran=False):
    # Hadith are paraphrased by the notes, so the model translates them. A Quran translation is
    # only ever fetched, so the skeleton for the model leaves it out and `check` allows it.
    if d["kind"] == "hadith":
        return ["context", "translation"]
    return ["context", "translation", "source"] if quran else ["context"]


def walk_map(node):
    out = {"id": node["id"], **pick(node, MINDMAP)}
    if node.get("children"):
        out["children"] = [walk_map(c) for c in node["children"]]
    return out


def skeleton(notes, quran=False):
    out = {"summary": notes["summary"], "keyPoints": notes["keyPoints"]}
    for name, fields in LISTS.items():
        out[name] = [{"id": x["id"], **pick(x, fields)} for x in notes.get(name, [])]
    out["dalil"] = [{"id": d["id"], **pick(d, dalil_fields(d, quran))} for d in notes["dalil"]]
    s = notes["sirah"]
    out["sirah"] = {**pick(s, SIRAH), "events": [{"id": e["id"], **pick(e, SIRAH_EVENTS)} for e in s["events"]]}
    out["mindmap"] = walk_map(notes["mindmap"])
    return out


def shape_errors(base, patch, path="", errors=None):
    """Keys the overlay may not have: anything missing from the skeleton, unknown ids, wrong list lengths."""
    errors = [] if errors is None else errors
    if isinstance(base, dict) and isinstance(patch, dict):
        for k, v in patch.items():
            if k not in base:
                errors.append(f"{path}/{k}: not translatable")
            else:
                shape_errors(base[k], v, f"{path}/{k}", errors)
    elif isinstance(base, list) and isinstance(patch, list):
        if base and isinstance(base[0], dict):
            ids = {x["id"]: x for x in base}
            for p in patch:
                if p.get("id") not in ids:
                    errors.append(f"{path}: unknown id {p.get('id')!r}")
                else:
                    shape_errors(ids[p["id"]], p, f"{path}[{p['id']}]", errors)
            missing = set(ids) - {p.get("id") for p in patch}
            if missing:
                errors.append(f"{path}: untranslated {sorted(missing)}")
        elif len(base) != len(patch):
            errors.append(f"{path}: {len(patch)} items, expected {len(base)}")
    elif type(base) is not type(patch):
        errors.append(f"{path}: expected {type(base).__name__}")
    return errors


def check(ep_dir):
    overlay_file = ep_dir / "notes.en.json"
    if not overlay_file.exists():
        return None
    notes = json.loads((ep_dir / "notes.json").read_text())
    return shape_errors(skeleton(notes, quran=True), json.loads(overlay_file.read_text()))


def fetch_quran_en(refs):
    cache = json.loads(QURAN_CACHE.read_text()) if QURAN_CACHE.exists() else {}
    for ref in refs:
        if ref in cache:
            continue
        req = urllib.request.Request(QURAN_API.format(ref=ref), headers={"User-Agent": "nota-kuliah (open-source lecture notes)"})
        with urllib.request.urlopen(req, timeout=30) as r:
            text = json.load(r)["verse"]["translations"][0]["text"]
        cache[ref] = re.sub(r"<sup[^>]*>.*?</sup>", "", text).strip()
        time.sleep(0.2)
    QURAN_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    return cache


def merge_quran(ep_dir):
    """Add the English translation to the overlay's Quran dalil. Verses merged into one entry join with a space."""
    overlay_file = ep_dir / "notes.en.json"
    if not overlay_file.exists():
        return None
    notes = json.loads((ep_dir / "notes.json").read_text())
    overlay = json.loads(overlay_file.read_text())
    quran = [d for d in notes["dalil"] if d["kind"] == "quran"]
    refs = {d["id"]: re.findall(r"(\d+):(\d+)(?:-(\d+))?$", d["ref"]) for d in quran}
    wanted = []
    for d in quran:
        (surah, first, last), = refs[d["id"]]
        d["_refs"] = [f"{surah}:{n}" for n in range(int(first), int(last or first) + 1)]
        wanted += d["_refs"]
    cache = fetch_quran_en(sorted(set(wanted)))
    by_id = {x["id"]: x for x in overlay["dalil"]}
    for d in quran:
        by_id[d["id"]].update(translation=" ".join(cache[r] for r in d["_refs"]), source=QURAN_SOURCE)
    overlay_file.write_text(json.dumps(overlay, ensure_ascii=False, indent=1) + "\n")
    return len(quran)


def episode_dirs(ep=None):
    return [d for d in sorted(SERIES.glob("*/*")) if (d / "notes.json").exists() and (ep is None or d.name == ep)]


def main(argv):
    cmd, ep = (argv + [None, None])[1:3]
    if cmd == "skeleton" and ep:
        for d in episode_dirs(ep):
            print(json.dumps(skeleton(json.loads((d / "notes.json").read_text())), ensure_ascii=False, indent=1))
            return 0
        print(f"no notes for {ep}", file=sys.stderr)
        return 1
    if cmd == "quran":
        for d in episode_dirs(ep):
            n = merge_quran(d)
            print(f"- {d.name}: no English notes yet" if n is None else f"ok {d.name}: {n} verses")
        return 0
    if cmd == "check":
        bad = 0
        for d in episode_dirs(ep):
            errors = check(d)
            if errors is None:
                print(f"- {d.name}: no English notes yet")
            elif errors:
                bad += 1
                print(f"x {d.name}\n  " + "\n  ".join(errors))
            else:
                print(f"ok {d.name}")
        return 1 if bad else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
