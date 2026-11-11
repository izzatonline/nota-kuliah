// Draws the 1200x630 share image for a page (the picture WhatsApp, Telegram and social feeds show for a link).
// Used by scripts/prerender.mjs. `node scripts/og-image.mjs <out.png>` writes one sample.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const font = (w) => readFileSync(join(root, `node_modules/@fontsource/geist-sans/files/geist-sans-latin-${w}-normal.woff`))
const fonts = [
  { name: 'Geist', data: font(500), weight: 500, style: 'normal' },
  { name: 'Geist', data: font(600), weight: 600, style: 'normal' },
]

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } })

/** `kicker` is the small line above the title (series and episode), `foot` the line below (speaker). */
export async function ogImage({ kicker, title, foot }) {
  const tree = h('div', { width: 1200, height: 630, flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box', background: '#0f2a22', color: '#f4efe4', fontFamily: 'Geist' }, [
    h('div', { alignItems: 'center', gap: 16 }, [
      h('div', { width: 14, height: 14, borderRadius: 7, background: '#d9b45a' }, ''),
      h('div', { fontSize: 30, fontWeight: 600, letterSpacing: 1 }, 'Nota Kuliah'),
    ]),
    h('div', { flexDirection: 'column', gap: 24 }, [
      h('div', { fontSize: 32, fontWeight: 500, color: '#d9b45a' }, kicker),
      { type: 'div', props: { style: { display: 'block', fontSize: title.length > 70 ? 56 : 68, fontWeight: 600, lineHeight: 1.15, lineClamp: 3 }, children: title } },
    ]),
    h('div', { fontSize: 30, fontWeight: 500, color: '#b9c7bf' }, foot),
  ])
  const svg = await satori(tree, { width: 1200, height: 630, fonts })
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? 'og-sample.png'
  const idx = JSON.parse(readFileSync(join(root, 'public/series/sirah-impak-sosial/index.json'), 'utf8'))
  const ep = idx.episodes.find((e) => e.number === 23)
  const t0 = performance.now()
  const png = await ogImage({ kicker: `${idx.series.title} · Ep ${ep.number}`, title: ep.title, foot: idx.series.speaker })
  writeFileSync(out, png)
  console.log(`wrote ${out} (${(png.length / 1024).toFixed(0)} kB) in ${(performance.now() - t0).toFixed(0)} ms`)
  const t1 = performance.now()
  for (let i = 0; i < 10; i++) await ogImage({ kicker: 'x', title: ep.title, foot: 'y' })
  console.log(`10 more: ${(performance.now() - t1).toFixed(0)} ms`)
}
