import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ExternalLink, ListOrdered, History, Landmark, Languages, Lightbulb, Library, Network, ScrollText, Users, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { HeaderActions } from '@/components/header-actions'
import { ScrollRow } from '@/components/scroll-tabs'
import { EpisodeSidebar } from '@/components/episode-list'
import { ChapterScroll, NowPlaying, Video } from '@/components/video-panel'
import { PlayerContext } from '@/components/player-context'
import { BooksTab, DalilTab, GlossaryTab, LessonsTab, Overview, PeopleTab, SirahTab, TopicsTab, nowTabs, type TabKey } from '@/components/notes-tabs'
import { MindMap } from '@/components/mindmap'
import { ShareMenu } from '@/components/share-menu'
import { epPath, fmt, loadIndex, loadNotes, startEpisode, youtubeUrl } from '@/lib/data'
import { getLast, getProgress, markVisited, saveTime } from '@/lib/progress'
import { useT, type Key } from '@/lib/i18n'
import { useYouTube } from '@/lib/youtube'
import type { Episode, Notes, SeriesIndex } from '@/lib/types'

const TABS: { key: TabKey; Icon: LucideIcon; count?: (n: Notes) => number }[] = [
  { key: 'topik', Icon: ListOrdered, count: (n) => n.chapters.length },
  { key: 'ringkasan', Icon: BookOpen },
  { key: 'dalil', Icon: ScrollText, count: (n) => n.dalil.length },
  { key: 'kitab', Icon: Library, count: (n) => n.books.filter((b) => !b.suggested).length },
  { key: 'tokoh', Icon: Users, count: (n) => n.people.length },
  { key: 'sirah', Icon: Landmark },
  { key: 'pengajaran', Icon: Lightbulb, count: (n) => n.lessons.length },
  { key: 'peta', Icon: Network },
  { key: 'istilah', Icon: Languages },
]

export function SeriesPage() {
  const { t } = useT()
  const { slug = '', epId } = useParams()
  const navigate = useNavigate()
  const [index, setIndex] = useState<SeriesIndex | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setIndex(null)
    setError(false)
    loadIndex(slug).then(setIndex).catch(() => setError(true))
  }, [slug])

  const select = useCallback((id: string) => navigate(epPath(slug, id)), [navigate, slug])

  if (error)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="space-y-4">
          <p className="text-muted-foreground">{t('notFound')}</p>
          <Button asChild><Link to="/">{t('backHome')}</Link></Button>
        </div>
      </div>
    )
  if (!index) return <p className="p-8 text-muted-foreground">{t('loading')}</p>

  const episode = index.episodes.find((e) => e.id === epId)
  if (!epId) {
    const last = getLast()
    const back = last && last.slug === slug ? index.episodes.find((e) => e.id === last.ep && e.hasNotes) : undefined
    return <Navigate to={epPath(slug, (back ?? startEpisode(index)).id)} replace />
  }
  if (!episode) return <Navigate to={`/${slug}`} replace />

  const epLabel = episode.number ? t('ep', { n: episode.number }) : t('sidebar.prolog')

  return (
    <SidebarProvider className="h-dvh min-h-0">
      <EpisodeSidebar index={index} activeId={episode.id} onSelect={select} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList className="flex-nowrap gap-1.5 whitespace-nowrap sm:gap-2">
              <BreadcrumbItem className="hidden xl:inline-flex">{index.series.title}</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden xl:block" />
              <BreadcrumbItem className="hidden xl:inline-flex">{t('sidebar.season', { n: episode.season })}</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden xl:block" />
              <BreadcrumbItem className="min-w-0 gap-2">
                <Badge variant="secondary" className="shrink-0 font-mono">{epLabel}</Badge>
                <BreadcrumbPage className="line-clamp-2 whitespace-normal text-sm leading-tight sm:line-clamp-1 sm:text-base">{episode.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <HeaderActions watchUrl={youtubeUrl(episode.youtubeId)} />
        </header>

        {episode.hasNotes ? <Lecture key={episode.id} slug={slug} episode={episode} series={index.series.title} /> : <NoNotes episode={episode} />}
      </SidebarInset>
    </SidebarProvider>
  )
}

