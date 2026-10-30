import { loadAllSeries, loadNotes } from '@/lib/data'
import type { Lang } from '@/lib/i18n'
import type { Notes, SeriesIndex } from '@/lib/types'

export type Kind = 'episode' | 'topik' | 'dalil' | 'kitab' | 'tokoh' | 'pengajaran' | 'istilah'
/** Result groups, in the order they are listed. */
export const KINDS: Kind[] = ['episode', 'tokoh', 'kitab', 'dalil', 'topik', 'pengajaran', 'istilah']

export type Entry = {
  key: string
  kind: Kind
  slug: string
  epId: string
  epNumber: number | null
  title: string
  body: string
  /** Normalised title and body, what the query is matched against. */
  hay: string
  titleHay: string
  /** The card to open and flash on the episode page (none for an episode). */
  itemId?: string
  order: number
}

/** Lower case, accents and apostrophes removed and other punctuation turned into spaces, so "Mus'ab" is found by "musab". */
export const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f]/g, '').toLowerCase().replace(/['\u2018\u2019\u02bb\u02bc\u02bf`]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

const entry = (e: Omit<Entry, 'hay' | 'titleHay' | 'key'>, id: string): Entry => ({
  ...e,
  key: `${e.slug}/${e.epId}/${e.kind}/${id}`,
  titleHay: norm(e.title),
  hay: norm(`${e.title} ${e.body}`),
})

function fromNotes(slug: string, epId: string, epNumber: number | null, n: Notes, order: number): Entry[] {
  const base = { slug, epId, epNumber, order }
  const at = (kind: Kind, id: string) => ({ ...base, kind, itemId: `${kind}:${id}` })
  return [
    ...n.chapters.map((c) => entry({ ...at('topik', c.id), title: c.title, body: c.summary }, c.id)),
    ...n.dalil.map((d) => entry({ ...at('dalil', d.id), title: d.ref, body: [d.translation, d.context, d.narrator, d.source].filter(Boolean).join(' ') }, d.id)),
    ...n.books.map((b) => entry({ ...at('kitab', b.id), title: b.title, body: [b.author, b.context].filter(Boolean).join(' ') }, b.id)),
    ...n.people.map((p) => entry({ ...at('tokoh', p.id), title: p.name, body: `${p.role} ${p.context}` }, p.id)),
    ...n.lessons.map((l) => entry({ ...at('pengajaran', l.id), title: l.title, body: l.body }, l.id)),
    ...n.glossary.map((g) => entry({ ...at('istilah', g.id), title: g.term, body: [g.arabic, g.meaning].filter(Boolean).join(' ') }, g.id)),
  ]
}

const cache = new Map<Lang, Promise<Entry[]>>()

/** Every episode title and every item of every episode's notes. Fetched once per language, the first time search opens. */
export function loadEntries(lang: Lang): Promise<Entry[]> {
  let p = cache.get(lang)
  if (!p) {
    p = (async () => {
      const all: SeriesIndex[] = await loadAllSeries()
      const out: Entry[] = []
      for (const idx of all) {
        const eps = [...idx.episodes].reverse()
        eps.forEach((ep, i) => out.push(entry({ kind: 'episode', slug: idx.series.slug, epId: ep.id, epNumber: ep.number, title: ep.title, body: '', order: i }, ep.id)))
        const notes = await Promise.allSettled(eps.filter((e) => e.hasNotes).map((e) => loadNotes(idx.series.slug, e.id, lang).then((n) => [e, n] as const)))
        for (const r of notes) {
          if (r.status !== 'fulfilled') continue
          const [ep, n] = r.value
          out.push(...fromNotes(idx.series.slug, ep.id, ep.number, n, eps.indexOf(ep)))
        }
      }
      return out
    })()
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
