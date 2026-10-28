"""Offline tests for the notes pipeline.

Run: python3 -m unittest discover -s scripts -p "test_*.py" -v

They cover the parts that decide whether notes can be trusted: finding timestamps from quotes,
spotting a broken transcript, and assembling notes. Nothing here touches the network.
"""
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pipeline  # noqa: E402


def segs(*items):
    """items are (start_seconds, text); each segment lasts 2 seconds."""
    return [(s, s + 2.0, t) for s, t in items]


TRANSCRIPT = segs(
    (0, "Alhamdulillah segala puji"),
    (10, "Kemudian Nabi SAW sampai ke Sidratul Muntaha"),
    (20, "Jibril AS tidak boleh melepasi had"),
    (30, "Aku mohon dengan semua nama yang kau miliki"),
    (120, "Sidratul Muntaha disebut sekali lagi di sini"),
)


class LocatorTests(unittest.TestCase):
    def setUp(self):
        self.loc = pipeline.Locator(TRANSCRIPT)

    def test_exact_quote_gives_its_time(self):
        self.assertEqual(self.loc.find("x", "Jibril AS tidak boleh melepasi", "0:20"), 20)

    def test_punctuation_and_case_are_ignored(self):
        self.assertEqual(self.loc.find("x", "jibril, AS tidak boleh MELEPASI had!", None), 20)

    def test_repeated_quote_uses_the_hint_to_pick_the_right_one(self):
        self.assertEqual(self.loc.find("x", "Sidratul Muntaha", "2:00"), 120)
        self.assertEqual(self.loc.find("x", "Sidratul Muntaha", "0:10"), 10)

    def test_single_letter_cannot_match_inside_a_word(self):
        # a one-word quote is ignored and the hint is used instead
        self.assertEqual(self.loc.find("x", "x", "0:30"), 30)
        self.assertTrue(any("shorter than 2 words" in how for _, _, how in self.loc.report))

    def test_fuzzy_match_near_the_hint_recovers_a_typo(self):
        t = self.loc.find("x", "Jibril AS tidak boleh melepasi hadd", "0:20")
        self.assertEqual(t, 20)
        self.assertTrue(any("fuzzy" in how for _, _, how in self.loc.report))

    def test_missing_quote_falls_back_to_the_hint_and_is_reported(self):
        self.assertEqual(self.loc.find("x", "kata yang tiada langsung", "0:45"), 45)
        self.assertTrue(any("used approx" in how for _, _, how in self.loc.report))

    def test_no_quote_and_no_hint_gives_nothing(self):
        self.assertIsNone(self.loc.find("x", None, None))


class TranscriptCheckTests(unittest.TestCase):
    def test_a_healthy_transcript_passes(self):
        good = segs(*[(i * 5, f"ayat nombor {i} dibincangkan") for i in range(100)])
        self.assertEqual(pipeline.check_transcript(good, 500), [])

    def test_a_repetition_loop_is_flagged(self):
        loop = segs((0, "mula"), *[(i * 3, "Jauh lebih bosan daripada diri sendiri.") for i in range(1, 60)])
        problems = pipeline.check_transcript(loop, 190)
        self.assertTrue(any("repeats" in p for p in problems))

    def test_a_transcript_that_stops_early_is_flagged(self):
        short = segs(*[(i * 5, f"baris {i} yang berbeza") for i in range(20)])
        self.assertTrue(any("only reaches" in p for p in pipeline.check_transcript(short, 1000)))

    def test_a_long_silence_is_flagged(self):
        gap = segs((0, "satu"), (10, "dua"), (400, "tiga"), (410, "empat"))
        self.assertTrue(any("gap" in p for p in pipeline.check_transcript(gap, 420)))


