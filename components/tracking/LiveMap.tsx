'use client'
import { useEffect, useRef } from 'react'

export interface LiveMapProps {
  pharmacyPos:      { lat: number; lng: number }
  clientPos:        { lat: number; lng: number }
  phase:            string
  onUpdate?:        (info: { etaMin: number; distM: number; progress: number }) => void
  onPhaseComplete?: (event: 'arrive_pharmacie' | 'arrive_patient') => void
}

const PULSE_CSS = `
.lm-ring{animation:lm-ring 2s ease-in-out infinite}
@keyframes lm-ring{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.8);opacity:0}}`

function makeIcon(html: string, size: number) {
  const L = require('leaflet') as typeof import('leaflet')
  return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

const PHARMACY_HTML = `<div style="width:46px;height:46px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px rgba(245,158,11,.45);display:flex;align-items:center;justify-content:center;font-size:21px">💊</div>`
const CLIENT_HTML   = `<div style="width:46px;height:46px;background:#10b981;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px rgba(16,185,129,.45);display:flex;align-items:center;justify-content:center;font-size:21px">🏠</div>`
const MOTO_HTML     = `
<div style="position:relative;width:54px;height:54px">
  <div class="lm-ring" style="position:absolute;inset:0;background:rgba(99,102,241,.22);border-radius:50%"></div>
  <div style="position:absolute;inset:5px;background:#6366f1;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 18px rgba(99,102,241,.55);display:flex;align-items:center;justify-content:center;font-size:22px">🛵</div>
</div>`

const PHASE_DURATION_MS = 50_000  // 50 real seconds per phase
const TICK_MS           = 100     // 10 fps — smooth interpolated movement

export default function LiveMap({
  pharmacyPos, clientPos, phase, onUpdate, onPhaseComplete,
}: LiveMapProps) {
  const divRef     = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const motoRef    = useRef<any>(null)
  const lineActive = useRef<any>(null)
  const lineDone   = useRef<any>(null)
  const initDone   = useRef(false)

  // Keep latest callbacks in refs so the interval never calls stale closures
  const onUpdateRef        = useRef(onUpdate)
  const onPhaseCompleteRef = useRef(onPhaseComplete)
  onUpdateRef.current        = onUpdate
  onPhaseCompleteRef.current = onPhaseComplete

  // Animation state — refs so the interval reads live values, no re-renders needed
  const phaseRef     = useRef('')
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const totalDistRef = useRef(0)
  const totalDurRef  = useRef(0)
  const panCounter   = useRef(0)
  const firedRef     = useRef(new Set<string>())

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current || !divRef.current) return
    initDone.current = true

    if (!document.querySelector('#lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    if (!document.querySelector('#lm-css')) {
      const s = document.createElement('style')
      s.id = 'lm-css'; s.textContent = PULSE_CSS
      document.head.appendChild(s)
    }

    const L = require('leaflet') as typeof import('leaflet')
    const map = L.map(divRef.current, {
      center: [pharmacyPos.lat, pharmacyPos.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Fixed markers for pharmacy and client
    L.marker([pharmacyPos.lat, pharmacyPos.lng], { icon: makeIcon(PHARMACY_HTML, 46), zIndexOffset: 200 }).addTo(map)
    L.marker([clientPos.lat,   clientPos.lng],   { icon: makeIcon(CLIENT_HTML, 46),   zIndexOffset: 200 }).addTo(map)

    // Livreur marker — starts slightly south-west of pharmacy (simulates coming from afar)
    motoRef.current = L.marker(
      [pharmacyPos.lat - 0.022, pharmacyPos.lng - 0.028],
      { icon: makeIcon(MOTO_HTML, 54), zIndexOffset: 1000 }
    ).addTo(map)

    map.fitBounds(
      L.latLngBounds([[pharmacyPos.lat, pharmacyPos.lng], [clientPos.lat, clientPos.lng]]),
      { padding: [60, 60] }
    )

    mapRef.current = map

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      // Reset phase so the animation restarts on the new map instance
      // (React Strict Mode runs effects twice — without this, the second run
      //  sees phaseRef.current === phase and returns early, killing the animation)
      phaseRef.current = ''
      firedRef.current.clear()
      map.remove()
      mapRef.current   = null
      initDone.current = false
    }
  }, []) // eslint-disable-line

  // ── React to phase changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!phase || !mapRef.current) return
    if (phaseRef.current === phase) return
    phaseRef.current = phase

    // Stop any running animation first
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    // Static positions for "arrived" states (user opens page late)
    if (phase === 'arrive_pharmacie') {
      motoRef.current?.setLatLng([pharmacyPos.lat, pharmacyPos.lng])
      mapRef.current.panTo([pharmacyPos.lat, pharmacyPos.lng], { animate: true, duration: 0.5 })
      return
    }
    if (phase === 'arrive_patient' || phase === 'livre') {
      motoRef.current?.setLatLng([clientPos.lat, clientPos.lng])
      mapRef.current.panTo([clientPos.lat, clientPos.lng], { animate: true, duration: 0.5 })
      return
    }

    if (!['vers_pharmacie', 'vers_patient'].includes(phase)) return

    const toClient = phase === 'vers_patient'
    // Phase 1: livreur starts south-west and goes to pharmacy
    // Phase 2: livreur starts at pharmacy and goes to client
    const startLat = toClient ? pharmacyPos.lat        : pharmacyPos.lat - 0.022
    const startLng = toClient ? pharmacyPos.lng        : pharmacyPos.lng - 0.028
    const endLat   = toClient ? clientPos.lat          : pharmacyPos.lat
    const endLng   = toClient ? clientPos.lng          : pharmacyPos.lng

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full`

    const capturedPhase = phase
    const startWith = (pts: [number, number][], dist: number, dur: number) => {
      if (phaseRef.current !== capturedPhase) return
      totalDistRef.current = dist
      totalDurRef.current  = dur
      beginAnimation(pts, toClient, capturedPhase)
    }

    fetch(osrmUrl)
      .then(r => r.json())
      .then(d => {
        const route = d.routes?.[0]
        if (!route) throw new Error('no route')
        const pts: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: number[]) => [lat, lng]
        )
        startWith(pts, route.legs[0].distance, route.legs[0].duration)
      })
      .catch(() => {
        // Fallback: 100-point straight line (still animates smoothly)
        const pts: [number, number][] = Array.from({ length: 100 }, (_, i) => {
          const t = i / 99
          return [startLat + (endLat - startLat) * t, startLng + (endLng - startLng) * t] as [number, number]
        })
        startWith(pts, 2500, 360)
      })
  }, [phase]) // eslint-disable-line

  function beginAnimation(pts: [number, number][], toClient: boolean, animPhase: string) {
    const L   = require('leaflet') as typeof import('leaflet')
    const map = mapRef.current
    if (!map || !pts.length) return

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    // Remove old route lines and draw new ones
    if (lineActive.current) { map.removeLayer(lineActive.current); lineActive.current = null }
    if (lineDone.current)   { map.removeLayer(lineDone.current);   lineDone.current   = null }

    lineActive.current = L.polyline(pts, {
      color: toClient ? '#6366f1' : '#0ea5e9',
      weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round',
    }).addTo(map)
    lineDone.current = L.polyline([], {
      color: '#94a3b8', weight: 4, opacity: 0.6, lineCap: 'round',
    }).addTo(map)

    // Place livreur at route start
    motoRef.current?.setLatLng(pts[0])
    map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] })

    startTimeRef.current = Date.now()
    panCounter.current   = 0

    timerRef.current = setInterval(() => {
      const elapsed  = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / PHASE_DURATION_MS, 1)

      // ── Smooth linear interpolation between consecutive route points ─────────
      const fi   = progress * (pts.length - 1)
      const idx  = Math.floor(fi)
      const frac = fi - idx
      const a    = pts[Math.min(idx,     pts.length - 1)]
      const b    = pts[Math.min(idx + 1, pts.length - 1)]
      const lat  = a[0] + (b[0] - a[0]) * frac
      const lng  = a[1] + (b[1] - a[1]) * frac
      // ────────────────────────────────────────────────────────────────────────

      // Move livreur marker to interpolated position
      motoRef.current?.setLatLng([lat, lng])

      // Update route lines: done portion grows, active portion shrinks
      lineActive.current?.setLatLngs(pts.slice(idx + 1))
      lineDone.current?.setLatLngs([...pts.slice(0, idx + 1), [lat, lng] as [number, number]])

      // Camera follows livreur — every 5 ticks (500 ms) to avoid micro-jitter
      panCounter.current++
      if (panCounter.current % 5 === 0) {
        map.panTo([lat, lng], { animate: true, duration: 0.5 })
      }

      // Report ETA / distance / progress to parent
      onUpdateRef.current?.({
        etaMin: Math.max(0, Math.ceil((1 - progress) * totalDurRef.current / 60)),
        distM:  Math.round((1 - progress) * totalDistRef.current),
        progress,
      })

      // Phase complete — fire once only
      if (progress >= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        const ev = animPhase === 'vers_pharmacie' ? 'arrive_pharmacie' : 'arrive_patient'
        if (!firedRef.current.has(ev)) {
          firedRef.current.add(ev)
          onPhaseCompleteRef.current?.(ev)
        }
      }
    }, TICK_MS)
  }

  return <div ref={divRef} style={{ width: '100%', height: '100%' }} />
}
