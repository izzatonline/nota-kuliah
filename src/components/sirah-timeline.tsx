import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronLeft, ChevronRight, Milestone, X } from 'lucide-react'
import { getProgress } from '@/lib/progress'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Episode, SeriesIndex } from '@/lib/types'

type Phase = { id: string; hue: number; start: string; ms: string; en: string }
type TimelineData = { birthYear: number; phases: Phase[]; years: Record<string, number> }
type Item = { ep: Episode; phase: number; x: number; year?: number }

const STEP = 96 // distance between two episodes on the line
const PAD = 120 // room before the first and after the last episode
const hueStyle = (h: number) => ({ '--h': h }) as CSSProperties
/** The colour of a period, one value for light and one for dark, both taken from the period's hue. */
const DOT = 'bg-[hsl(var(--h)_58%_40%)] dark:bg-[hsl(var(--h)_55%_62%)]'
const INK = 'text-[hsl(var(--h)_60%_32%)] dark:text-[hsl(var(--h)_60%_72%)]'

/** The button that opens the timeline. Its border is lit by a light that runs around it, to be noticed. */
export function TimelineButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { t } = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('nk-shine inline-flex h-9 shrink-0 items-center justify-center gap-2 bg-background px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <Milestone className="size-4 text-[hsl(var(--gold))]" />
      {t('timeline.button')}
    </button>
  )
}

