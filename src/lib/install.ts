import { useSyncExternalStore } from 'react'

/** The browser's "install this app" prompt. Chrome and Edge fire it once, early, so it is caught here when the app loads. */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

const standalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
// Safari on iPhone and iPad has no prompt: the visitor adds it from the Share menu.
const iosSafari = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)

export type InstallState = 'prompt' | 'ios' | 'none'
const snapshot = (): InstallState => (installed || standalone() ? 'none' : deferred ? 'prompt' : iosSafari() ? 'ios' : 'none')

export const useInstallState = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => void listeners.delete(cb)
    },
    snapshot,
    () => 'none' as InstallState,
  )

export async function promptInstall() {
  if (!deferred) return
  const p = deferred
  deferred = null // a prompt can be used once
  emit()
  await p.prompt()
  await p.userChoice.catch(() => {})
}
