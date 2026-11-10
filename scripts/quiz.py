#!/usr/bin/env python3
"""Episode quizzes live next to the notes: quiz.json (Malay) and an optional quiz.en.json overlay.

Run: python3 scripts/quiz.py check [<series>/<ep> | <ep>]    # validate quizzes (and English overlays) against the notes
     python3 scripts/quiz.py skeleton <series>/<ep>          # the English text to translate, as JSON on stdout
     python3 scripts/quiz.py index <series>                  # set hasQuiz in the series index.json

Questions are written from notes.json and never from the transcript. `check` fails on a wrong answer, a
`source` that is not in the notes, a question traced to a hadith that is not verified, and the other
rules in docs/QUIZ_PLAN.md. The English overlay holds text only, keyed by id, so it can never change an answer.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERIES = ROOT / "public" / "series"

MIN_QUESTIONS, MAX_QUESTIONS = 6, 14
TYPES = {"mcq", "tf", "multi", "order", "match"}
MAX_FIRST_ANSWER = 0.4  # share of mcq whose right answer sits at option A
SOURCE_LISTS = {
    "lessons": lambda n: n["lessons"],
    "people": lambda n: n["people"],
    "chapters": lambda n: n["chapters"],
    "glossary": lambda n: n["glossary"],
    "events": lambda n: n["sirah"]["events"],
    "dalil": lambda n: n["dalil"],
}


def is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def dupes(texts):
    seen = set()
    for t in texts:
        k = " ".join(str(t).lower().split())
        if k in seen:
            return True
        seen.add(k)
    return False


def source_item(notes, source):
    if not isinstance(source, str) or ":" not in source:
        return None
    kind, item_id = source.split(":", 1)
    if kind not in SOURCE_LISTS:
        return None
    return next((x for x in SOURCE_LISTS[kind](notes) if x["id"] == item_id), None)


def choice_errors(items, label):
    ok = isinstance(items, list) and all(isinstance(i, dict) and i.get("id") and str(i.get("text", "")).strip() for i in items)
    if not ok:
        return [f"{label} must be a list of {{id, text}}"]
    ids = [i["id"] for i in items]
    errs = []
    if len(set(ids)) != len(ids):
        errs.append(f"{label} has duplicate ids")
    if dupes([i["text"] for i in items]):
        errs.append(f"{label} has duplicate text")
    return errs


def question_errors(q, notes):
    errs = []
    t = q.get("type")
    if t not in TYPES:
        return [f"type must be one of {sorted(TYPES)}"]
    for f in ("q", "explain"):
        if not str(q.get(f, "")).strip():
            errs.append(f"missing {f}")
    if not isinstance(q.get("t"), (int, float)) or isinstance(q.get("t"), bool) or q["t"] < 0:
        errs.append("missing t (seconds into the lecture)")
    elif q["t"] > notes.get("duration", 10**9):
        errs.append(f"t {q['t']} is after the end of the lecture")
    if q.get("level") not in (1, 2, 3):
        errs.append("level must be 1, 2 or 3")

    item = source_item(notes, q.get("source"))
    if item is None:
        errs.append(f"source {q.get('source')!r} is not in the notes")
    elif q["source"].startswith("dalil:") and item["kind"] == "hadith" and not item.get("verified"):
        errs.append(f"source {q['source']} is a hadith that is not verified")
    if notes.get("careNote") and not str(q.get("source", "")).startswith("lessons:"):
        errs.append("this episode has a careNote: ask about the lesson only (source lessons:...)")

    a = q.get("answer")
    if t in ("mcq", "multi"):
        opts = q.get("options")
        if not isinstance(opts, list) or len(opts) < 4:
            errs.append("needs at least 4 options")
        elif not all(isinstance(o, str) and o.strip() for o in opts):
            errs.append("options must be non-empty text")
        else:
            if dupes(opts):
                errs.append("duplicate options")
            if t == "mcq" and not (is_int(a) and 0 <= a < len(opts)):
                errs.append(f"answer {a!r} is not an option index")
            if t == "multi":
                if not (isinstance(a, list) and a and all(is_int(x) and 0 <= x < len(opts) for x in a) and len(set(a)) == len(a)):
                    errs.append("answer must be a list of distinct option indexes")
                elif len(a) < 2 or len(a) >= len(opts):
                    errs.append("a multi question needs 2 or more right answers and at least one wrong option")
    elif t == "tf":
        if not isinstance(a, bool):
            errs.append("answer must be true or false")
    elif t == "order":
        errs += choice_errors(q.get("items"), "items")
        if not errs and (len(q["items"]) < 3 or sorted(a if isinstance(a, list) else []) != sorted(i["id"] for i in q["items"]) or len(a) != len(set(a))):
            errs.append("answer must list every item id once, in order (3 items or more)")
    elif t == "match":
        errs += choice_errors(q.get("left"), "left") + choice_errors(q.get("right"), "right")
        if not errs:
            lids, rids = [i["id"] for i in q["left"]], [i["id"] for i in q["right"]]
            pairs = a if isinstance(a, list) and all(isinstance(p, list) and len(p) == 2 for p in a) else None
            if len(lids) < 3 or len(lids) != len(rids):
                errs.append("match needs 3 or more items on each side, the same number")
            elif pairs is None or sorted(p[0] for p in pairs) != sorted(lids) or sorted(p[1] for p in pairs) != sorted(rids):
                errs.append("answer must pair every left id with a different right id")
    return errs


def quiz_errors(quiz, notes):
    """Problems with a Malay quiz, as readable lines."""
    errs = []
    qs = quiz.get("questions")
    if not isinstance(qs, list):
        return ["questions must be a list"]
    if not MIN_QUESTIONS <= len(qs) <= MAX_QUESTIONS:
        errs.append(f"{len(qs)} questions, need {MIN_QUESTIONS} to {MAX_QUESTIONS}")
    ids = [q.get("id") for q in qs]
    if len(set(ids)) != len(ids) or not all(ids):
        errs.append("question ids must be present and unique")
    for q in qs:
        errs += [f"{q.get('id')}: {e}" for e in question_errors(q, notes)]
    mcq = [q for q in qs if q.get("type") == "mcq" and is_int(q.get("answer"))]
    if len(mcq) >= 5 and sum(q["answer"] == 0 for q in mcq) / len(mcq) > MAX_FIRST_ANSWER:
        errs.append(f"the right answer is option A in {sum(q['answer'] == 0 for q in mcq)} of {len(mcq)} mcq: spread them out")
    return errs


# Text the English overlay carries, per question type. Everything else (answer, t, source, level, type) stays Malay.
def text_fields(q):
    t = q["type"]
    fields = {"q": q["q"], "explain": q["explain"]}
    if t in ("mcq", "multi"):
        fields["options"] = q["options"]
    if t == "order":
        fields["items"] = {i["id"]: i["text"] for i in q["items"]}
    if t == "match":
        fields["left"] = {i["id"]: i["text"] for i in q["left"]}
        fields["right"] = {i["id"]: i["text"] for i in q["right"]}
    return fields


def skeleton(quiz):
    """The Malay text, in the shape the overlay must have."""
    out = []
    for q in quiz["questions"]:
        row = {"id": q["id"], "q": q["q"], "explain": q["explain"]}
        if q["type"] in ("mcq", "multi"):
            row["options"] = q["options"]
        for k in ("items", "left", "right"):
            if k in q:
                row[k] = [{"id": i["id"], "text": i["text"]} for i in q[k]]
        out.append(row)
    return {"id": quiz["id"], "questions": out}


def overlay_errors(quiz, patch):
    errs = []
    if patch.get("id") != quiz["id"]:
        errs.append(f"id must be {quiz['id']!r}")
    extra = set(patch) - {"id", "questions"}
    if extra:
        errs.append(f"unknown keys {sorted(extra)}")
    pq = patch.get("questions")
    if not isinstance(pq, list):
        return errs + ["questions must be a list"]
    by_id = {p.get("id"): p for p in pq}
    if len(by_id) != len(pq):
        errs.append("duplicate question ids")
    want = {q["id"] for q in quiz["questions"]}
    if set(by_id) != want:
        errs.append(f"questions differ from the Malay quiz: missing {sorted(want - set(by_id))}, extra {sorted(set(by_id) - want)}")
    for q in quiz["questions"]:
        p = by_id.get(q["id"])
        if p is None:
            continue
        sk = skeleton({"id": quiz["id"], "questions": [q]})["questions"][0]
        bad = set(p) - set(sk)
        if bad:
            errs.append(f"{q['id']}: may not change {sorted(bad)} (text only)")
        for k, v in sk.items():
            if k == "id":
                continue
            got = p.get(k)
            if isinstance(v, str):
                if not (isinstance(got, str) and got.strip()):
                    errs.append(f"{q['id']}: missing {k}")
            elif k == "options":
                if not (isinstance(got, list) and len(got) == len(v) and all(isinstance(x, str) and x.strip() for x in got)):
                    errs.append(f"{q['id']}: options must be {len(v)} texts in the same order")
                elif len({x.lower() for x in got}) != len(got):
                    errs.append(f"{q['id']}: duplicate options")
            else:  # items, left, right: same ids, translated text
                ok = isinstance(got, list) and [i.get("id") for i in got if isinstance(i, dict)] == [i["id"] for i in v] and all(str(i.get("text", "")).strip() for i in got)
                if not ok:
                    errs.append(f"{q['id']}: {k} must keep the same ids, each with text")
    return errs


def check(ep_dir):
    """None when the episode has no quiz; else a list of problems."""
    qf = ep_dir / "quiz.json"
    if not qf.exists():
        return None
    notes = json.loads((ep_dir / "notes.json").read_text())
    quiz = json.loads(qf.read_text())
    errs = quiz_errors(quiz, notes)
    if quiz.get("id") != ep_dir.name:
        errs.append(f"id must be {ep_dir.name!r}")
    en = ep_dir / "quiz.en.json"
    if en.exists() and not errs:
        errs += [f"en: {e}" for e in overlay_errors(quiz, json.loads(en.read_text()))]
    return errs


def episode_dirs(ep=None):
    return [d for d in sorted(SERIES.glob("*/*")) if (d / "notes.json").exists() and (ep is None or ep in (d.name, f"{d.parent.name}/{d.name}"))]


def sync_index(slug):
    path = SERIES / slug / "index.json"
    data = json.loads(path.read_text())
    n = 0
    for e in data["episodes"]:
        has = (SERIES / slug / e["id"] / "quiz.json").exists()
        n += has
        if has:
            e["hasQuiz"] = True
        else:
            e.pop("hasQuiz", None)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    return n


def main(argv):
    cmd, arg = (argv + [None, None])[1:3]
    if cmd == "check":
        bad = checked = 0
        for d in episode_dirs(arg):
            errs = check(d)
            if errs is None:
                continue
            checked += 1
            if errs:
                bad += 1
                print(f"x {d.parent.name}/{d.name}\n  " + "\n  ".join(errs))
            else:
                print(f"ok {d.parent.name}/{d.name}")
        if not checked:
            print("no quizzes found")
        return 1 if bad else 0
    if cmd == "skeleton" and arg:
        dirs = [d for d in episode_dirs(arg) if (d / "quiz.json").exists()]
        if len(dirs) != 1:
            print(f"need exactly one quiz for {arg!r}, found {len(dirs)} (use <series>/<ep>)", file=sys.stderr)
            return 1
        print(json.dumps(skeleton(json.loads((dirs[0] / "quiz.json").read_text())), ensure_ascii=False, indent=1))
        return 0
    if cmd == "index" and arg:
        print(f"{arg}: {sync_index(arg)} episodes with a quiz")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
