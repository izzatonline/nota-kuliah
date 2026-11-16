import type { Lang } from '@/lib/i18n'
import type { TermEntry, TermIndex } from '@/lib/types'
import { fold } from '@/lib/tokoh'

const cache = new Map<Lang, Promise<TermIndex>>()
/** The index `scripts/search-index.mjs` builds by merging every episode's glossary. */
export function loadIstilah(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/istilah.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no istilah index')
      return r.json() as Promise<TermIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

const ARTICLE = /^(al|an|as|ad|ar|az|ash|at|adh)\s+/
/** What a term is filed under: without the Arabic article, so "Al-Amin" sits under A for Amin. */
export const termSort = (e: TermEntry) => e.key.replace(ARTICLE, '')
export const termLetter = (e: TermEntry) => (/^[a-z]/.test(termSort(e)) ? termSort(e)[0].toUpperCase() : '#')
export const matchesTerm = (e: TermEntry, q: string) => !q || fold(e.term).includes(q) || e.key.includes(q) || e.mentions.some((m) => fold(m.meaning).includes(q))

/** Mentions after the first whose meaning is not the one shown, so "n other meanings" counts real differences. */
export const otherMeanings = (e: TermEntry) => e.mentions.slice(1).filter((m) => fold(m.meaning) !== fold(e.mentions[0].meaning)).length
