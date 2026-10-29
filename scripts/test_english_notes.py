import unittest

import english_notes as en

NOTES = {
    "summary": "s", "keyPoints": ["a", "b"],
    "chapters": [{"id": "c1", "title": "t", "summary": "x", "start": 0}],
    "books": [], "people": [], "lessons": [], "glossary": [],
    "dalil": [
        {"id": "q1", "kind": "quran", "context": "c", "translation": "malay"},
        {"id": "h1", "kind": "hadith", "context": "c", "translation": "malay"},
    ],
    "sirah": {"era": "e", "summary": "s", "events": []},
    "mindmap": {"id": "root", "label": "l", "detail": "d", "t": 0},
}


class EnglishNotes(unittest.TestCase):
    def test_skeleton_leaves_times_and_quran_translation_alone(self):
        sk = en.skeleton(NOTES)
        self.assertNotIn("start", sk["chapters"][0])
        self.assertEqual(set(sk["dalil"][0]), {"id", "context"})
        self.assertIn("translation", en.skeleton(NOTES, quran=True)["dalil"][0])
        self.assertEqual(set(sk["dalil"][1]), {"id", "context", "translation"})

    def test_complete_overlay_passes(self):
        patch = en.skeleton(NOTES)
        self.assertEqual(en.shape_errors(en.skeleton(NOTES), patch), [])

    def test_overlay_cannot_touch_times_or_miss_items(self):
        sk = en.skeleton(NOTES)
        patch = en.skeleton(NOTES)
        patch["chapters"][0]["start"] = 5
        patch["keyPoints"] = ["only one"]
        patch["dalil"].pop()
        errors = en.shape_errors(sk, patch)
        self.assertTrue(any("start" in e for e in errors))
        self.assertTrue(any("keyPoints" in e for e in errors))
        self.assertTrue(any("untranslated" in e for e in errors))

    def test_published_overlays_are_valid(self):
        for ep_dir in en.episode_dirs():
            with self.subTest(ep=ep_dir.name):
                self.assertEqual(en.check(ep_dir) or [], [])


if __name__ == "__main__":
    unittest.main()
