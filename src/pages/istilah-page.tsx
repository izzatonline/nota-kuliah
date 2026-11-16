import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Play, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { epPath, fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { loadIstilah, matchesTerm, otherMeanings, termLetter, termSort } from '@/lib/istilah'
import { fold } from '@/lib/tokoh'
import { cn } from '@/lib/utils'
import type { TermEntry, TermIndex, TermMention } from '@/lib/types'

function Where({ m }: { m: TermMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  return (
    <Link
      to={`${epPath(m.slug, m.epId)}?t=${m.t}`}
      state={{ focus: { tab: 'istilah', id: `istilah:${m.id}` } }}
      className="group inline-flex items-center gap-2 rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Play className="size-3 fill-current" aria-hidden />
        {fmt(m.t)}
      </span>
      <span className="text-muted-foreground">{m.series} · {ep}</span>
    </Link>
  )
}

function TermCard({ e, open, onToggle }: { e: TermEntry; open: boolean; onToggle: () => void }) {
  const { t } = useT()
  const [first, ...rest] = e.mentions
  const diff = otherMeanings(e)
  return (
    <Card id={e.key} data-letter={termLetter(e)} className="scroll-mt-40 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{e.term}</p>
          {e.mentions.length > 1 && <Badge variant="secondary" className="shrink-0">{t('istilah.lectures', { n: e.mentions.length })}</Badge>}
        </div>
        {e.arabic && <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-loose">{e.arabic}</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">{first.meaning}</p>
        <Where m={first} />
        {rest.length > 0 && (
          <>
            <button onClick={onToggle} aria-expanded={open} className="flex items-center gap-1.5 rounded text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {diff > 0 ? t('istilah.more', { n: diff }) : t('istilah.also', { n: rest.length })}
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {open && (
              <ul className="space-y-3 border-t pt-3">
                {rest.map((m) => (
                  <li key={`${m.slug}/${m.epId}/${m.id}`} className="space-y-1">
                    <p className="text-sm leading-relaxed text-muted-foreground">{m.meaning}</p>
                    <Where m={m} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function IstilahPage() {
  const { t, lang } = useT()
  const { hash } = useLocation()
  const [index, setIndex] = useState<TermIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('istilah.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadIstilah(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  // /istilah#hanif opens at that term.
  useEffect(() => {
    if (!index || !hash) return
    const key = decodeURIComponent(hash.slice(1))
    setQ('')
    setOpenKey(key)
    requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ block: 'start' }))
  }, [index, hash])

  const needle = fold(q)
  const terms = useMemo(
    () => (index?.terms ?? []).filter((e) => matchesTerm(e, needle)).sort((a, b) => termSort(a).localeCompare(termSort(b))),
    [index, needle],
  )
  const letters = [...new Set(terms.map(termLetter))].sort()

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('istilah.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('istilah.lede')}</p>
        {index && <p className="text-xs text-muted-foreground">{t('istilah.count', { n: index.terms.length })}</p>}
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('istilah.none')}</p>
      ) : !index ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 mt-6 space-y-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('istilah.search')} aria-label={t('istilah.search')} className="h-9 pl-9" />
            </div>
            {letters.length > 1 && (
              <nav aria-label={t('istilah.jump')} className="-my-0.5 flex gap-0.5 overflow-x-auto py-0.5 text-xs [scrollbar-width:none]">
                {letters.map((l) => (
                  <button
                    key={l}
                    onClick={() => document.querySelector(`[data-letter="${l}"]`)?.scrollIntoView({ block: 'start' })}
                    className="grid h-6 min-w-6 shrink-0 place-items-center rounded font-mono font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {!terms.length ? (
            <p className="py-16 text-center text-muted-foreground">{t('istilah.noMatch')}</p>
          ) : (
            <div className="mt-6 grid items-start gap-3 md:grid-cols-2">
              {terms.map((e) => <TermCard key={e.key} e={e} open={openKey === e.key} onToggle={() => setOpenKey(openKey === e.key ? null : e.key)} />)}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
