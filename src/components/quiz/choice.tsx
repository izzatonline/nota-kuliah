import { useEffect, useState } from 'react'
import { Check, Circle, Square, SquareCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Shown } from '@/lib/quiz'

type Props = {
  shown: Shown
  /** Set once answered: the question is locked and the right answers are marked. */
  locked: boolean
  response?: number | boolean | number[]
  onSubmit: (r: number | boolean | number[]) => void
}

/** mcq, tf and multi share one look: a list of big buttons. Keys 1 to 4 pick an option. */
export function ChoiceQuestion({ shown, locked, response, onSubmit }: Props) {
  const { t } = useT()
  const q = shown.item.q
  const multi = q.type === 'multi'
  const [picked, setPicked] = useState<number[]>([])

  // each question starts clean (the component is reused when the next question has the same type)
  useEffect(() => setPicked([]), [shown])

  const rows: { key: number | boolean; text: string }[] =
    q.type === 'tf'
      ? [{ key: true, text: t('quiz.true') }, { key: false, text: t('quiz.false') }]
      : (shown.order ?? []).map((i) => ({ key: i, text: (q as { options: string[] }).options[i] }))

  const isRight = (k: number | boolean) => (q.type === 'multi' ? q.answer.includes(k as number) : q.type !== 'order' && q.type !== 'match' && q.answer === k)
  const chosen = (k: number | boolean) => (multi ? (locked ? ((response as number[] | null) ?? []) : picked).includes(k as number) : locked && response === k)

  const press = (k: number | boolean) => {
    if (locked) return
    if (multi) setPicked((p) => (p.includes(k as number) ? p.filter((x) => x !== k) : [...p, k as number]))
    else onSubmit(k)
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (locked || e.metaKey || e.ctrlKey || e.altKey) return
      const i = Number(e.key) - 1
      if (i >= 0 && i < rows.length) press(rows[i].key)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{q.type === 'tf' ? t('quiz.tfHint') : multi ? t('quiz.pickMany') : t('quiz.pickOne')}</p>
      <div role={multi ? 'group' : 'radiogroup'} aria-label={q.q} className="grid gap-2.5">
        {rows.map((r, n) => {
          const right = locked && isRight(r.key)
          const wrong = locked && chosen(r.key) && !isRight(r.key)
          const on = chosen(r.key)
          const Icon = multi ? (on ? SquareCheck : Square) : Circle
          return (
            <button
              key={String(r.key)}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              disabled={locked}
              onClick={() => press(r.key)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left text-base leading-snug outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                !locked && 'hover:border-primary/50 hover:bg-accent',
                !locked && on && 'border-primary bg-primary/5',
                right && 'border-primary bg-primary/10',
                wrong && 'border-destructive bg-destructive/10',
                locked && !right && !wrong && 'opacity-70',
              )}
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-xs text-muted-foreground">{n + 1}</span>
              <span className="min-w-0 flex-1">{r.text}</span>
              {locked ? (
                right ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"><Check className="size-4" aria-hidden />{t('quiz.correct')}</span>
                ) : wrong ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-destructive"><X className="size-4" aria-hidden />{t('quiz.wrong')}</span>
                ) : null
              ) : multi ? (
                <Icon className={cn('mt-0.5 size-5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
      {multi && !locked && (
        <button
          type="button"
          disabled={!picked.length}
          onClick={() => onSubmit(picked)}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {t('quiz.check')}
        </button>
      )}
    </div>
  )
}
