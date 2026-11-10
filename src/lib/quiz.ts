import type { Choice, Question, Quiz, SeriesIndex } from './types'
import type { Lang } from './i18n'
import { overlay } from './overlay'

/** Share of correct answers that counts as a pass. */
export const PASS_MARK = 0.7
export const POINTS_PER_CORRECT = 10
export const SERIES_QUESTIONS = 20
export const CHALLENGE_QUESTIONS = 10
/** Seconds per question in Cabaran. The speed bonus exists only there: 1 point for every 3 seconds left, so at most 5. */
export const CHALLENGE_SECONDS = 15
export const speedBonus = (secondsLeft: number) => Math.ceil(Math.max(0, secondsLeft) / 3)

export type SeriesMode = 'mix' | 'range' | 'challenge'

/** A question as it is played: where it came from, so the learner can watch that moment again. */
export type Item = { uid: string; q: Question; epId: string; youtubeId: string }

/** What the learner answered, in terms of the authored data (never the shuffled positions). */
export type Response = number | boolean | number[] | string[] | Record<string, string>

async function fetchJson<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  // a missing file is answered with the app shell (html), so only json counts
  if (!r.ok || !r.headers.get('content-type')?.includes('json')) return null
  return r.json()
}

/** The quiz of one episode. English is an overlay of text only; with no overlay yet the Malay text is shown. */
export async function loadQuiz(slug: string, ep: string, lang: Lang): Promise<Quiz | null> {
  const base = await fetchJson<Quiz>(`/series/${slug}/${ep}/quiz.json`)
  if (!base || lang === 'ms') return base
  const patch = await fetchJson<unknown>(`/series/${slug}/${ep}/quiz.en.json`)
  return patch ? overlay(base, patch) : base
}

export const toItems = (quiz: Quiz, epId: string, youtubeId: string): Item[] =>
  quiz.questions.map((q) => ({ uid: `${epId}:${q.id}`, q, epId, youtubeId }))

/** Every question of every episode that has a quiz, in lecture order. */
export async function loadSeriesPool(index: SeriesIndex, lang: Lang): Promise<Item[]> {
  const eps = index.episodes.filter((e) => e.hasQuiz)
  const quizzes = await Promise.all(eps.map((e) => loadQuiz(index.series.slug, e.id, lang)))
  return eps.flatMap((e, i) => (quizzes[i] ? toItems(quizzes[i]!, e.id, e.youtubeId) : []))
}

/* ---------------------------------------------------------------- randomness */
export type Rng = () => number

/** A small seeded generator, so a round can be reproduced and tested. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Up to `n` questions spread evenly over the episodes: take one from each episode in turn. */
export function sample(pool: Item[], n: number, rng: Rng): Item[] {
  const byEp = new Map<string, Item[]>()
  for (const it of pool) byEp.set(it.epId, [...(byEp.get(it.epId) ?? []), it])
  const queues = shuffle([...byEp.values()].map((q) => shuffle(q, rng)), rng)
  const out: Item[] = []
  while (out.length < n && queues.some((q) => q.length)) for (const q of queues) if (q.length && out.length < n) out.push(q.shift()!)
  return out
}

/* ---------------------------------------------------------------- one question as shown */
export type Shown = {
  item: Item
  /** Option positions (indexes into the authored options) in the order they are displayed. */
  order?: number[]
  /** Order and match questions: what is displayed, shuffled. */
  items?: Choice[]
  right?: Choice[]
}

const sameSeq = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i])

export function show(item: Item, rng: Rng): Shown {
  const q = item.q
  if (q.type === 'mcq' || q.type === 'multi') return { item, order: shuffle(q.options.map((_, i) => i), rng) }
  if (q.type === 'order') {
    let items = shuffle(q.items, rng)
    // never hand the answer over already in order
    for (let tries = 0; tries < 5 && sameSeq(items.map((i) => i.id), q.answer); tries++) items = shuffle(q.items, rng)
    return { item, items }
  }
  if (q.type === 'match') return { item, items: q.left, right: shuffle(q.right, rng) }
  return { item }
}

/* ---------------------------------------------------------------- grading and scoring */
export function grade(q: Question, r: Response): boolean {
  switch (q.type) {
    case 'mcq':
      return r === q.answer
    case 'tf':
      return r === q.answer
    case 'multi': {
      const got = [...(r as number[])].sort()
      const want = [...q.answer].sort()
      return got.length === want.length && got.every((x, i) => x === want[i])
    }
    case 'order':
      return sameSeq(r as string[], q.answer)
    case 'match': {
      const got = r as Record<string, string>
      return q.answer.length === Object.keys(got).length && q.answer.every(([l, rt]) => got[l] === rt)
    }
  }
}

export type Tally = { correct: number; answered: number; streak: number; points: number; bonus: number }
export const emptyTally: Tally = { correct: 0, answered: 0, streak: 0, points: 0, bonus: 0 }

/** 10 points per correct answer; the third answer in a row adds 5, the fifth adds 10. A wrong answer breaks the streak. */
export function addResult(t: Tally, ok: boolean, speed = 0): Tally {
  const streak = ok ? t.streak + 1 : 0
  const bonus = (ok ? (streak === 3 ? 5 : streak === 5 ? 10 : 0) : 0) + (ok ? speed : 0)
  return {
    correct: t.correct + (ok ? 1 : 0),
    answered: t.answered + 1,
    streak,
    points: t.points + (ok ? POINTS_PER_CORRECT : 0) + bonus,
    bonus: t.bonus + bonus,
  }
}

export type Band = 'mumtaz' | 'baik' | 'hampir' | 'ulang'

/** Kind wording for the result, never a ranking against others. Passing is 70% and up. */
export function band(correct: number, total: number): Band {
  const p = total ? correct / total : 0
  return p >= 0.9 ? 'mumtaz' : p >= PASS_MARK ? 'baik' : p >= 0.5 ? 'hampir' : 'ulang'
}
export const passed = (correct: number, total: number) => total > 0 && correct / total >= PASS_MARK
