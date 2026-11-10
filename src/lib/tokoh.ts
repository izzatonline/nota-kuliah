import type { Lang } from '@/lib/i18n'
import type { PersonEntry, PersonGroup, PersonIndex } from '@/lib/types'

const cache = new Map<Lang, Promise<PersonIndex>>()
/** The index `scripts/search-index.mjs` builds from every people entry tagged with a person key. */
export function loadTokoh(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    p = fetch(`/search/tokoh.${lang}.json`).then((r) => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('no tokoh index')
      return r.json() as Promise<PersonIndex>
    })
    p.catch(() => cache.delete(lang))
    cache.set(lang, p)
  }
  return p
}

/** Lower case, no accents, no apostrophes or punctuation: "Mus'ab" and "Musab" match. */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’‘`.]/g, '').replace(/\s+/g, ' ').trim()

const TITLES = /^(nabi|imam|dr|prof|profesor|syekh|syeikh|sheikh|sultan|raja|datuk|bapak|haji|buya|saidina|ustaz|al|an|as|ad|ar|az)\s+/

/** What a name is filed under: without honorifics, so "Nabi Musa AS" sits under M. */
export const sortKey = (title: string) => {
  let k = fold(title)
  for (let i = 0; i < 3 && TITLES.test(k); i++) k = k.replace(TITLES, '')
  return k
}
export const letterOf = (title: string) => (sortKey(title)[0] ?? '#').toUpperCase()

export const byName = (a: PersonEntry, b: PersonEntry) => sortKey(a.title).localeCompare(sortKey(b.title))

export const matches = (p: PersonEntry, q: string) => !q || [p.title, ...p.aliases].some((n) => fold(n).includes(q))

export function findPerson(index: PersonIndex, key: string): { person: PersonEntry; group: PersonGroup } | undefined {
  for (const group of index.groups) {
    const person = group.people.find((p) => p.key === key)
    if (person) return { person, group }
  }
}