class HelperTests(unittest.TestCase):
    def test_video_id_from_a_url_and_a_bare_id(self):
        self.assertEqual(pipeline.video_id("https://www.youtube.com/watch?v=NszXGwmnv-I&list=PL1"), "NszXGwmnv-I")
        self.assertEqual(pipeline.video_id("https://youtu.be/NszXGwmnv-I"), "NszXGwmnv-I")
        self.assertEqual(pipeline.video_id("NszXGwmnv-I"), "NszXGwmnv-I")

    def test_clean_title_drops_series_and_speaker_parts(self):
        raw = "Ep 42: Solat Teras Keseimbangan Hidup | Sirah Impak Sosial | Ustaz Azlan Shah NK"
        self.assertEqual(pipeline.clean_title(raw), "Solat Teras Keseimbangan Hidup")

    def test_clean_title_keeps_every_part_of_an_unnumbered_episode(self):
        raw = "Prolog | Sirah Impak Sosial | Kehidupan Nabi Muhammad SAW"
        self.assertEqual(pipeline.clean_title(raw), "Prolog: Kehidupan Nabi Muhammad SAW")
        self.assertEqual(pipeline.clean_title("Prolog"), "Prolog")

    def test_extract_json_handles_fences_and_chatter(self):
        self.assertEqual(pipeline.extract_json('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(pipeline.extract_json('Berikut notanya: {"a": 2} selesai'), {"a": 2})
        with self.assertRaises(ValueError):
            pipeline.extract_json("tiada json di sini")

    def test_blocks_text_marks_blocks_with_minutes_and_seconds(self):
        text = pipeline.blocks_text(segs((0, "satu"), (50, "dua"), (3725, "tiga")))
        self.assertEqual(text.splitlines()[0], "[0:00] satu")
        self.assertTrue(text.splitlines()[-1].startswith("[62:05]"))


class AssembleTests(unittest.TestCase):
    """The draft-to-notes step, with the Quran lookup replaced so no network is needed."""

    QURAN = {
        "53:9": {"surah": "An-Najm", "surahArabic": "x", "ayah": 9, "arabic": "فَكَانَ قَابَ قَوْسَيْنِ", "translation": "terjemahan"},
    }

    def setUp(self):
        self.original_fetch = pipeline.fetch_quran
        pipeline.fetch_quran = lambda refs: {r: self.QURAN[r] for r in refs if r in self.QURAN}
        self.meta = {"id": "ep9", "youtubeId": "abcdefghijk", "number": 9, "title": "Ujian", "duration": 200}
        self.args = SimpleNamespace(speaker="Ustaz", series="Siri")
        self.loc = pipeline.Locator(TRANSCRIPT)

    def tearDown(self):
        pipeline.fetch_quran = self.original_fetch

    def draft(self, **extra):
        base = {
            "summary": "ringkasan", "keyPoints": ["a", "b", "c"],
            "chapters": [{"title": "Satu", "summary": "s", "at": "Alhamdulillah segala puji", "approx": "0:00"}],
            "dalil": [], "books": [], "suggested": [], "people": [], "lessons": [], "glossary": [],
            "sirah": {"era": "e", "summary": "s", "events": []},
            "mindmap": {"label": "akar", "detail": "d", "at": "Alhamdulillah segala puji", "approx": "0:00", "children": []},
        }
        base.update(extra)
        return base

    def test_quran_items_get_exact_text_from_the_source_not_the_draft(self):
        d = self.draft(dalil=[{"kind": "quran", "quran": "53:9", "context": "c", "at": "Jibril AS tidak boleh", "approx": "0:20"}])
        notes, _ = pipeline.assemble(d, self.meta, self.loc, self.args)
        verse = notes["dalil"][0]
        self.assertEqual(verse["arabic"], self.QURAN["53:9"]["arabic"])
        self.assertTrue(verse["verified"])
        self.assertEqual(verse["t"], 20)

    def test_unknown_quran_reference_is_dropped_with_a_warning(self):
        d = self.draft(dalil=[{"kind": "quran", "quran": "99:999", "context": "c", "at": "Jibril AS tidak boleh", "approx": "0:20"}])
        notes, warnings = pipeline.assemble(d, self.meta, self.loc, self.args)
        self.assertEqual(notes["dalil"], [])
        self.assertTrue(any("99:999" in w for w in warnings))

    def test_same_verse_twice_keeps_the_first_mention(self):
        item = {"kind": "quran", "quran": "53:9", "context": "c"}
        d = self.draft(dalil=[{**item, "at": "Sidratul Muntaha disebut sekali lagi", "approx": "2:00"},
                              {**item, "at": "Jibril AS tidak boleh", "approx": "0:20"}])
        notes, warnings = pipeline.assemble(d, self.meta, self.loc, self.args)
        self.assertEqual(len(notes["dalil"]), 1)
        self.assertEqual(notes["dalil"][0]["t"], 20)
        self.assertTrue(any("listed twice" in w for w in warnings))

    def test_hadith_is_never_marked_verified(self):
        d = self.draft(dalil=[{"kind": "hadith", "ref": "Hadis", "translation": "t", "context": "c",
                               "at": "Jibril AS tidak boleh", "approx": "0:20"}])
        notes, _ = pipeline.assemble(d, self.meta, self.loc, self.args)
        self.assertFalse(notes["dalil"][0]["verified"])
        self.assertEqual(notes["dalil"][0]["narrator"], "Tidak disebut dalam kuliah")

    def test_first_chapter_always_starts_at_zero_and_the_last_ends_at_the_duration(self):
        d = self.draft(chapters=[
            {"title": "A", "summary": "", "at": "Kemudian Nabi SAW sampai", "approx": "0:10"},
            {"title": "B", "summary": "", "at": "Aku mohon dengan semua nama", "approx": "0:30"},
        ])
        notes, _ = pipeline.assemble(d, self.meta, self.loc, self.args)
        self.assertEqual(notes["chapters"][0]["start"], 0)
        self.assertEqual(notes["chapters"][0]["end"], 30)
        self.assertEqual(notes["chapters"][-1]["end"], self.meta["duration"])

    def test_care_note_text_comes_from_the_reviewed_file_only(self):
        notes, _ = pipeline.assemble(self.draft(careNote=True), self.meta, self.loc, self.args)
        reviewed = json.loads(pipeline.CARE_NOTE.read_text())
        self.assertEqual(notes["careNote"], reviewed)
        plain, _ = pipeline.assemble(self.draft(), self.meta, self.loc, self.args)
        self.assertNotIn("careNote", plain)


if __name__ == "__main__":
    unittest.main()
