import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { useSaved } from '@/lib/saved'

/** Header link to the Simpanan page with how many cards are starred. */
export function SavedLink() {
  const { t } = useT()
  const n = useSaved().length
  const label = n ? `${t('nav.saved')} (${n})` : t('nav.saved')
  return (
    <Button asChild variant="ghost" size="sm" className="relative shrink-0 max-sm:size-8 max-sm:p-0">
      <Link to="/simpanan" aria-label={label} title={label}>
        <Star className={n ? 'fill-gold text-gold' : undefined} />
        <span className="hidden sm:inline">{t('nav.saved')}</span>
        {n > 0 && <span className="rounded-full bg-gold-soft px-1.5 font-mono text-[11px] font-medium text-gold max-sm:absolute max-sm:-right-1 max-sm:-top-1 max-sm:px-1 max-sm:text-[10px]">{n}</span>}
      </Link>
    </Button>
  )
}
