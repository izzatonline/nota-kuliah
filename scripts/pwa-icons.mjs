// Draws the app icons (public/icons/*.png) from public/favicon.svg. Run once with `node scripts/pwa-icons.mjs` and commit the PNGs.
// "maskable" has the artwork inside the safe zone on a solid background, so Android can crop it to a circle or a squircle.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8')
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const out = join(root, 'public/icons')
mkdirSync(out, { recursive: true })

const draw = (svgText, size, file) => writeFileSync(join(out, file), new Resvg(svgText, { fitTo: { mode: 'width', value: size } }).render().asPng())
for (const [size, file] of [[192, 'icon-192.png'], [512, 'icon-512.png']]) draw(svg, size, file)
const solid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#134e3a"/><g transform="translate(76.8 76.8) scale(5.6)">${inner}</g></svg>`
// iOS rounds the corners itself and shows transparent ones as black, so its icon is the solid one too.
draw(solid, 512, 'icon-maskable-512.png')
draw(solid, 180, 'apple-touch-icon.png')
console.log('wrote icons to public/icons')
