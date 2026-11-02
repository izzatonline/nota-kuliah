import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, ExternalLink, Flame, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { youtubeUrl } from '@/lib/data'
import { useT } from '@/lib/i18n'
import {
  addResult, emptyTally, grade, mulberry32, passed, sample, show, shuffle, speedBonus,
  type Item, type Response, type Shown, type Tally,
} from '@/lib/quiz'
import { getRecord, saveAttempt, saveRevision } from '@/lib/quiz-progress'
import { ChoiceQuestion } from './choice'
import { MatchQuestion } from './match'
import { OrderQuestion } from './order'
import { ResultScreen } from './result-screen'
import { StartScreen } from './start-screen'

type Props = {
  /** Where the best score is kept: see `quizKey`. */
  storeKey: string
  title: string
  intro: string
  pool: Item[]
  /** Play only this many questions, drawn evenly from the pool (the series quiz). All of them when omitted. */
  take?: number
  back: { to: string; label: string }
  /** Seconds allowed per question (Cabaran). The speed bonus applies only when this is set. */
  timed?: number
  /** Shown on the start screen, such as the mastery ring of the series quiz. */
  extra?: ReactNode
}

type Round = { shown: Shown[]; seed: number; revision: boolean }
type Answer = { ok: boolean; response: Response }

/** Start screen, one question at a time with instant feedback, then the result. */
export function QuizRunner({ storeKey, title, intro, pool, take, back, extra, timed }: Props) {
  const { t } = useT()
  const [round, setRound] = useState<Round | null>(null)
  const [i, setI] = useState(0)
  const [tally, setTally] = useState<Tally>(emptyTally)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [record, setRecord] = useState(() => getRecord(storeKey))
  useEffect(() => setRecord(getRecord(storeKey)), [storeKey])

  const known = useMemo(() => new Set(pool.map((p) => p.uid)), [pool])
  const revise = (record?.wrong ?? []).filter((u) => known.has(u))

  const begin = (items: Item[], revision: boolean) => {
    const seed = Date.now()
    const rng = mulberry32(seed)
    setRound({ shown: items.map((it) => show(it, rng)), seed, revision })
    setI(0)
    setTally(emptyTally)
    setAnswers([])
  }
  const startAll = () => begin(take ? sample(pool, take, mulberry32(Date.now())) : pool, false)
  const startWrong = () => begin(shuffle(pool.filter((p) => revise.includes(p.uid)), mulberry32(Date.now())), true)

  const total = round?.shown.length ?? 0
  const finished = Boolean(round) && answers.length === total && i >= total

  // a finished round is saved once
  const saved = useRef<Round | null>(null)
  useEffect(() => {
    if (!round || !finished || saved.current === round) return
    saved.current = round
    const wrong = round.shown.filter((_, n) => !answers[n]?.ok).map((s) => s.item.uid)
    if (round.revision) {
      // a revision round only clears what is now right; the best score of the full quiz stays
      const inRound = new Set(round.shown.map((x) => x.item.uid))
      saveRevision(storeKey, [...(getRecord(storeKey)?.wrong ?? []).filter((u) => !inRound.has(u)), ...wrong])
    } else saveAttempt(storeKey, { correct: tally.correct, total, points: tally.points, wrong, passed: passed(tally.correct, total) })
    setRecord(getRecord(storeKey))
  }, [round, finished, answers, tally, total, storeKey])

  if (!round) {
    return <StartScreen title={title} intro={intro} count={take ? Math.min(take, pool.length) : pool.length} record={record} revise={revise.length} extra={extra} onStart={startAll} onRevise={startWrong} />
  }

  if (finished) {
    return (
      <ResultScreen
        title={title}
        total={total}
        tally={tally}
        missed={round.shown.filter((_, n) => !answers[n]?.ok).map((s) => s.item)}
        back={back}
        onRetryWrong={() => begin(round.shown.filter((_, n) => !answers[n]?.ok).map((s) => s.item), true)}
        onRetryAll={startAll}
      />
    )
  }

  return (
    <Playing
      key={`${round.seed}:${i}`}
      shown={round.shown[i]}
      n={i + 1}
      total={total}
      tally={tally}
      answer={answers[i]}
      timed={timed}
      onAnswer={(response, secondsLeft) => {
        // no response means the clock ran out
        const ok = response !== null && grade(round.shown[i].item.q, response)
        setTally((tl) => addResult(tl, ok, timed ? speedBonus(secondsLeft) : 0))
        setAnswers((a) => [...a.slice(0, i), { ok, response: response as Response }])
      }}
      onNext={() => setI((x) => x + 1)}
      last={i === total - 1}
    />
  )
}

