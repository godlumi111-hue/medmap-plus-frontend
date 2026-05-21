'use client'
import { useEffect, useRef } from 'react'

export type VehicleType = 'ambulance' | 'pompiers' | 'samu'
export type VehiclePhase = 'attente' | 'en_route' | 'sur_place' | 'prise_en_charge' | 'vers_hopital' | 'termine'

export interface VehicleData {
  type: VehicleType
  phase: VehiclePhase
  startPos?: { lat: number; lng: number }
  currentPos?: { lat: number; lng: number }  // real-time position from socket/DB — overrides animation
  acceptedAt?: number  // unix ms — used to resume animation at the correct position on reconnect
}

interface Props {
  emergencyPos: { lat: number; lng: number }
  vehicles: VehicleData[]
  onVehicleUpdate?: (type: string, info: { etaMin: number; distM: number; progress: number }) => void
}

const ANIM_CSS = `
.mv-ring{animation:mv-ring 1.8s ease-in-out infinite}
@keyframes mv-ring{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2.2);opacity:0}}
.mv-blink{animation:mv-blink 0.9s step-start infinite}
@keyframes mv-blink{0%,100%{opacity:1}50%{opacity:.3}}`

const VEHICLE_OFFSETS: Record<VehicleType, { dlat: number; dlng: number }> = {
  samu:      { dlat:  0.025, dlng: -0.032 },
  pompiers:  { dlat: -0.022, dlng:  0.018 },
  ambulance: { dlat:  0.016, dlng:  0.030 },
}

const VEHICLE_COLORS: Record<VehicleType, string> = {
  samu:      '#2563eb',
  pompiers:  '#ea580c',
  ambulance: '#dc2626',
}

const PHASE_DURATION_MS = 45_000
const TICK_MS = 100

function makeVehicleIcon(type: VehicleType, active: boolean): string {
  const color = VEHICLE_COLORS[type]
  const emoji = type === 'pompiers' ? '🚒' : '🚑'
  const size = active ? '22px' : '18px'
  const opacity = active ? '1' : '0.5'
  const ring = active
    ? `<div class="mv-ring" style="position:absolute;inset:0;background:${color}33;border-radius:50%"></div>`
    : ''
  return `<div style="position:relative;width:52px;height:52px;opacity:${opacity}">
    ${ring}
    <div style="position:absolute;inset:5px;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px ${color}88;display:flex;align-items:center;justify-content:center;font-size:${size}">${emoji}</div>
  </div>`
}

function makeEmergencyPin(): string {
  return `<div style="position:relative;width:52px;height:52px">
    <div class="mv-blink" style="position:absolute;inset:0;background:rgba(220,38,38,.3);border-radius:50%"></div>
    <div style="position:absolute;inset:4px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 0 20px rgba(239,68,68,.8);display:flex;align-items:center;justify-content:center;font-size:20px">🆘</div>
  </div>`
}

type VehicleState = {
  marker: any
  lineActive: any
  lineDone: any
  timer: ReturnType<typeof setInterval> | null
  phase: string
}

