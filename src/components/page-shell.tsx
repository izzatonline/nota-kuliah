import type { ReactNode } from 'react'
import { BrandLink } from '@/components/brand'
import { LanguageSwitch } from '@/components/language-switch'
import { SearchButton } from '@/components/header-actions'
import { useSearch } from '@/components/search-palette'
import { SiteFooter } from '@/components/site-footer'
import { ThemeToggle } from '@/components/theme'
import { useT } from '@/lib/i18n'

/** The top bar and footer shared by the catalogue pages (the Doa page keeps its own copy of this). */
export function PageShell({ children, narrow = true }: { children: ReactNode; narrow?: boolean }) {
  const { t } = useT()
  const { open } = useSearch()
  return (
    <div className="min-h-dvh overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <BrandLink />
          <div className="flex-1" />
          <SearchButton onClick={open} label={t('search.button')} />
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className={narrow ? 'mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10' : 'mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10'}>{children}</main>
      <SiteFooter />
    </div>
  )
}
