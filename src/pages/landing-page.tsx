import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Clock, Eye, FileText, Headphones, History, Play, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BrandLink } from '@/components/brand'
import { LanguageSwitch } from '@/components/language-switch'
import { SiteFooter } from '@/components/site-footer'
import { ThemeToggle } from '@/components/theme'
import { epPath, fmt, loadAllSeries, loadNotes } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { getLast, getProgress } from '@/lib/progress'
import type { Episode, Notes, SeriesIndex } from '@/lib/types'

type Item = { ep: Episode; series: SeriesIndex['series'] }

function EpisodeCard({ item, badge }: { item: Item; badge?: string }) {
  const { t, lang } = useT()
  const { ep, series } = item
  const views = ep.views ? new Intl.NumberFormat(lang, { notation: 'compact' }).format(ep.views) : null
  return (
    <Link to={epPath(series.slug, ep.id)} className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {ep.number ? t('ep', { n: ep.number }) : t('sidebar.prolog')}
            </span>
            {badge ? (
              <Badge>{badge}</Badge>
            ) : ep.hasNotes ? (
              <Badge variant="secondary" className="gap-1 text-primary"><FileText className="size-3" /> {t('featured.hasNotes')}</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">{t('featured.soon')}</Badge>
            )}
          </div>
          <p className="text-base font-semibold leading-snug tracking-tight">{ep.title}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
            {ep.duration && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{fmt(ep.duration)}</span>}
            {views && <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{t('featured.views', { n: views })}</span>}
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
              {t('featured.read')} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/** A peek at real notes: the episode's progress and one verse, so visitors see what they get. */
function HeroPreview({ item }: { item: Item }) {
  const { t, lang } = useT()
  const [notes, setNotes] = useState<Notes | null>(null)
  useEffect(() => {
    loadNotes(item.series.slug, item.ep.id, lang).then(setNotes).catch(() => {})
  }, [item, lang])
  const verse = notes?.dalil.find((d) => d.kind === 'quran' && d.arabic)
  const chapters = notes?.chapters.slice(2, 4) ?? []
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-2xl" />
      <Card className="overflow-hidden shadow-xl">
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full bg-primary/60" />
          <span className="truncate">{item.ep.number ? t('ep', { n: item.ep.number }) : ''} · {item.ep.title}</span>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('now')}</p>
            {chapters.length ? (
              <ol className="space-y-1.5">
                {chapters.map((c, i) => (
                  <li key={c.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === 0 ? 'bg-accent ring-1 ring-primary/30' : 'text-muted-foreground'}`}>
                    <span className={`grid size-5 place-items-center rounded-full text-[10px] ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{i + 3}</span>
                    <span className="truncate">{c.title}</span>
                    <span className="ml-auto font-mono text-xs">{fmt(c.start)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            )}
          </div>
          {verse && (
            <div className="space-y-2 rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between">
                <Badge variant="gold">{t('kind.quran')}</Badge>
                <span className="text-xs text-muted-foreground">{verse.ref}</span>
              </div>
              <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2]">{verse.arabic}</p>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{verse.translation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


/** Shown only when this browser has opened an episode before. */
function ContinueCard({ all }: { all: SeriesIndex[] }) {
  const { t } = useT()
  const last = useMemo(() => getLast(), [])
  const found = useMemo(() => {
    if (!last) return null
    const s = all.find((x) => x.series.slug === last.slug)
    const ep = s?.episodes.find((e) => e.id === last.ep && e.hasNotes)
    return s && ep ? { series: s.series, ep } : null
  }, [all, last])
  if (!found) return null
  const { series, ep } = found
  const saved = getProgress(series.slug, ep.id)
  const started = Boolean(saved && saved.t > 20)
  const pct = started && ep.duration ? Math.min(100, Math.round((saved!.t / ep.duration) * 100)) : 0
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card py-3 pl-5 pr-3 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><History className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('resume.last')}</p>
        <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
          {ep.number ? t('ep', { n: ep.number }) : t('sidebar.prolog')}: {ep.title}
        </p>
        {started && (
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-muted sm:w-44">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono">{fmt(saved!.t)}{ep.duration ? ` / ${fmt(ep.duration)}` : ''}</span>
          </div>
        )}
      </div>
      <Button asChild size="sm" className="shrink-0 sm:ml-2">
        <Link to={epPath(series.slug, ep.id)} state={{ resume: true }}>
          <Play className="fill-current" /> {started ? t('resume.from', { t: fmt(saved!.t) }) : t('resume.continue')}
        </Link>
      </Button>
    </div>
  )
}

export function LandingPage() {
  const { t, lang } = useT()
  const [all, setAll] = useState<SeriesIndex[] | null>(null)
  useEffect(() => {
    document.title = 'Nota Kuliah'
    loadAllSeries().then(setAll).catch(() => setAll([]))
  }, [])

  const { latest, popular } = useMemo(() => {
    const items: Item[] = (all ?? []).flatMap((s) => s.episodes.map((ep) => ({ ep, series: s.series })))
    const latest = items.filter((i) => i.ep.hasNotes).sort((a, b) => (b.ep.notesAddedAt ?? '').localeCompare(a.ep.notesAddedAt ?? ''))[0]
    const popular = items.filter((i) => i.ep.views).sort((a, b) => (b.ep.views ?? 0) - (a.ep.views ?? 0)).slice(0, 3)
    return { latest, popular }
  }, [all])

  const why = [
    { Icon: Headphones, k: 'why.1' },
    { Icon: Users, k: 'why.2' },
    { Icon: BookOpenCheck, k: 'why.3' },
  ] as const
  const first = all?.[0]

  return (
    <div className="min-h-dvh overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <BrandLink />
          <div className="flex-1" />
          {first && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to={`/${first.series.slug}`}>{t('nav.episodes')}</Link>
            </Button>
          )}
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="border-b bg-[radial-gradient(ellipse_at_85%_0%,hsl(var(--primary)/0.09),transparent_55%)]">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 md:py-10">
            {all && <ContinueCard all={all} />}
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
              <div className="space-y-4">
                <Badge variant="secondary" className="px-2.5 py-0.5 text-xs text-primary">{t('hero.badge')}</Badge>
                <h1 className="text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.6rem]">{t('hero.title')}</h1>
                <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">{t('hero.lede')}</p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {latest && (
                    <Button asChild>
                      <Link to={epPath(latest.series.slug, latest.ep.id)}>{t('hero.cta.start')} <ArrowRight /></Link>
                    </Button>
                  )}
                  {first && (
                    <Button asChild variant="outline">
                      <Link to={`/${first.series.slug}`}>{t('hero.cta.browse')}</Link>
                    </Button>
                  )}
                </div>
              </div>
              {latest && <div className="hidden lg:block"><HeroPreview item={latest} /></div>}
            </div>
          </div>
        </section>

        {/* why */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t('why.title')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {why.map(({ Icon, k }) => (
              <Card key={k}>
                <CardContent className="space-y-3 p-6">
                  <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></div>
                  <p className="font-semibold tracking-tight">{t(`${k}.title` as 'why.1.title')}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(`${k}.body` as 'why.1.body')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* featured */}
        {(latest || popular.length > 0) && (
          <section className="border-y bg-muted/40">
            <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
              {latest && (
                <div>
                  <h2 className="mb-5 text-2xl font-semibold tracking-tight">{t('featured.latest')}</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <EpisodeCard item={latest} badge={t('featured.latest')} />
                  </div>
                </div>
              )}
              {popular.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{t('featured.popular')}</h2>
                  <p className="mb-5 mt-1 text-sm text-muted-foreground">{t('featured.popular.hint')}</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {popular.map((i) => <EpisodeCard key={`${i.series.slug}/${i.ep.id}`} item={i} />)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* series */}
        {all && all.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="mb-5 text-2xl font-semibold tracking-tight">{t('series.title')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {all.map((s) => (
                <Link key={s.series.slug} to={`/${s.series.slug}`} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="transition-all group-hover:border-primary/40 group-hover:shadow-md">
                    <CardContent className="space-y-2 p-6">
                      <p className="text-lg font-semibold tracking-tight">{s.series.title}</p>
                      <p className="text-sm text-muted-foreground">{s.series.speaker} · {t('sidebar.episodes', { n: s.episodes.length })} · {t('sidebar.withNotes', { n: s.episodes.filter((e) => e.hasNotes).length })}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.series.description[lang]}</p>
                      <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">{t('series.open')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
