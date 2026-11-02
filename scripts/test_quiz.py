import copy
import unittest

import quiz as qz

NOTES = {
    "duration": 600,
    "lessons": [{"id": "l1"}, {"id": "l2"}],
    "people": [{"id": "p1"}],
    "chapters": [{"id": "c1"}],
    "glossary": [{"id": "g1"}],
    "sirah": {"events": [{"id": "e0"}]},
    "dalil": [
        {"id": "h1", "kind": "hadith", "verified": True},
        {"id": "h2", "kind": "hadith", "verified": False},
        {"id": "q1", "kind": "quran", "verified": True},
    ],
}


def mcq(i, answer=1, **kw):
    q = {"id": f"q{i}", "type": "mcq", "q": "Siapa?", "options": ["A", "B", "C", "D"], "answer": answer,
         "explain": "Kerana.", "t": 30, "source": "lessons:l1", "level": 1}
    q.update(kw)
    return q


def quiz(n=8, **kw):
    return {"id": "ep1", "questions": [mcq(i, answer=i % 3 + 1, **kw) for i in range(n)]}


class Validator(unittest.TestCase):
    def errs(self, q, notes=NOTES):
        return qz.quiz_errors(q, notes)

    def test_good_quiz_passes(self):
        self.assertEqual(self.errs(quiz()), [])

    def test_question_count_bounds(self):
        self.assertTrue(any("questions, need" in e for e in self.errs(quiz(3))))
        self.assertTrue(any("questions, need" in e for e in self.errs(quiz(15))))

    def test_wrong_answer_index_and_options(self):
        q = quiz()
        q["questions"][0]["answer"] = 4
        q["questions"][1]["options"] = ["A", "B", "C"]
        q["questions"][2]["options"] = ["A", "a ", "C", "D"]
        out = "\n".join(self.errs(q))
        self.assertIn("q0: answer 4 is not an option index", out)
        self.assertIn("q1: needs at least 4 options", out)
        self.assertIn("q2: duplicate options", out)

    def test_missing_time_and_explanation(self):
        q = quiz()
        del q["questions"][0]["t"]
        q["questions"][1]["explain"] = " "
        q["questions"][2]["t"] = 601
        out = "\n".join(self.errs(q))
        self.assertIn("q0: missing t", out)
        self.assertIn("q1: missing explain", out)
        self.assertIn("q2: t 601 is after", out)

    def test_source_must_exist_in_notes(self):
        q = quiz()
        q["questions"][0]["source"] = "lessons:l9"
        q["questions"][1]["source"] = "nope"
        out = "\n".join(self.errs(q))
        self.assertIn("q0: source 'lessons:l9' is not in the notes", out)
        self.assertIn("q1: source 'nope'", out)

    def test_unverified_hadith_is_refused_but_verified_and_quran_are_fine(self):
        q = quiz()
        q["questions"][0]["source"] = "dalil:h2"
        q["questions"][1]["source"] = "dalil:h1"
        q["questions"][2]["source"] = "dalil:q1"
        out = "\n".join(self.errs(q))
        self.assertIn("q0: source dalil:h2 is a hadith that is not verified", out)
        self.assertNotIn("q1:", out)
        self.assertNotIn("q2:", out)

    def test_care_note_episode_keeps_to_lessons(self):
        notes = dict(NOTES, careNote={"title": "x"})
        q = quiz()
        q["questions"][0]["source"] = "chapters:c1"
        out = "\n".join(self.errs(q, notes))
        self.assertIn("q0: this episode has a careNote", out)
        self.assertNotIn("q1:", out)

    def test_answer_position_skew(self):
        q = {"id": "ep1", "questions": [mcq(i, answer=0) for i in range(8)]}
        self.assertTrue(any("option A" in e for e in self.errs(q)))

    def test_duplicate_question_ids(self):
        q = quiz()
        q["questions"][1]["id"] = "q0"
        self.assertTrue(any("unique" in e for e in self.errs(q)))

    def test_tf_multi_order_match(self):
        base = {"explain": "e", "t": 1, "level": 2}
        items = [{"id": "a", "text": "1"}, {"id": "b", "text": "2"}, {"id": "c", "text": "3"}]
        left = [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}, {"id": "c", "text": "C"}]
        right = [{"id": "1", "text": "one"}, {"id": "2", "text": "two"}, {"id": "3", "text": "three"}]
        opts = ["a", "b", "c", "d"]
        cases = [
            (dict(type="tf", answer=True), True),
            (dict(type="tf", answer="ya"), False),
            (dict(type="multi", options=opts, answer=[0, 2]), True),
            (dict(type="multi", options=opts, answer=[0, 1, 2, 3]), False),
            (dict(type="order", items=items, answer=["b", "a", "c"]), True),
            (dict(type="order", items=items, answer=["a", "a", "c"]), False),
            (dict(type="match", left=left, right=right, answer=[["a", "2"], ["b", "1"], ["c", "3"]]), True),
            (dict(type="match", left=left, right=right, answer=[["a", "2"], ["b", "2"], ["c", "3"]]), False),
        ]
        for fields, good in cases:
            q = dict(base, id="x", q="x", source="events:e0", **fields)
            self.assertEqual(qz.question_errors(q, NOTES) == [], good, (fields, qz.question_errors(q, NOTES)))


class Overlay(unittest.TestCase):
    def setUp(self):
        self.base = quiz(6)
        self.base["questions"][0] = {"id": "o1", "type": "order", "q": "x", "items": [{"id": "a", "text": "1"}, {"id": "b", "text": "2"}, {"id": "c", "text": "3"}],
                                     "answer": ["b", "a", "c"], "explain": "e", "t": 1, "source": "events:e0", "level": 2}

    def patch(self):
        return copy.deepcopy(qz.skeleton(self.base))

    def test_skeleton_is_a_valid_overlay(self):
        self.assertEqual(qz.overlay_errors(self.base, self.patch()), [])

    def test_overlay_cannot_change_answers_or_times(self):
        p = self.patch()
        p["questions"][1]["answer"] = 3
        p["questions"][1]["t"] = 5
        out = "\n".join(qz.overlay_errors(self.base, p))
        self.assertIn("may not change ['answer', 't']", out)

    def test_overlay_must_cover_every_question_and_option(self):
        p = self.patch()
        p["questions"].pop()
        p["questions"][1]["options"] = ["a", "b", "c"]
        p["questions"][0]["items"][0]["id"] = "zz"
        out = "\n".join(qz.overlay_errors(self.base, p))
        self.assertIn("questions differ", out)
        self.assertIn("options must be 4 texts", out)
        self.assertIn("items must keep the same ids", out)


if __name__ == "__main__":
    unittest.main()
