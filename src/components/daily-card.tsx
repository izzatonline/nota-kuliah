import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ItemShare } from '@/components/item-share'
import { SaveButton } from '@/components/save-button'
import { epPath, fmt } from '@/lib/data'
import { useT, type Lang } from '@/lib/i18n'

type Daily = { kind: 'lesson' | 'dua'; slug: string; epId: string; epNumber: number | null; epTitle: string; series: string; id: string; t: number; title: string; line: string; arabic?: string | null }

const cache = new Map<Lang, Promise<Daily[]>>()
function loadDaily(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/harian.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no daily index')
      return r.json() as Promise<Daily[]>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

/** Today's date in Malaysia, so everyone sees the same card whatever their own time zone. */
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d)

/** FNV-1a of the date, so the pick jumps around the list instead of walking through it one by one. */
export function pickIndex(day: string, n: number) {
  let h = 2166136261
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619) >>> 0
  return n ? h % n : 0
}

/** One lesson or dua a day, the same for everyone: picked from the date over the list `scripts/search-index.mjs` builds. */
export function DailyCard() {
  const { t, lang } = useT()
  const [item, setItem] = useState<Daily | null>(null)
  useEffect(() => {
    let live = true
    loadDaily(lang)
      .then((list) => live && setItem(list[pickIndex(dayKey(), list.length)] ?? null))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [lang])
  if (!item) return null
  const tab = item.kind === 'dua' ? 'dalil' : 'pengajaran'
  const ep = item.epNumber ? t('ep', { n: item.epNumber }) : t('sidebar.prolog')
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6" aria-labelledby="daily">
      <Card className="bg-gold-soft/60">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sun className="size-4 text-gold" aria-hidden />
              <h2 id="daily" className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{item.kind === 'dua' ? t('daily.dua') : t('daily.lesson')}</h2>
              <Badge variant="secondary">{item.kind === 'dua' ? item.title : t('daily.fromLecture')}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <SaveButton kind={tab} id={item.id} slug={item.slug} epId={item.epId} />
              <ItemShare slug={item.slug} epId={item.epId} item={{ tab, id: item.id, t: item.t, title: item.title, line: item.line, arabic: item.arabic }} />
            </div>
          </div>
          {item.kind === 'lesson' && <p className="text-lg font-semibold leading-snug tracking-tight">{item.title}</p>}
          {item.arabic && <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2.1] sm:text-3xl">{item.arabic}</p>}
          <p className="line-clamp-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{item.line}</p>
          <Link
            to={`${epPath(item.slug, item.epId)}?t=${item.t}&i=${encodeURIComponent(`${tab}:${item.id}`)}`}
            className="group inline-flex items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 font-mono text-xs font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Play className="size-3 fill-current" aria-hidden />
              {fmt(item.t)}
            </span>
            <span className="font-medium text-primary underline-offset-2 group-hover:underline">{t('daily.see')}</span>
            <span className="text-muted-foreground">{item.series} · {ep}</span>
          </Link>
        </CardContent>
      </Card>
    </section>
  )
}