export default function MultiVehicleMap({ emergencyPos, vehicles, onVehicleUpdate }: Props) {
  const divRef      = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const initDone    = useRef(false)
  const vsRef       = useRef<Record<string, VehicleState>>({})
  const onUpdateRef = useRef(onVehicleUpdate)
  onUpdateRef.current = onVehicleUpdate

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
    if (!document.querySelector('#mv-css')) {
      const s = document.createElement('style')
      s.id = 'mv-css'; s.textContent = ANIM_CSS
      document.head.appendChild(s)
    }

    const L = require('leaflet') as typeof import('leaflet')
    function icon(html: string, size: number) {
      return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
    }

    const map = L.map(divRef.current!, {
      center: [emergencyPos.lat, emergencyPos.lng],
      zoom: 12, zoomControl: false, attributionControl: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.marker([emergencyPos.lat, emergencyPos.lng], {
      icon: icon(makeEmergencyPin(), 52), zIndexOffset: 300,
    }).addTo(map)

    mapRef.current = map
    return () => {
      Object.values(vsRef.current).forEach(vs => { if (vs.timer) clearInterval(vs.timer) })
      vsRef.current = {}
      map.remove()
      mapRef.current = null
      initDone.current = false
    }
  }, []) // eslint-disable-line

  // ── React to vehicle changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const L = require('leaflet') as typeof import('leaflet')
    const map = mapRef.current

    function icon(html: string, size: number) {
      return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
    }

    const boundsPoints: [number, number][] = [[emergencyPos.lat, emergencyPos.lng]]

    for (const vd of vehicles) {
      const { type, phase, acceptedAt, currentPos } = vd
      const active = phase !== 'attente'
      const startPos = vd.startPos || {
        lat: emergencyPos.lat + VEHICLE_OFFSETS[type].dlat,
        lng: emergencyPos.lng + VEHICLE_OFFSETS[type].dlng,
      }
      boundsPoints.push([startPos.lat, startPos.lng])

      if (!vsRef.current[type]) {
        const marker = L.marker([startPos.lat, startPos.lng], {
          icon: icon(makeVehicleIcon(type, false), 52),
          zIndexOffset: 1000,
        }).addTo(map)
        vsRef.current[type] = { marker, lineActive: null, lineDone: null, timer: null, phase: '' }
      }

      const vs = vsRef.current[type]
      vs.marker.setIcon(icon(makeVehicleIcon(type, active), 52))

      // Real-time position from socket/DB: move marker directly, skip client-side animation
      if (currentPos && (phase === 'en_route' || phase === 'vers_hopital')) {
        vs.marker.setLatLng([currentPos.lat, currentPos.lng])
        vs.phase = phase
        continue
      }

      if (vs.phase === phase) continue
      vs.phase = phase

      if (vs.timer) { clearInterval(vs.timer); vs.timer = null }
      if (vs.lineActive) { vs.lineActive.remove(); vs.lineActive = null }
      if (vs.lineDone) { vs.lineDone.remove(); vs.lineDone = null }

      if (phase === 'attente') {
        vs.marker.setLatLng([startPos.lat, startPos.lng])
        continue
      }
      if (phase === 'sur_place' || phase === 'prise_en_charge') {
        vs.marker.setLatLng([emergencyPos.lat, emergencyPos.lng])
        continue
      }
      if (phase === 'termine') {
        vs.marker.setLatLng([emergencyPos.lat, emergencyPos.lng])
        continue
      }

      // Animate: en_route or vers_hopital
      const isToHosp = phase === 'vers_hopital'
      const fromLat  = isToHosp ? emergencyPos.lat : startPos.lat
      const fromLng  = isToHosp ? emergencyPos.lng : startPos.lng
      const toLat    = isToHosp ? emergencyPos.lat - 0.020 : emergencyPos.lat
      const toLng    = isToHosp ? emergencyPos.lng + 0.025 : emergencyPos.lng

      const color = VEHICLE_COLORS[type]
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`

      const capturedVs    = vs
      const capturedType  = type
      const capturedPhase = phase
      // Use acceptedAt to resume animation at correct position after reconnect
      const animStart = acceptedAt && acceptedAt < Date.now() ? acceptedAt : Date.now()

      fetch(osrmUrl)
        .then(r => r.json())
        .then(data => {
          if (!mapRef.current || capturedVs.phase !== capturedPhase) return
          const route = data.routes?.[0]
          if (!route) return

          const coords: [number, number][] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
          const distM = route.distance
          const durS  = route.duration
          const n = coords.length

          // Jump to current position immediately (no visual flash from start)
          const tNow = Math.min((Date.now() - animStart) / PHASE_DURATION_MS, 1)
          const idxNow = Math.min(Math.floor(tNow * n), n - 1)
          capturedVs.marker.setLatLng(coords[idxNow])

          capturedVs.lineActive = L.polyline(coords.slice(idxNow), { color, weight: 4, opacity: 0.75, dashArray: '8 4' }).addTo(map)
          capturedVs.lineDone   = L.polyline(coords.slice(0, idxNow + 1), { color, weight: 3, opacity: 0.40 }).addTo(map)

          if (tNow >= 1) return  // already done

          capturedVs.timer = setInterval(() => {
            if (!mapRef.current || capturedVs.phase !== capturedPhase) return
            const t   = Math.min((Date.now() - animStart) / PHASE_DURATION_MS, 1)
            const idx = Math.min(Math.floor(t * n), n - 1)
            capturedVs.marker.setLatLng(coords[idx])
            capturedVs.lineDone?.setLatLngs(coords.slice(0, idx + 1))
            capturedVs.lineActive?.setLatLngs(coords.slice(idx))
            const etaMin = Math.max(0, Math.round((durS * (1 - t)) / 60))
            onUpdateRef.current?.(capturedType, { etaMin, distM: Math.round(distM * (1 - t)), progress: t * 100 })
            if (t >= 1 && capturedVs.timer) { clearInterval(capturedVs.timer); capturedVs.timer = null }
          }, TICK_MS)
        })
        .catch(() => {
          const dist = Math.sqrt(
            Math.pow((toLat - fromLat) * 111000, 2) +
            Math.pow((toLng - fromLng) * 111000 * Math.cos(fromLat * Math.PI / 180), 2)
          )
          const tNow = Math.min((Date.now() - animStart) / PHASE_DURATION_MS, 1)
          capturedVs.marker.setLatLng([
            fromLat + (toLat - fromLat) * tNow,
            fromLng + (toLng - fromLng) * tNow,
          ])
          if (tNow >= 1) return
          capturedVs.timer = setInterval(() => {
            if (!mapRef.current || capturedVs.phase !== capturedPhase) return
            const t = Math.min((Date.now() - animStart) / PHASE_DURATION_MS, 1)
            capturedVs.marker.setLatLng([fromLat + (toLat - fromLat) * t, fromLng + (toLng - fromLng) * t])
            const etaMin = Math.max(0, Math.round(8 * (1 - t)))
            onUpdateRef.current?.(capturedType, { etaMin, distM: Math.round(dist * (1 - t)), progress: t * 100 })
            if (t >= 1 && capturedVs.timer) { clearInterval(capturedVs.timer); capturedVs.timer = null }
          }, TICK_MS)
        })
    }

    if (boundsPoints.length > 1) {
      try { map.fitBounds(L.latLngBounds(boundsPoints), { padding: [60, 60] }) } catch {}
    }
  }, [vehicles]) // eslint-disable-line

  return <div ref={divRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
}
