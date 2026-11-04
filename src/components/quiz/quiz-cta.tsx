import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useT } from '@/lib/i18n'
import { loadQuiz } from '@/lib/quiz'
import { getRecord, quizKey } from '@/lib/quiz-progress'

/** The "Kuiz" tab of an episode: how many questions, the best score so far, and the way in. */
export function QuizCta({ slug, episodeId }: { slug: string; episodeId: string }) {
  const { t, lang } = useT()
  const [count, setCount] = useState<number | null>(null)
  const record = getRecord(quizKey(slug, episodeId))
  useEffect(() => {
    loadQuiz(slug, episodeId, lang).then((q) => setCount(q?.questions.length ?? 0)).catch(() => setCount(0))
  }, [slug, episodeId, lang])

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Trophy className="size-6" aria-hidden /></div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">{t('quiz.cta')}</p>
          <p className="text-sm text-muted-foreground">{count ? t('quiz.ctaBody', { n: count }) : ' '}</p>
          <p className="text-sm text-muted-foreground">
            {record?.best ? `${t('quiz.best', { c: record.best.correct, n: record.best.total, p: record.best.points })}${record.passed ? ` · ${t('quiz.passedBadge')}` : ''}` : t('quiz.noBest')}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to={`/${slug}/${episodeId}/quiz`}>{record?.best ? t('quiz.startAgain') : t('quiz.start')} <ArrowRight aria-hidden /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}
