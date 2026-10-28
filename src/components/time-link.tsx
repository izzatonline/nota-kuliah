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

/** True while the video is within `span` seconds after `t`. */
export function useIsNow(t: number | null, span = 45) {
  const { time } = usePlayer()
  return t !== null && time >= t && time < t + span
}
