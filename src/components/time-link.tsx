import { Play } from 'lucide-react'
import { fmt } from '@/lib/data'
import { usePlayer } from '@/components/player-context'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/** A timestamp that jumps the YouTube player to that moment. */
export function TimeLink({ t, className }: { t: number; className?: string }) {
  const { seek } = usePlayer()
  const { t: tr } = useT()
  return (
    <button
      type="button"
      onClick={() => seek(t)}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 font-mono text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground',
        className,
      )}
      aria-label={tr('playAt', { t: fmt(t) })}
    >
      <Play className="size-3 fill-current" />
      {fmt(t)}
    </button>
  )
}

/** Shining border for whatever the ustaz is talking about right now. */
export const NOW_RING = 'border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.55),0_0_16px_-3px_hsl(var(--primary)/0.5)]'

/** True while the video is within `span` seconds after `t`. */
export function useIsNow(t: number | null, span = 45) {
  const { time } = usePlayer()
  return t !== null && time >= t && time < t + span
}
