import { useT, type Key } from '@/lib/i18n'
import { hasPin, orient } from '@/lib/places'
import type { PlaceEntry } from '@/lib/types'

/** Where a place is today and which way it lies from Makkah, so a learner can place it on the map in their head. */
export function PlaceWhere({ entry, makkah }: { entry: PlaceEntry; makkah?: PlaceEntry }) {
  const { t } = useT()
  const parts: string[] = []
  if (entry.now) parts.push(t('places.now', { country: entry.now }))
  if (makkah && hasPin(makkah) && hasPin(entry) && entry.key !== makkah.key) {
    const o = orient(makkah, entry)
    parts.push(t('places.fromMakkah', { km: o.km.toLocaleString(), dir: t(`places.dir.${o.dir}` as Key) }))
  }
  return parts.length ? <span className="block text-xs text-muted-foreground">{parts.join(' · ')}</span> : null
}
