// Builds public/search/<lang>.json: one file per language with every searchable item of every episode, so the
// search palette fetches one small file the first time it opens instead of every episode's notes.
// Also builds public/search/doa.<lang>.json for the Doa page: every dalil entry tagged with a `dua` key, grouped by the
// duas and topics in data/duas.json.
// And public/search/tokoh.<lang>.json for the Tokoh pages: every `people` entry tagged with a `person` key, grouped by
// the groups in data/people.json.
// Run by `npm run dev` and `npm run build`. The output is generated and not committed.
// The entries are made by src/lib/search-entries.ts, the same code the app uses, bundled here with esbuild.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { buildSync } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const read = (p) => (existsSync(join(pub, p)) ? JSON.parse(readFileSync(join(pub, p), 'utf8')) : undefined)

const out = join(tmpdir(), `nota-kuliah-search-${process.pid}.mjs`)
buildSync({
  stdin: {
    contents: "export * from './src/lib/search-entries.ts'; export * from './src/lib/overlay.ts'",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
})
const { seriesEntries, overlay } = await import(pathToFileURL(out).href)
rmSync(out)

const slugs = read('series/index.json').series
const dir = join(pub, 'search')
mkdirSync(dir, { recursive: true })

const catalogue = JSON.parse(readFileSync(join(root, 'data/duas.json'), 'utf8'))
const unknownDuas = new Set()
const people = JSON.parse(readFileSync(join(root, 'data/people.json'), 'utf8'))
const unknownPeople = new Set()

for (const lang of ['ms', 'en']) {
  const rows = []
  const mentions = new Map() // dua key -> mentions, in series then episode order
  const whoMentions = new Map() // person key -> mentions, in series then episode order
  for (const slug of slugs) {
    const idx = read(`series/${slug}/index.json`)
    const notesOf = (epId) => {
      const base = read(`series/${slug}/${epId}/notes.json`)
      const en = lang === 'en' && base ? read(`series/${slug}/${epId}/notes.en.json`) : undefined
      return en ? overlay(base, en) : base
    }
    for (const { hay, titleHay, key, ...row } of seriesEntries(idx, notesOf)) rows.push(row)
    for (const ep of idx.episodes) {
      const n = ep.hasNotes ? notesOf(ep.id) : undefined
      for (const p of n?.people ?? []) {
        if (!p.person) continue
        if (!whoMentions.has(p.person)) whoMentions.set(p.person, [])
        whoMentions.get(p.person).push({ slug, series: idx.series.title, epId: ep.id, epNumber: ep.number, epTitle: n.title, person: p })
      }
      for (const d of n?.dalil ?? []) {
        if (!d.dua) continue
        if (!mentions.has(d.dua)) mentions.set(d.dua, [])
        mentions.get(d.dua).push({ slug, series: idx.series.title, epId: ep.id, epNumber: ep.number, epTitle: n.title, dalil: d })
      }
    }
  }
  writeFileSync(join(dir, `${lang}.json`), JSON.stringify(rows))
  console.log(`search index ${lang}: ${rows.length} entries`)

  for (const k of mentions.keys()) if (!catalogue.duas.some((d) => d.key === k)) unknownDuas.add(k)
  const topics = catalogue.topics
    .map((tp) => ({
      key: tp.key,
      title: tp[lang],
      ...(tp.hint && { hint: tp.hint[lang] }),
      duas: catalogue.duas
        .filter((d) => d.topic === tp.key && mentions.has(d.key))
        .map((d) => ({ key: d.key, title: d[lang], mentions: mentions.get(d.key) })),
    }))
    .filter((tp) => tp.duas.length)
  writeFileSync(join(dir, `doa.${lang}.json`), JSON.stringify({ topics }))
  console.log(`doa index ${lang}: ${topics.reduce((n, tp) => n + tp.duas.length, 0)} duas`)

  for (const k of whoMentions.keys()) if (!people.people.some((p) => p.key === k)) unknownPeople.add(k)
  const groups = people.groups
    .map((g) => ({
      key: g.key,
      title: g[lang],
      people: people.people
        .filter((p) => p.group === g.key && whoMentions.has(p.key))
        .map((p) => ({ key: p.key, title: (lang === 'en' && p.en) || p.ms, aliases: p.aliases ?? [], mentions: whoMentions.get(p.key) }))
        .sort((a, b) => b.mentions.length - a.mentions.length || a.title.localeCompare(b.title)),
    }))
    .filter((g) => g.people.length)
  writeFileSync(join(dir, `tokoh.${lang}.json`), JSON.stringify({ groups }))
  console.log(`tokoh index ${lang}: ${groups.reduce((n, g) => n + g.people.length, 0)} people`)
}
for (const k of unknownPeople) console.warn(`! person "${k}" is not in data/people.json, so the Tokoh page leaves it out`)
// A key the drafting step made up for a new dua needs a title and topic before the page can list it.
for (const k of unknownDuas) console.warn(`! dua "${k}" is not in data/duas.json, so the Doa page leaves it out`)
