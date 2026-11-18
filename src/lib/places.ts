import type { Lang } from '@/lib/i18n'
import type { PlaceEntry, PlaceIndex } from '@/lib/types'
import { fold } from '@/lib/tokoh'

const cache = new Map<Lang, Promise<PlaceIndex>>()
/** The index `scripts/search-index.mjs` builds from every places entry tagged with a place key. */
export function loadPlaces(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/tempat.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no places index')
      return r.json() as Promise<PlaceIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

export const hasPin = (p: PlaceEntry): p is PlaceEntry & { lat: number; lng: number } => p.lat !== null && p.lng !== null
export const matchesPlace = (p: PlaceEntry, q: string) => !q || fold(p.title).includes(q) || p.aliases.some((a) => fold(a).includes(q))

const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
export type Compass = (typeof COMPASS)[number]
/** How far and in which direction `p` lies from `from` (a straight line, as the crow flies). */
export function orient(from: { lat: number; lng: number }, p: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const dLat = (p.lat - from.lat) * rad
  const dLng = (p.lng - from.lng) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(p.lat * rad) * Math.sin(dLng / 2) ** 2
  const km = 2 * 6371 * Math.asin(Math.sqrt(a))
  const y = Math.sin(dLng) * Math.cos(p.lat * rad)
  const x = Math.cos(from.lat * rad) * Math.sin(p.lat * rad) - Math.sin(from.lat * rad) * Math.cos(p.lat * rad) * Math.cos(dLng)
  const deg = ((Math.atan2(y, x) / rad) + 360) % 360
  return { km: km < 100 ? Math.round(km / 5) * 5 : Math.round(km / 50) * 50, dir: COMPASS[Math.round(deg / 45) % 8] as Compass }
}
