// Runs after `vite build`. The app is a single-page app, so every URL would otherwise serve one empty shell.
// This writes a real HTML file per page (landing, series, episode) with its own title, description, canonical
// and Open Graph tags, plus the summary and topic list as plain text, then writes sitemap.xml and robots.txt.
// React replaces the plain text when it mounts. Pages Cloudflare serves a file first and only falls back to
// /index.html (see public/_redirects) when no file matches.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ogImage } from './og-image.mjs'

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

/** ISO 8601 duration, such as PT1H4M52S, for structured data. */
const isoDuration = (sec) => {
  const s = Math.max(0, Math.round(sec))
  return `PT${s >= 3600 ? Math.floor(s / 3600) + 'H' : ''}${Math.floor((s % 3600) / 60)}M${s % 60}S`
}
const ORG = { '@type': 'Organization', name: NAME, url: SITE + '/' }
const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
})

/** Draws dist/og/<name>.png, the share image for one page, and returns the path to put in og:image. */
let ogCount = 0
async function og(name, spec) {
  const file = join(dist, 'og', `${name}.png`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, await ogImage(spec))
  ogCount++
  return `/og/${name}.png`
}

function page({ path, title, description, body, index = true, jsonLd = [], image = '/og.jpg' }) {
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
    `<meta property="og:image" content="${SITE}${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    image === '/og.jpg' ? `<meta property="og:image:alt" content="${esc(NAME)}: nota sirah Nabi Muhammad SAW, Ustaz Azlan Shah NK" />` : `<meta property="og:image:alt" content="${esc(title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE}${image}" />`,
    // "<" is escaped so that text from the notes can never close the script tag.
    ...jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`),
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

const seriesSlugs = read('series/index.json').series
const all = seriesSlugs.map((slug) => ({ slug, ...read(`series/${slug}/index.json`) }))
// Searchers look for the series and the speaker by name, so the landing page says both.
const featured = all.map((s) => `${s.series.title} oleh ${s.series.speaker}`).join(', ')
const landingDescription = `Nota ${featured} di sebelah video YouTube: topik berserta masa, dalil, rujukan dan pengajaran. Percuma, sumber terbuka, dalam Bahasa Melayu dan English.`

page({
  path: '/',
  title: `${NAME}: nota ${all.map((s) => `${s.series.title} ${s.series.speaker}`).join(', ')} dengan masa dan dalil`,
  description: landingDescription,
  body:
    `<h1>${NAME}</h1><p>${esc(landingDescription)}</p><ul>` +
    all.map((s) => `<li><a href="/${s.slug}">${esc(s.series.title)}</a> · ${esc(s.series.speaker)}</li>`).join('') +
    '</ul>',
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/', inLanguage: ['ms', 'en'], description: landingDescription, publisher: ORG }],
})
entries.push({ path: '/' })

// The Doa page: every dua from the lectures, with its text and reference, from the index scripts/search-index.mjs built.
const doa = read('search/doa.ms.json')
const doaDescription = `Himpunan doa yang disebut dalam kuliah ${all.map((s) => s.series.title).join(' dan ')}: teks Arab, terjemahan, rujukan ayat atau hadis, dan masa ia disebut.`
const doaImage = await og('doa', { kicker: NAME, title: 'Himpunan doa daripada kuliah', foot: all[0].series.speaker })
page({
  image: doaImage,
  path: '/doa',
  title: `Himpunan doa daripada kuliah ${all[0].series.speaker} | ${NAME}`,
  description: clip(doaDescription),
  body:
    `<h1>Himpunan doa daripada kuliah</h1><p>${esc(doaDescription)}</p>` +
    doa.topics
      .map(
        (tp) =>
          `<h2>${esc(tp.title)}</h2>` +
          tp.duas
            .map((d) => {
              const m = d.mentions.find((x) => x.dalil.arabic) ?? d.mentions[0]
              return `<h3 id="${esc(d.key)}">${esc(d.title)}</h3>${m.dalil.arabic ? `<p dir="rtl" lang="ar">${esc(m.dalil.arabic)}</p>` : ''}<p>${esc(m.dalil.translation)} (${esc(m.dalil.ref)})</p>`
            })
            .join(''),
      )
      .join(''),
  jsonLd: [crumbs([[NAME, '/'], ['Doa', '/doa']])],
})
entries.push({ path: '/doa' })

// The Tokoh pages: everyone the ustaz talks about, and one page per person. A person with a single mention gets
// noindex and no sitemap entry, so the sitemap is not full of thin pages.
const tokoh = read('search/tokoh.ms.json')
const epLabel = (m) => (m.epNumber ? `Ep ${m.epNumber}` : 'Prolog')
const mentionLi = (m) =>
  `<li><a href="/${m.slug}/${m.epId}?t=${m.person.t}">${esc(m.series)} · ${esc(epLabel(m))}: ${esc(m.epTitle)}</a>. ${esc(m.person.role)}. ${esc(m.person.context)}</li>`
