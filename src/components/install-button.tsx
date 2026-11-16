import { useState } from 'react'
import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { promptInstall, useInstallState } from '@/lib/install'

/** "Tambah ke skrin utama": installs the app where the browser offers it, and explains the Share menu on iPhone. Hidden once installed. */
export function InstallButton() {
  const { t } = useT()
  const state = useInstallState()
  const [help, setHelp] = useState(false)
  if (state === 'none') return null
  return (
    <div className="space-y-2">
      <Button variant="outline" className="shrink-0 self-start" onClick={() => (state === 'prompt' ? void promptInstall() : setHelp((v) => !v))} aria-expanded={state === 'ios' ? help : undefined}>
        <Download /> {t('install.cta')}
      </Button>
      {state === 'ios' && help && (
        <p className="flex max-w-xs items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Share className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t('install.ios')}
        </p>
      )}
    </div>
  )
}
