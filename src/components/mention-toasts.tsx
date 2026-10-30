import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useT, type Key } from '@/lib/i18n'
import type { Notes } from '@/lib/types'

export type MentionTab = 'dalil' | 'kitab' | 'tokoh'
export type Mention = { tab: MentionTab; id: string; label: string; t: number }

/** Everything in the notes that has a card to open, in lecture order. Suggested books were not said, so they are left out. */
export function mentionsOf(n: Notes): Mention[] {
  return [
    ...n.dalil.map((d) => ({ tab: 'dalil' as const, id: d.id, label: d.ref, t: d.t })),
    ...n.books.flatMap((b) => (!b.suggested && b.t !== null ? [{ tab: 'kitab' as const, id: b.id, label: b.title, t: b.t }] : [])),
    ...n.people.map((p) => ({ tab: 'tokoh' as const, id: p.id, label: p.name, t: p.t })),
  ].sort((a, b) => a.t - b.t)
}

/** Playback moves about 0.4 s per tick (a little more at 2x or in a throttled tab). A bigger jump is a seek. */
const MAX_STEP = 3

/**
 * Shows a toast when playback reaches a dalil, kitab or tokoh from the notes.
 * - each item is shown once per visit;
 * - nothing shows while paused, buffering or scrubbing, or after a seek (the clock restarts from where it landed);
 * - every item gets its own toast and they stack (the Toaster shows the newest three), so a burst of names is not missed.
 */
export function useMentionToasts(notes: Notes | null, time: number, playing: boolean, enabled: boolean, open: (m: Mention) => void) {
  const { t } = useT()
  const shown = useRef(new Set<string>())
  const prev = useRef(time)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    prev.current = time // resuming after a pause or scrub must not replay what was skipped
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const from = prev.current
    prev.current = time
    if (!notes || !enabled || !playing || time <= from || time - from > MAX_STEP) return
    for (const m of mentionsOf(notes)) {
      const key = `${m.tab}:${m.id}`
      if (m.t <= from || m.t > time || shown.current.has(key)) continue
      shown.current.add(key)
      toast(m.label, {
        description: t(`mention.${m.tab}` as Key),
        duration: 8000,
        action: { label: t('mention.view'), onClick: () => openRef.current(m) },
      })
    }
  }, [time]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) toast.dismiss()
  }, [enabled])
  useEffect(() => () => void toast.dismiss(), [])
}
