import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, MapPinOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Pin } from '@/components/places-map'
import { PlaceWhere } from '@/components/place-where'
import { NOW_RING, TimeLink, useIsNow } from '@/components/time-link'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { hasPin, loadPlaces } from '@/lib/places'
import type { Notes, Place, PlaceEntry } from '@/lib/types'

// Leaflet is big, so it loads only when a map is on screen.
const PlacesMap = lazy(() => import('@/components/places-map').then((m) => ({ default: m.PlacesMap })))

function PlaceCard({ p, entry, makkah, selected, onShow }: { p: Place; entry?: PlaceEntry; makkah?: PlaceEntry; selected: boolean; onShow: () => void }) {
  const { t } = useT()
  const now = useIsNow(p.t, 60)
  const pin = entry && hasPin(entry)
  return (
    <Card data-item={`tempat:${p.id}`} className={cn(now && NOW_RING, selected && 'border-primary/60')}>
      <CardContent className="space-y-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-medium leading-snug">
            {pin ? <MapPin className="size-4 text-primary" aria-hidden /> : <MapPinOff className="size-4 text-muted-foreground" aria-hidden />}
            {entry?.title ?? p.name}
          </p>
          {p.t !== null && <TimeLink t={p.t} />}
        </div>
        {entry && <PlaceWhere entry={entry} makkah={makkah} />}
        <p className="text-sm leading-relaxed text-muted-foreground">{p.context}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-medium">
          {pin && (
            <button type="button" onClick={onShow} className="text-primary underline-offset-2 hover:underline">
              {t('places.show')}
            </button>
          )}
          {p.place && (
            <Link to={`/tempat#${p.place}`} className="text-primary underline-offset-2 hover:underline">
              {t('places.allMentions')}
            </Link>
          )}
          {entry && !pin && entry.note && <span className="font-normal italic text-muted-foreground">{entry.note}</span>}
          {entry && pin && entry.precision === 'region' && entry.note && <span className="font-normal italic text-muted-foreground">{entry.note}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

/** The places the ustaz talks about in this lecture: a map with a pin for each, and a card for each with the moment. */
export function PlacesTab({ notes }: { notes: Notes }) {
  const { t, lang } = useT()
  const [entries, setEntries] = useState<Map<string, PlaceEntry> | null>(null)
  const [failed, setFailed] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  useEffect(() => {
    setFailed(false)
    loadPlaces(lang).then((i) => setEntries(new Map(i.groups.flatMap((g) => g.places).map((p) => [p.key, p])))).catch(() => setFailed(true))
  }, [lang])

  const list = useMemo(() => [...(notes.places ?? [])].sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity)), [notes])
  const pins = useMemo<Pin[]>(() => {
    const seen = new Set<string>()
    const out: Pin[] = []
    for (const p of list) {
      const e = p.place ? entries?.get(p.place) : undefined
      if (!e || !hasPin(e) || seen.has(e.key)) continue
      seen.add(e.key)
      out.push({ key: e.key, title: e.title, lat: e.lat, lng: e.lng, n: list.filter((x) => x.place === e.key).length })
    }
    return out
  }, [list, entries])

  return (
    <div className="space-y-4">
      <div className="mb-1 mt-1">
        <h3 className="text-sm font-semibold tracking-tight">{t('places.heading')}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('places.hint')}</p>
      </div>
      {failed ? (
        <p className="text-sm text-muted-foreground">{t('places.none')}</p>
      ) : !entries ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : pins.length ? (
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}><PlacesMap pins={pins} selected={sel} onSelect={setSel} label={t('places.mapLabel')} north={t('places.north')} /></Suspense>
      ) : (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{t('places.noPins')}</p>
      )}
      <div className="space-y-3">
        {list.map((p) => {
          const e = p.place ? entries?.get(p.place) : undefined
          return <PlaceCard key={p.id} p={p} entry={e} makkah={entries?.get('makkah')} selected={!!e && sel === e.key} onShow={() => setSel(e?.key ?? null)} />
        })}
      </div>
    </div>
  )
}
