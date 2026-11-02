import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ExternalLink, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { youtubeUrl } from '@/lib/data'
import { useT, type Key } from '@/lib/i18n'
import { band, passed, type Item, type Tally } from '@/lib/quiz'
import { copy } from '@/lib/share'

type Props = {
  title: string
  total: number
  tally: Tally
  missed: Item[]
  back: { to: string; label: string }
  onRetryWrong: () => void
  onRetryAll: () => void
}

export function ResultScreen({ title, total, tally, missed, tally: { correct }, back, onRetryWrong, onRetryAll }: Props) {
  const { t } = useT()
  const ok = passed(correct, total)
  const pct = total ? Math.round((correct / total) * 100) : 0
  const [copied, setCopied] = useState(false)
  const head = useRef<HTMLHeadingElement>(null)
  useEffect(() => head.current?.focus(), [])

  const text = `${t('quiz.shareText', { c: correct, n: total, title })}\n${window.location.href}`
  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
        return
      } catch {}
    }
    if (await copy(text)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2">
      <div className="space-y-4 text-center">
        <h1 ref={head} tabIndex={-1} className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground outline-none">{t('quiz.result')}</h1>
        <div
          role="img"
          aria-label={`${pct}%`}
          className={`mx-auto grid size-32 place-items-center rounded-full border-8 ${ok ? 'border-primary text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500' : 'border-muted-foreground/30 text-foreground'}`}
        >
          <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{t('quiz.outOf', { c: correct, n: total })}</p>
          <p className="flex items-center justify-center gap-1.5 text-muted-foreground">
            {ok && <Sparkles className="size-4 text-gold" aria-hidden />}
            {t(`quiz.band.${band(correct, total)}` as Key)}
          </p>
          <p className="text-sm text-muted-foreground">{t('quiz.points', { p: tally.points, b: tally.bonus })}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {missed.length > 0 && (
          <Button className="gap-2" onClick={onRetryWrong}><RotateCcw aria-hidden /> {t('quiz.retryWrong')}</Button>
        )}
        <Button variant={missed.length ? 'outline' : 'default'} className="gap-2" onClick={onRetryAll}><RotateCcw aria-hidden /> {t('quiz.retryAll')}</Button>
        <Button variant="outline" className="gap-2" onClick={share}>{copied ? <Check aria-hidden /> : <Share2 aria-hidden />} {copied ? t('quiz.copied') : t('quiz.share')}</Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link to={back.to}><ArrowLeft aria-hidden /> {back.label}</Link>
        </Button>
      </div>

      {missed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t('quiz.missed')}</h2>
          <ul className="space-y-3">
            {missed.map((m) => (
              <li key={m.uid} className="rounded-xl border bg-card p-4 text-sm">
                <p className="font-medium leading-snug">{m.q.q}</p>
                <p className="mt-2 leading-relaxed text-muted-foreground">{m.q.explain}</p>
                <a className="mt-2 inline-flex items-center gap-1.5 font-medium text-primary hover:underline" href={youtubeUrl(m.youtubeId, m.q.t)} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" aria-hidden /> {t('quiz.watch')}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
