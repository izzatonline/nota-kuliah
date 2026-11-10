import { useEffect, useState } from 'react'

/** True unless the visitor asked for reduced motion. Decorative effects that are not just CSS check this first. */
export function useMotion() {
  const [ok, setOk] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setOk(!mql.matches)
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])
  return ok
}

/** Eight small sparks around a point, for a right answer. */
export function Burst() {
  const motion = useMotion()
  if (!motion) return null
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="nk-spark absolute size-1.5 rounded-full bg-gold" style={{ ['--a' as string]: `${i * 45}deg` }} />
      ))}
    </span>
  )
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--gold))', 'hsl(var(--primary) / 0.55)', 'hsl(var(--gold) / 0.6)']

/** Paper falling over the whole screen. Pieces are fixed for a given count, so a re-render does not restart them. */
export function Confetti({ pieces = 60, seconds = 3.2 }: { pieces?: number; seconds?: number }) {
  const motion = useMotion()
  const [done, setDone] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setDone(true), (seconds + 1.5) * 1000)
    return () => window.clearTimeout(id)
  }, [seconds])
  const [items] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      d: seconds * (0.7 + Math.random() * 0.6),
      delay: Math.random() * 0.8,
      x: (Math.random() - 0.5) * 160,
      r: (Math.random() - 0.5) * 900,
      w: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
    })),
  )
  if (!motion || done) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {items.map((p, i) => (
        <span
          key={i}
          className="nk-confetti absolute top-0 block rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.w, height: p.w * 1.6, background: p.color, ['--d' as string]: `${p.d}s`, ['--delay' as string]: `${p.delay}s`, ['--x' as string]: `${p.x}px`, ['--r' as string]: `${p.r}deg` }}
        />
      ))}
    </div>
  )
}

/** Counts up to a number, so a score does not just appear. Jumps straight there under reduced motion. */
export function useCountUp(target: number, ms = 900) {
  const motion = useMotion()
  const [n, setN] = useState(motion ? 0 : target)
  useEffect(() => {
    if (!motion) return setN(target)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, motion])
  return n
}
