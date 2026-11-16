import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { epPath, fmt, loadNotes } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { toggleSaved, useSaved, type SavedItem, type SavedKind } from '@/lib/saved'
import type { Notes } from '@/lib/types'

type Row = { saved: SavedItem; title: string; line: string; t: number; badge?: string; epLabel: string }

/** The card a saved item points at, in the notes of its episode; undefined when the notes no longer have it. */
function find(n: Notes, s: SavedItem): Omit<Row, 'saved' | 'epLabel'> | undefined {
  if (s.kind === 'pengajaran') {
    const l = n.lessons.find((x) => x.id === s.id)
    return l && { title: l.title, line: l.body, t: l.t, badge: l.kind }
  }
  if (s.kind === 'dalil') {
    const d = n.dalil.find((x) => x.id === s.id)
    return d && { title: d.ref, line: d.translation, t: d.t, badge: d.kind }
  }
  const p = n.people.find((x) => x.id === s.id)
  return p && { title: `${p.name} (${p.role})`, line: p.context, t: p.t }
}

const ORDER: SavedKind[] = ['pengajaran', 'dalil', 'tokoh']

export function SavedPage() {
  const { t, lang } = useT()
  const saved = useSaved()
  const [notes, setNotes] = useState<Map<string, Notes | null> | null>(null)

  useEffect(() => {
    document.title = `${t('saved.title')} · Nota Kuliah`
  }, [t])

  // Notes of every episode with a saved card, loaded once per episode (and again when the language changes).
  const eps = [...new Set(saved.map((s) => `${s.slug}/${s.epId}`))].sort().join(',')
  useEffect(() => {
    let live = true
    Promise.all(
      (eps ? eps.split(',') : []).map(async (k) => {
        const [slug, epId] = k.split('/')
        return [k, await loadNotes(slug, epId, lang).catch(() => null)] as const
      }),
    ).then((pairs) => live && setNotes(new Map(pairs)))
    return () => {
      live = false
    }
  }, [eps, lang])

  const rows = saved.flatMap((s): Row[] => {
    const n = notes?.get(`${s.slug}/${s.epId}`)
    const f = n ? find(n, s) : undefined
    const ep = n ? `${n.series} · ${n.episode > 0 ? t('ep', { n: n.episode }) : t('sidebar.prolog')}` : ''
    return [f ? { saved: s, ...f, epLabel: ep } : { saved: s, title: '', line: '', t: 0, epLabel: '' }]
  })
  const loading = saved.length > 0 && !notes

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('saved.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('saved.lede')}</p>
      </div>

      {saved.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <Star className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{t('saved.empty')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('saved.emptyHint')}</p>
        </div>
      ) : loading ? (
        <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : (
        <div className="mt-8 space-y-10">
          {ORDER.map((kind) => {
            const list = rows.filter((r) => r.saved.kind === kind)
            if (!list.length) return null
            return (
              <section key={kind} aria-labelledby={`k-${kind}`} className="space-y-3">
                <h2 id={`k-${kind}`} className="text-xl font-semibold tracking-tight">
                  {t(`saved.kind.${kind}`)} <span className="font-mono text-sm font-normal text-muted-foreground">{list.length}</span>
                </h2>
                <div className="space-y-2">
                  {list.map((r) => (
                    <Card key={`${r.saved.slug}/${r.saved.epId}/${r.saved.id}`}>
                      <CardContent className="space-y-1.5 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            {r.badge && <Badge variant={r.badge === 'quran' ? 'gold' : 'secondary'}>{r.badge === 'quran' ? t('kind.quran') : r.badge === 'hadith' ? t('kind.hadith') : r.badge}</Badge>}
                            <p className="font-medium leading-snug">{r.title || t('saved.missing')}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={t('saved.remove')} title={t('saved.remove')} onClick={() => toggleSaved(r.saved)}>
                            <Star className="size-3.5 fill-gold text-gold" />
                          </Button>
                        </div>
                        {r.line && <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{r.line}</p>}
                        {r.title && (
                          <Link
                            to={`${epPath(r.saved.slug, r.saved.epId)}?t=${r.t}&i=${encodeURIComponent(`${r.saved.kind}:${r.saved.id}`)}`}
                            className="group inline-flex items-center gap-2 rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              <Play className="size-3 fill-current" aria-hidden />
                              {fmt(r.t)}
                            </span>
                            <span className="text-muted-foreground">{r.epLabel}</span>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
