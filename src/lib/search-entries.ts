import type { Notes, SeriesIndex } from './types'

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

/** What the search index stores for an entry. The normalised text is worked out again when the index is loaded. */
export type Row = Omit<Entry, 'hay' | 'titleHay' | 'key'>

export const entry = (e: Row, id = e.itemId?.split(':')[1] ?? e.epId): Entry => ({
  ...e,
  key: `${e.slug}/${e.epId}/${e.kind}/${id}`,
  titleHay: norm(e.title),
  hay: norm(`${e.title} ${e.body}`),
})

/** Every item of one episode's notes. */
export function fromNotes(slug: string, epId: string, epNumber: number | null, n: Notes, order: number): Entry[] {
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

/** Every episode of a series and every item of the notes of those that have them, in the order search ranks them. */
export function seriesEntries(idx: SeriesIndex, notesOf: (epId: string) => Notes | undefined): Entry[] {
  const out: Entry[] = []
  const eps = [...idx.episodes].reverse()
  eps.forEach((ep, i) => out.push(entry({ kind: 'episode', slug: idx.series.slug, epId: ep.id, epNumber: ep.number, title: ep.title, body: '', order: i }, ep.id)))
  eps.forEach((ep, i) => {
    const n = ep.hasNotes ? notesOf(ep.id) : undefined
    if (n) out.push(...fromNotes(idx.series.slug, ep.id, ep.number, n, i))
  })
  return out
}