const tokohDescription = `Semua tokoh yang disebut dalam kuliah ${all.map((s) => s.series.title).join(' dan ')}: para nabi, keluarga Nabi SAW, sahabat, ulama dan lain-lain, dengan setiap kuliah dan masa mereka disebut.`
const tokohImage = await og('tokoh', { kicker: NAME, title: 'Tokoh dalam kuliah', foot: all[0].series.speaker })
page({
  image: tokohImage,
  path: '/tokoh',
  title: `Tokoh dalam kuliah ${all[0].series.speaker} | ${NAME}`,
  description: clip(tokohDescription),
  body:
    `<h1>Tokoh dalam kuliah</h1><p>${esc(tokohDescription)}</p>` +
    tokoh.groups
      .map((g) => `<h2>${esc(g.title)}</h2><ul>${g.people.map((p) => `<li><a href="/tokoh/${esc(p.key)}">${esc(p.title)}</a> (${p.mentions.length})</li>`).join('')}</ul>`)
      .join(''),
  jsonLd: [crumbs([[NAME, '/'], ['Tokoh', '/tokoh']])],
})
entries.push({ path: '/tokoh' })
// The Kitab page: every book the ustaz mentions, and a separate list of books the notes only suggest.
const kitab = read('search/kitab.ms.json')
const kitabDescription = `Semua kitab, buku, dokumentari dan rujukan yang disebut dalam kuliah ${all.map((s) => s.series.title).join(' dan ')}, dengan setiap kuliah dan masa ia disebut.`
const bookLi = (b) => `<li id="${esc(b.key)}">${esc(b.title)}${b.author ? ` (${esc(b.author)})` : ''}: ${b.mentions.length}</li>`
const kitabImage = await og('kitab', { kicker: NAME, title: 'Kitab dan buku yang disebut dalam kuliah', foot: all[0].series.speaker })
page({
  image: kitabImage,
  path: '/kitab',
  title: `Kitab dan buku yang disebut dalam kuliah ${all[0].series.speaker} | ${NAME}`,
  description: clip(kitabDescription),
  body:
    `<h1>Kitab dan buku yang disebut dalam kuliah</h1><p>${esc(kitabDescription)}</p>` +
    kitab.groups.map((g) => `<h2>${esc(g.title)}</h2><ul>${g.books.map(bookLi).join('')}</ul>`).join('') +
    (kitab.further.length ? `<h2>Bacaan tambahan (bukan daripada kuliah)</h2><ul>${kitab.further.flatMap((g) => g.books.map(bookLi)).join('')}</ul>` : ''),
  jsonLd: [crumbs([[NAME, '/'], ['Kitab', '/kitab']])],
})
entries.push({ path: '/kitab' })
let pages = 4
for (const g of tokoh.groups)
  for (const p of g.people) {
    const path = `/tokoh/${p.key}`
    const many = p.mentions.length > 1
    const image = many ? await og(`tokoh/${p.key}`, { kicker: `${g.title} · ${p.mentions.length} sebutan`, title: p.title, foot: all[0].series.speaker }) : '/og.jpg'
    page({
      image,
      path,
      title: `${p.title}: disebut dalam kuliah ${all[0].series.speaker} | ${NAME}`,
      description: clip(`${p.title} (${g.title}) disebut ${p.mentions.length} kali dalam kuliah. ${p.mentions[0].person.context}`),
      index: many,
      body: `<h1>${esc(p.title)}</h1><p>${esc(g.title)}</p><ul>${p.mentions.map(mentionLi).join('')}</ul>`,
      jsonLd: [crumbs([[NAME, '/'], ['Tokoh', '/tokoh'], [p.title, path]])],
    })
    if (many) entries.push({ path })
    pages++
  }
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
    jsonLd: [crumbs([[NAME, '/'], [series.title, `/${slug}`]])],
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
      const image = await og(`${slug}/${e.id}`, { kicker: `${series.title} · ${label(e)}`, title: n.title, foot: series.speaker })
      page({
        image,
        path,
        title: `${label(e)}: ${n.title} · ${series.title} | ${NAME}`,
        description: clip(n.summary),
        body:
          `<h1>${esc(n.title)}</h1><p>${esc(n.speaker)} · <a href="/${slug}">${esc(series.title)}</a> · ${esc(label(e))}</p>` +
          `<p>${esc(n.summary)}</p><h2>Topik utama</h2><ol>` +
          n.chapters.map((c) => `<li><strong>${esc(c.title)}</strong>: ${esc(c.summary)}</li>`).join('') +
          '</ol>',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: n.title,
            description: clip(n.summary, 300),
            url: SITE + path,
            inLanguage: 'ms',
            ...(e.notesAddedAt && { dateModified: e.notesAddedAt.slice(0, 10) }),
            author: ORG,
            publisher: ORG,
            // The notes are ours; the lecture they summarise is the speaker's and stays on YouTube.
            isBasedOn: {
              '@type': 'VideoObject',
              name: n.title,
              url: `https://www.youtube.com/watch?v=${e.youtubeId}`,
              embedUrl: `https://www.youtube.com/embed/${e.youtubeId}`,
              thumbnailUrl: `https://i.ytimg.com/vi/${e.youtubeId}/hqdefault.jpg`,
              ...(e.duration && { duration: isoDuration(e.duration) }),
              creator: { '@type': 'Person', name: n.speaker },
            },
          },
          crumbs([[NAME, '/'], [series.title, `/${slug}`], [`${label(e)}: ${n.title}`, path]]),
        ],
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

console.log(`prerendered ${pages} pages, ${entries.length} in sitemap.xml, ${ogCount} share images`)
