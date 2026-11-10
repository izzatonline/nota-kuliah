import type { Notes } from './types'

export const episodeUrl = (slug: string, epId: string, t?: number) =>
  `${window.location.origin}/${slug}/${epId}${t && t > 0 ? `?t=${Math.floor(t)}` : ''}`

/** A short message that reads well in WhatsApp or Telegram: title, key points, link. */
export function shareText(notes: Notes, url: string, labels: { keyPoints: string; cta: string }, points = 3) {
  const label = notes.episode > 0 ? `Ep ${notes.episode}` : 'Prolog'
  const head = `${notes.title}\n${notes.speaker} · ${notes.series} · ${label}`
  const body = notes.keyPoints.slice(0, points).map((p) => `• ${p}`).join('\n')
  return `${head}\n\n${labels.keyPoints}:\n${body}\n\n${labels.cta}:\n${url}`
}

/** A link to one card in an episode, such as /sirah-impak-sosial/ep23?t=1483&i=tokoh:p4. The page opens the tab, scrolls to the card and drops `i`. */
export const itemUrl = (slug: string, epId: string, t: number, tab: string, id: string) =>
  `${window.location.origin}/${slug}/${epId}?t=${Math.floor(t)}&i=${encodeURIComponent(`${tab}:${id}`)}`

const clip = (s: string, n: number) => {
  const x = s.replace(/\s+/g, ' ').trim()
  return x.length <= n ? x : x.slice(0, n).replace(/\s+\S*$/, '') + '…'
}

/** A short excerpt of one card for WhatsApp or Telegram: title, one line, the Arabic for a dua, then the link. */
export function itemText(item: { title: string; line: string; arabic?: string | null }, url: string, cta: string) {
  const parts = [item.title, clip(item.line, 220)]
  if (item.arabic) parts.push(clip(item.arabic, 260))
  return `${parts.filter(Boolean).join('\n\n')}\n\n${cta}:\n${url}`
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
export const telegramUrl = (url: string, text: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

/** Copies text. Falls back to a hidden text box when the Clipboard API is unavailable or blocked. */
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(box)
    box.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      box.remove()
    }
  }
}
