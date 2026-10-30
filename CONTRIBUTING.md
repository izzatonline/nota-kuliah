# Contributing

Thank you for helping. This project is for the ummah, and every kind of help counts: writing notes, checking evidences,
fixing bugs, improving the app.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org). Write the subject in lowercase, imperative mood,
and keep it short:

```
<type>(<optional scope>): <what changed>
```

| Type       | Use for                                              |
| ---------- | ---------------------------------------------------- |
| `feat`     | a new feature or new notes for an episode            |
| `fix`      | a bug fix, or a correction to a note                 |
| `docs`     | README, roadmap, contributing and other documentation |
| `refactor` | code changes that do not change behaviour            |
| `style`    | formatting and visual polish without logic changes   |
| `perf`     | performance improvements                             |
| `test`     | adding or fixing tests                               |
| `chore`    | tooling, dependencies, configuration                 |

Examples:

```
feat(landing): show a continue card for returning visitors
fix(notes): correct the timestamp for An-Najm 53:9 in ep41
feat(notes): add ep42 notes
chore(pipeline): move work files to private/<series>/<ep>
```

One concern per commit. Keep notes for different episodes in separate commits.

## Adding notes

See the "Add an episode" section of the [README](README.md). Never commit audio or transcripts: they stay in `private/`.
Hadith text marked as unverified must be checked against a hadith source before it is presented as verified.

## Verifying hadith

The list of hadith still to check is [docs/hadith-review.md](docs/hadith-review.md). Regenerate it with
`python3 scripts/hadith_checklist.py`. For each entry:

1. Find the hadith on [sunnah.com](https://sunnah.com) (or [dorar.net](https://dorar.net) for the Arabic and its ruling).
   The "Semak" line has search links to start from. They are searches, not answers.
2. Copy the Arabic text (the matn, without the chain) and the reference from the source. Do not retype Arabic.
3. Check that our Malay translation says what the hadith says, and fix it if not. The English overlay follows.
4. Write the source with its number (for example "Sahih al-Bukhari 3930 (Kitab 63, Hadis 155)"), the narrator and the
   grade from the source, then set `"verified": true` in the episode's `notes.json`.
5. Never mark an entry verified from memory, and never copy a grade from somewhere that does not cite its source.
   If the ustaz himself said the hadith is weak, keep that in the entry.

Entries from Bukhari or Muslim are the quickest. Start with those, then the ones where the lecture named no source.
