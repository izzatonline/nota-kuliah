import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Search, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { PersonMentionRow } from '@/components/person-mention'
import { useT } from '@/lib/i18n'
import { byName, fold, letterOf, loadTokoh, matches } from '@/lib/tokoh'
import { cn } from '@/lib/utils'
import type { PersonEntry, PersonIndex } from '@/lib/types'

function PersonCard({ p, groupTitle, open, onToggle }: { p: PersonEntry; groupTitle: string; open: boolean; onToggle: () => void }) {
  const { t } = useT()
  return (
    <Card id={p.key} data-letter={letterOf(p.title)} className="scroll-mt-40 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><UserRound className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">{p.title}</span>
            <span className="block text-xs text-muted-foreground">{groupTitle}</span>
          </span>
          <Badge variant="secondary" className="shrink-0">{t('tokoh.mentions', { n: p.mentions.length })}</Badge>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <div className="border-t px-4 pb-3 pt-2">
            <ul className="-mx-2">{p.mentions.map((m) => <PersonMentionRow key={`${m.slug}/${m.epId}/${m.person.id}`} m={m} />)}</ul>
            <Button asChild variant="ghost" size="sm" className="-ml-2 mt-1 text-primary">
              <Link to={`/tokoh/${p.key}`}>{t('tokoh.allMentions')}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TokohPage() {
  const { t, lang } = useT()
  const { hash } = useLocation()
  const [index, setIndex] = useState<PersonIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('tokoh.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadTokoh(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  // A link such as /tokoh#abu-bakar opens at that person once the list is in.
  useEffect(() => {
    if (!index || !hash) return
    const key = decodeURIComponent(hash.slice(1))
    setGroup('all')
    setQ('')
    setOpenKey(key)
    requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ block: 'start' }))
  }, [index, hash])

  const needle = fold(q)
  const groups = useMemo(
    () =>
      (index?.groups ?? [])
        .map((g) => ({ ...g, people: g.people.filter((p) => matches(p, needle)).sort(byName) }))
        .filter((g) => g.people.length),
    [index, needle],
  )
  const shown = group === 'all' ? groups : groups.filter((g) => g.key === group)
  const letters = [...new Set(shown.flatMap((g) => g.people.map((p) => letterOf(p.title))))].sort()
  const total = (index?.groups ?? []).reduce((n, g) => n + g.people.length, 0)

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('tokoh.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('tokoh.lede')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('tokoh.note')}</p>
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('tokoh.none')}</p>
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
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tokoh.search')} aria-label={t('tokoh.search')} className="h-9 pl-9" />
            </div>
            <div className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {[{ key: 'all', title: t('all'), n: total }, ...(index.groups.map((g) => ({ key: g.key, title: g.title, n: g.people.length })))].map((c) => (
                <Button key={c.key} size="sm" variant={group === c.key ? 'default' : 'outline'} className="shrink-0" onClick={() => setGroup(c.key)}>
                  {c.title} <span className="font-mono text-xs opacity-70">{c.n}</span>
                </Button>
              ))}
            </div>
            {letters.length > 1 && (
              <nav aria-label={t('tokoh.jump')} className="-my-0.5 flex gap-0.5 overflow-x-auto py-0.5 text-xs [scrollbar-width:none]">
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

          {!shown.length ? (
            <p className="py-16 text-center text-muted-foreground">{t('tokoh.noMatch')}</p>
          ) : (
            <div className="mt-6 space-y-10">
              {shown.map((g) => (
                <section key={g.key} aria-labelledby={`group-${g.key}`} className="space-y-3">
                  <h2 id={`group-${g.key}`} className="text-xl font-semibold tracking-tight">
                    {g.title} <span className="font-mono text-sm font-normal text-muted-foreground">{g.people.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {g.people.map((p) => (
                      <PersonCard key={p.key} p={p} groupTitle={g.title} open={openKey === p.key} onToggle={() => setOpenKey(openKey === p.key ? null : p.key)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
