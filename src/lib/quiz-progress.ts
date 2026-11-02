/** Remembers, in this browser only, how each quiz went: best score, attempts and the questions still to revise. */
const KEY = 'nota-quiz'

export type Best = { correct: number; total: number; points: number }
export type QuizRecord = { attempts: number; best: Best | null; passed: boolean; wrong: string[]; updatedAt: number }
type Store = Record<string, QuizRecord>

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && typeof s === 'object' && !Array.isArray(s)) return s
    }
  } catch {}
  return {}
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

/** `slug/ep5` for an episode quiz, `slug/_series` for the series quiz. */
export const quizKey = (slug: string, ep?: string) => `${slug}/${ep ?? '_series'}`

export const getRecord = (key: string): QuizRecord | null => read()[key] ?? null

/** Saves a finished round. `wrong` holds the question uids to revise; only a better score replaces the best. */
export function saveAttempt(key: string, round: Best & { wrong: string[]; passed: boolean }) {
  const s = read()
  const old = s[key]
  const better = !old?.best || round.correct / round.total > old.best.correct / old.best.total || (round.correct / round.total === old.best.correct / old.best.total && round.points > old.best.points)
  s[key] = {
    attempts: (old?.attempts ?? 0) + 1,
    best: better ? { correct: round.correct, total: round.total, points: round.points } : old.best,
    passed: Boolean(old?.passed) || round.passed,
    wrong: round.wrong,
    updatedAt: Date.now(),
  }
  write(s)
}

/** Episodes of a series whose quiz was passed at least once. */
export function passedCount(slug: string, epIds: string[]) {
  const s = read()
  return epIds.filter((id) => s[quizKey(slug, id)]?.passed).length
}

/** A revision round of only the missed questions: keeps the best score, updates what is still to revise. */
export function saveRevision(key: string, wrong: string[]) {
  const s = read()
  if (!s[key]) return
  s[key] = { ...s[key], wrong, updatedAt: Date.now() }
  write(s)
}
