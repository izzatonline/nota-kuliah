export type Episode = {
  id: string
  youtubeId: string
  number: number | null
  title: string
  season: number
  duration: number | null
  views?: number | null
  hasNotes: boolean
  hasQuiz?: boolean
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
  /** Key in data/books.json, kept in the Malay notes only. */
  book?: string
  author: string | null
  kind: string
  t: number | null
  context: string
  note?: string
  suggested?: boolean
}
export type Person = { id: string; name: string; /** Key in data/people.json, kept in the Malay notes only. */ person?: string; role: string; t: number; context: string }
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

/** One time the ustaz talks about a person: the notes' entry for them in one lecture. */
export type PersonMention = { slug: string; series: string; epId: string; epNumber: number | null; epTitle: string; person: Person }
export type PersonEntry = { key: string; title: string; /** The other spellings in the notes, so the name filter finds them. */ aliases: string[]; mentions: PersonMention[] }
export type PersonGroup = { key: string; title: string; people: PersonEntry[] }
export type PersonIndex = { groups: PersonGroup[] }

/* ---------------------------------------------------------------- Quiz */
type QuizBase = {
  id: string
  q: string
  explain: string
  /** Seconds into the lecture where the answer is taught. */
  t: number
  /** The note item the question came from, such as `lessons:l2`. */
  source: string
  /** 1 recall, 2 understanding, 3 application. */
  level: 1 | 2 | 3
}
export type Choice = { id: string; text: string }
export type McqQuestion = QuizBase & { type: 'mcq'; options: string[]; answer: number }
export type TfQuestion = QuizBase & { type: 'tf'; answer: boolean }
export type MultiQuestion = QuizBase & { type: 'multi'; options: string[]; answer: number[] }
/** `items` are listed in any order; `answer` holds their ids in the right order. */
export type OrderQuestion = QuizBase & { type: 'order'; items: Choice[]; answer: string[] }
/** `answer` holds `[left id, right id]` pairs. */
export type MatchQuestion = QuizBase & { type: 'match'; left: Choice[]; right: Choice[]; answer: [string, string][] }
export type Question = McqQuestion | TfQuestion | MultiQuestion | OrderQuestion | MatchQuestion
export type Quiz = { id: string; questions: Question[] }

/** One lecture's entry for a book (or, for `suggested`, a book we suggest and the ustaz did not say). */
export type BookMention = { slug: string; series: string; epId: string; epNumber: number | null; epTitle: string; book: Book }
export type BookEntry = { key: string; title: string; author: string | null; mentions: BookMention[] }
export type BookGroup = { key: string; title: string; books: BookEntry[] }
/** What `scripts/search-index.mjs` writes to `public/search/kitab.<lang>.json`. `further` holds books only suggested in the notes. */
export type BookIndex = { groups: BookGroup[]; further: BookGroup[] }