function NoNotes({ episode }: { episode: Episode }) {
  const { t } = useT()
  return (
    <div className="grid flex-1 place-items-center p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">{episode.number ? t('episode', { n: episode.number }) : t('sidebar.prolog')}</p>
          <p className="text-lg font-semibold leading-snug">{episode.title}</p>
          <p className="text-sm text-muted-foreground">{t('noNotes.title')}</p>
          <Button asChild>
            <a href={youtubeUrl(episode.youtubeId)} target="_blank" rel="noreferrer">
              <ExternalLink /> {t('header.watch')}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Lecture({ slug, episode, series }: { slug: string; episode: Episode; series: string }) {
  const { t, lang } = useT()
  const epLabel = episode.number ? t('ep', { n: episode.number }) : t('sidebar.prolog')
  const [notes, setNotes] = useState<Notes | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabKey>('topik')
  const mount = useRef<HTMLDivElement>(null)
  const yt = useYouTube(episode.youtubeId, mount)

  // --- remembering where the visitor was ---
  const saved = useMemo(() => getProgress(slug, episode.id), [slug, episode.id])
  const [dismissed, setDismissed] = useState(false)
  const autoResume = Boolean((useLocation().state as { resume?: boolean } | null)?.resume)
  // A shared link such as /sirah-impak-sosial/ep42?t=230 opens at that moment and wins over the saved position.
  const sharedT = Math.max(0, Math.floor(Number(useSearchParams()[0].get('t')) || 0))
  const jumped = useRef(false)
  const resumed = useRef(false)
  const latest = useRef({ t: 0, playing: false })
  const lastSaved = useRef(0)
  latest.current = { t: yt.time, playing: yt.playing }

  useEffect(() => markVisited(slug, episode.id), [slug, episode.id])

  useEffect(() => {
    if (sharedT > 0 && yt.ready && !jumped.current) {
      jumped.current = true
      yt.seek(sharedT)
    } else if (!sharedT && autoResume && saved && yt.ready && !resumed.current) {
      resumed.current = true
      yt.seek(saved.t)
    }
  }, [sharedT, autoResume, saved, yt.ready, yt.seek])

  useEffect(() => {
    if (yt.playing && Math.abs(yt.time - lastSaved.current) >= 5) {
      saveTime(slug, episode.id, yt.time)
      lastSaved.current = yt.time
    }
  }, [yt.time, yt.playing, slug, episode.id])

  useEffect(() => {
    if (!yt.playing && latest.current.t > 5) saveTime(slug, episode.id, latest.current.t)
  }, [yt.playing, slug, episode.id])

  useEffect(() => {
    const onHide = () => latest.current.t > 5 && saveTime(slug, episode.id, latest.current.t)
    window.addEventListener('pagehide', onHide)
    return () => {
      onHide()
      window.removeEventListener('pagehide', onHide)
    }
  }, [slug, episode.id])

  useEffect(() => {
    loadNotes(slug, episode.id, lang).then(setNotes).catch((e) => setError(e.message))
  }, [slug, episode.id, lang])

  useEffect(() => {
    document.title = `${episode.title} · Nota Kuliah`
  }, [episode.title])

  // Tabs whose content the ustaz is discussing right now get a dot, so you know where to look.
  const live = useMemo(() => (notes ? nowTabs(notes, yt.time) : new Set<TabKey>()), [notes, yt.time])

  const gutter = 'px-3 @xl:px-5 @3xl:px-8'
  const bleed = '-mx-3 px-3 @xl:-mx-5 @xl:px-5 @3xl:-mx-8 @3xl:px-8'

  return (
    <PlayerContext.Provider value={{ time: yt.time, playing: yt.playing, seek: yt.seek }}>
      <div className="@container min-h-0 flex-1">
        <div className="flex h-full flex-col @3xl:grid @3xl:grid-cols-[clamp(280px,36%,420px)_minmax(0,1fr)]">
          {/* video column */}
          <div className="shrink-0 space-y-2 bg-background pb-2 @3xl:flex @3xl:min-h-0 @3xl:flex-col @3xl:gap-3 @3xl:space-y-0 @3xl:border-r @3xl:p-4 @3xl:pb-0">
            <Video mount={mount} />
            <div className="px-3 @3xl:px-0">{notes ? <NowPlaying notes={notes} /> : <Skeleton className="h-16 w-full rounded-xl" />}</div>
            <div className="hidden min-h-0 flex-1 @3xl:flex @3xl:flex-col">{notes && <ChapterScroll notes={notes} />}</div>
          </div>

          {/* notes column: title and tabs stay put, only the content scrolls */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className={`shrink-0 bg-background pt-3 @3xl:pt-5 ${gutter}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight @3xl:line-clamp-1 @3xl:text-2xl">{notes?.title ?? episode.title}</h1>
                  <p className="mb-3 hidden truncate text-sm text-muted-foreground @xl:block">
                    {notes?.speaker ?? 'Ustaz Azlan Shah NK'} · {series} · {epLabel}
                  </p>
                </div>
                {notes && <ShareMenu slug={slug} episodeId={episode.id} notes={notes} />}
              </div>
              <ScrollRow activeKey={tab} className={`mt-2 border-b ${bleed}`}>
                <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0">
                  {TABS.map(({ key, Icon, count }) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      // Radix focuses the tab from script on mouse down, which makes Chrome draw the keyboard focus ring
                      // after a mouse click when the last input was a key press. Mark pointer use so the ring only
                      // shows for keyboard navigation (the ring is kept for keyboard users).
                      onMouseDown={(e) => e.currentTarget.setAttribute('data-pointer', 'true')}
                      onKeyDown={(e) => e.currentTarget.removeAttribute('data-pointer')}
                      onBlur={(e) => e.currentTarget.removeAttribute('data-pointer')}
                      className="group gap-2 rounded-none data-[pointer=true]:focus-visible:ring-0 focus-visible:ring-inset focus-visible:ring-offset-0 border-b-2 border-transparent px-3 py-3 text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      <span className="relative">
                        <Icon className="size-4" />
                        {live.has(key) && tab !== key && <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-primary ring-2 ring-background" />}
                      </span>
                      {t(`tab.${key}` as Key)}
                      {count && notes && (
                        <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium tabular-nums text-muted-foreground group-data-[state=active]:bg-primary/10">
                          {count(notes)}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollRow>
            </div>

            <div className={`min-h-0 flex-1 overflow-y-auto py-4 @3xl:py-6 ${gutter}`}>
              {notes && saved && !sharedT && !dismissed && saved.t > 20 && saved.t < notes.duration - 30 && yt.time < saved.t - 15 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><History className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t('resume.title')}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmt(saved.t)} · {t('resume.section', { title: notes.chapters.findLast((c) => c.start <= saved.t)?.title ?? '' })}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => yt.seek(saved.t)}>{t('resume.from', { t: fmt(saved.t) })}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>{t('resume.restart')}</Button>
                </div>
              )}
              {lang === 'en' && notes && !notes.translated && <p className="mb-4 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2 text-xs text-gold">{t('enNotice')}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {!notes && !error && <Skeleton className="h-64 w-full rounded-xl" />}
              {notes && (
                <>
                  <TabsContent value="topik" className="mt-0"><TopicsTab notes={notes} /></TabsContent>
                  <TabsContent value="ringkasan" className="mt-0"><Overview notes={notes} go={setTab} /></TabsContent>
                  <TabsContent value="dalil" className="mt-0"><DalilTab notes={notes} /></TabsContent>
                  <TabsContent value="kitab" className="mt-0"><BooksTab notes={notes} /></TabsContent>
                  <TabsContent value="tokoh" className="mt-0"><PeopleTab notes={notes} /></TabsContent>
                  <TabsContent value="sirah" className="mt-0"><SirahTab notes={notes} /></TabsContent>
                  <TabsContent value="pengajaran" className="mt-0"><LessonsTab notes={notes} /></TabsContent>
                  <TabsContent value="peta" className="mt-0"><MindMap root={notes.mindmap} /></TabsContent>
                  <TabsContent value="istilah" className="mt-0"><GlossaryTab notes={notes} /></TabsContent>
                </>
              )}
              <p className="mt-10 border-t pt-4 text-xs leading-relaxed text-muted-foreground">{t('disclaimer')}</p>
            </div>
          </Tabs>
        </div>
      </div>
    </PlayerContext.Provider>
  )
}
