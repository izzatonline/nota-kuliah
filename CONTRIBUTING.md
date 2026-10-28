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
