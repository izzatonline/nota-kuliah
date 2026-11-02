import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Shown } from '@/lib/quiz'

type Props = { shown: Shown; locked: boolean; response?: string[]; onSubmit: (r: string[]) => void }

/** Tap the items in sequence. Tapping a chosen item takes it (and nothing else) out again. */
export function OrderQuestion({ shown, locked, response, onSubmit }: Props) {
  const { t } = useT()
  const q = shown.item.q
  const [picked, setPicked] = useState<string[]>([])
  useEffect(() => setPicked([]), [shown])
  if (q.type !== 'order') return null

  const chosen = locked ? response ?? [] : picked
  const items = shown.items ?? []
  const text = (id: string) => q.items.find((i) => i.id === id)?.text ?? ''
  const toggle = (id: string) => {
    if (locked) return
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('quiz.orderHint')}</p>
      <ul className="grid gap-2.5">
        {items.map((it) => {
          const pos = chosen.indexOf(it.id)
          const placed = pos >= 0
          const rightPlace = locked && q.answer[pos] === it.id
          return (
            <li key={it.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={placed}
                onClick={() => toggle(it.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left text-base leading-snug outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                  !locked && 'hover:border-primary/50 hover:bg-accent',
                  !locked && placed && 'border-primary bg-primary/5',
                  locked && placed && (rightPlace ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'),
                )}
              >
                <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs', placed ? 'bg-primary text-primary-foreground' : 'border border-dashed text-transparent')}>
                  {placed ? pos + 1 : '0'}
                </span>
                <span className="min-w-0 flex-1">{it.text}</span>
                {locked && placed && (rightPlace ? <Check className="size-4 shrink-0 text-primary" aria-label={t('quiz.correct')} /> : <X className="size-4 shrink-0 text-destructive" aria-label={t('quiz.wrong')} />)}
                {placed && !locked && <span className="sr-only">{t('quiz.orderRemove', { text: it.text })}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {locked ? (
        <div>
          <p className="mb-2 text-sm font-medium">{t('quiz.rightAnswer')}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">{q.answer.map((id) => <li key={id}>{text(id)}</li>)}</ol>
        </div>
      ) : (
        <button
          type="button"
          disabled={picked.length !== items.length}
          onClick={() => onSubmit(picked)}
          className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {t('quiz.check')}
        </button>
      )}
    </div>
  )
}
