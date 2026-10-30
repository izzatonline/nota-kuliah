// Runs after `vite build`. The app is a single-page app, so every URL would otherwise serve one empty shell.
// This writes a real HTML file per page (landing, series, episode) with its own title, description, canonical
// and Open Graph tags, plus the summary and topic list as plain text, then writes sitemap.xml and robots.txt.
// React replaces the plain text when it mounts. Pages Cloudflare serves a file first and only falls back to
// /index.html (see public/_redirects) when no file matches.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const SITE = (process.env.SITE_URL ?? 'https://notakuliah.com').replace(/\/$/, '')
const NAME = 'Nota Kuliah'

const read = (p) => JSON.parse(readFileSync(join(root, 'public', p), 'utf8'))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clip = (s, n = 155) => {
  const t = String(s).replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return t.slice(0, n).replace(/\s+\S*$/, '') + '…'
}

const shell = readFileSync(join(dist, 'index.html'), 'utf8')

function page({ path, title, description, body, index = true }) {
  const url = SITE + path
  const head = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    index ? '' : '<meta name="robots" content="noindex,follow" />',
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="ms_MY" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ]
    .filter(Boolean)
    .join('\n    ')
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:44rem;margin:0 auto;padding:1.5rem 1rem;font-family:system-ui,sans-serif">${body}</main></div>`)
  const dir = path === '/' ? dist : join(dist, path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

const entries = [] // for the sitemap

const landingDescription =
  'Nota kuliah Islam di sebelah video YouTube: topik berserta masa, dalil, rujukan dan pengajaran. Percuma, sumber terbuka, dalam Bahasa Melayu dan English.'
const seriesSlugs = read('series/index.json').series
const all = seriesSlugs.map((slug) => ({ slug, ...read(`series/${slug}/index.json`) }))

page({
  path: '/',
  title: `${NAME}: nota kuliah agama dengan masa, dalil dan pengajaran`,
  description: landingDescription,
  body:
    `<h1>${NAME}</h1><p>${esc(landingDescription)}</p><ul>` +
    all.map((s) => `<li><a href="/${s.slug}">${esc(s.series.title)}</a> · ${esc(s.series.speaker)}</li>`).join('') +
    '</ul>',
})
entries.push({ path: '/' })

let pages = 1
for (const s of all) {
  const { slug, series, episodes } = s
  const withNotes = episodes.filter((e) => e.hasNotes)
  const label = (e) => (e.number ? `Ep ${e.number}` : 'Prolog')

  page({
    path: `/${slug}`,
    title: `Nota ${series.title} oleh ${series.speaker} | ${NAME}`,
    description: clip(series.description.ms),
    body:
      `<h1>Nota ${esc(series.title)}</h1><p>${esc(series.description.ms)}</p><ol>` +
      episodes
        .map((e) => `<li><a href="/${slug}/${e.id}">${esc(label(e))}: ${esc(e.title)}</a></li>`)
        .join('') +
      '</ol>',
  })
  entries.push({ path: `/${slug}` })
  pages++

  for (const e of episodes) {
    const path = `/${slug}/${e.id}`
    if (!e.hasNotes || !existsSync(join(root, 'public', `series/${slug}/${e.id}/notes.json`))) {
      page({
        path,
        title: `${label(e)}: ${e.title} · ${series.title} | ${NAME}`,
        description: `${label(e)} siri ${series.title} oleh ${series.speaker}. Nota untuk kuliah ini belum tersedia.`,
        body: `<h1>${esc(label(e))}: ${esc(e.title)}</h1><p><a href="/${slug}">${esc(series.title)}</a></p>`,
        index: false,
      })
    } else {
      const n = read(`series/${slug}/${e.id}/notes.json`)
      page({
        path,
        title: `${label(e)}: ${n.title} · ${series.title} | ${NAME}`,
        description: clip(n.summary),
        body:
          `<h1>${esc(n.title)}</h1><p>${esc(n.speaker)} · <a href="/${slug}">${esc(series.title)}</a> · ${esc(label(e))}</p>` +
          `<p>${esc(n.summary)}</p><h2>Topik utama</h2><ol>` +
          n.chapters.map((c) => `<li><strong>${esc(c.title)}</strong>: ${esc(c.summary)}</li>`).join('') +
          '</ol>',
      })
      entries.push({ path, lastmod: e.notesAddedAt?.slice(0, 10) })
    }
    pages++
  }
}

writeFileSync(
  join(dist, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map((u) => `  <url><loc>${SITE}${u.path === '/' ? '/' : u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n',
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

console.log(`prerendered ${pages} pages, ${entries.length} in sitemap.xml`)
