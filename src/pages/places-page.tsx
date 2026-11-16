import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ExternalLink, MapPin, MapPinOff, Play, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { PlaceWhere } from '@/components/place-where'
import type { Pin } from '@/components/places-map'
import { epPath, fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { hasPin, loadPlaces, matchesPlace } from '@/lib/places'
import { fold } from '@/lib/tokoh'
import { cn } from '@/lib/utils'
import type { PlaceEntry, PlaceGroup, PlaceIndex, PlaceMention } from '@/lib/types'

// Leaflet is big, so it loads only when a map is on screen.
const PlacesMap = lazy(() => import('@/components/places-map').then((m) => ({ default: m.PlacesMap })))

function MentionRow({ m }: { m: PlaceMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  const at = m.place.t
  return (
    <li>
      <Link
        to={`${epPath(m.slug, m.epId)}${at !== null ? `?t=${at}` : ''}`}
        state={{ focus: { tab: 'tempat', id: `tempat:${m.place.id}` } }}
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
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{m.place.context}</span>
        </span>
      </Link>
    </li>
  )
}

function PlaceCard({ p, makkah, open, onToggle }: { p: PlaceEntry; makkah?: PlaceEntry; open: boolean; onToggle: () => void }) {
  const { t } = useT()
  const pin = hasPin(p)
  return (
    <Card id={p.key} className="scroll-mt-40 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="p-0">
        <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', pin ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>
            {pin ? <MapPin className="size-5" aria-hidden /> : <MapPinOff className="size-5" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">{p.title}</span>
            {!pin && <span className="block text-xs text-muted-foreground">{t('places.noPin')}</span>}
            <PlaceWhere entry={p} makkah={makkah} />
          </span>
          <Badge variant="secondary" className="shrink-0">{p.mentions.length === 1 ? t('places.mention1') : t('places.mentions', { n: p.mentions.length })}</Badge>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <div className="border-t px-4 pb-3 pt-2">
            {p.note && <p className="mb-2 text-xs italic leading-relaxed text-muted-foreground">{p.note}</p>}
            {p.osm && (
              <a href={`https://www.openstreetmap.org/${p.osm}`} target="_blank" rel="noopener noreferrer" className="mb-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
                {t('places.source')} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('places.mentioned', { n: p.mentions.length })}</p>
            <ul className="-mx-2">{p.mentions.map((m) => <MentionRow key={`${m.slug}/${m.epId}/${m.place.id}`} m={m} />)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PlacesPage() {
  const { t, lang } = useT()
  const { hash } = useLocation()
  const [index, setIndex] = useState<PlaceIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const mapBox = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${t('places.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadPlaces(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  const select = (key: string, scroll = true) => {
    setGroup('all')
    setQ('')
    setOpenKey(key)
    if (scroll) requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
  }
  // A link such as /tempat#taif opens at that place once the list is in.
  useEffect(() => {
    if (!index || !hash) return
    select(decodeURIComponent(hash.slice(1)))
  }, [index, hash]) // eslint-disable-line react-hooks/exhaustive-deps

  const needle = fold(q)
  const groups = useMemo(
    () => (index?.groups ?? []).map((g): PlaceGroup => ({ ...g, places: g.places.filter((p) => matchesPlace(p, needle)) })).filter((g) => g.places.length),
    [index, needle],
  )
  const shown = group === 'all' ? groups : groups.filter((g) => g.key === group)
  const all = useMemo(() => (index?.groups ?? []).flatMap((g) => g.places), [index])
  const pins = useMemo<Pin[]>(() => all.filter(hasPin).map((p) => ({ key: p.key, title: p.title, lat: p.lat, lng: p.lng, n: p.mentions.length })), [all])

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('places.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('places.lede')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('places.note')}</p>
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('places.none')}</p>
      ) : !index ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-80 w-full rounded-xl" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div ref={mapBox} className="mt-6">
            <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}><PlacesMap pins={pins} selected={openKey} onSelect={(k) => select(k)} label={t('places.mapLabel')} north={t('places.north')} thin className="h-80 sm:h-[28rem]" /></Suspense>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('places.mapHint')}</p>
          <div className="sticky top-14 z-20 -mx-4 mt-6 space-y-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('places.search')} aria-label={t('places.search')} className="h-9 pl-9" />
            </div>
            <div className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {[{ key: 'all', title: t('all'), n: all.length }, ...index.groups.map((g) => ({ key: g.key, title: g.title, n: g.places.length }))].map((c) => (
                <Button key={c.key} size="sm" variant={group === c.key ? 'default' : 'outline'} className="shrink-0" onClick={() => setGroup(c.key)}>
                  {c.title} <span className="font-mono text-xs opacity-70">{c.n}</span>
                </Button>
              ))}
            </div>
          </div>
          {!shown.length ? (
            <p className="py-16 text-center text-muted-foreground">{t('places.noMatch')}</p>
          ) : (
            <div className="mt-6 space-y-10">
              {shown.map((g) => (
                <section key={g.key} aria-labelledby={`group-${g.key}`} className="space-y-3">
                  <h2 id={`group-${g.key}`} className="text-xl font-semibold tracking-tight">
                    {g.title} <span className="font-mono text-sm font-normal text-muted-foreground">{g.places.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {g.places.map((p) => <PlaceCard key={p.key} p={p} makkah={all.find((x) => x.key === 'makkah')} open={openKey === p.key} onToggle={() => setOpenKey(openKey === p.key ? null : p.key)} />)}
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
