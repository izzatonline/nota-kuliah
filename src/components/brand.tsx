import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** A dome under a crescent and star, in the theme's own colours so it follows light and dark. */
export function NKMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={cn('size-8 shrink-0', className)}>
      <rect width="64" height="64" rx="14" style={{ fill: 'hsl(var(--primary))' }} />
      <path d="M36 9A9 9 0 1 0 36 27A7 7 0 1 1 36 9Z" fill="#d9a441" />
      <path d="M43 13L44.2 16.8L48 18L44.2 19.2L43 23L41.8 19.2L38 18L41.8 16.8Z" fill="#d9a441" />
      <path d="M14 52V46A18 18 0 0 1 50 46V52Z" style={{ fill: 'hsl(var(--primary-foreground))' }} />
      <path d="M27 52V46A5 5 0 0 1 37 46V52Z" style={{ fill: 'hsl(var(--primary))' }} />
    </svg>
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
