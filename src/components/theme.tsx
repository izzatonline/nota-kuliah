import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

type Theme = 'light' | 'dark'
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('nota-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('nota-theme', theme)
    } catch {}
  }, [theme])
  return <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

export function ThemeToggle() {
  const { theme, toggle } = useContext(Ctx)
  const { t } = useT()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('header.theme')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
