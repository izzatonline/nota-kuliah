import { Gauge, Layers, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { CHALLENGE_SECONDS, type SeriesMode } from '@/lib/quiz'

type Ep = { id: string; label: string }
type Props = { mode: SeriesMode; onMode: (m: SeriesMode) => void; episodes: Ep[]; from: number; to: number; onRange: (from: number, to: number) => void; rangeCount: number }

/** The three ways to play the series quiz. Cabaran is the only one with a clock and a speed bonus. */
export function ModePicker({ mode, onMode, episodes, from, to, onRange, rangeCount }: Props) {
  const { t } = useT()
  const modes: { key: SeriesMode; Icon: typeof Shuffle }[] = [
    { key: 'mix', Icon: Shuffle },
    { key: 'range', Icon: Layers },
    { key: 'challenge', Icon: Gauge },
  ]
  const select = 'h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div role="radiogroup" aria-label={t('quiz.mode')} className="grid grid-cols-3 gap-2">
        {modes.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={mode === key}
            onClick={() => onMode(key)}
            className={cn('flex flex-col items-center gap-1 rounded-xl border bg-card px-2 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', mode === key ? 'border-primary bg-primary/10' : 'hover:bg-accent')}
          >
            <Icon className="size-5" aria-hidden />
            {t(`quiz.mode.${key}` as const)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{t(`quiz.mode.${mode}Hint` as const, { s: CHALLENGE_SECONDS })}</p>
      {mode === 'range' && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <label className="flex items-center gap-2">{t('quiz.from')}
            <select className={select} value={from} onChange={(e) => onRange(Number(e.target.value), Math.max(Number(e.target.value), to))}>
              {episodes.map((e, i) => <option key={e.id} value={i}>{e.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">{t('quiz.to')}
            <select className={select} value={to} onChange={(e) => onRange(Math.min(from, Number(e.target.value)), Number(e.target.value))}>
              {episodes.map((e, i) => <option key={e.id} value={i} disabled={i < from}>{e.label}</option>)}
            </select>
          </label>
          {rangeCount < 20 && <p className="w-full text-muted-foreground">{t('quiz.fewQuestions', { n: rangeCount })}</p>}
        </div>
      )}
    </div>
  )
}
