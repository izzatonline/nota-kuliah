import { GripVertical } from 'lucide-react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useT } from '@/lib/i18n'

const MIN = 280 // narrowest video column
const MIN_NOTES = 380 // room the notes column always keeps
export const DEFAULT_WIDTH = 'clamp(280px,36%,420px)'

/**
 * A draggable divider on the right edge of the video column (desktop only). The column is the parent element and
 * `grid` is the layout it sits in, which gives the room to share. Double-click resets the width.
 */
export function ColumnResizer({ grid, onChange }: { grid: React.RefObject<HTMLElement>; onChange: (px: number | null) => void }) {
  const { t } = useT()
  const dragging = useRef(false)
  const max = () => Math.max(MIN, (grid.current?.clientWidth ?? 0) - MIN_NOTES)
  const clamp = (px: number) => Math.round(Math.min(max(), Math.max(MIN, px)))

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current && grid.current) onChange(clamp(e.clientX - grid.current.getBoundingClientRect().left))
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const now = e.currentTarget.parentElement?.offsetWidth ?? MIN
    const step = e.shiftKey ? 96 : 24
    if (e.key === 'ArrowLeft') onChange(clamp(now - step))
    else if (e.key === 'ArrowRight') onChange(clamp(now + step))
    else if (e.key === 'Home' || e.key === 'Escape') onChange(null)
    else return
    e.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('resizeVideo')}
      title={t('resizeVideo')}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId) // keeps the drag alive over the YouTube iframe
      }}
      onPointerMove={move}
      onPointerUp={(e) => {
        dragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onDoubleClick={() => onChange(null)}
      onKeyDown={key}
      className="group absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize touch-none select-none outline-none @3xl:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:w-0.5 group-hover:bg-primary/60 group-focus-visible:w-0.5 group-focus-visible:bg-primary group-active:w-0.5 group-active:bg-primary" />
      {/* the grip is always visible so it is clear the line can be dragged */}
      <span className="absolute left-1/2 top-1/2 grid h-10 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors group-hover:border-primary/60 group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground group-active:bg-primary group-active:text-primary-foreground">
        <GripVertical className="size-3.5" />
      </span>
    </div>
  )
}
