import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { loadAllSeries } from '@/lib/data'
import type { SeriesIndex } from '@/lib/types'

/** The series name in the breadcrumb. With more than one series it opens a menu to switch to another. */
export function SeriesSwitch({ current }: { current: SeriesIndex['series'] }) {
  const navigate = useNavigate()
  const [all, setAll] = useState<SeriesIndex[]>([])
  useEffect(() => {
    loadAllSeries().then(setAll).catch(() => {})
  }, [])
  if (all.length < 2) return <>{current.title}</>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent">
        {current.title}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {all.map((s) => (
          <DropdownMenuItem key={s.series.slug} onSelect={() => s.series.slug !== current.slug && navigate(`/${s.series.slug}`)} className="gap-2">
            <Check className={s.series.slug === current.slug ? 'size-4' : 'size-4 opacity-0'} />
            {s.series.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
