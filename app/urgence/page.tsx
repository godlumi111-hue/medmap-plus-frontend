'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/layout/Navbar'
import { majorEmergency } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { getSocket } from '@/lib/socket'
import type { VehicleData, VehiclePhase } from '@/components/emergency/MultiVehicleMap'
import {
  AlertTriangle, MapPin, Users, Flame, Phone, Navigation,
  CheckCircle, Clock, Shield, ChevronRight, RefreshCw,
} from 'lucide-react'

const MultiVehicleMap = dynamic(() => import('@/components/emergency/MultiVehicleMap'), { ssr: false })

const EMERGENCY_TYPES = [
  { id: 'incendie',         label: 'Incendie',           icon: '🔥', desc: 'Feu, fumée, explosion thermique' },
  { id: 'accident_grave',   label: 'Accident grave',     icon: '🚗', desc: 'AVP, collision, blessé grave' },
  { id: 'explosion',        label: 'Explosion',          icon: '💥', desc: 'Explosion, gaz, attentat' },
  { id: 'malaise_collectif',label: 'Malaise collectif',  icon: '😷', desc: 'Plusieurs personnes malades' },
  { id: 'catastrophe',      label: 'Catastrophe',        icon: '🌊', desc: 'Inondation, effondrement, cataclysme' },
  { id: 'animal_dangereux', label: 'Animal dangereux',   icon: '🐯', desc: 'Animal sauvage menaçant, serpent' },
  { id: 'effondrement',     label: 'Effondrement',       icon: '🏚', desc: 'Bâtiment effondré, personnes piégées' },
  { id: 'urgence_medicale', label: 'Urgence médicale',   icon: '🏥', desc: 'Arrêt cardiaque, accident grave' },
]

const GRAVITE_OPTIONS = ['critique', 'élevée', 'modérée']

const DISPATCH_LABELS: Record<string, string[]> = {
  incendie:         ['SAMU', 'Pompiers', 'Ambulance'],
  accident_grave:   ['SAMU', 'Ambulance'],
  explosion:        ['SAMU', 'Pompiers', 'Ambulance'],
  malaise_collectif:['SAMU', 'Ambulance'],
  catastrophe:      ['SAMU', 'Pompiers', 'Ambulance'],
  animal_dangereux: ['Pompiers'],
  effondrement:     ['SAMU', 'Pompiers', 'Ambulance'],
  urgence_medicale: ['SAMU', 'Ambulance'],
  autre:            ['SAMU'],
}

const DISPATCH_MAP: Record<string, { samu: boolean; pompiers: boolean; ambulance: boolean }> = {
  incendie:         { samu: true,  pompiers: true,  ambulance: true  },
  accident_grave:   { samu: true,  pompiers: false, ambulance: true  },
  explosion:        { samu: true,  pompiers: true,  ambulance: true  },
  malaise_collectif:{ samu: true,  pompiers: false, ambulance: true  },
  catastrophe:      { samu: true,  pompiers: true,  ambulance: true  },
  animal_dangereux: { samu: false, pompiers: true,  ambulance: false },
  effondrement:     { samu: true,  pompiers: true,  ambulance: true  },
  urgence_medicale: { samu: true,  pompiers: false, ambulance: true  },
  autre:            { samu: true,  pompiers: false, ambulance: false },
}

