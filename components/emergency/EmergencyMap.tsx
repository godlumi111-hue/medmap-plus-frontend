'use client'
import { useEffect, useRef } from 'react'

export type VehicleType = 'ambulance' | 'pompiers' | 'samu'
export type EmergencyPhase =
  | 'attente'
  | 'en_route'
  | 'sur_place'
  | 'vers_hopital'
  | 'termine'

export interface EmergencyMapProps {
  emergencyPos: { lat: number; lng: number }
  vehicleStartPos?: { lat: number; lng: number }
  hospitalPos?: { lat: number; lng: number }
  phase: EmergencyPhase
  vehicleType?: VehicleType
  onUpdate?: (info: { etaMin: number; distM: number; progress: number; lat?: number; lng?: number }) => void
  onPhaseComplete?: (event: string) => void
}

// ── Pulsing ring animation CSS ────────────────────────────────────────────────
const ANIM_CSS = `
.em-ring{animation:em-ring 1.8s ease-in-out infinite}
@keyframes em-ring{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2.2);opacity:0}}
.em-blink{animation:em-blink 0.9s step-start infinite}
@keyframes em-blink{0%,100%{opacity:1}50%{opacity:.3}}`

// ── Icons ─────────────────────────────────────────────────────────────────────
function makeAmbulance(): string {
  return `<div style="position:relative;width:58px;height:58px">
    <div class="em-ring" style="position:absolute;inset:0;background:rgba(220,38,38,.25);border-radius:50%"></div>
    <div style="position:absolute;inset:6px;background:#dc2626;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 20px rgba(220,38,38,.6);display:flex;align-items:center;justify-content:center;font-size:22px">🚑</div>
  </div>`
}
function makePompiers(): string {
  return `<div style="position:relative;width:58px;height:58px">
    <div class="em-ring" style="position:absolute;inset:0;background:rgba(220,38,38,.25);border-radius:50%"></div>
    <div style="position:absolute;inset:6px;background:#b91c1c;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 20px rgba(185,28,28,.6);display:flex;align-items:center;justify-content:center;font-size:22px">🚒</div>
  </div>`
}
function makeEmergencyPin(): string {
  return `<div style="position:relative;width:52px;height:52px">
    <div class="em-blink" style="position:absolute;inset:0;background:rgba(220,38,38,.3);border-radius:50%"></div>
    <div style="position:absolute;inset:4px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 0 20px rgba(239,68,68,.8);display:flex;align-items:center;justify-content:center;font-size:20px">🆘</div>
  </div>`
}
function makeHospital(): string {
  return `<div style="width:46px;height:46px;background:#1d4ed8;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px rgba(29,78,216,.45);display:flex;align-items:center;justify-content:center;font-size:20px">🏥</div>`
}

const PHASE_DURATION_MS = 45_000 // 45s per leg
const TICK_MS = 100

// Default starting positions (Abidjan simulation)
const DEFAULT_VEHICLE_OFFSET = { dlat: 0.025, dlng: -0.03 }

