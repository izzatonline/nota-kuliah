import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

export type Pin = { key: string; title: string; lat: number; lng: number; n: number }

const icon = (n: number, active: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span class="grid size-7 place-items-center rounded-full border-2 border-white font-mono text-[11px] font-semibold text-primary-foreground shadow-md transition-transform ${active ? 'scale-125 bg-gold ring-2 ring-gold/50' : 'bg-primary'}">${n}</span>`,
  })

/** A Leaflet map with one pin per place. The tiles come from OpenStreetMap; the pins are ours. */
export function PlacesMap({ pins, selected, onSelect, label, north, thin, className }: { pins: Pin[]; selected?: string | null; onSelect?: (key: string) => void; label: string; north: string; /** Hide the names of the lesser pins until the map is zoomed in, so a crowded map stays readable. */ thin?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>()
  const layer = useRef<L.LayerGroup>()
  const markers = useRef(new Map<string, L.Marker>())
  const fit = useRef<() => void>()
  const sized = useRef(false)
  const pick = useRef(onSelect)
  pick.current = onSelect

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { scrollWheelZoom: false, worldCopyJump: false }).setView([24, 40], 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(m)
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m)
    const compass = new L.Control({ position: 'topright' })
    compass.onAdd = () => {
      const el = L.DomUtil.create('div', 'rounded-md border bg-background/90 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-foreground shadow-sm')
      el.innerHTML = `<span aria-hidden="true" class="block text-base leading-none">↑</span>${north}`
      return el
    }
    compass.addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // A map in a hidden tab has no size yet, so fit the pins again once it gets one.
    const ro = new ResizeObserver(() => {
      m.invalidateSize()
      if (!sized.current && box.current && box.current.clientWidth > 0) {
        sized.current = true
        fit.current?.()
      }
    })
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = undefined
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current
    if (!m || !layer.current) return
    layer.current.clearLayers()
    markers.current.clear()
    for (const p of pins) {
      const mk = L.marker([p.lat, p.lng], { icon: icon(p.n, false), title: p.title, alt: p.title, riseOnHover: true }).on('click', () => pick.current?.(p.key))
      mk.bindTooltip(p.title, { permanent: true, direction: 'right', offset: [12, 0], className: 'nk-label' })
      mk.addTo(layer.current)
      markers.current.set(p.key, mk)
    }
    m.invalidateSize()
    const labels = () => {
      const zoomed = m.getZoom() >= 7
      for (const p of pins) markers.current.get(p.key)?.getTooltip()?.getElement()?.classList.toggle('hidden', !!thin && !zoomed && p.n < 5)
    }
    m.on('zoomend', labels)
    requestAnimationFrame(labels)
    fit.current = () => {
      if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], 8)
      else if (pins.length) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 9 })
    }
    if (box.current && box.current.clientWidth > 0) {
      sized.current = true
      fit.current()
    }
    return () => {
      m.off('zoomend', labels)
    }
  }, [pins, thin])

  useEffect(() => {
    for (const p of pins) markers.current.get(p.key)?.setIcon(icon(p.n, p.key === selected)).setZIndexOffset(p.key === selected ? 1000 : 0)
    const sel = pins.find((p) => p.key === selected)
    if (sel && map.current) map.current.flyTo([sel.lat, sel.lng], Math.max(map.current.getZoom(), 7), { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.6 })
  }, [selected, pins])

  return <div ref={box} role="region" aria-label={label} className={cn('z-0 h-72 w-full overflow-hidden rounded-xl border bg-muted sm:h-96', className)} />
}
