import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { epPath, loadNotes } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { loadQuiz } from '@/lib/quiz'
import { episodeUrl } from '@/lib/share'
import type { Notes, Question, Quiz } from '@/lib/types'

const LETTERS = 'ABCDEFGH'
const MAX_DALIL = 8
const QUESTIONS = 5

/** The QR code as an inline SVG, drawn in the browser so the handout needs no image file. */
function Qr({ url }: { url: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(url)
    q.make()
    return q.createSvgTag({ scalable: true, margin: 0 })
  }, [url])
  return <div className="size-24 shrink-0 text-black [&_svg]:size-full" role="img" aria-label={url} dangerouslySetInnerHTML={{ __html: svg }} />
}

type Printable = Extract<Question, { type: 'mcq' | 'tf' | 'multi' }>

/** Up to five questions that print well (choose-one, true/false, choose-all), spread across the whole quiz. */
function pickQuestions(quiz: Quiz | null): Printable[] {
  const ok = (quiz?.questions ?? []).filter((q): q is Printable => q.type === 'mcq' || q.type === 'tf' || q.type === 'multi')
  if (ok.length <= QUESTIONS) return ok
  return Array.from({ length: QUESTIONS }, (_, i) => ok[Math.floor((i * ok.length) / QUESTIONS)])
}

export function HandoutPage() {
  const { t, lang } = useT()
  const { slug = '', epId = '' } = useParams()
  const [notes, setNotes] = useState<Notes | null | undefined>()
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    setNotes(undefined)
    loadNotes(slug, epId, lang).then(setNotes).catch(() => setNotes(null))
    loadQuiz(slug, epId, lang).then(setQuiz).catch(() => setQuiz(null))
  }, [slug, epId, lang])
  useEffect(() => {
    if (notes) document.title = `${t('handout.title')}: ${notes.title}`
  }, [notes, t])

  const qs = pickQuestions(quiz)
  const dalil = (notes?.dalil ?? []).slice(0, MAX_DALIL)
  const url = episodeUrl(slug, epId)
  const answer = (q: Printable) => (q.type === 'tf' ? (q.answer ? t('handout.true') : t('handout.false')) : q.type === 'mcq' ? LETTERS[q.answer] : q.answer.map((i) => LETTERS[i]).join(', '))
  const opts = (q: Printable) => (q.type === 'tf' ? [t('handout.true'), t('handout.false')] : q.options)

  return (
    <div className="min-h-dvh bg-muted/40 print:bg-white">
      <style>{'@page { size: A4; margin: 14mm } @media print { html, body { background: #fff !important } }'}</style>
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-2 px-4 py-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={epPath(slug, epId)}><ArrowLeft /> {t('handout.back')}</Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!notes}>
          <Printer /> {t('handout.print')}
        </Button>
      </div>

      <main className="mx-auto max-w-[210mm] bg-white p-6 text-[13px] leading-relaxed text-black shadow-sm sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        {notes === undefined ? (
          <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : notes === null ? (
          <p className="py-16 text-center">{t('handout.none')}</p>
        ) : (
          <>
            <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nota Kuliah · {t('handout.title')}</p>
                <h1 className="text-2xl font-bold leading-tight">{notes.title}</h1>
                <p>{notes.speaker} · {notes.series} · {notes.episode > 0 ? t('ep', { n: notes.episode }) : t('sidebar.prolog')}</p>
                <p className="break-all text-[11px]">{url}</p>
              </div>
              <Qr url={url} />
            </header>

            <section className="mt-5 break-inside-avoid">
              <h2 className="mb-1.5 text-base font-bold">{t('handout.keyPoints')}</h2>
              <ul className="list-disc space-y-1 pl-5">{notes.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </section>

            {notes.lessons.length > 0 && (
              <section className="mt-5">
                <h2 className="mb-1.5 text-base font-bold">{t('handout.lessons')}</h2>
                <ol className="space-y-2 pl-5">
                  {notes.lessons.map((l) => (
                    <li key={l.id} className="break-inside-avoid list-decimal">
                      <span className="font-semibold">{l.title}.</span> {l.body}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {dalil.length > 0 && (
              <section className="mt-5">
                <h2 className="mb-1.5 text-base font-bold">{t('handout.dalil')}</h2>
                <div className="space-y-3">
                  {dalil.map((d) => (
                    <div key={d.id} className="break-inside-avoid border-l-2 border-black pl-3">
                      <p className="font-semibold">{d.ref}</p>
                      {d.arabic && <p dir="rtl" lang="ar" className="font-arabic text-right text-xl leading-[2]">{d.arabic}</p>}
                      <p>{d.translation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {qs.length > 0 && (
              <section className="mt-5">
                <h2 className="mb-1.5 text-base font-bold">{t('handout.quiz')}</h2>
                <ol className="space-y-3">
                  {qs.map((q, i) => (
                    <li key={q.id} className="break-inside-avoid">
                      <p className="font-medium">{i + 1}. {q.q}{q.type === 'multi' && <span className="font-normal"> ({t('handout.multi')})</span>}</p>
                      <ul className="mt-0.5 space-y-0.5 pl-5">
                        {opts(q).map((o, j) => <li key={j}>{q.type === 'tf' ? '○' : LETTERS[j] + '.'} {o}</li>)}
                      </ul>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 break-inside-avoid border-t-2 border-dashed border-black pt-2">
                  <h3 className="font-bold">{t('handout.answers')}</h3>
                  <p>{qs.map((q, i) => `${i + 1}. ${answer(q)}`).join('   ')}</p>
                </div>
              </section>
            )}

            <footer className="mt-6 border-t pt-2 text-[11px]">{t('handout.foot')}</footer>
          </>
        )}
      </main>
    </div>
  )
}
