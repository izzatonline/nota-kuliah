import { type RefObject } from 'react'
import { ChevronLeft, ChevronRight, Headphones, Pause, Play, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { fmt } from '@/lib/data'
import { usePlayer } from '@/components/player-context'
import { useT } from '@/lib/i18n'
import type { Notes } from '@/lib/types'

export function Video({ mount, compact, onCompact }: { mount: RefObject<HTMLDivElement>; compact: boolean; onCompact: () => void }) {
  const { t } = useT()
  return (
    <div className={cn('relative overflow-hidden bg-black @3xl:rounded-xl @3xl:border', compact && 'w-28 shrink-0 rounded-lg @3xl:w-auto')}>
      <div
        ref={mount}
        className={cn('mx-auto aspect-video @3xl:h-auto @3xl:w-full [&_iframe]:size-full', compact ? 'w-full' : 'h-[min(34vh,56.25cqw)]')}
      />
      {!compact && (
        <button
          onClick={onCompact}
          aria-label={t('audioMode')}
          title={t('audioMode')}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur @3xl:hidden"
        >
          <Headphones className="size-4" />
        </button>
      )}
    </div>
  )
}

export function NowPlaying({ notes, compact, onCompact }: { notes: Notes; compact: boolean; onCompact: () => void }) {
  const { time, seek, playing, toggle } = usePlayer()
  const { t } = useT()
  const idx = Math.max(0, notes.chapters.findLastIndex((c) => c.start <= time))
  const c = notes.chapters[idx]
  const pct = Math.min(100, Math.max(0, ((time - c.start) / (c.end - c.start)) * 100))
  const refs = notes.dalil.filter((d) => d.t >= c.start && d.t < c.end)

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={idx === 0} onClick={() => seek(notes.chapters[idx - 1].start)} aria-label={t('prevChapter')}>
          <ChevronLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('now')} · {idx + 1}/{notes.chapters.length}
          </p>
          <p className="truncate text-sm font-medium">{c.title}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={idx === notes.chapters.length - 1} onClick={() => seek(notes.chapters[idx + 1].start)} aria-label={t('nextChapter')}>
          <ChevronRight />
        </Button>
      </div>
      {compact && (
        <div className="flex items-center justify-between gap-2 @3xl:hidden">
          <Button size="sm" className="h-8 gap-1.5" onClick={toggle}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? t('pause') : t('play')}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={onCompact} aria-label={t('showVideo')}>
            <VideoIcon className="size-4" />
            {t('showVideo')}
          </Button>
        </div>
      )}
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {refs.length > 0 && (
        <div className="hidden flex-wrap gap-1.5 pt-1 sm:flex">
          {refs.slice(0, 5).map((d) => (
            <button key={d.id} onClick={() => seek(d.t)}>
              <Badge variant={d.kind === 'quran' ? 'gold' : 'secondary'} className="cursor-pointer hover:opacity-80">
                {d.ref}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** `titlesOnly` keeps just the number and title; the Main topics tab already carries the summaries. */
export function ChapterList({ notes, className, titlesOnly }: { notes: Notes; className?: string; titlesOnly?: boolean }) {
  const { time, seek } = usePlayer()
  const active = notes.chapters.findLastIndex((c) => c.start <= time)
  return (
    <ol className={cn('space-y-1', className)}>
      {notes.chapters.map((c, i) => (
        <li key={c.id}>
          <button
            onClick={() => seek(c.start)}
            className={cn(
              'flex w-full gap-3 rounded-lg px-3 text-left transition-colors hover:bg-accent',
              titlesOnly ? 'items-center py-1.5' : 'py-2.5',
              i === active && 'bg-accent ring-1 ring-primary/30',
            )}
          >
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium', !titlesOnly && 'mt-0.5', i === active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium leading-snug">{c.title}</span>
                {!titlesOnly && <span className="font-mono text-xs text-muted-foreground">{fmt(c.start)}</span>}
              </span>
              {!titlesOnly && <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.summary}</span>}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

export function ChapterScroll({ notes }: { notes: Notes }) {
  const { t } = useT()
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-1.5 pb-4">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('topics')}</p>
        <ChapterList notes={notes} titlesOnly />
      </div>
    </ScrollArea>
  )
}
