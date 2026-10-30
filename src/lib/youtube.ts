import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { youtubeUrl } from './data'

/* Minimal typing for the parts of the IFrame API we use. */
type YTPlayer = {
  getCurrentTime(): number
  seekTo(s: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
  destroy(): void
}
type YTNamespace = {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiReady: Promise<void> | null = null
function loadApi() {
  if (window.YT?.Player) return Promise.resolve()
  apiReady ??= new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiReady
}

/** Embeds the YouTube player and exposes the current time so notes can follow along. */
export function useYouTube(videoId: string, mount: RefObject<HTMLDivElement>) {
  const player = useRef<YTPlayer | null>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const host = mount.current
    if (!host) return
    const el = document.createElement('div')
    host.appendChild(el)
    setReady(false)
    setTime(0)
    setPlaying(false)

    loadApi().then(() => {
      if (cancelled || !window.YT) return
      player.current = new window.YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e: { data: number }) => !cancelled && setPlaying(e.data === 1),
        },
      })
      timer = window.setInterval(() => {
        const p = player.current
        if (p && typeof p.getCurrentTime === 'function') setTime(p.getCurrentTime())
      }, 400)
    })

    return () => {
      cancelled = true
      window.clearInterval(timer)
      player.current?.destroy?.()
      player.current = null
      el.remove()
    }
  }, [videoId, mount])

  const seek = useCallback(
    (t: number) => {
      const p = player.current
      if (p && ready) {
        p.seekTo(t, true)
        p.playVideo()
        setTime(t)
      } else {
        window.open(youtubeUrl(videoId, t), '_blank', 'noopener')
      }
    },
    [ready, videoId],
  )

  const toggle = useCallback(() => {
    const p = player.current
    if (!p || !ready) return
    if (p.getPlayerState() === 1) p.pauseVideo()
    else p.playVideo()
  }, [ready])

  return { time, playing, ready, seek, toggle }
}
