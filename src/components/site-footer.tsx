import { ArrowUpRight, Github, Heart, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QURANSLIDE_URL, REPO_URL } from '@/config'
import { useT } from '@/lib/i18n'

export function SiteFooter() {
  const { t } = useT()
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <a
          href={QURANSLIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-4 rounded-xl border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Presentation className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight">{t('qs.title')}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('qs.body')}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t('qs.cta')} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </a>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Heart className="size-5 fill-primary text-primary" /> {t('footer.title')}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('footer.body')}</p>
          <p className="pt-2 text-xs text-muted-foreground">{t('footer.credit')}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0 self-start md:self-center">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Github /> {t('footer.source')}
          </a>
        </Button>
      </div>
    </footer>
  )
}
