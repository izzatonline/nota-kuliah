import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT, type Lang } from '@/lib/i18n'

const OPTIONS: Lang[] = ['ms', 'en']

export function LanguageSwitch() {
  const { lang, setLang, t } = useT()
  return (
    <div role="group" aria-label={t('header.language')} className="inline-flex items-center gap-1 rounded-lg border bg-card p-0.5 text-xs font-medium">
      <Globe className="ml-1.5 hidden size-3.5 text-muted-foreground sm:block" />
      {OPTIONS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn('rounded-md px-2 py-1 transition-colors', lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
