import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/** A spinner with a hidden label, so screen readers still hear that something is loading. */
export function Spinner({ className }: { className?: string }) {
  const { t } = useT()
  return (
    <span role="status" className="inline-flex">
      <Loader2 className={cn('size-5 animate-spin text-muted-foreground motion-reduce:animate-none', className)} aria-hidden />
      <span className="sr-only">{t('loading')}</span>
    </span>
  )
}

/** Centred spinner for panels that load as a whole (timeline, search). */
export function PanelLoading({ className }: { className?: string }) {
  return (
    <div className={cn('grid place-items-center p-8', className)}>
      <Spinner className="size-6" />
    </div>
  )
}

/** Result-shaped rows for the search palette. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useT()
  return (
    <div role="status" className="space-y-2 p-1">
      <span className="sr-only">{t('loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-md px-3 py-2" aria-hidden>
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The notes area while an episode's notes are fetched: tab row, then summary lines and cards. */
export function NotesSkeleton() {
  const { t } = useT()
  return (
    <div role="status" className="space-y-5" aria-busy="true">
      <span className="sr-only">{t('loading')}</span>
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[96%]" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 rounded-xl border p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The whole series page before its episode list has arrived: sidebar, header, video and notes columns. */
export function PageSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-busy="true" className="flex h-dvh bg-background">
      <span className="sr-only">{t('loading')}</span>
      <aside className="hidden w-72 shrink-0 flex-col gap-3 border-r p-4 md:flex" aria-hidden>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="mt-2 space-y-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col" aria-hidden>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-48 max-w-[50%]" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="space-y-3 p-3 lg:border-r lg:p-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="space-y-4 p-3 lg:p-6">
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-1">
              {[20, 16, 14, 16, 18].map((w, i) => <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w * 4}px` }} />)}
            </div>
            <NotesSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
