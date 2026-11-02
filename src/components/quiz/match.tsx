import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Shown } from '@/lib/quiz'

type Props = { shown: Shown; locked: boolean; response?: Record<string, string>; onSubmit: (r: Record<string, string>) => void }

/** Tap an item on the left, then its match on the right. A pair shares a number, so colour is never the only signal. */
export function MatchQuestion({ shown, locked, response, onSubmit }: Props) {
  const { t } = useT()
  const q = shown.item.q
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    setPairs({})
    setActive(null)
  }, [shown])
  if (q.type !== 'match') return null

  const current = locked ? response ?? {} : pairs
  const left = q.left
  const right = shown.right ?? []
  const num = (leftId: string) => left.findIndex((l) => l.id === leftId) + 1
  const leftOf = (rightId: string) => Object.keys(current).find((l) => current[l] === rightId)
  const truth = Object.fromEntries(q.answer)

  const tapLeft = (id: string) => {
    if (locked) return
    if (pairs[id]) {
      setPairs(({ [id]: _gone, ...rest }) => rest)
      setActive(null)
    } else setActive(active === id ? null : id)
  }
  const tapRight = (id: string) => {
    if (locked) return
    const owner = leftOf(id)
    if (owner) {
      setPairs(({ [owner]: _gone, ...rest }) => rest)
      return
    }
    if (active) {
      setPairs((p) => ({ ...p, [active]: id }))
      setActive(null)
    }
  }

  const box = 'flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left text-base leading-snug outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default'
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('quiz.matchHint')}</p>
      <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        <ul className="grid content-start gap-2.5">
          {left.map((l) => {
            const paired = current[l.id]
            const ok = locked && truth[l.id] === paired
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={active === l.id}
                  onClick={() => tapLeft(l.id)}
                  className={cn(
                    box,
                    !locked && 'hover:border-primary/50 hover:bg-accent',
                    !locked && (active === l.id || paired) && 'border-primary bg-primary/5',
                    active === l.id && 'ring-2 ring-primary',
                    locked && (ok ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'),
                  )}
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-xs text-muted-foreground">{num(l.id)}</span>
                  <span className="min-w-0 flex-1">{l.text}</span>
                  {locked && (ok ? <Check className="size-4 shrink-0 text-primary" aria-label={t('quiz.correct')} /> : <X className="size-4 shrink-0 text-destructive" aria-label={t('quiz.wrong')} />)}
                </button>
              </li>
            )
          })}
        </ul>
        <ul className="grid content-start gap-2.5" aria-label={t('quiz.matchPick')}>
          {right.map((r) => {
            const owner = leftOf(r.id)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={locked || (!active && !owner)}
                  onClick={() => tapRight(r.id)}
                  className={cn(box, !locked && (active || owner) && 'hover:border-primary/50 hover:bg-accent', owner && 'border-primary/60 bg-primary/5', locked && 'opacity-90')}
                >
                  <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs', owner ? 'bg-primary text-primary-foreground' : 'border border-dashed text-transparent')}>
                    {owner ? num(owner) : '0'}
                  </span>
                  <span className="min-w-0 flex-1">{r.text}</span>
                  {owner && <span className="sr-only">{t('quiz.matchPaired', { n: num(owner) })}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {locked ? (
        <div>
          <p className="mb-2 text-sm font-medium">{t('quiz.rightAnswer')}</p>
          <ul className="space-y-1 text-sm">
            {q.answer.map(([l, r]) => <li key={l}>{left.find((x) => x.id === l)?.text} → {q.right.find((x) => x.id === r)?.text}</li>)}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          disabled={Object.keys(pairs).length !== left.length}
          onClick={() => onSubmit(pairs)}
          className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {t('quiz.check')}
        </button>
      )}
    </div>
  )
}
