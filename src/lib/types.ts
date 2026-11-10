export type Episode = {
  id: string
  youtubeId: string
  number: number | null
  title: string
  season: number
  duration: number | null
  views?: number | null
  hasNotes: boolean
  notesAddedAt?: string
}
export type SeriesIndex = {
  series: { slug: string; title: string; speaker: string; playlist: string; description: { ms: string; en: string } }
  episodes: Episode[]
}

export type Chapter = { id: string; title: string; start: number; end: number; summary: string }
export type Dalil = {
  id: string
  kind: 'quran' | 'hadith'
  ref: string
  t: number
  arabic: string | null
  translation: string
  context: string
  narrator?: string
  source: string
  /** Page of the verified source (sunnah.com), set only once the entry has been checked against it. */
  sourceUrl?: string
  grade?: string | null
  verified: boolean
  /** Key of the dua this is, from `data/duas.json`. Set when the item is a dua or teaches about making dua. */
  dua?: string
}
export type Book = {
  id: string
  title: string
  author: string | null
  kind: string
  t: number | null
  context: string
  note?: string
  suggested?: boolean
}
export type Person = { id: string; name: string; role: string; t: number; context: string }
export type SirahEvent = { id: string; label: string; title: string; t: number | null; desc: string }
export type Lesson = { id: string; title: string; body: string; kind: string; t: number }
export type Term = { id: string; term: string; arabic: string | null; meaning: string; t: number }
export type MapNode = { id: string; label: string; t: number; detail: string; children?: MapNode[] }

export type Notes = {
  id: string
  youtubeId: string
  title: string
  speaker: string
  series: string
  episode: number
  duration: number
  /** Set when an English overlay was applied. */
  translated?: boolean
  summary: string
  keyPoints: string[]
  chapters: Chapter[]
  dalil: Dalil[]
  books: Book[]
  people: Person[]
  sirah: { era: string; summary: string; events: SirahEvent[] }
  lessons: Lesson[]
  glossary: Term[]
  mindmap: MapNode
  /** Support information for episodes that touch on self-harm. Not part of the lecture. */
  careNote?: { title: string; body: string; items: { name: string; contact: string }[]; source: string }
}

/* ----------------------------------------------------------------- Doa */
/** One place a dua comes up: an episode and the dalil entry there. */
export type DuaMention = { slug: string; series: string; epId: string; epNumber: number | null; epTitle: string; dalil: Dalil }
export type Dua = { key: string; title: string; mentions: DuaMention[] }
export type DuaTopic = { key: string; title: string; hint?: string; duas: Dua[] }
/** What `scripts/search-index.mjs` writes to `public/search/doa.<lang>.json`. */
export type DuaIndex = { topics: DuaTopic[] }
