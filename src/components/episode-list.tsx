import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Home, Search, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NKMark } from '@/components/brand'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import type { Episode, SeriesIndex } from '@/lib/types'

type Props = { index: SeriesIndex; activeId: string; onSelect: (id: string) => void }

export function EpisodeSidebar({ index, activeId, onSelect }: Props) {
  const { t } = useT()
  const { setOpenMobile } = useSidebar()
  const [q, setQ] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' })
  }, [activeId])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const match = (e: Episode) => !needle || e.title.toLowerCase().includes(needle) || String(e.number ?? 'prolog').includes(needle)
    const bySeason = new Map<number, Episode[]>()
    for (const e of [...index.episodes].reverse().filter(match)) bySeason.set(e.season, [...(bySeason.get(e.season) ?? []), e])
    return [...bySeason.entries()].sort((a, b) => b[0] - a[0])
  }, [index, q])

  const withNotes = index.episodes.filter((e) => e.hasNotes).length

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-4 p-3 group-data-[collapsible=icon]:p-2">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center" aria-label="Nota Kuliah">
          <NKMark />
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">Nota Kuliah</p>
            <p className="truncate text-xs text-muted-foreground">{t('brand.tagline')}</p>
          </div>
        </Link>
        <div className="space-y-3 group-data-[collapsible=icon]:hidden">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-sm font-medium leading-snug">{index.series.title}</p>
            <p className="text-xs text-muted-foreground">
              {index.series.speaker} · {t('sidebar.episodes', { n: index.episodes.length })} · {t('sidebar.withNotes', { n: withNotes })}
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sidebar.search')} className="h-9 bg-background pl-9" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent ref={listRef}>
        {groups.map(([season, eps]) => (
          <SidebarGroup key={season}>
            <SidebarGroupLabel className="uppercase tracking-[0.14em]">{t('sidebar.season', { n: season })}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {eps.map((e) => {
                  const active = e.id === activeId
                  const label = `${e.number ? t('ep', { n: e.number }) : t('sidebar.prolog')}: ${e.title}`
                  return (
                    <SidebarMenuItem key={e.id}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={label}
                        data-active={active}
                        onClick={() => {
                          onSelect(e.id)
                          setOpenMobile(false)
                        }}
                        className="h-auto items-start gap-3 py-2 group-data-[collapsible=icon]:!p-1"
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-md px-1 font-mono text-[11px] font-medium',
                            'group-data-[collapsible=icon]:mt-0',
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {e.number ?? 'P'}
                        </span>
                        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                          <span className={cn('line-clamp-2 whitespace-normal text-sm leading-snug', !e.hasNotes && !active && 'text-muted-foreground')}>{e.title}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs font-normal text-muted-foreground">
                            {e.duration ? fmt(e.duration) : ''}
                            {e.hasNotes && (
                              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                                <FileText className="size-3" /> {t('sidebar.notes')}
                              </span>
                            )}
                          </span>
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {!groups.length && <p className="px-4 text-sm text-muted-foreground">{t('sidebar.noMatch')}</p>}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t('sidebar.home')}>
              <Link to="/"><Home /><span>{t('sidebar.home')}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="flex items-center gap-1.5 px-2 pb-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <Heart className="size-3 fill-primary text-primary" /> {t('footer.title')}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
