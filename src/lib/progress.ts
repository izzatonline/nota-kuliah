/** Remembers, in this browser only, which episode was opened last and how far each one was played. */
const KEY = 'nota-progress'
const MAX_EPISODES = 60

type Entry = { t: number; updatedAt: number }
type Store = { last: { slug: string; ep: string } | null; eps: Record<string, Entry> }

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && typeof s === 'object') return { last: s.last ?? null, eps: s.eps ?? {} }
    }
  } catch {}
  return { last: null, eps: {} }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

const key = (slug: string, ep: string) => `${slug}/${ep}`

export const getLast = () => read().last
export const getProgress = (slug: string, ep: string): Entry | null => read().eps[key(slug, ep)] ?? null

/** Opening an episode makes it the last visited one, without touching its saved position. */
export function markVisited(slug: string, ep: string) {
  const s = read()
  s.last = { slug, ep }
  write(s)
}

export function saveTime(slug: string, ep: string, t: number) {
  const s = read()
  s.last = { slug, ep }
  s.eps[key(slug, ep)] = { t: Math.floor(t), updatedAt: Date.now() }
  const keep = Object.entries(s.eps).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_EPISODES)
  s.eps = Object.fromEntries(keep)
  write(s)
}
