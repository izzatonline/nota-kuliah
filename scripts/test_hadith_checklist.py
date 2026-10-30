"""Offline tests for the hadith review checklist."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hadith_checklist  # noqa: E402


class ChecklistTests(unittest.TestCase):
    def test_stamp_formats_minutes_and_hours(self):
        self.assertEqual(hadith_checklist.stamp(532), "8:52")
        self.assertEqual(hadith_checklist.stamp(3725), "1:02:05")

    def test_every_unverified_hadith_is_listed_once_and_verified_ones_are_not(self):
        text, count = hadith_checklist.render()
        self.assertEqual(text.count("- [ ] "), count)
        for _, notes, d in hadith_checklist.unverified():
            self.assertFalse(d.get("verified"))
            self.assertEqual(d["kind"], "hadith")

    def test_source_class_ranks_how_easy_an_entry_is_to_check(self):
        self.assertEqual(hadith_checklist.source_class({"source": "Sahih Muslim"}), "Bukhari or Muslim")
        self.assertEqual(hadith_checklist.source_class({"source": "Sunan Tirmidzi"}), "Other source named")
        self.assertEqual(hadith_checklist.source_class({"source": "Sumber tidak disebut dalam kuliah"}), "No source named")

    def test_lookup_links_use_english_words_and_arabic_without_vowel_marks(self):
        links = hadith_checklist.lookup_links({"arabic": "السَّلَامُ عَلَيْكُمْ دَارَ قَوْمٍ مُؤْمِنِينَ"}, "The day of Bu'ath was a day Allah brought forward")
        self.assertIn("sunnah.com/search?q=The%20day%20of%20Bu%27ath", links)
        self.assertIn("dorar.net/hadith/search?q=" + "%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85", links)
        self.assertEqual(hadith_checklist.lookup_links({}, "too short"), "")


if __name__ == "__main__":
    unittest.main()
