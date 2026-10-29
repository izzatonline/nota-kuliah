import type { Notes, SeriesIndex } from './types'
import type { Lang } from './i18n'

const get = async <T,>(url: string, what: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${what} tidak dijumpai.`)
  return r.json()
}

export const loadSeriesSlugs = async () => (await get<{ series: string[] }>('/series/index.json', 'Senarai siri')).series
export const loadIndex = (slug: string) => get<SeriesIndex>(`/series/${slug}/index.json`, `Siri ${slug}`)

type Patch = Record<string, unknown>
const isRecord = (v: unknown): v is Patch => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Lays a translation over the notes: objects merge by key, arrays of `{id}` items merge by id, anything else is replaced. */
function overlay<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) && Array.isArray(patch)) {
    if (!base.every((x) => isRecord(x) && 'id' in x)) return patch as T
    const byId = new Map((patch as Patch[]).map((p) => [p.id, p]))
    return base.map((b) => (byId.has((b as Patch).id) ? overlay(b, byId.get((b as Patch).id)) : b)) as T
  }
  if (isRecord(base) && isRecord(patch)) {
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, k in patch ? overlay(v, patch[k]) : v])) as T
  }
  return (patch ?? base) as T
}

export const loadNotes = async (slug: string, id: string, lang: Lang = 'ms') => {
  const base = await get<Notes>(`/series/${slug}/${id}/notes.json`, `Nota ${id}`)
  if (lang === 'ms') return base
  // English is an overlay of text only: times and ids come from the Malay notes. No overlay yet means Malay.
  const r = await fetch(`/series/${slug}/${id}/notes.en.json`)
  if (!r.ok || !r.headers.get('content-type')?.includes('json')) return base
  return { ...overlay(base, await r.json()), translated: true }
}
export const loadAllSeries = async () => Promise.all((await loadSeriesSlugs()).map(loadIndex))

export const epPath = (slug: string, id: string) => `/${slug}/${id}`

/** The episode a visitor should land on: the newest notes, else the first episode. */
export function startEpisode(index: SeriesIndex) {
  const withNotes = index.episodes.filter((e) => e.hasNotes)
  return [...withNotes].sort((a, b) => (b.notesAddedAt ?? '').localeCompare(a.notesAddedAt ?? ''))[0] ?? index.episodes[0]
}

export function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const youtubeUrl = (id: string, t = 0) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${Math.floor(t)}s` : ''}`