export function TimelineDialog({ index, activeId, onSelect, onClose }: { index: SeriesIndex; activeId: string; onSelect: (id: string) => void; onClose: () => void }) {
  const { t, lang } = useT()
  const slug = index.series.slug
  const [data, setData] = useState<TimelineData | null>(null)
  const [failed, setFailed] = useState(false)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [here, setHere] = useState(0) // the phase in the middle of the view

  useEffect(() => {
    let live = true
    fetch(`/series/${slug}/timeline.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: TimelineData) => live && setData(d))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [slug])

  const model = useMemo(() => {
    if (!data) return null
    let phase = 0
    const items: Item[] = index.episodes.map((ep, i) => {
      const at = data.phases.findIndex((p) => p.start === ep.id)
      if (at >= 0) phase = at
      return { ep, phase, x: PAD + i * STEP, year: data.years[ep.id] }
    })
    const spans = data.phases.map((p, k) => {
      const own = items.filter((i) => i.phase === k)
      const years = own.map((i) => i.year).filter((y): y is number => y != null)
      return { from: own[0].x - STEP / 2, to: own[own.length - 1].x + STEP / 2, count: own.length, first: own[0].x, years: years.length ? [Math.min(...years), Math.max(...years)] : null }
    })
    const lastNotes = [...items].reverse().find((i) => i.ep.hasNotes)?.ep.id
    return { items, spans, lastNotes, width: PAD * 2 + (items.length - 1) * STEP + STEP }
  }, [data, index.episodes])

  // Open on the episode the visitor is reading.
  useEffect(() => {
    if (!scroller || !model) return
    const cur = model.items.find((i) => i.ep.id === activeId)
    if (cur) scroller.scrollTo({ left: Math.max(0, cur.x - scroller.clientWidth / 2) })
  }, [scroller, model, activeId])

  const syncPhase = useCallback(() => {
    if (!scroller || !model) return
    const mid = scroller.scrollLeft + scroller.clientWidth / 2
    const k = model.spans.findIndex((s) => mid < s.to)
    setHere(k < 0 ? model.spans.length - 1 : k)
  }, [scroller, model])
  useEffect(() => {
    if (!scroller) return
    syncPhase()
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(syncPhase)
    }
    // A mouse wheel moves the line sideways, since there is nothing to scroll up or down.
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scroller.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    scroller.addEventListener('scroll', on, { passive: true })
    scroller.addEventListener('wheel', wheel, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', on)
      scroller.removeEventListener('wheel', wheel)
    }
  }, [scroller, syncPhase])

  // Drag the line with the mouse. Touch and trackpads already scroll on their own.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scroller) return
    drag.current = { x: e.clientX, left: scroller.scrollLeft, moved: false }
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || !scroller) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) scroller.scrollLeft = d.left - dx
  }
  const up = () => {
    window.setTimeout(() => (drag.current = null), 0) // lets the click that ends a drag be ignored first
  }

  const go = (id: string) => {
    onClose()
    onSelect(id)
  }
  const by = (dir: number) => scroller?.scrollBy({ left: dir * Math.max(300, scroller.clientWidth * 0.7), behavior: 'smooth' })
  const jump = (k: number) => model && scroller?.scrollTo({ left: Math.max(0, model.spans[k].first - 40), behavior: 'smooth' })

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="nk-tl-desc"
          className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:inset-6 lg:inset-x-[5vw] lg:inset-y-[7vh] short:inset-1 short:rounded-xl"
        >
          <div className="flex items-start gap-3 border-b px-4 py-3 sm:px-6 sm:py-4 short:py-1.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold leading-tight sm:text-xl short:text-base">
                <Milestone className="size-5 shrink-0 text-[hsl(var(--gold))]" />
                {t('timeline.button')}
              </Dialog.Title>
              <Dialog.Description id="nk-tl-desc" className="mt-1 text-sm text-muted-foreground short:hidden">{t('timeline.subtitle')}</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('timeline.close')}>
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {data && model && (
            <div className="flex items-center gap-1 border-b px-3 py-2 sm:px-5 short:py-1" role="group" aria-label={t('timeline.jump')}>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {data.phases.map((p, k) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => jump(k)}
                    aria-current={here === k}
                    style={hueStyle(p.hue)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      here === k ? 'border-[hsl(var(--h)_55%_45%/0.6)] bg-[hsl(var(--h)_60%_50%/0.14)] text-foreground' : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', DOT)} />
                    {p[lang]}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => by(-1)} aria-label="←" className="hidden size-8 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:grid">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => by(1)} aria-label="→" className="hidden size-8 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:grid">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            {failed && <p className="p-8 text-center text-sm text-destructive">{t('notFound')}</p>}
            {!failed && !model && <p className="p-8 text-center text-sm text-muted-foreground">{t('loading')}</p>}
            {data && model && (
              <>
                <div
                  ref={setScroller}
                  onPointerDown={down}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                  onClickCapture={(e) => {
                    if (drag.current?.moved) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  className="h-full min-h-[380px] short:min-h-0 cursor-grab select-none overflow-x-auto overflow-y-hidden active:cursor-grabbing"
                  tabIndex={-1}
                >
                  <div className="relative h-full min-h-[380px] short:min-h-0" style={{ width: model.width }}>
                    {/* the periods: a tint behind each, and its name pinned to the bottom while it is in view */}
                    {data.phases.map((p, k) => {
                      const s = model.spans[k]
                      return (
                        <div
                          key={p.id}
                          style={{ ...hueStyle(p.hue), left: s.from, width: s.to - s.from }}
                          className="absolute inset-y-0 border-l border-[hsl(var(--h)_55%_50%/0.28)] bg-[hsl(var(--h)_60%_50%/0.06)] first:border-l-0"
                        >
                          <div className="sticky left-0 flex w-max max-w-[min(100%,20rem)] flex-col px-3 pt-3 short:pt-1">
                            <span className={cn('text-[13px] font-semibold leading-tight', INK)}>{p[lang]}</span>
                            <span className="text-[11px] text-muted-foreground short:hidden">
                              {t('sidebar.episodes', { n: s.count })}
                              {s.years && ` · ${t('timeline.year', { y: s.years[0] })}${s.years[1] !== s.years[0] ? `–${s.years[1]}` : ''}`}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {/* the line itself, coloured by period, ending in a dashed tail for what is still to come */}
                    <div className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-border" style={{ left: PAD - STEP / 2, width: model.width - 2 * PAD + STEP }} />
                    {data.phases.map((p, k) => {
                      const s = model.spans[k]
                      return <div key={p.id} style={{ ...hueStyle(p.hue), left: s.from + (k === 0 ? STEP / 2 : 0), width: s.to - s.from - (k === 0 ? STEP / 2 : 0) }} className={cn('absolute top-1/2 h-[5px] -translate-y-1/2', DOT)} />
                    })}
                    <div className="absolute top-1/2 h-[5px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,hsl(var(--muted-foreground)/0.5)_0_6px,transparent_6px_12px)]" style={{ left: PAD + (model.items.length - 1) * STEP + STEP / 2, width: PAD }} />
                    <div className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground" style={{ left: PAD + (model.items.length - 1) * STEP + STEP / 2 + 12, top: 'calc(50% + 22px)' }}>
                      <span className="inline-flex items-center gap-1.5"><span className="size-2 animate-pulse rounded-full bg-[hsl(var(--gold))]" />{t('timeline.more')}</span>
                    </div>

                    {model.items.map((it, i) => (
                      <Node key={it.ep.id} item={it} up={i % 2 === 0} phase={data.phases[it.phase]} birth={data.birthYear} slug={slug} current={it.ep.id === activeId} latest={it.ep.id === model.lastNotes} onGo={go} />
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-popover to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-popover to-transparent" />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6 short:py-1">
            <span className="short:hidden">{t('timeline.hint')}</span>
            <span>{t('timeline.disclaimer')}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Node({ item, up, phase, birth, slug, current, latest, onGo }: { item: Item; up: boolean; phase: Phase; birth: number; slug: string; current: boolean; latest: boolean; onGo: (id: string) => void }) {
  const { t } = useT()
  const { ep, x, year } = item
  const played = (getProgress(slug, ep.id)?.t ?? 0) > 5
  const label = ep.number ? t('ep', { n: ep.number }) : t('sidebar.prolog')
  const when = year != null ? [t('timeline.year', { y: year }), year > birth ? t('timeline.age', { n: year - birth }) : ''].filter(Boolean).join(' · ') : phase.id === 'latar' ? t('timeline.before') : ''
  return (
    <div style={hueStyle(phase.hue)}>
      {/* stem from the line to the card */}
      <span className="absolute w-px bg-[hsl(var(--h)_50%_50%/0.45)]" style={{ left: x, ...(up ? { bottom: '50%', height: 28 } : { top: '50%', height: 28 }) }} />
      <span
        className={cn('absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-popover text-white', current ? 'size-6' : 'size-[18px]', ep.hasNotes ? DOT : 'bg-popover !border-[hsl(var(--h)_45%_55%)]')}
        style={{ left: x, top: '50%' }}
        aria-hidden
      >
        {played && ep.hasNotes && !current && <Check className="size-2.5" strokeWidth={4} />}
        {current && <span className="size-2 rounded-full bg-white" />}
      </span>
      {current && <span className="absolute z-0 size-9 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[hsl(var(--h)_60%_50%/0.35)]" style={{ left: x, top: '50%' }} aria-hidden />}
      <button
        type="button"
        onClick={() => onGo(ep.id)}
        title={ep.title}
        className={cn(
          'group absolute z-20 flex w-[152px] -translate-x-1/2 flex-col gap-1 rounded-xl border bg-card p-2.5 text-left short:w-[136px] short:gap-0.5 short:p-1.5 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring',
          'hover:border-[hsl(var(--h)_55%_50%/0.7)]',
          current && 'border-[hsl(var(--h)_55%_45%)] ring-2 ring-[hsl(var(--h)_55%_50%/0.5)]',
          !ep.hasNotes && 'opacity-60',
        )}
        style={{ left: x, ...(up ? { bottom: 'calc(50% + 28px)' } : { top: 'calc(50% + 28px)' }) }}
      >
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={cn('font-mono text-[11px] font-semibold', INK)}>{label}</span>
          {current && <span className="rounded bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground">{t('timeline.here')}</span>}
          {!current && latest && <span className="rounded bg-[hsl(var(--gold-soft))] px-1 text-[10px] font-medium leading-4 text-[hsl(var(--gold))]">{t('timeline.latest')}</span>}
          {!ep.hasNotes && <span className="text-[10px] text-muted-foreground">{t('timeline.noNotes')}</span>}
        </span>
        <span className="line-clamp-3 text-[12.5px] font-medium leading-snug short:line-clamp-2 short:text-[11.5px]">{ep.title}</span>
        {(when || played) && (
          <span className="flex items-center justify-between gap-1 text-[10.5px] text-muted-foreground short:hidden">
            <span>{when}</span>
            {played && <Check className="size-3 shrink-0 text-[hsl(var(--h)_55%_40%)] dark:text-[hsl(var(--h)_55%_65%)]" aria-label={t('timeline.played')} />}
          </span>
        )}
      </button>
    </div>
  )
}
