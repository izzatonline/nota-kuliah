import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Link2, MessageCircle, Send, Share2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePlayer } from '@/components/player-context'
import { fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { copy, episodeUrl, shareText, telegramUrl, whatsappUrl } from '@/lib/share'
import type { Notes } from '@/lib/types'

/** Share the episode with family and friends: the link plus a short summary of the key points. */
export function ShareMenu({ slug, episodeId, notes }: { slug: string; episodeId: string; notes: Notes }) {
  const { t } = useT()
  const { time } = usePlayer()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const url = episodeUrl(slug, episodeId)
  const text = shareText(notes, url, { keyPoints: t('share.keyPoints'), cta: t('share.cta') })
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const atTime = time > 20 ? Math.floor(time) : 0

  const done = () => {
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }
  const doCopy = async (value: string) => (await copy(value)) && done()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
          {copied ? <Check className="text-primary" /> : <Share2 />}
          <span className="hidden sm:inline">{copied ? t('share.copied') : t('share.label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {canShare && (
          <>
            <DropdownMenuItem onSelect={() => void navigator.share({ title: notes.title, text, url }).catch(() => {})}>
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
          <Copy className="mr-2 size-4" /> {t('share.copySummary')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void doCopy(url)}>
          <Link2 className="mr-2 size-4" /> {t('share.copyLink')}
        </DropdownMenuItem>
        {atTime > 0 && (
          <DropdownMenuItem onSelect={() => void doCopy(episodeUrl(slug, episodeId, atTime))}>
            <Link2 className="mr-2 size-4" /> {t('share.copyLinkAt', { t: fmt(atTime) })}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
