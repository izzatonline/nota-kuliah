import type { Lang } from '@/lib/i18n'
import { entry, norm, type Entry, type Kind, type Row } from '@/lib/search-entries'

export { KINDS, norm, type Entry, type Kind } from '@/lib/search-entries'

const cache = new Map<Lang, Promise<Entry[]>>()

/** Every episode title and every item of every episode's notes, from the index `scripts/search-index.mjs` builds. Fetched once per language, the first time search opens. */
export function loadEntries(lang: Lang): Promise<Entry[]> {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/${lang}.json`).then(async (r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no search index')
      return ((await r.json()) as Row[]).map((row) => entry(row))
    })
    p.catch(() => cache.delete(lang)) // a failed load can be tried again
    cache.set(lang, p)
  }
  return p
}

/** Entries that contain every word of the query. A title hit ranks above a hit in the body, then the earlier episode first. */
export function search(entries: Entry[], query: string, perKind = 6): Entry[] {
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return []
  const q = words.join(' ')
  const scored: { e: Entry; s: number }[] = []
  for (const e of entries) {
    if (!words.every((w) => e.hay.includes(w))) continue
    let s = 0
    if (e.titleHay.includes(q)) s += 4
    if (e.titleHay.startsWith(words[0])) s += 2
    s += words.filter((w) => e.titleHay.includes(w)).length
    scored.push({ e, s })
  }
  scored.sort((a, b) => b.s - a.s || a.e.order - b.e.order)
  const seen = new Map<Kind, number>()
  return scored.filter(({ e }) => {
    const n = seen.get(e.kind) ?? 0
    seen.set(e.kind, n + 1)
    return n < perKind
  }).map((x) => x.e)
}

/** A short piece of the body around the first word that matched, for the result's second line. */
export function snippet(e: Entry, query: string, len = 90): string {
  const text = e.body.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const words = norm(query).split(' ').filter(Boolean)
  // Accents are stripped for matching, so look the word up in the lower-cased original and fall back to the start.
  const found = words.map((w) => text.toLowerCase().indexOf(w)).filter((i) => i >= 0)
  const hit = found.length ? Math.min(...found) : 0
  const from = Math.max(0, hit - 25)
  return (from > 0 ? '…' : '') + text.slice(from, from + len) + (from + len < text.length ? '…' : '')
}
