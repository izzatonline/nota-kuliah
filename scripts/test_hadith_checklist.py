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


if __name__ == "__main__":
    unittest.main()
