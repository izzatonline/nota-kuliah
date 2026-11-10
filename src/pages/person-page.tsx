import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { PersonMentionRow } from '@/components/person-mention'
import { useT } from '@/lib/i18n'
import { findPerson, loadTokoh } from '@/lib/tokoh'
import type { PersonIndex } from '@/lib/types'

export function PersonPage() {
  const { key = '' } = useParams()
  const { t, lang } = useT()
  const [index, setIndex] = useState<PersonIndex | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    loadTokoh(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  const found = useMemo(() => (index ? findPerson(index, key) : undefined), [index, key])
  useEffect(() => {
    document.title = `${found?.person.title ?? t('tokoh.title')} · Nota Kuliah`
  }, [found, t])

  // Other people who come up in the same lectures, most shared lectures first.
  const together = useMemo(() => {
    if (!index || !found) return []
    const eps = new Set(found.person.mentions.map((m) => `${m.slug}/${m.epId}`))
    const rows: { key: string; title: string; n: number }[] = []
    for (const g of index.groups)
      for (const p of g.people) {
        if (p.key === key) continue
        const n = new Set(p.mentions.map((m) => `${m.slug}/${m.epId}`).filter((e) => eps.has(e))).size
        if (n) rows.push({ key: p.key, title: p.title, n })
      }
    return rows.sort((a, b) => b.n - a.n || a.title.localeCompare(b.title)).slice(0, 12)
  }, [index, found, key])

  return (
    <PageShell>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4 text-muted-foreground">
        <Link to="/tokoh"><ArrowLeft aria-hidden /> {t('tokoh.back')}</Link>
      </Button>
      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('tokoh.none')}</p>
      ) : !index ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !found ? (
        <p className="py-16 text-center text-muted-foreground">{t('tokoh.notFound')}</p>
      ) : (
        <>
          <div className="space-y-2">
            <Badge variant="secondary">{found.group.title}</Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{found.person.title}</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('tokoh.note')}</p>
          </div>
          <section className="mt-8">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('tokoh.mentioned', { n: found.person.mentions.length })}</p>
            <ul className="-mx-2">{found.person.mentions.map((m) => <PersonMentionRow key={`${m.slug}/${m.epId}/${m.person.id}`} m={m} />)}</ul>
          </section>
          {together.length > 0 && (
            <section className="mt-10 border-t pt-6">
              <h2 className="text-lg font-semibold tracking-tight">{t('tokoh.together')}</h2>
              <p className="mb-3 text-sm text-muted-foreground">{t('tokoh.togetherHint')}</p>
              <div className="flex flex-wrap gap-2">
                {together.map((p) => (
                  <Button key={p.key} asChild size="sm" variant="outline">
                    <Link to={`/tokoh/${p.key}`}>{p.title} <span className="font-mono text-xs opacity-70">{p.n}</span></Link>
                  </Button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  )
}
