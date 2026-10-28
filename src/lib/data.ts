import type { Notes, SeriesIndex } from './types'

const get = async <T,>(url: string, what: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${what} tidak dijumpai.`)
  return r.json()
}

export const loadSeriesSlugs = async () => (await get<{ series: string[] }>('/series/index.json', 'Senarai siri')).series
export const loadIndex = (slug: string) => get<SeriesIndex>(`/series/${slug}/index.json`, `Siri ${slug}`)
export const loadNotes = (slug: string, id: string) => get<Notes>(`/series/${slug}/${id}/notes.json`, `Nota ${id}`)
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
