import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ExternalLink, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { youtubeUrl } from '@/lib/data'
import { useT, type Key } from '@/lib/i18n'
import { band, passed, type Item, type Tally } from '@/lib/quiz'
import { copy } from '@/lib/share'
import { Confetti, useCountUp, useMotion } from './fx'

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
  const perfect = total > 0 && correct === total
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
      {ok && <Confetti pieces={perfect ? 110 : 60} />}
      <div className="space-y-4 text-center">
        <h1 ref={head} tabIndex={-1} className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground outline-none">{t('quiz.result')}</h1>
        <ScoreRing pct={pct} ok={ok} />
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

/** A ring that fills while the percentage counts up. A pass pops in with a gold glow; a miss stays quiet. */
function ScoreRing({ pct, ok }: { pct: number; ok: boolean }) {
  const motion = useMotion()
  const shown = useCountUp(pct)
  const r = 58
  const len = 2 * Math.PI * r
  const [fill, setFill] = useState(motion ? 0 : pct)
  useEffect(() => {
    // one frame at zero so the ring has something to grow from
    const id = requestAnimationFrame(() => setFill(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  return (
    <div role="img" aria-label={`${pct}%`} className={`relative mx-auto grid size-36 place-items-center ${ok ? 'nk-pop' : ''}`}>
      <svg viewBox="0 0 136 136" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="68" cy="68" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="68" cy="68" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          className={ok ? 'stroke-primary' : 'stroke-muted-foreground/50'}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - fill / 100)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.3, 0.1, 0.2, 1)', filter: ok ? 'drop-shadow(0 0 6px hsl(var(--gold) / 0.55))' : undefined }}
        />
      </svg>
      <span className="text-3xl font-semibold tabular-nums">{shown}%</span>
    </div>
  )
}
