import { History, Play, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import type { QuizRecord } from '@/lib/quiz-progress'

type Props = { title: string; intro: string; count: number; record: QuizRecord | null; revise: number; onStart: () => void; onRevise: () => void }

export function StartScreen({ title, intro, count, record, revise, onStart, onRevise }: Props) {
  const { t } = useT()
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Trophy className="size-7" aria-hidden /></div>
      <div className="space-y-2">
        <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{t('quiz.questions', { n: count })}</p>
      </div>
      <p className="mx-auto max-w-md text-pretty text-muted-foreground">{intro}</p>
      <div className="mx-auto flex max-w-sm flex-col gap-1 rounded-xl border bg-card p-4 text-sm">
        {record?.best ? (
          <>
            <p className="font-medium">{t('quiz.best', { c: record.best.correct, n: record.best.total, p: record.best.points })}</p>
            <p className="text-muted-foreground">{t('quiz.attempts', { n: record.attempts })}{record.passed ? ` · ${t('quiz.passedBadge')}` : ''}</p>
          </>
        ) : (
          <p className="text-muted-foreground">{t('quiz.noBest')}</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-2.5">
        <Button size="lg" className="min-w-40 gap-2" onClick={onStart} autoFocus>
          <Play aria-hidden /> {record?.best ? t('quiz.startAgain') : t('quiz.start')}
        </Button>
        {revise > 0 && (
          <Button variant="outline" className="gap-2" onClick={onRevise}>
            <History aria-hidden /> {t('quiz.revise', { n: revise })}
          </Button>
        )}
      </div>
    </div>
  )
}
