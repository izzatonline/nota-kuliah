import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function NKMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-[13px] font-bold leading-none tracking-tight text-primary-foreground', className)}
    >
      NK
    </div>
  )
}

export function BrandLink({ tagline, className }: { tagline?: string; className?: string }) {
  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
      <NKMark />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight">Nota Kuliah</span>
        {tagline && <span className="block truncate text-xs text-muted-foreground">{tagline}</span>}
      </span>
    </Link>
  )
}