type PlayingProps = { shown: Shown; n: number; total: number; tally: Tally; answer?: Answer; timed?: number; onAnswer: (r: Response | null, secondsLeft: number) => void; onNext: () => void; last: boolean }

function Playing({ shown, n, total, tally, answer, timed, onAnswer, onNext, last }: PlayingProps) {
  const { t } = useT()
  const q = shown.item.q
  const locked = Boolean(answer)
  const heading = useRef<HTMLHeadingElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  useEffect(() => heading.current?.focus(), [])
  // Cabaran: a clock per question. Running out counts as a miss.
  const [left, setLeft] = useState(timed ?? 0)
  const leftRef = useRef(left)
  leftRef.current = left
  useEffect(() => {
    if (!timed || locked) return
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [timed, locked])
  useEffect(() => {
    if (timed && !locked && left <= 0) onAnswer(null, 0)
  }, [timed, locked, left, onAnswer])
  const submit = (r: Response) => onAnswer(r, leftRef.current)
  useEffect(() => {
    if (locked) next.current?.focus()
  }, [locked])

  return (
    <div className="mx-auto max-w-xl space-y-5 py-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{t('quiz.progress', { i: n, n: total })}</span>
          <span className="flex items-center gap-3 whitespace-nowrap tabular-nums">
            {timed ? <span className={`font-medium ${left <= 5 && !locked ? 'text-destructive' : ''}`}>{t('quiz.timeLeft', { s: Math.max(0, left) })}</span> : null}
            {tally.streak >= 2 && <span className="flex items-center gap-1 text-gold" title={t('quiz.streak', { n: tally.streak })}><Flame className="size-4" aria-hidden /><span aria-hidden>{tally.streak}</span><span className="sr-only">{t('quiz.streak', { n: tally.streak })}</span></span>}
            <span className="font-medium text-foreground">{t('quiz.score', { p: tally.points })}</span>
          </span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n - 1 + (locked ? 1 : 0)} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((n - 1 + (locked ? 1 : 0)) / total) * 100}%` }} />
        </div>
      </div>

      <h2 ref={heading} tabIndex={-1} className="text-balance text-xl font-semibold leading-snug tracking-tight outline-none">{q.q}</h2>

      {(q.type === 'mcq' || q.type === 'tf' || q.type === 'multi') && (
        <ChoiceQuestion shown={shown} locked={locked} response={answer?.response as number | boolean | number[]} onSubmit={submit} />
      )}
      {q.type === 'order' && <OrderQuestion shown={shown} locked={locked} response={answer?.response as string[]} onSubmit={submit} />}
      {q.type === 'match' && <MatchQuestion shown={shown} locked={locked} response={answer?.response as Record<string, string>} onSubmit={submit} />}

      <div aria-live="polite" role="status">
        {answer && (
          <div className={`space-y-3 rounded-xl border p-4 ${answer.ok ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}`}>
            <p className={`flex items-center gap-2 font-semibold ${answer.ok ? 'text-primary' : 'text-destructive'}`}>
              {answer.ok ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
              {answer.ok ? t('quiz.correct') : answer.response === null || answer.response === undefined ? t('quiz.timeUp') : t('quiz.wrong')}
            </p>
            <p className="text-sm leading-relaxed">{q.explain}</p>
            <a className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" href={youtubeUrl(shown.item.youtubeId, q.t)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" aria-hidden /> {t('quiz.watch')}
            </a>
          </div>
        )}
      </div>

      {answer && (
        <Button ref={next} size="lg" className="w-full gap-2 sm:w-auto" onClick={onNext}>
          {last ? t('quiz.finish') : t('quiz.next')} <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  )
}
