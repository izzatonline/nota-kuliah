import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Horizontally scrollable row that fades out on whichever edge has more to reveal. */
export function ScrollRow({ children, className, activeKey }: { children: ReactNode; className?: string; activeKey?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  // Keep the selected tab visible when it changes.
  useEffect(() => {
    ref.current?.querySelector('[data-state="active"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [activeKey])

  const mask = `linear-gradient(to right, ${edge.left ? 'transparent, black 28px' : 'black, black'}, ${edge.right ? 'black calc(100% - 36px), transparent' : 'black, black'})`
  return (
    <div
      ref={ref}
      className={cn('overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  )
}
