import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, Landmark, Languages, Lightbulb, Library, ListOrdered, ScrollText, Search, Users, type LucideIcon } from 'lucide-react'
import { epPath } from '@/lib/data'
import { useT, type Key } from '@/lib/i18n'
import { KINDS, loadEntries, search, snippet, type Entry, type Kind } from '@/lib/search'
import { cn } from '@/lib/utils'

const ICONS: Record<Kind, LucideIcon> = { episode: BookOpen, topik: ListOrdered, dalil: ScrollText, kitab: Library, tokoh: Users, pengajaran: Lightbulb, istilah: Languages }
/** Which tab of the episode page a result opens. */
export const TAB_OF: Record<Exclude<Kind, 'episode'>, string> = { topik: 'topik', dalil: 'dalil', kitab: 'kitab', tokoh: 'tokoh', pengajaran: 'pengajaran', istilah: 'istilah' }

const Ctx = createContext<{ open: () => void }>({ open: () => {} })
export const useSearch = () => useContext(Ctx)

export const isMac = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)

/** The keyboard hint for the search shortcut, such as "⌘K" or "Ctrl K". */
export const shortcutLabel = () => (isMac() ? '⌘K' : 'Ctrl K')

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const value = useMemo(() => ({ open: () => setOpen(true) }), [])
  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchDialog open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  )
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [failed, setFailed] = useState(false)

  // The notes of every episode are fetched the first time the palette opens, not on page load.
  useEffect(() => {
    if (!open) return
    let live = true
    setFailed(false)
    loadEntries(lang).then((e) => live && setEntries(e)).catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [open, lang])
  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const results = useMemo(() => (entries ? search(entries, q) : []), [entries, q])
  const groups = KINDS.map((k) => [k, results.filter((r) => r.kind === k)] as const).filter(([, r]) => r.length)

  const go = useCallback(
    (e: Entry) => {
      onOpenChange(false)
      navigate(epPath(e.slug, e.epId), { state: e.itemId ? { focus: { tab: TAB_OF[e.kind as Exclude<Kind, 'episode'>], id: e.itemId } } : undefined })
    },
    [navigate, onOpenChange],
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:top-[15%]"
        >
          <Dialog.Title className="sr-only">{t('search.title')}</Dialog.Title>
          <Command shouldFilter={false} loop label={t('search.title')}>
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder={t('search.placeholder')}
                className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">Esc</kbd>
            </div>
            <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
              {!q.trim() && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('search.hint')}</p>}
              {q.trim() && !entries && !failed && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('loading')}</p>}
              {failed && <p className="px-3 py-8 text-center text-sm text-destructive">{t('search.failed')}</p>}
              {q.trim() && entries && !results.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('search.empty', { q: q.trim() })}</p>}
              {groups.map(([kind, items]) => (
                <Command.Group
                  key={kind}
                  heading={t(`search.kind.${kind}` as Key)}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items.map((e) => (
                    <Result key={e.key} e={e} q={q} onSelect={() => go(e)} />
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Result({ e, q, onSelect }: { e: Entry; q: string; onSelect: () => void }) {
  const { t } = useT()
  const Icon = ICONS[e.kind]
  const where = e.epNumber ? t('ep', { n: e.epNumber }) : t('sidebar.prolog')
  const sub = e.kind === 'episode' ? '' : snippet(e, q)
  return (
    <Command.Item
      value={e.key}
      onSelect={onSelect}
      className={cn('flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm', 'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground')}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{e.title}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground">{where}</span>
    </Command.Item>
  )
}
