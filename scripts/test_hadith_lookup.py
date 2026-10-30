"""Offline tests for the hadithapi.com lookup helper. No network and no key are needed."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hadith_lookup  # noqa: E402


def hadith(number, english, book="sahih-bukhari"):
    return {"bookSlug": book, "hadithNumber": number, "hadithEnglish": english, "status": "Sahih", "englishNarrator": "Narrated Aisha:",
            "hadithArabic": "x", "book": {"bookName": "Sahih Bukhari"}}


class LookupTests(unittest.TestCase):
    def test_book_slug_follows_the_collection_named_in_the_source(self):
        self.assertEqual(hadith_lookup.book_slug("Sahih al-Bukhari 3930"), "sahih-bukhari")
        self.assertEqual(hadith_lookup.book_slug("Sahih Muslim"), "sahih-muslim")
        self.assertEqual(hadith_lookup.book_slug("Sunan Ibn Majah"), "ibn-e-majah")
        self.assertIsNone(hadith_lookup.book_slug("Sumber tidak disebut dalam kuliah"))

    def test_keywords_put_names_and_transliterations_first(self):
        words = hadith_lookup.keywords("Aisha said that the day of Bu'ath was a day Allah brought forward for Madinah")
        self.assertEqual(words[0], "Bu'ath")
        self.assertIn("Madinah", words)
        self.assertLessEqual(len(words), 3)

    def test_overlap_is_the_share_of_our_words_found_in_the_candidate(self):
        self.assertEqual(hadith_lookup.overlap("nobles killed battle", "their nobles had been killed in battle"), 1.0)
        self.assertEqual(hadith_lookup.overlap("", "anything"), 0.0)

    def test_candidates_merge_searches_and_rank_the_closest_first(self):
        calls = []

        def fake(params, key):
            calls.append(params)
            return [hadith("1", "unrelated words entirely"), hadith("3930", "The day of Bu'ath battle nobles had been killed")]

        found = hadith_lookup.candidates("the day of Bu'ath where nobles were killed in battle", "Sahih Bukhari", "k", search=fake)
        self.assertEqual(found[0][1]["hadithNumber"], "3930")
        self.assertTrue(all(c["book"] == "sahih-bukhari" for c in calls))
        self.assertEqual(len({h["hadithNumber"] for _, h in found}), len(found))  # no duplicates

    def test_phrases_pair_neighbouring_content_words(self):
        self.assertIn("lost property", hadith_lookup.phrases("Wisdom is the lost property of the believer"))

    def test_a_weak_result_in_the_named_book_is_retried_across_all_books(self):
        def fake(params, key):
            if params.get("book"):
                return [hadith("1", "nothing in common")]
            return [hadith("2", "wisdom lost property believer", book="al-tirmidhi")]

        found = hadith_lookup.candidates("wisdom is the lost property of the believer", "Sahih Bukhari", "k", search=fake)
        self.assertEqual(found[0][1]["bookSlug"], "al-tirmidhi")

    def test_missing_fields_in_an_answer_do_not_break_the_report(self):
        sparse = {"bookSlug": "sahih-muslim", "hadithNumber": "7", "hadithEnglish": None, "englishNarrator": None, "hadithArabic": None, "status": None, "book": None}
        text = hadith_lookup.render_entry({"id": "ep1"}, {"id": "h1", "ref": "r", "translation": "t"}, "english", [(0.1, sparse)])
        self.assertIn("sahih-muslim 7", text)
        self.assertIn("no grade", text)
        self.assertEqual(hadith_lookup.candidates("some words here", None, "k", search=lambda p, k: [sparse])[0][1], sparse)

    def test_the_key_never_appears_in_rendered_output(self):
        notes = {"id": "ep45"}
        text = hadith_lookup.render_entry(notes, {"id": "h0", "ref": "r", "translation": "t"}, "english", [(0.5, hadith("3930", "The day of Bu'ath"))])
        self.assertIn("Sahih Bukhari 3930", text)
        self.assertNotIn("apiKey", text)


if __name__ == "__main__":
    unittest.main()
