import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TimeLink } from '@/components/time-link'
import { usePlayer } from '@/components/player-context'
import { useT } from '@/lib/i18n'
import type { MapNode } from '@/lib/types'

type Placed = { node: MapNode; x: number; y: number; w: number; level: 0 | 1 | 2; parent?: Placed }

const SLOT = 62
const H = 52
const X = { 0: 0, 1: 175, 2: 375 } as const
const W = { 0: 145, 1: 165, 2: 195 } as const
const WIDTH = X[2] + W[2]

function wrap(text: string, max: number) {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  if (lines.length <= 3) return lines
  return [lines[0], lines[1], lines.slice(2).join(' ').slice(0, max - 1) + '…']
}

export function MindMap({ root }: { root: MapNode }) {
  const { time } = usePlayer()
  const { t } = useT()
  const branches = root.children ?? []
  const [open, setOpen] = useState<Set<string>>(() => new Set([branches[0]?.id]))
  const [picked, setPicked] = useState<MapNode>(root)

  const sorted = useMemo(() => {
    const all: MapNode[] = [root]
    for (const b of branches) all.push(b, ...(b.children ?? []))
    return all.sort((a, b) => a.t - b.t)
  }, [root, branches])
  const activeId = sorted.findLast((n) => n.t <= time)?.id
  const activeBranch = branches.find((b) => b.id === activeId || b.children?.some((c) => c.id === activeId))?.id

  // Open the branch being discussed as the video moves on.
  useEffect(() => {
    if (activeBranch) setOpen((s) => (s.has(activeBranch) ? s : new Set(s).add(activeBranch)))
  }, [activeBranch])

  const { placed, height } = useMemo(() => {
    const placed: Placed[] = []
    let y = 0
    const rootP: Placed = { node: root, x: X[0], y: 0, w: W[0], level: 0 }
    for (const b of branches) {
      const kids = open.has(b.id) ? b.children ?? [] : []
      const slots = Math.max(1, kids.length)
      const bp: Placed = { node: b, x: X[1], y: y + (slots * SLOT) / 2, w: W[1], level: 1, parent: rootP }
      placed.push(bp)
      kids.forEach((k, i) => placed.push({ node: k, x: X[2], y: y + i * SLOT + SLOT / 2, w: W[2], level: 2, parent: bp }))
      y += slots * SLOT
    }
    rootP.y = y / 2
    return { placed: [rootP, ...placed], height: y }
  }, [root, branches, open])

  const select = (p: Placed) => {
    setPicked(p.node)
    if (p.level === 1)
      setOpen((s) => {
        const n = new Set(s)
        if (n.has(p.node.id)) n.delete(p.node.id)
        else n.add(p.node.id)
        return n
      })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('map.hint')}</p>
      <Card>
        <CardContent className="overflow-x-auto p-3">
          <svg viewBox={`-4 -4 ${WIDTH + 8} ${height + 8}`} className="block h-auto w-full min-w-[460px]" role="tree">
            {placed
              .filter((p) => p.parent)
              .map((p) => {
                const a = p.parent!
                const x1 = a.x + a.w
                const mx = (x1 + p.x) / 2
                return <path key={p.node.id} d={`M${x1},${a.y} C${mx},${a.y} ${mx},${p.y} ${p.x},${p.y}`} fill="none" stroke="hsl(var(--border))" strokeWidth={2} />
              })}
            {placed.map((p) => {
              const lines = wrap(p.node.label, p.level === 0 ? 17 : p.level === 1 ? 17 : 25)
              const isActive = p.node.id === activeId
              const isPicked = p.node.id === picked.id
              const hasKids = p.level === 1 && (p.node.children?.length ?? 0) > 0
              const fill = p.level === 0 ? 'hsl(var(--primary))' : isActive ? 'hsl(var(--gold-soft))' : p.level === 1 ? 'hsl(var(--secondary))' : 'hsl(var(--card))'
              const stroke = isPicked ? 'hsl(var(--gold))' : isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
              return (
                <g
                  key={p.node.id}
                  transform={`translate(${p.x},${p.y - H / 2})`}
                  className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[hsl(var(--ring))]"
                  tabIndex={0}
                  role="treeitem"
                  aria-label={p.node.label}
                  onClick={() => select(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      select(p)
                    }
                  }}
                >
                  <rect width={p.w} height={H} rx={12} fill={fill} stroke={stroke} strokeWidth={isPicked || isActive ? 2.5 : 1.5} />
                  {lines.map((l, i) => (
                    <text
                      key={i}
                      x={13}
                      y={H / 2 + (i - (lines.length - 1) / 2) * 15 + 4.5}
                      fontSize={12.5}
                      fontWeight={p.level < 2 ? 600 : 400}
                      fill={p.level === 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {l}
                    </text>
                  ))}
                  {hasKids && (
                    <text x={p.w - 14} y={H / 2 + 5} fontSize={18} fontWeight={700} textAnchor="middle" fill="hsl(var(--primary))" style={{ pointerEvents: 'none' }}>
                      {open.has(p.node.id) ? '−' : '+'}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{picked.label}</p>
            <TimeLink t={picked.t} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{picked.detail}</p>
        </CardContent>
      </Card>
    </div>
  )
}
