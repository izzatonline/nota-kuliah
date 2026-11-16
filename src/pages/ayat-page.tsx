import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Flame, Play, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { loadAyat } from '@/lib/ayat'
import { epPath, fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { fold } from '@/lib/tokoh'
import { cn } from '@/lib/utils'
import type { AyatEntry, AyatIndex, AyatMention, SurahEntry } from '@/lib/types'

function MentionRow({ m }: { m: AyatMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  return (
    <li>
      <Link
        to={`${epPath(m.slug, m.epId)}?t=${m.t}`}
        state={{ focus: { tab: 'dalil', id: `dalil:${m.id}` } }}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono text-xs font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Play className="size-3 fill-current" aria-hidden />
          {fmt(m.t)}
        </span>
        <span className="min-w-0 text-sm leading-relaxed">
          <span className="font-medium">{m.series} · {ep}</span>
          <span className="text-muted-foreground">: {m.epTitle}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{m.context}</span>
        </span>
      </Link>
    </li>
  )
}

function AyahCard({ a, s, id, open, onToggle }: { a: AyatEntry; s: SurahEntry; id?: string; open: boolean; onToggle: () => void }) {
  const { t } = useT()
  return (
    <Card id={id} className="scroll-mt-40 target:border-primary/60 target:shadow-[0_0_0_1px_hsl(var(--primary)/0.55)]">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">{s.name} {a.key}</span>
          <Badge variant="gold">{a.mentions.length === 1 ? t('ayat.mention1') : t('ayat.mentions', { n: a.mentions.length })}</Badge>
        </div>
        {a.arabic && (
          <p dir="rtl" lang="ar" className={cn('font-arabic text-right', a.arabic.length > 300 ? 'text-xl leading-[2.1] sm:text-2xl' : 'text-[1.7rem] leading-[2.1] sm:text-3xl sm:leading-[2.2]')}>
            {a.arabic}
          </p>
        )}
        <p className="text-[15px] leading-relaxed">{a.translation}</p>
        <button onClick={onToggle} aria-expanded={open} className="flex items-center gap-1.5 rounded text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t('ayat.mentioned', { n: a.mentions.length })}
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && <ul className="-mx-2 border-t pt-2">{a.mentions.map((m) => <MentionRow key={`${m.slug}/${m.epId}/${m.id}`} m={m} />)}</ul>}
      </CardContent>
    </Card>
  )
}

export function AyatPage() {
  const { t, lang } = useT()
  const { hash } = useLocation()
  const [index, setIndex] = useState<AyatIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('ayat.title')} · Nota Kuliah`
  }, [t])
  useEffect(() => {
    setFailed(false)
    loadAyat(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  // /ayat#17:15 opens at that verse, /ayat#s17 at that surah.
  useEffect(() => {
    if (!index || !hash) return
    const key = decodeURIComponent(hash.slice(1))
    setQ('')
    setOpenKey(key.startsWith('s') ? null : key)
    requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ block: 'start' }))
  }, [index, hash])

  const needle = fold(q)
  const surahs = useMemo(() => {
    if (!index) return []
    if (!needle) return index.surahs
    return index.surahs
      .map((s) => (fold(s.name).includes(needle) || String(s.n) === needle ? s : { ...s, ayahs: s.ayahs.filter((a) => a.key === needle || fold(a.translation).includes(needle)) }))
      .filter((s) => s.ayahs.length)
  }, [index, needle])
  const top = useMemo(
    () =>
      (index?.surahs ?? [])
        .flatMap((s) => s.ayahs.map((a) => ({ a, s })))
        .filter(({ a }) => a.mentions.length >= 2)
        .sort((x, y) => y.a.mentions.length - x.a.mentions.length || x.s.n - y.s.n || x.a.ayah - y.a.ayah)
        .slice(0, 6),
    [index],
  )
  const total = (index?.surahs ?? []).reduce((n, s) => n + s.ayahs.length, 0)

  return (
    <PageShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('ayat.title')}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{t('ayat.lede')}</p>
        {index && <p className="text-xs text-muted-foreground">{t('ayat.count', { v: total, s: index.surahs.length })}</p>}
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted-foreground">{t('ayat.none')}</p>
      ) : !index ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 mt-6 flex flex-col gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ayat.search')} aria-label={t('ayat.search')} className="h-9 pl-9" />
            </div>
            <select
              aria-label={t('ayat.jump')}
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                setQ('')
                requestAnimationFrame(() => document.getElementById(e.target.value)?.scrollIntoView({ block: 'start' }))
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
            >
              <option value="">{t('ayat.jump')}</option>
              {index.surahs.map((s) => (
                <option key={s.n} value={`s${s.n}`}>{s.n}. {s.name} ({s.ayahs.length})</option>
              ))}
            </select>
          </div>

          {!needle && top.length > 0 && (
            <section aria-labelledby="top" className="mt-8 space-y-3">
              <h2 id="top" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight"><Flame className="size-5 text-gold" aria-hidden /> {t('ayat.top')}</h2>
              <div className="space-y-2">
                {top.map(({ a, s }) => <AyahCard key={a.key} a={a} s={s} open={openKey === `top-${a.key}`} onToggle={() => setOpenKey(openKey === `top-${a.key}` ? null : `top-${a.key}`)} />)}
              </div>
            </section>
          )}

          {!surahs.length ? (
            <p className="py-16 text-center text-muted-foreground">{t('ayat.noMatch')}</p>
          ) : (
            <div className="mt-10 space-y-10">
              {surahs.map((s) => (
                <section key={s.n} id={`s${s.n}`} aria-labelledby={`h-s${s.n}`} className="scroll-mt-40 space-y-3">
                  <h2 id={`h-s${s.n}`} className="flex flex-wrap items-baseline justify-between gap-2 text-xl font-semibold tracking-tight">
                    <span>
                      {s.n}. {s.name} <span className="font-mono text-sm font-normal text-muted-foreground">{s.ayahs.length}</span>
                    </span>
                    {s.arabic && <span dir="rtl" lang="ar" className="font-arabic text-2xl font-normal">{s.arabic}</span>}
                  </h2>
                  <div className="space-y-2">
                    {s.ayahs.map((a) => <AyahCard key={a.key} a={a} s={s} id={a.key} open={openKey === a.key} onToggle={() => setOpenKey(openKey === a.key ? null : a.key)} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
