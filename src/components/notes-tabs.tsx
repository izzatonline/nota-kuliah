import { useState, type ReactNode } from 'react'
import { LifeBuoy, Lightbulb, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/components/player-context'
import { TimeLink, useIsNow } from '@/components/time-link'
import { ChapterList } from '@/components/video-panel'
import { useT } from '@/lib/i18n'
import type { Book, Dalil, Lesson, Notes, Person, SirahEvent, Term } from '@/lib/types'

export type TabKey = 'ringkasan' | 'dalil' | 'kitab' | 'tokoh' | 'sirah' | 'pengajaran' | 'peta' | 'istilah'

const Heading = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <div className="mb-3 mt-1">
    <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
    {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>
)

function NowBadge() {
  const { t } = useT()
  return <Badge className="animate-pulse">{t('now')}</Badge>
}

/* ------------------------------------------------------------- Ringkasan */
export function Overview({ notes, go }: { notes: Notes; go: (t: TabKey) => void }) {
  const { t } = useT()
  const stats: { key: TabKey; n: number; label: string }[] = [
    { key: 'dalil', n: notes.dalil.length, label: t('stat.dalil') },
    { key: 'kitab', n: notes.books.filter((b) => !b.suggested).length, label: t('stat.books') },
    { key: 'tokoh', n: notes.people.length, label: t('stat.people') },
    { key: 'pengajaran', n: notes.lessons.length, label: t('stat.lessons') },
  ]
  const care = notes.careNote
  return (
    <div className="space-y-6">
      {care && (
        <Card className="border-gold/40 bg-gold-soft/50">
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <LifeBuoy className="size-5 text-gold" />
              <p className="font-semibold tracking-tight">{care.title}</p>
              <Badge variant="outline" className="ml-auto">{t('careNote.badge')}</Badge>
            </div>
            <p className="text-sm leading-relaxed">{care.body}</p>
            <ul className="divide-y rounded-lg border bg-background">
              {care.items.map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{i.name}</span>
                  <a href={`tel:${i.contact.replace(/[^\d+]/g, '')}`} className="shrink-0 whitespace-nowrap font-mono font-medium text-primary hover:underline">{i.contact}</a>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">{care.source}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-3 p-5">
          <Badge variant="secondary">{t('overview.summary')}</Badge>
          <p className="text-[15px] leading-relaxed">{notes.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <button key={s.key} onClick={() => go(s.key)} className="rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent">
            <p className="text-2xl font-semibold tracking-tight">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <section>
        <Heading>{t('overview.keyPoints')}</Heading>
        <ol className="space-y-2">
          {notes.keyPoints.map((p, i) => (
            <li key={i} className="flex gap-3 rounded-lg border bg-card p-3 text-sm leading-relaxed">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      </section>

      <section className="@3xl:hidden">
        <Heading hint={t('topics.hint')}>{t('topics')}</Heading>
        <ChapterList notes={notes} />
      </section>
    </div>
  )
}

/* ----------------------------------------------------------------- Dalil */
function DalilCard({ d }: { d: Dalil }) {
  const { t } = useT()
  const now = useIsNow(d.t, 40)
  return (
    <Card className={cn('transition-shadow', now && 'ring-2 ring-primary/50')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={d.kind === 'quran' ? 'gold' : 'secondary'}>{d.kind === 'quran' ? t('kind.quran') : t('kind.hadith')}</Badge>
            <span className="text-sm font-medium">{d.ref}</span>
            {now && <NowBadge />}
          </div>
          <TimeLink t={d.t} />
        </div>
        {d.arabic && (
          <p dir="rtl" lang="ar" className="font-arabic text-right text-[1.7rem] leading-[2.1] sm:text-3xl sm:leading-[2.2]">
            {d.arabic}
          </p>
        )}
        <p className="text-[15px] leading-relaxed">{d.translation}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{d.context}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
          {d.narrator && <span>{t('narrator')}: {d.narrator}</span>}
          <span>{t('source')}: {d.source}</span>
          {d.grade && <Badge variant="outline">{d.grade}</Badge>}
          <span className={cn('ml-auto inline-flex items-center gap-1', d.verified ? 'text-primary' : 'text-gold')}>
            {d.verified ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
            {d.verified ? t('verified') : t('unverified')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function DalilTab({ notes }: { notes: Notes }) {
  const { t } = useT()
  const [f, setF] = useState<'all' | 'quran' | 'hadith'>('all')
  const items = [...notes.dalil].filter((d) => f === 'all' || d.kind === f).sort((a, b) => a.t - b.t)
  const opts = [
    ['all', `${t('all')} (${notes.dalil.length})`],
    ['quran', `${t('kind.quran')} (${notes.dalil.filter((d) => d.kind === 'quran').length})`],
    ['hadith', `${t('kind.hadith')} (${notes.dalil.filter((d) => d.kind === 'hadith').length})`],
  ] as const
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {opts.map(([k, label]) => (
          <Button key={k} size="sm" variant={f === k ? 'default' : 'outline'} onClick={() => setF(k)}>
            {label}
          </Button>
        ))}
      </div>
      <div className="space-y-3">{items.map((d) => <DalilCard key={d.id} d={d} />)}</div>
    </div>
  )
}

/* ---------------------------------------------------------- Kitab & buku */
function BookCard({ b }: { b: Book }) {
  const now = useIsNow(b.t, 60)
  return (
    <Card className={cn('h-full', now && 'ring-2 ring-primary/50')}>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={b.suggested ? 'gold' : 'secondary'}>{b.kind}</Badge>
          {b.t !== null && <TimeLink t={b.t} />}
        </div>
        <p className="font-medium leading-snug">{b.title}</p>
        {b.author && <p className="text-sm text-muted-foreground">{b.author}</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">{b.context}</p>
        {b.note && <p className="mt-auto border-t pt-2 text-xs italic text-muted-foreground">{b.note}</p>}
      </CardContent>
    </Card>
  )
}

export function BooksTab({ notes }: { notes: Notes }) {
  const { t } = useT()
  const said = notes.books.filter((b) => !b.suggested)
  const extra = notes.books.filter((b) => b.suggested)
  return (
    <div className="space-y-8">
      <section>
        <Heading hint={t('books.said.hint')}>{t('books.said')}</Heading>
        <div className="grid gap-3 md:grid-cols-2">{said.map((b) => <BookCard key={b.id} b={b} />)}</div>
      </section>
      <section>
        <Heading hint={t('books.suggested.hint')}>
          <span className="inline-flex items-center gap-1.5">
            <Lightbulb className="size-4 text-gold" /> {t('books.suggested')}
          </span>
        </Heading>
        <div className="grid gap-3 md:grid-cols-2">{extra.map((b) => <BookCard key={b.id} b={b} />)}</div>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- Tokoh */
const initials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function PersonRow({ p }: { p: Person }) {
  const now = useIsNow(p.t, 60)
  return (
    <Card className={cn(now && 'ring-2 ring-primary/50')}>
      <CardContent className="flex gap-3 p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{initials(p.name)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium leading-snug">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.role}</p>
            </div>
            <TimeLink t={p.t} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{p.context}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function PeopleTab({ notes }: { notes: Notes }) {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <Heading hint={t('people.hint')}>{t('people.heading')}</Heading>
      {[...notes.people].sort((a, b) => a.t - b.t).map((p) => <PersonRow key={p.id} p={p} />)}
    </div>
  )
}

/* ----------------------------------------------------------- Zaman sirah */
function Event({ e, active, last }: { e: SirahEvent; active: boolean; last: boolean }) {
  return (
    <li className="relative pb-6 pl-8 last:pb-0">
      {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-border" />}
      <span className={cn('absolute left-0 top-1 grid size-6 place-items-center rounded-full border-2 bg-background', active ? 'border-primary' : 'border-border')}>
        <span className={cn('size-2 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/40')} />
      </span>
      <div className={cn('rounded-xl border bg-card p-4 transition-shadow', active && 'ring-2 ring-primary/50')}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{e.label}</Badge>
            {active && <NowBadge />}
          </div>
          {e.t !== null && <TimeLink t={e.t} />}
        </div>
        <p className="font-medium leading-snug">{e.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.desc}</p>
      </div>
    </li>
  )
}

export function SirahTab({ notes }: { notes: Notes }) {
  const { time } = usePlayer()
  const { t } = useT()
  const ev = notes.sirah.events
  // The timeline follows the story, not the lecture, so pick the event whose time is closest before now.
  let active = -1
  ev.forEach((e, i) => {
    if (e.t !== null && e.t <= time && (active < 0 || e.t >= (ev[active].t ?? -1))) active = i
  })
  return (
    <div className="space-y-6">
      <Card className="bg-gold-soft/60">
        <CardContent className="space-y-1.5 p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{t('sirah.era')}</p>
          <p className="text-lg font-semibold tracking-tight">{notes.sirah.era}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{notes.sirah.summary}</p>
        </CardContent>
      </Card>
      <ol>{ev.map((e, i) => <Event key={e.id} e={e} active={i === active} last={i === ev.length - 1} />)}</ol>
    </div>
  )
}

/* ------------------------------------------------------------ Pengajaran */
function LessonCard({ l, n }: { l: Lesson; n: number }) {
  const now = useIsNow(l.t, 60)
  return (
    <Card className={cn(now && 'ring-2 ring-primary/50')}>
      <CardContent className="flex gap-3 p-4">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">{n}</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary">{l.kind}</Badge>
            <TimeLink t={l.t} />
          </div>
          <p className="font-medium leading-snug">{l.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{l.body}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LessonsTab({ notes }: { notes: Notes }) {
  const { t } = useT()
  const ALL = '__all'
  const kinds = [ALL, ...Array.from(new Set(notes.lessons.map((l) => l.kind)))]
  const [k, setK] = useState(ALL)
  const items = notes.lessons.filter((l) => k === ALL || l.kind === k)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {kinds.map((x) => (
          <Button key={x} size="sm" variant={k === x ? 'default' : 'outline'} onClick={() => setK(x)}>
            {x === ALL ? t('all') : x}
          </Button>
        ))}
      </div>
      <div className="space-y-3">{items.map((l) => <LessonCard key={l.id} l={l} n={notes.lessons.indexOf(l) + 1} />)}</div>
    </div>
  )
}

/* ---------------------------------------------------------------- Istilah */
function TermCard({ t }: { t: Term }) {
  const now = useIsNow(t.t, 60)
  return (
    <Card className={cn(now && 'ring-2 ring-primary/50')}>
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{t.term}</p>
          <TimeLink t={t.t} />
        </div>
        {t.arabic && (
          <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-loose">
            {t.arabic}
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">{t.meaning}</p>
      </CardContent>
    </Card>
  )
}

export function GlossaryTab({ notes }: { notes: Notes }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[...notes.glossary].sort((a, b) => a.t - b.t).map((t) => <TermCard key={t.id} t={t} />)}
    </div>
  )
}

