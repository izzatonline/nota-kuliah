import { Star } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { isSaved, toggleSaved, useSaved, type SavedKind } from '@/lib/saved'
import { cn } from '@/lib/utils'

/** Stars one card (a lesson, an evidence or a person) so it shows on the Simpanan page. Kept in this browser only. */
export function SaveButton({ kind, id, slug: slugProp, epId: epProp }: { kind: SavedKind; id: string; slug?: string; epId?: string }) {
  const { t } = useT()
  const params = useParams()
  const slug = slugProp ?? params.slug ?? ''
  const epId = epProp ?? params.epId ?? ''
  const saved = isSaved(useSaved(), { kind, slug, epId, id })
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground"
      aria-pressed={saved}
      aria-label={saved ? t('saved.remove') : t('saved.add')}
      title={saved ? t('saved.remove') : t('saved.add')}
      onClick={() => toggleSaved({ kind, slug, epId, id })}
    >
      <Star className={cn('size-3.5', saved && 'fill-gold text-gold')} />
    </Button>
  )
}
