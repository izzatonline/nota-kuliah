// Builds public/search/<lang>.json: one file per language with every searchable item of every episode, so the
// search palette fetches one small file the first time it opens instead of every episode's notes.
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

for (const lang of ['ms', 'en']) {
  const rows = []
  for (const slug of slugs) {
    const idx = read(`series/${slug}/index.json`)
    const notesOf = (epId) => {
      const base = read(`series/${slug}/${epId}/notes.json`)
      const en = lang === 'en' && base ? read(`series/${slug}/${epId}/notes.en.json`) : undefined
      return en ? overlay(base, en) : base
    }
    for (const { hay, titleHay, key, ...row } of seriesEntries(idx, notesOf)) rows.push(row)
  }
  writeFileSync(join(dir, `${lang}.json`), JSON.stringify(rows))
  console.log(`search index ${lang}: ${rows.length} entries`)
}
