#!/usr/bin/env python3
"""Find candidate matches on hadithapi.com for the hadith still marked unverified, to speed up a human review.

Run: python3 scripts/hadith_lookup.py [--ep ep45] [--id h3] [--limit 10]

It searches the English text by a few keywords from each entry's English translation, keeps the closest
candidates and writes them to private/hadith-lookup.md. A candidate is a lead, not proof: compare the text,
reference and grade yourself, then fix the entry in notes.json as described in CONTRIBUTING.md.

The key is read from the HADITHAPI_KEY environment variable or from .env.local (never committed). Requests
identify themselves with an honest user agent and wait between calls; answers are cached in
private/hadithapi-cache/, so a re-run costs nothing. The output stays in private/ because the data's terms of
reuse have not been checked, so do not commit it.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hadith_checklist  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "private" / "hadith-lookup.md"
CACHE = ROOT / "private" / "hadithapi-cache"
API = "https://hadithapi.com/api/hadiths/"
USER_AGENT = "nota-kuliah-hadith-lookup/1.0 (+https://github.com/izzatonline/nota-kuliah)"
PAUSE = 1.2  # seconds between live requests

BOOKS = [  # (pattern in our "source" field, hadithapi book slug)
    (r"bukhari", "sahih-bukhari"),
    (r"muslim", "sahih-muslim"),
    (r"tirmi", "al-tirmidhi"),
    (r"abu ?(dawud|dawood|daud)", "abu-dawood"),
    (r"(ibn )?maj", "ibn-e-majah"),
    (r"nasa", "sunan-nasai"),
    (r"ahmad", "musnad-ahmad"),
]
STOP = set(
    "about after again also because been before being between could does from have into just like more most much "
    "must only other over said says same shall should some such than that their them then there these they this "
    "those through under upon very want were what when where which while whoever will with without would your "
    "prophet messenger allah people person".split()
)


def load_key():
    key = os.environ.get("HADITHAPI_KEY")
    env = ROOT / ".env.local"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("HADITHAPI_KEY="):
                key = line.split("=", 1)[1]
    key = (key or "").strip().strip("\"'")
    if not key:
        sys.exit("HADITHAPI_KEY is not set. Put HADITHAPI_KEY=... in .env.local (it is git-ignored).")
    return key


def book_slug(source):
    """The hadithapi book to search in when the entry names its collection, else None (search every book)."""
    for pattern, slug in BOOKS:
        if re.search(pattern, (source or "").lower()):
            return slug
    return None


def words(text):
    return [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z']+", text or "")]


def content_words(text):
    return {w for w in words(text) if len(w) > 3 and w not in STOP}


def keywords(english, n=3):
    """Words worth searching for: names and transliterated terms first (capitalised mid-sentence or with an
    apostrophe, such as Bu'ath), then the longest plain words."""
    seen, names, plain = set(), [], []
    for m in re.finditer(r"[A-Za-z][A-Za-z']+", english or ""):
        w = m.group(0)
        low = w.lower()
        if len(low) < 4 or low in STOP or low in seen:
            continue
        seen.add(low)
        mid_capital = w[0].isupper() and m.start() > 0 and not re.search(r"[.!?]\s*$", english[: m.start()])
        (names if "'" in w or mid_capital else plain).append(w)
    plain.sort(key=len, reverse=True)
    return (names + plain)[:n]


def phrases(english, n=2):
    """Pairs of neighbouring content words, longest first, as in "lost property". Our wording is a paraphrase, so
    these only sometimes hit, but when they do the match is sharp."""
    toks = [(w, w.lower() not in STOP and len(w) > 3) for w in words(english)]
    pairs = [f"{a} {b}" for (a, ka), (b, kb) in zip(toks, toks[1:]) if ka and kb]
    return sorted(dict.fromkeys(pairs), key=len, reverse=True)[:n]


def overlap(ours, theirs):
    """Share of our content words that also appear in a candidate's English text."""
    a = content_words(ours)
    return len(a & content_words(theirs)) / len(a) if a else 0.0


def fetch(params, key):
    """One search, cached. Returns the list of hadith dicts (empty on 404 = no match)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    name = hashlib.sha1(json.dumps(params, sort_keys=True).encode()).hexdigest()
    cached = CACHE / f"{name}.json"
    if cached.exists():
        return json.loads(cached.read_text())
    query = urllib.parse.urlencode({"apiKey": key, "paginate": 10, **params})
    req = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    time.sleep(PAUSE)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)["hadiths"]["data"]
    except urllib.error.HTTPError as e:
        if e.code != 404:
            sys.exit(f"hadithapi.com answered HTTP {e.code}. Stopping.")
        data = []
    cached.write_text(json.dumps(data, ensure_ascii=False))
    return data


WEAK = 0.4  # below this share of shared words the named collection is probably wrong, so search every book


def candidates(english, source, key, search=fetch, top=3):
    """The closest matches for one entry: search by phrases and keywords, merge, rank by word overlap.
    The lecture's source is sometimes wrong or vague, so a weak result is retried across all books."""
    terms = phrases(english) + keywords(english)

    def run(slug):
        found = {}
        for term in terms:
            params = {"hadithEnglish": term, **({"book": slug} if slug else {})}
            for h in search(params, key):
                found[(h["bookSlug"], h["hadithNumber"])] = h
        scored = [(overlap(english, h.get("hadithEnglish", "")), h) for h in found.values()]
        return sorted(scored, key=lambda x: x[0], reverse=True)[:top]

    best = run(book_slug(source))
    if book_slug(source) and (not best or best[0][0] < WEAK):
        wider = run(None)
        if wider and (not best or wider[0][0] > best[0][0]):
            best = wider
    return best


def render_entry(notes, d, english, cands):
    lines = [f"### {notes['id']}/{d['id']} · {d['ref']}", "", f"Ours: {english or d.get('translation', '')}", ""]
    if not cands:
        return "\n".join(lines + ["No candidate found. Search by hand (see docs/hadith-review.md).", ""])
    for score, h in cands:
        ref = f"{h['book']['bookName']} {h['hadithNumber']}"
        lines += [
            f"- **{ref}** · {h.get('status') or 'no grade'} · match {score:.0%}{' (weak lead)' if score < 0.5 else ''} · {h.get('englishNarrator', '').strip()}",
            f"  - English: {h.get('hadithEnglish', '').strip()[:400]}",
            f"  - Arabic (with the chain): {(h.get('hadithArabic') or '').strip()}",
        ]
    return "\n".join(lines + [""])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--ep", help="only this episode id, such as ep45")
    ap.add_argument("--id", help="only this hadith id, such as h3 (needs --ep)")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many entries")
    args = ap.parse_args()
    key = load_key()
    out = ["# Hadith lookup candidates", "", "Leads from hadithapi.com. Not committed. Compare each one yourself.", ""]
    done = 0
    for _, notes, d in hadith_checklist.unverified():
        if (args.ep and notes["id"] != args.ep) or (args.id and d["id"] != args.id):
            continue
        english = notes["_english"].get(d["id"]) or ""
        out.append(render_entry(notes, d, english, candidates(english, d.get("source"), key)))
        done += 1
        print(f"{notes['id']}/{d['id']} done ({done})", flush=True)
        if args.limit and done >= args.limit:
            break
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("\n".join(out))
    print(f"{done} entries -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
