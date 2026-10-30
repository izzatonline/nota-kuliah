import { createElement, useRef, useState, type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Text that is cut off (truncate or line-clamp) and shows in full in a tooltip on hover or focus. The tooltip only
 * opens when the text really is clipped, so short titles do not get one. `text` is the full string; `className`
 * carries the clamping classes. Touch screens have no hover, so there the full title is on the page itself.
 */
export function Clamp({ as = 'span', text, className, children }: { as?: 'span' | 'p' | 'h1'; text: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const clipped = () => {
    const el = ref.current
    return !!el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  }
  return (
    <Tooltip open={open} onOpenChange={(o) => setOpen(o && clipped())}>
      <TooltipTrigger asChild>{createElement(as, { ref, className }, children ?? text)}</TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs whitespace-normal text-balance leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
