import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import type { AyatIndex } from '@/lib/types'

const cache = new Map<Lang, Promise<AyatIndex>>()
/** The index `scripts/search-index.mjs` builds from every Quran dalil, grouped by surah and ayah. */
export function loadAyat(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/ayat.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no ayat index')
      return r.json() as Promise<AyatIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

let counts: Promise<Record<string, number>> | undefined
/** How many times a verse is cited ("17:15" -> 2), from a small file so a dalil card need not load the whole index. */
export function useAyatCount(ref: string) {
  const [n, setN] = useState<number>()
  const key = /(\d+:\d+)$/.exec(ref)?.[1]
  useEffect(() => {
    if (!key) return
    counts ??= fetch('/search/ayat-counts.json')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : Promise.reject()))
      .catch(() => {
        counts = undefined
        return {} as Record<string, number>
      })
    let live = true
    counts.then((c) => live && setN(c[key]))
    return () => {
      live = false
    }
  }, [key])
  return key ? { key, n } : undefined
}
