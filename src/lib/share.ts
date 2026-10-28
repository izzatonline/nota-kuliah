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