const SERVICE_INFO: Record<string, { label: string; emoji: string; color: string; bg: string; border: string; btnColor: string }> = {
  samu:      { label: 'SAMU',      emoji: '🚑', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    btnColor: 'bg-red-500 hover:bg-red-600'    },
  pompiers:  { label: 'Pompiers',  emoji: '🚒', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', btnColor: 'bg-orange-500 hover:bg-orange-600' },
  ambulance: { label: 'Ambulance', emoji: '🚑', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   btnColor: 'bg-blue-500 hover:bg-blue-600'   },
}

const PHASE_LABEL: Record<string, string> = {
  attente: 'En attente', en_route: 'En route', sur_place: 'Sur place',
  prise_en_charge: 'Prise en charge', vers_hopital: 'Vers l\'hôpital', termine: 'Terminé',
}

const OVERALL_STATUS: Record<string, { label: string; icon: string; desc: string }> = {
  attente:        { label: 'Alerte transmise',     icon: '⏳', desc: 'Votre alerte a été transmise. En attente d\'acceptation par les secours.' },
  en_route:       { label: 'Secours en route',     icon: '🚑', desc: 'Les secours se dirigent vers vous.' },
  sur_place:      { label: 'Secours sur place',    icon: '📍', desc: 'Les secours sont arrivés sur les lieux.' },
  prise_en_charge:{ label: 'Prise en charge',      icon: '🏥', desc: 'Vous êtes pris en charge.' },
  vers_hopital:   { label: 'Transport hôpital',    icon: '🚑', desc: 'Transport vers l\'établissement de soins.' },
  termine:        { label: 'Intervention terminée',icon: '✅', desc: 'L\'intervention est terminée.' },
}

const LS_KEY = 'medmap_active_emergency_id'

function buildVehicles(em: any, positions?: Record<string, { lat: number; lng: number }>): VehicleData[] {
  const dispatch = DISPATCH_MAP[em?.type] || { samu: true, pompiers: false, ambulance: false }
  const responses: any[] = em?.responses || []
  const result: VehicleData[] = []
  for (const vType of ['samu', 'pompiers', 'ambulance'] as const) {
    if (!dispatch[vType]) continue
    const resp = responses.find((r: any) => r.responder_role === vType)
    const phase: VehiclePhase = (resp?.statut as VehiclePhase) || 'attente'
    // Real-time position from socket takes priority, then fall back to last DB-saved position
    const currentPos = positions?.[vType]
      ?? (resp?.vehicle_lat ? { lat: Number(resp.vehicle_lat), lng: Number(resp.vehicle_lng) } : undefined)
    result.push({
      type: vType,
      phase,
      acceptedAt: resp?.created_at ? new Date(resp.created_at).getTime() : undefined,
      currentPos,
    })
  }
  return result
}

function getOverallPhase(vehicles: VehicleData[]): string {
  if (!vehicles.length) return 'attente'
  const phases = vehicles.map(v => v.phase)
  if (phases.every(p => p === 'termine')) return 'termine'
  if (phases.some(p => p === 'vers_hopital'))    return 'vers_hopital'
  if (phases.some(p => p === 'prise_en_charge')) return 'prise_en_charge'
  if (phases.some(p => p === 'sur_place'))       return 'sur_place'
  if (phases.some(p => p === 'en_route'))        return 'en_route'
  return 'attente'
}

export default function UrgencePage() {
  const { user, loading: authLoading } = useAuth()

  const [selectedType, setSelectedType]   = useState<string | null>(null)
  const [nbVictimes, setNbVictimes]       = useState(1)
  const [feu, setFeu]                     = useState(false)
  const [gravite, setGravite]             = useState('critique')
  const [description, setDescription]     = useState('')
  const [adresse, setAdresse]             = useState('')
  const [gps, setGps]                     = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading]       = useState(false)
  const [sending, setSending]             = useState(false)
  const [step, setStep]                   = useState<'form' | 'tracking'>('form')
  const [emergency, setEmergency]         = useState<any>(null)
  const [restoring, setRestoring]         = useState(true)
  const [confirming, setConfirming]       = useState<string | null>(null)  // role being confirmed
  const [vehiclePositions, setVehiclePositions] = useState<Record<string, { lat: number; lng: number }>>({})

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function detectGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
      () => setGpsLoading(false),
      { timeout: 8000 }
    )
  }

  // Refresh emergency data from API
  const refreshEmergency = useCallback(async (id: number) => {
    try {
      const data = await majorEmergency.get(id)
      setEmergency(data)
      if (data.statut === 'termine') {
        localStorage.removeItem(LS_KEY)
        if (pollRef.current) clearInterval(pollRef.current)
      }
      return data
    } catch {
      return null
    }
  }, [])

  // Detect GPS on mount (doesn't need auth)
  useEffect(() => { detectGPS() }, [])

  // Restore active emergency from localStorage — waits for auth to load
  useEffect(() => {
    if (authLoading) return  // wait for auth context to resolve
    setRestoring(false)

    const storedId = localStorage.getItem(LS_KEY)
    if (!storedId || !user) return  // no stored emergency or not logged in

    refreshEmergency(parseInt(storedId)).then(data => {
      if (data && data.statut !== 'termine') {
        setEmergency(data)
        setStep('tracking')
      } else {
        localStorage.removeItem(LS_KEY)
      }
    })
  }, [authLoading, user?.id]) // eslint-disable-line

  // Poll emergency every 10s while tracking
  useEffect(() => {
    if (step !== 'tracking' || !emergency?.id) return
    pollRef.current = setInterval(() => refreshEmergency(emergency.id), 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, emergency?.id, refreshEmergency])

  // Socket: status updates from responders
  useEffect(() => {
    if (step !== 'tracking' || !emergency?.id || !user?.id) return
    const socket = getSocket()
    const handler = (data: any) => {
      if (data.emergency_id === emergency.id) {
        refreshEmergency(emergency.id)
      }
    }
    socket.on('major_emergency:update', handler)
    return () => { socket.off('major_emergency:update', handler) }
  }, [step, emergency?.id, user?.id, refreshEmergency])

  // Socket: real-time vehicle position updates
  useEffect(() => {
    if (step !== 'tracking' || !emergency?.id || !user?.id) return
    const socket = getSocket()
    const posHandler = (data: any) => {
      if (Number(data.emergency_id) === Number(emergency.id) && data.responder_role && data.lat != null) {
        setVehiclePositions(prev => ({
          ...prev,
          [data.responder_role]: { lat: Number(data.lat), lng: Number(data.lng) },
        }))
      }
    }
    socket.on('major_emergency:position', posHandler)
    return () => { socket.off('major_emergency:position', posHandler) }
  }, [step, emergency?.id, user?.id])

  async function submit() {
    if (!selectedType) return
    setSending(true)
    try {
      const data = await majorEmergency.report({
        type: selectedType, description: description || undefined,
        nb_victimes: nbVictimes, feu, gravite,
        lat: gps?.lat, lng: gps?.lng, adresse: adresse || undefined,
      })
      localStorage.setItem(LS_KEY, String(data.id))
      setEmergency(data)
      setStep('tracking')
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  async function handleConfirmArrival(role: string) {
    if (!emergency?.id || confirming) return
    setConfirming(role)
    try {
      await majorEmergency.confirmArrival(emergency.id, role)
      await refreshEmergency(emergency.id)
    } catch (e: any) {
      alert(e.message || 'Erreur')
    } finally {
      setConfirming(null)
    }
  }

  function clearAndReset() {
    localStorage.removeItem(LS_KEY)
    setEmergency(null)
    setStep('form')
    setSelectedType(null)
    setVehiclePositions({})
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const dispatched = selectedType ? (DISPATCH_LABELS[selectedType] || ['SAMU']) : []

  // ── Loading while restoring ────────────────────────────────────────────────
  if (authLoading || restoring) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate">
          <RefreshCw className="w-5 h-5 animate-spin" /> Chargement...
        </div>
      </div>
    )
  }

  // ── Tracking view ─────────────────────────────────────────────────────────
  if (step === 'tracking' && emergency) {
    const vehicles    = buildVehicles(emergency, vehiclePositions)
    const overallPhase = getOverallPhase(vehicles)
    const statusInfo  = OVERALL_STATUS[overallPhase] || OVERALL_STATUS.attente
    const hasPos      = !!(emergency.lat && emergency.lng)
    const emergPos    = hasPos
      ? { lat: Number(emergency.lat), lng: Number(emergency.lng) }
      : { lat: 5.359, lng: -4.008 }
    const isTerminated = overallPhase === 'termine' || emergency.statut === 'termine'

    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="bg-red-600 text-white py-3 px-4 text-center">
          <p className="text-sm font-semibold flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            SAMU Côte d'Ivoire : <a href="tel:185" className="text-xl font-black mx-1 hover:underline">185</a>
          </p>
        </div>

        <div className="pt-16 max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Main status card */}
          <div className={`rounded-2xl shadow-sm overflow-hidden border ${isTerminated ? 'border-green-200' : 'border-red-100'}`}>
            <div className={`px-6 py-5 flex items-start justify-between ${isTerminated ? 'bg-green-500' : 'bg-red-500'}`}>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Alerte #{emergency.id}</p>
                <h1 className="text-white font-black text-xl">{statusInfo.icon} {statusInfo.label}</h1>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-white/70 text-xs">Type</p>
                <p className="text-white font-bold text-sm mt-0.5">
                  {EMERGENCY_TYPES.find(t => t.id === emergency.type)?.icon}{' '}
                  {EMERGENCY_TYPES.find(t => t.id === emergency.type)?.label || emergency.type}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-white">
              <p className="text-slate text-sm">{statusInfo.desc}</p>
            </div>
          </div>

          {/* Per-service status + confirm buttons */}
          <div className="bg-white rounded-xl border border-bone shadow-sm p-4">
            <p className="text-slate text-xs font-semibold uppercase tracking-wider mb-3">Services mobilisés</p>
            <div className="space-y-3">
              {vehicles.map(v => {
                const info      = SERVICE_INFO[v.type]
                const phaseLabel = PHASE_LABEL[v.phase] || v.phase
                const isActive  = v.phase !== 'attente' && v.phase !== 'termine'
                const isDone    = v.phase === 'termine'
                const canConfirm = v.phase === 'en_route'

                return (
                  <div key={v.type} className={`rounded-xl border ${info.bg} ${info.border} p-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.emoji}</span>
                        <span className={`font-bold text-sm ${info.color}`}>{info.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Terminé
                          </span>
                        ) : isActive ? (
                          <span className={`text-xs font-bold ${info.color} px-2.5 py-1 rounded-full border ${info.border} flex items-center gap-1.5`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                            {phaseLabel}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confirm arrival button — shown when service is en_route */}
                    {canConfirm && (
                      <button
                        onClick={() => handleConfirmArrival(v.type)}
                        disabled={confirming === v.type}
                        className={`mt-2.5 w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${info.btnColor}`}
                      >
                        {confirming === v.type ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirmation...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> {info.label} est arrivé — Confirmer</>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live multi-vehicle map */}
          {hasPos && (
            <div className="bg-white rounded-2xl border border-bone shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-bone flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-ink">Suivi en temps réel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate">Live</span>
                </div>
              </div>
              <div style={{ height: 320 }}>
                <MultiVehicleMap emergencyPos={emergPos} vehicles={vehicles} />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-bone shadow-sm p-4 text-center">
              <Shield className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-ink font-black text-2xl">{emergency.nb_victimes || '—'}</p>
              <p className="text-slate text-xs mt-0.5">Victimes signalées</p>
            </div>
            <div className="bg-white rounded-xl border border-bone shadow-sm p-4 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-ink font-black text-2xl">
                {vehicles.filter(v => v.phase !== 'attente').length}/{vehicles.length}
              </p>
              <p className="text-slate text-xs mt-0.5">Services en route</p>
            </div>
          </div>

          {/* Location */}
          {(emergency.adresse || emergency.lat) && (
            <div className="bg-white rounded-xl border border-bone shadow-sm p-4 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                {emergency.adresse && <p className="text-ink text-sm font-medium">{emergency.adresse}</p>}
                {emergency.lat && (
                  <p className="text-slate text-xs font-mono mt-0.5">
                    {Number(emergency.lat).toFixed(5)}, {Number(emergency.lng).toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          )}

          <a href="tel:185" className="flex items-center justify-center gap-3 w-full py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white text-lg transition-colors shadow-lg shadow-red-500/25">
            <Phone className="w-5 h-5" /> Appeler le SAMU : 185
          </a>

          {isTerminated && (
            <button onClick={clearAndReset}
              className="w-full py-3 border-2 border-gray-200 rounded-xl text-slate font-semibold text-sm hover:border-gray-300 transition-colors">
              Fermer et revenir à l'accueil
            </button>
          )}

          <p className="text-center text-slate text-xs pb-4">
            Restez calme. Restez à votre emplacement si possible. Les secours ont votre position.
          </p>
        </div>
      </div>
    )
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="bg-red-600 text-white py-2.5 px-4 text-center">
        <p className="text-sm font-semibold flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" />
          SAMU Côte d'Ivoire : <a href="tel:185" className="text-xl font-black mx-1 hover:underline">185</a> — Disponible 24h/24
        </p>
      </div>

      <div className="pt-16 max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4 relative">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="absolute inset-0 rounded-2xl bg-red-400/20 animate-ping" />
          </div>
          <h1 className="text-3xl font-black text-ink mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Urgence Majeure</h1>
          <p className="text-slate">Pour les catastrophes, incendies, accidents graves et crises collectives</p>
        </div>

        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-amber-700 text-sm font-semibold">Vous devez être connecté pour déclencher une urgence.</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Ce formulaire déclenche une intervention d'urgence. Frais d'activation : 2 000 FCFA. Réservé aux situations réelles.
          </p>
        </div>

        {/* Emergency type */}
        <div className="bg-white rounded-2xl border border-bone shadow-sm p-5">
          <p className="text-ink font-semibold text-sm mb-4">Type d'urgence *</p>
          <div className="grid grid-cols-2 gap-2.5">
            {EMERGENCY_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  selectedType === t.id ? 'border-red-400 bg-red-50' : 'border-bone bg-white hover:border-red-200 hover:bg-red-50/30'
                }`}>
                <span className="text-2xl leading-none">{t.icon}</span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm ${selectedType === t.id ? 'text-red-700' : 'text-ink'}`}>{t.label}</p>
                  <p className="text-slate text-xs mt-0.5 leading-snug">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dispatch preview */}
        {selectedType && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-xs font-semibold mb-2">Services qui seront alertés :</p>
              <div className="flex flex-wrap gap-2">
                {dispatched.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold">
                    {s === 'SAMU' ? '🚑' : s === 'Pompiers' ? '🚒' : '🏥'} {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="bg-white rounded-2xl border border-bone shadow-sm p-5 space-y-5">
          <p className="text-ink font-semibold text-sm">Détails de la situation</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Victimes estimées
              </label>
              <input type="number" min={0} value={nbVictimes} onChange={e => setNbVictimes(Number(e.target.value))}
                className="w-full bg-bone border border-bone rounded-xl px-4 py-3 text-ink text-center font-bold text-lg focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100" />
            </div>
            <div>
              <label className="text-slate text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Incendie présent ?
              </label>
              <div className="flex gap-2 h-[50px]">
                <button onClick={() => setFeu(true)} className={`flex-1 rounded-xl font-bold text-sm border-2 transition-all ${feu ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-bone bg-bone text-slate hover:border-orange-200'}`}>OUI</button>
                <button onClick={() => setFeu(false)} className={`flex-1 rounded-xl font-bold text-sm border-2 transition-all ${!feu ? 'border-slate/30 bg-bone text-ink' : 'border-bone bg-bone text-slate hover:border-slate/20'}`}>NON</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate text-xs font-semibold mb-2 block">Gravité</label>
            <div className="flex gap-2">
              {GRAVITE_OPTIONS.map(g => (
                <button key={g} onClick={() => setGravite(g)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 capitalize transition-all ${
                    gravite === g
                      ? g === 'critique' ? 'border-red-400 bg-red-50 text-red-700'
                        : g === 'élevée' ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-bone bg-bone text-slate hover:border-gray-300'
                  }`}>{g}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate text-xs font-semibold mb-2 block">Description (optionnel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Décrivez brièvement la situation..."
              className="w-full bg-bone border border-bone rounded-xl px-4 py-3 text-ink text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none" />
          </div>

          <div>
            <label className="text-slate text-xs font-semibold mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Localisation</span>
              {gps && <span className="text-green-600 text-[11px] font-mono bg-green-50 px-2 py-0.5 rounded-full">GPS détecté</span>}
            </label>
            <div className="flex gap-2">
              <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)}
                placeholder="Adresse ou description du lieu"
                className="flex-1 bg-bone border border-bone rounded-xl px-4 py-3 text-ink text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100" />
              <button onClick={detectGPS} disabled={gpsLoading}
                className="px-4 py-3 bg-bone border border-bone rounded-xl text-slate hover:border-red-300 hover:text-red-500 transition-all disabled:opacity-50">
                <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Avertissement frais urgence */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Frais d'alerte : 5 000 FCFA</p>
            <p className="text-xs text-amber-600 mt-0.5">Ce montant est débité de votre portefeuille MedMap+ et va directement à la plateforme pour financer les services d'urgence.</p>
          </div>
        </div>

        <button onClick={submit} disabled={!selectedType || sending || !user}
          className="w-full py-5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-500/30">
          {sending ? (
            <><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours...</>
          ) : (
            <><AlertTriangle className="w-6 h-6" /> DÉCLENCHER L'ALERTE — 5 000 FCFA <ChevronRight className="w-5 h-5" /></>
          )}
        </button>

        <a href="tel:185" className="flex items-center justify-center gap-2 text-red-500 hover:text-red-600 font-bold text-base transition-colors">
          <Phone className="w-4 h-4" /> Appel direct SAMU : 185
        </a>
      </div>
    </div>
  )
}