export default function EmergencyMap({
  emergencyPos,
  vehicleStartPos,
  hospitalPos,
  phase,
  vehicleType = 'ambulance',
  onUpdate,
  onPhaseComplete,
}: EmergencyMapProps) {
  const divRef     = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const vehicleRef = useRef<any>(null)
  const lineActive = useRef<any>(null)
  const lineDone   = useRef<any>(null)
  const initDone   = useRef(false)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef   = useRef('')
  const startTimeRef = useRef(0)
  const totalDistRef = useRef(0)
  const totalDurRef  = useRef(0)
  const firedRef   = useRef(new Set<string>())

  const onUpdateRef        = useRef(onUpdate)
  const onPhaseCompleteRef = useRef(onPhaseComplete)
  onUpdateRef.current        = onUpdate
  onPhaseCompleteRef.current = onPhaseComplete

  const vStart = vehicleStartPos || {
    lat: emergencyPos.lat + DEFAULT_VEHICLE_OFFSET.dlat,
    lng: emergencyPos.lng + DEFAULT_VEHICLE_OFFSET.dlng,
  }

  const hosp = hospitalPos || {
    lat: emergencyPos.lat - 0.02,
    lng: emergencyPos.lng + 0.025,
  }

  useEffect(() => {
    if (initDone.current || !divRef.current) return
    initDone.current = true

    if (!document.querySelector('#lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    if (!document.querySelector('#em-css')) {
      const s = document.createElement('style')
      s.id = 'em-css'; s.textContent = ANIM_CSS
      document.head.appendChild(s)
    }

    const L = require('leaflet') as typeof import('leaflet')
    function icon(html: string, size: number) {
      return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
    }

    const map = L.map(divRef.current!, {
      center: [emergencyPos.lat, emergencyPos.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Fixed markers
    L.marker([emergencyPos.lat, emergencyPos.lng], { icon: icon(makeEmergencyPin(), 52), zIndexOffset: 200 }).addTo(map)
    if (hospitalPos) {
      L.marker([hosp.lat, hosp.lng], { icon: icon(makeHospital(), 46), zIndexOffset: 200 }).addTo(map)
    }

    // Vehicle marker
    const vehicleIcon = vehicleType === 'pompiers' ? makePompiers() : makeAmbulance()
    vehicleRef.current = L.marker([vStart.lat, vStart.lng], {
      icon: icon(vehicleIcon, 58), zIndexOffset: 1000,
    }).addTo(map)

    map.fitBounds(
      L.latLngBounds([[vStart.lat, vStart.lng], [emergencyPos.lat, emergencyPos.lng]]),
      { padding: [60, 60] }
    )

    mapRef.current = map
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      phaseRef.current = ''
      firedRef.current.clear()
      map.remove()
      mapRef.current = null
      initDone.current = false
    }
  }, []) // eslint-disable-line

  // ── React to phase changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!phase || !mapRef.current) return
    if (phaseRef.current === phase) return
    phaseRef.current = phase

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const L = require('leaflet') as typeof import('leaflet')

    // Static snapshots
    if (phase === 'attente') return
    if (phase === 'sur_place') {
      vehicleRef.current?.setLatLng([emergencyPos.lat, emergencyPos.lng])
      mapRef.current.panTo([emergencyPos.lat, emergencyPos.lng])
      return
    }
    if (phase === 'termine') {
      vehicleRef.current?.setLatLng([emergencyPos.lat, emergencyPos.lng])
      return
    }

    const isToHospital = phase === 'vers_hopital'
    const fromLat = isToHospital ? emergencyPos.lat : vStart.lat
    const fromLng = isToHospital ? emergencyPos.lng : vStart.lng
    const toLat   = isToHospital ? hosp.lat        : emergencyPos.lat
    const toLng   = isToHospital ? hosp.lng        : emergencyPos.lng

    if (lineActive.current) { lineActive.current.remove(); lineActive.current = null }
    if (lineDone.current)   { lineDone.current.remove(); lineDone.current = null }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`

    fetch(osrmUrl)
      .then(r => r.json())
      .then(data => {
        if (!mapRef.current) return
        const route = data.routes?.[0]
        if (!route) return

        const coords: [number, number][] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
        const distM = route.distance
        const durS  = route.duration

        totalDistRef.current = distM
        totalDurRef.current  = PHASE_DURATION_MS

        lineActive.current = L.polyline(coords, { color: '#dc2626', weight: 4, opacity: 0.7, dashArray: '8 4' }).addTo(mapRef.current)
        lineDone.current   = L.polyline([], { color: '#fca5a5', weight: 3, opacity: 0.5 }).addTo(mapRef.current)

        mapRef.current.fitBounds(L.latLngBounds([[fromLat, fromLng], [toLat, toLng]]), { padding: [60, 60] })

        startTimeRef.current = Date.now()
        const n = coords.length

        timerRef.current = setInterval(() => {
          if (!mapRef.current) return
          const elapsed = Date.now() - startTimeRef.current
          const t = Math.min(elapsed / PHASE_DURATION_MS, 1)
          const idx = Math.min(Math.floor(t * n), n - 1)
          const pt = coords[idx]

          vehicleRef.current?.setLatLng(pt)

          const done = coords.slice(0, idx + 1)
          const remaining = coords.slice(idx)
          lineDone.current?.setLatLngs(done)
          lineActive.current?.setLatLngs(remaining)

          const distRemaining = Math.round(distM * (1 - t))
          const etaMin = Math.max(0, Math.round((durS * (1 - t)) / 60))
          onUpdateRef.current?.({ etaMin, distM: distRemaining, progress: t * 100, lat: pt[0], lng: pt[1] })

          if (t >= 1 && !firedRef.current.has(phase)) {
            firedRef.current.add(phase)
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
            onPhaseCompleteRef.current?.(phase)
          }
        }, TICK_MS)
      })
      .catch(() => {
        // Fallback: linear interpolation without OSRM
        startTimeRef.current = Date.now()
        const dist = Math.sqrt(Math.pow((toLat - fromLat) * 111000, 2) + Math.pow((toLng - fromLng) * 111000 * Math.cos(fromLat * Math.PI / 180), 2))
        totalDistRef.current = dist

        timerRef.current = setInterval(() => {
          const t = Math.min((Date.now() - startTimeRef.current) / PHASE_DURATION_MS, 1)
          const lat = fromLat + (toLat - fromLat) * t
          const lng = fromLng + (toLng - fromLng) * t
          vehicleRef.current?.setLatLng([lat, lng])
          const distRemaining = Math.round(dist * (1 - t))
          const etaMin = Math.max(0, Math.round(8 * (1 - t)))
          const curLat = fromLat + (toLat - fromLat) * t
          const curLng = fromLng + (toLng - fromLng) * t
          onUpdateRef.current?.({ etaMin, distM: distRemaining, progress: t * 100, lat: curLat, lng: curLng })
          if (t >= 1 && !firedRef.current.has(phase)) {
            firedRef.current.add(phase)
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
            onPhaseCompleteRef.current?.(phase)
          }
        }, TICK_MS)
      })
  }, [phase]) // eslint-disable-line

  return <div ref={divRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
}
