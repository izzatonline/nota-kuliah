import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandLink } from '@/components/brand'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeToggle } from '@/components/theme'
import { QuizRunner } from '@/components/quiz/quiz-runner'
import { SiteFooter } from '@/components/site-footer'
import { epPath, loadIndex } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { loadQuiz, loadSeriesPool, SERIES_QUESTIONS, toItems, type Item } from '@/lib/quiz'
import { quizKey } from '@/lib/quiz-progress'
import type { SeriesIndex } from '@/lib/types'

/** `/:slug/:epId/quiz` is one episode's quiz; `/:slug/quiz` draws from every episode that has one. */
export function QuizPage() {
  const { t, lang } = useT()
  const { slug = '', epId } = useParams()
  const [index, setIndex] = useState<SeriesIndex | null>(null)
  const [pool, setPool] = useState<Item[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setIndex(null)
    setFailed(false)
    loadIndex(slug).then(setIndex).catch(() => setFailed(true))
  }, [slug])

  const episode = index?.episodes.find((e) => e.id === epId)
  useEffect(() => {
    if (!index) return
    setPool(null)
    const load = epId
      ? episode
        ? loadQuiz(slug, episode.id, lang).then((q) => (q ? toItems(q, episode.id, episode.youtubeId) : []))
        : Promise.resolve([])
      : loadSeriesPool(index, lang)
    load.then(setPool).catch(() => setPool([]))
  }, [index, slug, epId, episode, lang])

  const title = epId ? t('quiz.title', { title: episode?.title ?? '' }) : t('quiz.seriesName', { series: index?.series.title ?? '' })
  useEffect(() => {
    document.title = `${title} · Nota Kuliah`
    // quizzes are interactive, not content: keep them out of search results
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,follow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [title])

  if (failed || (index && epId && !episode)) return <Navigate to={failed ? '/' : `/${slug}`} replace />

  const back = epId ? { to: epPath(slug, epId), label: t('quiz.backToNotes') } : { to: `/${slug}`, label: t('quiz.backToSeries') }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
        <BrandLink />
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 gap-1.5 text-muted-foreground">
          <Link to={back.to}><ArrowLeft aria-hidden /> {back.label}</Link>
        </Button>
        {!pool ? (
          <Skeleton className="mx-auto h-72 w-full max-w-xl rounded-xl" />
        ) : pool.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{epId ? t('quiz.none') : t('quiz.noneSeries')}</p>
        ) : (
          <QuizRunner
            // a new language or quiz starts clean
            key={`${slug}/${epId ?? ''}/${lang}`}
            storeKey={quizKey(slug, epId)}
            title={epId ? (episode?.title ?? '') : t('quiz.seriesName', { series: index?.series.title ?? '' })}
            intro={epId ? t('quiz.intro') : t('quiz.seriesIntro', { n: Math.min(SERIES_QUESTIONS, pool.length) })}
            pool={pool}
            take={epId ? undefined : SERIES_QUESTIONS}
            back={back}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
