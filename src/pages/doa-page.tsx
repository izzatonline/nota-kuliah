import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Copy, Info, Play, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandLink } from '@/components/brand'
import { LanguageSwitch } from '@/components/language-switch'
import { SearchButton } from '@/components/header-actions'
import { useSearch } from '@/components/search-palette'
import { SiteFooter } from '@/components/site-footer'
import { ThemeToggle } from '@/components/theme'
import { epPath, fmt } from '@/lib/data'
import { useT, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Dalil, Dua, DuaIndex, DuaMention } from '@/lib/types'

const cache = new Map<Lang, Promise<DuaIndex>>()
/** The index `scripts/search-index.mjs` builds from every dalil entry tagged with a dua. */
function loadDuas(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/doa.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no doa index')
      return r.json() as Promise<DuaIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

/** The mention to show in full: checked text first, then any Arabic, then the first time it came up. */
const main = (d: Dua) =>
  d.mentions.find((m) => m.dalil.verified && m.dalil.arabic) ?? d.mentions.find((m) => m.dalil.arabic) ?? d.mentions[0]

function Status({ d }: { d: Dalil }) {
  const { t } = useT()
  return (
    <span className={cn('inline-flex items-center gap-1', d.verified ? 'text-primary' : 'text-gold')}>
      {d.verified ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
      {d.verified ? t('verified') : t('unverified')}
    </span>
  )
}

function MentionRow({ m }: { m: DuaMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  return (
    <li>
      <Link
        to={`${epPath(m.slug, m.epId)}?t=${m.dalil.t}`}
        state={{ focus: { tab: 'dalil', id: `dalil:${m.dalil.id}` } }}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono text-xs font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Play className="size-3 fill-current" aria-hidden />
          {fmt(m.dalil.t)}
        </span>
        <span className="min-w-0 text-sm leading-relaxed">
          <span className="font-medium">{m.series} · {ep}</span>
          <span className="text-muted-foreground">: {m.epTitle}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{m.dalil.context}</span>
        </span>
      </Link>
    </li>
  )
}

function DuaCard({ dua }: { dua: Dua }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const m = main(dua)
  const d = m.dalil
  const copy = async () => {
    const text = [dua.title, d.arabic, d.translation, `(${d.ref}${d.source && d.kind === 'hadith' ? `, ${d.source}` : ''})`, `${location.origin}/doa#${dua.key}`]
      .filter(Boolean)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* the clipboard can be blocked; nothing else to do */
    }
  }
  return (
    <Card id={dua.key} className="scroll-mt-32 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-base font-semibold leading-snug tracking-tight">{dua.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={d.kind === 'quran' ? 'gold' : 'secondary'}>{d.kind === 'quran' ? t('kind.quran') : t('kind.hadith')}</Badge>
              {/* a hadith's ref is a Malay label for the notes, not a reference; its source line below is the reference */}
              {d.kind === 'quran' && <span>{d.ref}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={copy} className="-mr-2 shrink-0 gap-1.5 text-muted-foreground" aria-label={t('doa.copy')}>
            {copied ? <Check className="text-primary" /> : <Copy />}
            <span className="hidden sm:inline">{copied ? t('doa.copied') : t('doa.copy')}</span>
          </Button>
        </div>
        {d.arabic ? (
          <p
            dir="rtl"
            lang="ar"
            className={cn(
              'font-arabic text-right',
              d.arabic.length > 300 ? 'text-xl leading-[2.1] sm:text-2xl sm:leading-[2.2]' : 'text-[1.7rem] leading-[2.1] sm:text-3xl sm:leading-[2.2]',
            )}
          >
            {d.arabic}
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t('doa.noArabic')}
          </p>
        )}
        <p className="text-[15px] leading-relaxed">{d.translation}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {d.narrator && <span>{t('narrator')}: {d.narrator}</span>}
          <span>
            {t('source')}:{' '}
            {d.sourceUrl ? (
              <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
                {d.source}
              </a>
            ) : (
              d.source
            )}
          </span>
          {d.grade && <Badge variant="outline">{d.grade}</Badge>}
          <span className="ml-auto"><Status d={d} /></span>
        </div>
        <div className="border-t pt-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('doa.mentioned', { n: dua.mentions.length })}
          </p>
          <ul className="-mx-2">
            {dua.mentions.map((x) => <MentionRow key={`${x.slug}/${x.epId}/${x.dalil.id}`} m={x} />)}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export function DoaPage() {
  const { t, lang } = useT()
  const { open } = useSearch()
  const { hash } = useLocation()
  const [index, setIndex] = useState<DuaIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [topic, setTopic] = useState('all')

  useEffect(() => {
    document.title = `${t('doa.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadDuas(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  // A shared link such as /doa#yunus opens at that dua once the list is in.
  useEffect(() => {
    if (!index || !hash) return
    setTopic('all')
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }))
  }, [index, hash])

  const topics = index?.topics ?? []
  const total = topics.reduce((n, tp) => n + tp.duas.length, 0)
  const shown = topic === 'all' ? topics : topics.filter((tp) => tp.key === topic)

  return (
    <div className="min-h-dvh overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <BrandLink />
          <div className="flex-1" />
          <SearchButton onClick={open} label={t('search.button')} />
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('doa.title')}</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{t('doa.lede')}</p>
          <p className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold-soft/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden /> {t('doa.check')}
          </p>
        </div>

        {failed ? (
          <p className="py-16 text-center text-muted-foreground">{t('doa.none')}</p>
        ) : !index ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="sticky top-14 z-20 -mx-4 mt-6 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
                {[{ key: 'all', title: t('all'), n: total }, ...topics.map((tp) => ({ key: tp.key, title: tp.title, n: tp.duas.length }))].map((c) => (
                  <Button key={c.key} size="sm" variant={topic === c.key ? 'default' : 'outline'} className="shrink-0" onClick={() => setTopic(c.key)}>
                    {c.title} <span className="font-mono text-xs opacity-70">{c.n}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-6 space-y-10">
              {shown.map((tp) => (
                <section key={tp.key} aria-labelledby={`topic-${tp.key}`} className="space-y-3">
                  <div>
                    <h2 id={`topic-${tp.key}`} className="text-xl font-semibold tracking-tight">{tp.title}</h2>
                    {tp.hint && <p className="mt-0.5 text-sm text-muted-foreground">{tp.hint}</p>}
                  </div>
                  <div className="space-y-4">{tp.duas.map((d) => <DuaCard key={d.key} dua={d} />)}</div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
