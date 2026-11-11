import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, ChevronDown, Lightbulb, Play, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { epPath, fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { loadKitab, matchesBook } from '@/lib/kitab'
import { fold } from '@/lib/tokoh'
import { cn } from '@/lib/utils'
import type { BookEntry, BookGroup, BookIndex, BookMention } from '@/lib/types'

function MentionRow({ m }: { m: BookMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  const at = m.book.t
  return (
    <li>
      <Link
        to={`${epPath(m.slug, m.epId)}${at !== null ? `?t=${at}` : ''}`}
        state={{ focus: { tab: 'kitab', id: `kitab:${m.book.id}` } }}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {at !== null && (
          <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono text-xs font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Play className="size-3 fill-current" aria-hidden />
            {fmt(at)}
          </span>
        )}
        <span className="min-w-0 text-sm leading-relaxed">
          <span className="font-medium">{m.series} · {ep}</span>
          <span className="text-muted-foreground">: {m.epTitle}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{m.book.context}</span>
        </span>
      </Link>
    </li>
  )
}

function BookCard({ b, groupTitle, open, onToggle, suggested }: { b: BookEntry; groupTitle: string; open: boolean; onToggle: () => void; suggested?: boolean }) {
  const { t } = useT()
  return (
    <Card id={b.key} className="scroll-mt-40 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="p-0">
        <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', suggested ? 'bg-gold-soft text-gold' : 'bg-secondary text-secondary-foreground')}>
            {suggested ? <Lightbulb className="size-5" aria-hidden /> : <BookOpen className="size-5" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">{b.title}</span>
            <span className="block text-xs text-muted-foreground">{[b.author, groupTitle].filter(Boolean).join(' · ')}</span>
          </span>
          <Badge variant={suggested ? 'gold' : 'secondary'} className="shrink-0">{b.mentions.length === 1 ? t('kitab.mention1') : t('kitab.mentions', { n: b.mentions.length })}</Badge>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <div className="border-t px-4 pb-3 pt-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {suggested ? t('kitab.suggestedIn', { n: b.mentions.length }) : t('kitab.mentioned', { n: b.mentions.length })}
            </p>
            <ul className="-mx-2">{b.mentions.map((m) => <MentionRow key={`${m.slug}/${m.epId}/${m.book.id}`} m={m} />)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KitabPage() {
  const { t, lang } = useT()
  const { hash } = useLocation()
  const [index, setIndex] = useState<BookIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('kitab.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadKitab(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  // A link such as /kitab#sahih-bukhari opens at that book once the list is in.
  useEffect(() => {
    if (!index || !hash) return
    const key = decodeURIComponent(hash.slice(1))
    setGroup('all')
    setQ('')
    setOpenKey(key)
    requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ block: 'start' }))
  }, [index, hash])

  const needle = fold(q)
  const filter = (gs: BookGroup[]) => gs.map((g) => ({ ...g, books: g.books.filter((b) => matchesBook(b, needle)) })).filter((g) => g.books.length)
  const groups = useMemo(() => filter(index?.groups ?? []), [index, needle]) // eslint-disable-line react-hooks/exhaustive-deps
  const further = useMemo(() => filter(index?.further ?? []), [index, needle]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = group === 'all' ? groups : groups.filter((g) => g.key === group)
  const total = (index?.groups ?? []).reduce((n, g) => n + g.books.length, 0)

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('kitab.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('kitab.lede')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('kitab.note')}</p>
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('kitab.none')}</p>
      ) : !index ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 mt-6 space-y-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('kitab.search')} aria-label={t('kitab.search')} className="h-9 pl-9" />
            </div>
            <div className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {[{ key: 'all', title: t('all'), n: total }, ...index.groups.map((g) => ({ key: g.key, title: g.title, n: g.books.length }))].map((c) => (
                <Button key={c.key} size="sm" variant={group === c.key ? 'default' : 'outline'} className="shrink-0" onClick={() => setGroup(c.key)}>
                  {c.title} <span className="font-mono text-xs opacity-70">{c.n}</span>
                </Button>
              ))}
            </div>
          </div>

          {!shown.length && !(group === 'all' && further.length) ? (
            <p className="py-16 text-center text-muted-foreground">{t('kitab.noMatch')}</p>
          ) : (
            <div className="mt-6 space-y-10">
              {shown.map((g) => (
                <section key={g.key} aria-labelledby={`group-${g.key}`} className="space-y-3">
                  <h2 id={`group-${g.key}`} className="text-xl font-semibold tracking-tight">
                    {g.title} <span className="font-mono text-sm font-normal text-muted-foreground">{g.books.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {g.books.map((b) => <BookCard key={b.key} b={b} groupTitle={g.title} open={openKey === b.key} onToggle={() => setOpenKey(openKey === b.key ? null : b.key)} />)}
                  </div>
                </section>
              ))}
              {group === 'all' && further.length > 0 && (
                <section aria-labelledby="further" className="space-y-3 border-t pt-8">
                  <div>
                    <h2 id="further" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight"><Lightbulb className="size-5 text-gold" aria-hidden /> {t('kitab.further')}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t('kitab.furtherHint')}</p>
                  </div>
                  <div className="space-y-2">
                    {further.flatMap((g) => g.books.map((b) => <BookCard key={b.key} b={b} groupTitle={g.title} suggested open={openKey === b.key} onToggle={() => setOpenKey(openKey === b.key ? null : b.key)} />))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
