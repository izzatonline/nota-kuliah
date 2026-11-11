import type { Lang } from '@/lib/i18n'
import type { BookEntry, BookIndex } from '@/lib/types'
import { fold } from '@/lib/tokoh'

const cache = new Map<Lang, Promise<BookIndex>>()
/** The index `scripts/search-index.mjs` builds from every books entry tagged with a book key. */
export function loadKitab(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/kitab.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no kitab index')
      return r.json() as Promise<BookIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

export const matchesBook = (b: BookEntry, q: string) => !q || fold(b.title).includes(q) || (!!b.author && fold(b.author).includes(q))
