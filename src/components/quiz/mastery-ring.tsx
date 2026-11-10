import { useT } from '@/lib/i18n'
import { passedCount } from '@/lib/quiz-progress'

/** Episodes of the series whose quiz was passed, out of those that have one. The number is written out, so the ring is only decoration. */
export function MasteryRing({ slug, epIds }: { slug: string; epIds: string[] }) {
  const { t } = useT()
  const c = passedCount(slug, epIds)
  const n = epIds.length
  const r = 18
  const len = 2 * Math.PI * r
  return (
    <div className="mx-auto flex items-center justify-center gap-3 text-sm">
      <svg viewBox="0 0 44 44" className="size-11 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-primary" strokeDasharray={len} strokeDashoffset={len * (1 - (n ? c / n : 0))} />
      </svg>
      <span className="font-medium">{t('quiz.mastery', { c, n })}</span>
    </div>
  )
}
