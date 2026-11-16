import { useSyncExternalStore } from 'react'

/** A card the visitor starred. `kind` is the notes tab the card is in: pengajaran (lesson), dalil or tokoh (person). */
export type SavedKind = 'pengajaran' | 'dalil' | 'tokoh'
export type SavedItem = { kind: SavedKind; slug: string; epId: string; id: string; savedAt: number }

const KEY = 'nota-saved'
const EVENT = 'nota-saved-change'
const KINDS: SavedKind[] = ['pengajaran', 'dalil', 'tokoh']

// useSyncExternalStore needs the same array back until something changes, so the parsed list is cached by its raw text.
let rawCache: string | null | undefined
let listCache: SavedItem[] = []

function read(): SavedItem[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // Storage can be blocked (private window): nothing is saved then.
  }
  if (raw === rawCache) return listCache
  rawCache = raw
  try {
    const v = raw ? JSON.parse(raw) : []
    listCache = Array.isArray(v)
      ? v.filter((x): x is SavedItem => x && KINDS.includes(x.kind) && typeof x.slug === 'string' && typeof x.epId === 'string' && typeof x.id === 'string')
      : []
  } catch {
    listCache = []
  }
  return listCache
}

function write(list: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Nothing to do: the star simply does not stick.
  }
  window.dispatchEvent(new Event(EVENT))
}

const same = (a: SavedItem, b: Pick<SavedItem, 'kind' | 'slug' | 'epId' | 'id'>) => a.kind === b.kind && a.slug === b.slug && a.epId === b.epId && a.id === b.id

export const isSaved = (list: SavedItem[], x: Pick<SavedItem, 'kind' | 'slug' | 'epId' | 'id'>) => list.some((s) => same(s, x))

export function toggleSaved(x: Pick<SavedItem, 'kind' | 'slug' | 'epId' | 'id'>) {
  const list = read()
  write(isSaved(list, x) ? list.filter((s) => !same(s, x)) : [{ ...x, savedAt: Date.now() }, ...list])
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb) // another tab
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export const useSaved = () => useSyncExternalStore(subscribe, read, () => [] as SavedItem[])
