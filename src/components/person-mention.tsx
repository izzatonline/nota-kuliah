import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { epPath, fmt } from '@/lib/data'
import { useT } from '@/lib/i18n'
import type { PersonMention } from '@/lib/types'

/** One lecture's mention of a person: where it is, what the ustaz said, and a link to that moment. */
export function PersonMentionRow({ m }: { m: PersonMention }) {
  const { t } = useT()
  const ep = m.epNumber ? t('ep', { n: m.epNumber }) : t('sidebar.prolog')
  return (
    <li>
      <Link
        to={`${epPath(m.slug, m.epId)}?t=${m.person.t}`}
        state={{ focus: { tab: 'tokoh', id: `tokoh:${m.person.id}` } }}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono text-xs font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Play className="size-3 fill-current" aria-hidden />
          {fmt(m.person.t)}
        </span>
        <span className="min-w-0 text-sm leading-relaxed">
          <span className="font-medium">{m.series} · {ep}</span>
          <span className="text-muted-foreground">: {m.epTitle}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {m.person.role}. {m.person.context}
          </span>
        </span>
      </Link>
    </li>
  )
}
