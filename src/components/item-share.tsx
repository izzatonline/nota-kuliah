import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Copy, Link2, MessageCircle, Send, Share2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useT } from '@/lib/i18n'
import { copy, itemText, itemUrl, telegramUrl, whatsappUrl } from '@/lib/share'

export type ShareItem = { tab: string; id: string; t: number; title: string; line: string; /** Only for a dua: the Arabic goes into the message. */ arabic?: string | null }

/** Share one card (a lesson, an evidence, a dua or a person): a short excerpt plus a link that opens that card. */
export function ItemShare({ item }: { item: ShareItem }) {
  const { t } = useT()
  const { slug = '', epId = '' } = useParams()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const url = itemUrl(slug, epId, item.t, item.tab, item.id)
  const text = itemText(item, url, t('share.cta'))
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const doCopy = async (value: string) => {
    if (!(await copy(value))) return
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label={t('share.item')} title={t('share.item')}>
          {copied ? <Check className="size-3.5 text-primary" /> : <Share2 className="size-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canShare && (
          <>
            <DropdownMenuItem onSelect={() => void navigator.share({ title: item.title, text, url }).catch(() => {})}>
              <Smartphone className="mr-2 size-4" /> {t('share.device')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <a href={whatsappUrl(text)} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 size-4" /> WhatsApp</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={telegramUrl(url, text)} target="_blank" rel="noreferrer"><Send className="mr-2 size-4" /> Telegram</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void doCopy(text)}>
          <Copy className="mr-2 size-4" /> {t('share.copyText')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void doCopy(url)}>
          <Link2 className="mr-2 size-4" /> {t('share.copyLink')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
