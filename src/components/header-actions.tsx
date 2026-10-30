import { ExternalLink, MoreHorizontal, Moon, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeToggle, useTheme } from '@/components/theme'
import { shortcutLabel, useSearch } from '@/components/search-palette'
import { useT, type Lang } from '@/lib/i18n'

/** Header buttons. On small screens they collapse into one menu so the episode title keeps the room. */
export function HeaderActions({ watchUrl }: { watchUrl: string }) {
  const { t, lang, setLang } = useT()
  const { theme, toggle } = useTheme()
  const { open } = useSearch()
  return (
    <>
      <SearchButton onClick={open} label={t('search.button')} />
      <div className="hidden items-center gap-2 sm:flex">
        <LanguageSwitch />
        <Button asChild variant="outline" size="sm" className="shrink-0 max-lg:size-8 max-lg:p-0">
          <a href={watchUrl} target="_blank" rel="noreferrer" aria-label={t('header.watch')}>
            <ExternalLink />
            <span className="hidden lg:inline">{t('header.watch')}</span>
          </a>
        </Button>
        <ThemeToggle />
      </div>

      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9" aria-label={t('header.more')}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t('header.language')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <DropdownMenuRadioItem value="ms">Bahasa Melayu</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggle}>
              {theme === 'dark' ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
              {theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={watchUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 size-4" /> {t('header.watch')}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

/** Opens the search palette. The shortcut hint only shows where there is room for it. */
export function SearchButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label={label} className="shrink-0 gap-2 text-muted-foreground max-sm:size-8 max-sm:p-0">
      <Search />
      <span className="hidden lg:inline">{label}</span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">{shortcutLabel()}</kbd>
    </Button>
  )
}
