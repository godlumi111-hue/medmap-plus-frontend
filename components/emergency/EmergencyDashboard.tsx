'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import AlarmOverlay from '@/components/emergency/AlarmOverlay'
import type { EmergencyAlert } from '@/components/emergency/AlarmOverlay'
import { majorEmergency } from '@/lib/api'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import { getSocket } from '@/lib/socket'
import {
  Clock, MapPin, Users, Flame, AlertTriangle, CheckCircle,
  RefreshCw, Shield, Radio,
} from 'lucide-react'

const EmergencyMap = dynamic(() => import('@/components/emergency/EmergencyMap'), { ssr: false })

type EmergencyPhase = 'attente' | 'en_route' | 'sur_place' | 'vers_hopital' | 'termine'

const TYPE_ICONS: Record<string, string> = {
  incendie: '🔥', accident_grave: '🚗', explosion: '💥', malaise_collectif: '😷',
  catastrophe: '🌊', animal_dangereux: '🐯', effondrement: '🏚', urgence_medicale: '🏥', autre: '🆘',
}
const TYPE_LABELS: Record<string, string> = {
  incendie: 'Incendie', accident_grave: 'Accident grave', explosion: 'Explosion',
  malaise_collectif: 'Malaise collectif', catastrophe: 'Catastrophe',
  animal_dangereux: 'Animal dangereux', effondrement: 'Effondrement',
  urgence_medicale: 'Urgence médicale', autre: 'Urgence majeure',
}

const PHASE_MAP: Record<string, EmergencyPhase> = {
  en_route: 'en_route', sur_place: 'sur_place',
  prise_en_charge: 'sur_place', vers_hopital: 'vers_hopital', termine: 'termine',
}

// ── Config per role ───────────────────────────────────────────────────────────
export interface RoleConfig {
  role: 'samu' | 'pompiers' | 'ambulance'
  label: string
  emoji: string
  vehicleType: 'ambulance' | 'pompiers' | 'samu'
  missionStatuts: string[]
  statutLabels: Record<string, string>
  accent: {
    serviceColor: string   // badge bg
    headerBg: string       // mission header
    progressBar: string    // progress bar color
    btnActive: string      // active status button
    btnHover: string       // hover status button
    indicatorBg: string    // "en service" badge
    indicatorText: string
    indicatorDot: string
    listBtnBg: string      // "voir alerte" button
    listBtnHover: string
  }
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  samu: {
    role: 'samu',
    label: 'SAMU — Centre de commandement',
    emoji: '🚑',
    vehicleType: 'samu',
    missionStatuts: ['prise_en_charge', 'vers_hopital', 'termine'],
    statutLabels: {
      en_route: '🚑 En route', sur_place: '📍 Sur place',
      prise_en_charge: '🏥 Patient pris en charge', vers_hopital: '🚑 Vers l\'hôpital', termine: '✅ Terminé',
    },
    accent: {
      serviceColor: 'text-red-400', headerBg: 'bg-red-800', progressBar: 'bg-red-500',
      btnActive: 'border-red-500 bg-red-900/40 text-red-300',
      btnHover: 'hover:border-red-600 hover:text-red-300',
      indicatorBg: 'bg-green-900/40 border-green-700/50', indicatorText: 'text-green-400', indicatorDot: 'bg-green-400',
      listBtnBg: 'bg-red-600', listBtnHover: 'hover:bg-red-700',
    },
  },
  pompiers: {
    role: 'pompiers',
    label: 'Pompiers — Centre opérationnel',
    emoji: '🚒',
    vehicleType: 'pompiers',
    missionStatuts: ['prise_en_charge', 'termine'],
    statutLabels: {
      en_route: '🚒 En route', sur_place: '📍 Sur place',
      prise_en_charge: '🔥 Situation maîtrisée', termine: '✅ Terminé',
    },
    accent: {
      serviceColor: 'text-orange-400', headerBg: 'bg-orange-800', progressBar: 'bg-orange-500',
      btnActive: 'border-orange-500 bg-orange-900/40 text-orange-300',
      btnHover: 'hover:border-orange-600 hover:text-orange-300',
      indicatorBg: 'bg-orange-900/40 border-orange-700/50', indicatorText: 'text-orange-400', indicatorDot: 'bg-orange-400',
      listBtnBg: 'bg-orange-600', listBtnHover: 'hover:bg-orange-700',
    },
  },
  ambulance: {
    role: 'ambulance',
    label: 'Ambulance — Tableau de bord',
    emoji: '🚑',
    vehicleType: 'ambulance',
    missionStatuts: ['prise_en_charge', 'vers_hopital', 'termine'],
    statutLabels: {
      en_route: '🚑 En route', sur_place: '📍 Sur place',
      prise_en_charge: '🏥 Patient pris en charge', vers_hopital: '🏥 Vers l\'hôpital', termine: '✅ Terminé',
    },
    accent: {
      serviceColor: 'text-blue-400', headerBg: 'bg-blue-900', progressBar: 'bg-blue-500',
      btnActive: 'border-blue-500 bg-blue-900/40 text-blue-300',
      btnHover: 'hover:border-blue-600 hover:text-blue-300',
      indicatorBg: 'bg-blue-900/40 border-blue-700/50', indicatorText: 'text-blue-400', indicatorDot: 'bg-blue-400',
      listBtnBg: 'bg-blue-600', listBtnHover: 'hover:bg-blue-700',
    },
  },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmergencyDashboard({ config }: { config: RoleConfig }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { role, emoji, label, vehicleType, missionStatuts, statutLabels, accent } = config

  // Single redirect guard — router.replace avoids full page reloads (no repeated server GETs)
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth/login'); return }
    if (user.role !== role) {
      const dest = getDashboardRoute(user.role)
      if (dest !== `/dashboard/${role}`) router.replace(dest)
    }
  }, [authLoading, user, role, router])

  const [emergencies, setEmergencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [alarm, setAlarm] = useState<EmergencyAlert | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [activeEmergency, setActiveEmergency] = useState<any>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [mapInfo, setMapInfo] = useState<{ etaMin: number; distM: number; progress: number } | null>(null)

  // Track which emergencies we've already shown the alarm for (session-level)
  const seenIds = useRef(new Set<number>())
  const restoredRef = useRef(false)
  const activeEmergencyRef = useRef<any>(null)  // stable ref to avoid stale closures in socket handlers
  const lastVehiclePosRef = useRef<{ lat: number; lng: number; etaMin: number } | null>(null)

  // Derive my current response + statut from activeEmergency (no separate state)
  const myResponse = activeEmergency?.responses?.find((r: any) => Number(r.responder_id) === Number(user?.id))
  const myStatut = myResponse?.statut ?? null
  const mapPhase: EmergencyPhase = PHASE_MAP[myStatut || ''] || (activeEmergency ? 'en_route' : 'attente')

  const lsKey = `medmap_active_mission_${role}`

  // ── Load & alarm check ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id || user.role !== role) return
    // Pre-populate seenIds with stored mission to prevent alarm re-fire on reconnect
    const storedMissionId = localStorage.getItem(lsKey)
    try {
      const data = await majorEmergency.list()
      setEmergencies(data)

      for (const e of data) {
        if (e.statut === 'termine') continue
        const myResp = e.responses?.find((r: any) => Number(r.responder_id) === Number(user.id))
        // Already accepted OR is our stored active mission: mark seen, never alarm again
        if (myResp || (storedMissionId && Number(storedMissionId) === e.id)) {
          seenIds.current.add(e.id)
          continue
        }
        if (!seenIds.current.has(e.id)) {
          seenIds.current.add(e.id)
          setAlarm({
            id: e.id, type: e.type, description: e.description,
            nb_victimes: e.nb_victimes, feu: e.feu, gravite: e.gravite,
            lat: e.lat, lng: e.lng, adresse: e.adresse, created_at: e.created_at,
          })
          break
        }
      }
    } catch {}
    setLoading(false)
  }, [user?.id, lsKey])

  // ── Poll every 15s ───────────────────────────────────────────────────────
  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  // ── Keep activeEmergency fresh from poll data ─────────────────────────────
  useEffect(() => {
    if (!activeEmergency) return
    const fresh = emergencies.find(e => e.id === activeEmergency.id)
    if (fresh) {
      setActiveEmergency(fresh)
      activeEmergencyRef.current = fresh
    }
  }, [emergencies]) // eslint-disable-line

  // ── Restore active mission from localStorage ─────────────────────────────
  useEffect(() => {
    if (restoredRef.current || loading) return
    restoredRef.current = true
    const storedId = localStorage.getItem(lsKey)
    if (!storedId) return
    const id = parseInt(storedId)
    const stored = emergencies.find(e => e.id === id)
    if (stored && stored.statut !== 'termine') {
      setActiveEmergency(stored)
      activeEmergencyRef.current = stored
    } else {
      localStorage.removeItem(lsKey)
    }
  }, [loading, emergencies, lsKey])

  // ── Real-time socket ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const socket = getSocket()

    const newHandler = () => { load() }

    const updateHandler = (data: any) => {
      load()
      const current = activeEmergencyRef.current
      if (current && data.emergency_id === current.id) {
        majorEmergency.get(data.emergency_id).then(fresh => {
          setActiveEmergency(fresh)
          activeEmergencyRef.current = fresh
          localStorage.setItem(lsKey, String(data.emergency_id))
        }).catch(() => {})
      }
    }

    socket.on('major_emergency:new', newHandler)
    socket.on('major_emergency:update', updateHandler)
    return () => {
      socket.off('major_emergency:new', newHandler)
      socket.off('major_emergency:update', updateHandler)
    }
  }, [load, user?.id, lsKey])

  // ── Periodic vehicle position sync to backend (every 5s while en_route) ─
  useEffect(() => {
    if (!activeEmergency?.id || mapPhase !== 'en_route') return
    const id = setInterval(() => {
      const pos = lastVehiclePosRef.current
      if (!pos) return
      majorEmergency.updatePosition(activeEmergency.id, {
        lat: pos.lat, lng: pos.lng, eta_minutes: pos.etaMin,
      }).catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [activeEmergency?.id, mapPhase])

  // ── Accept mission ───────────────────────────────────────────────────────
  async function handleAccept(id: number) {
    setAccepting(true)
    try {
      await majorEmergency.accept(id)
      setAlarm(null)
      await load()
      const fresh = await majorEmergency.get(id)
      setActiveEmergency(fresh)
      activeEmergencyRef.current = fresh
      localStorage.setItem(lsKey, String(id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAccepting(false)
    }
  }

  // ── Update mission status ────────────────────────────────────────────────
  async function updateStatus(statut: string) {
    if (!activeEmergency) return
    setUpdatingStatus(true)
    try {
      await majorEmergency.updateStatus(activeEmergency.id, statut)
      if (statut === 'termine') {
        localStorage.removeItem(lsKey)
        setActiveEmergency(null)
        activeEmergencyRef.current = null
      }
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const activeList = emergencies.filter(e => e.statut !== 'termine')
  const doneList   = emergencies.filter(e => e.statut === 'termine').slice(0, 5)

  // Spinner while auth resolves or redirect is pending — never call window.location during render
  if (authLoading || !user || user.role !== role) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <AlarmOverlay
        alert={alarm}
        onAccept={handleAccept}
        onDismiss={() => setAlarm(null)}
        loading={accepting}
      />

      {/* Photo Hero */}
      <div className="pt-16 relative overflow-hidden" style={{ minHeight: 200 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/samu.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/97 via-gray-900/90 to-gray-900/55" />
        <div className="relative max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 border border-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl">{emoji}</div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Centre opérationnel</p>
              <h1 className="text-white font-black text-2xl" style={{ fontFamily: 'Sora, sans-serif' }}>{label}</h1>
              <p className="text-gray-300 text-sm mt-0.5">{user?.prenom} {user?.nom}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-4 py-2 ${accent.indicatorBg} border rounded-xl`}>
              <div className={`w-2 h-2 ${accent.indicatorDot} rounded-full animate-pulse`} />
              <span className={`${accent.indicatorText} text-xs font-bold`}>EN SERVICE</span>
            </div>
            <button onClick={load} className="p-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: emergencies.length, icon: Radio, color: accent.serviceColor },
            { label: 'En cours', value: activeList.length, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Terminées', value: doneList.length, icon: CheckCircle, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
              <p className={`font-black text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active mission */}
        {activeEmergency && (
          <div className={`bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden`}>
            <div className={`${accent.headerBg} px-5 py-3 flex items-center justify-between`}>
              <div>
                <p className="text-white/70 text-xs font-mono uppercase">Mission active</p>
                <h2 className="text-white font-black text-lg">
                  {TYPE_ICONS[activeEmergency.type] || '🆘'} {TYPE_LABELS[activeEmergency.type] || activeEmergency.type} — #{activeEmergency.id}
                </h2>
              </div>
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
                {statutLabels[myStatut || ''] || (myStatut ? myStatut.replace(/_/g, ' ') : 'EN ROUTE')}
              </span>
            </div>

            {activeEmergency.lat && (
              <div style={{ height: 280 }}>
                <EmergencyMap
                  emergencyPos={{ lat: Number(activeEmergency.lat), lng: Number(activeEmergency.lng) }}
                  phase={mapPhase}
                  vehicleType={vehicleType}
                  onUpdate={(info) => {
                    setMapInfo({ etaMin: info.etaMin, distM: info.distM, progress: info.progress })
                    if (info.lat !== undefined) lastVehiclePosRef.current = { lat: info.lat, lng: info.lng!, etaMin: info.etaMin }
                  }}
                />
              </div>
            )}

            {mapInfo && mapPhase === 'en_route' && (
              <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-4 text-sm">
                <span className="text-gray-400">{(mapInfo.distM / 1000).toFixed(1)} km</span>
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${accent.progressBar} rounded-full transition-all`} style={{ width: `${mapInfo.progress}%` }} />
                </div>
                <span className="text-white font-bold">{mapInfo.etaMin} min</span>
              </div>
            )}

            {/* Status buttons */}
            <div className="px-5 py-4 border-t border-gray-800">
              {/* Current status display */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Statut actuel :</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${accent.btnActive}`}>
                  {statutLabels[myStatut || ''] || (myStatut?.replace(/_/g, ' ') || 'En route')}
                </span>
              </div>

              {/* Waiting for patient confirmation */}
              {myStatut === 'en_route' && (
                <div className="mb-3 px-3 py-2.5 bg-yellow-900/30 border border-yellow-700/40 rounded-xl flex items-center gap-2">
                  <span className="text-lg">⏳</span>
                  <p className="text-yellow-300 text-xs font-semibold">En attente de confirmation d'arrivée par le patient</p>
                </div>
              )}

              {myStatut === 'sur_place' && (
                <div className="mb-3 px-3 py-2.5 bg-green-900/30 border border-green-700/40 rounded-xl flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <p className="text-green-300 text-xs font-semibold">Arrivée confirmée par le patient — vous pouvez continuer</p>
                </div>
              )}

              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Prochaine action</p>
              <div className="flex flex-wrap gap-2">
                {missionStatuts.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updatingStatus || myStatut === s || myStatut === 'en_route'}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-30 ${
                      myStatut === s
                        ? accent.btnActive
                        : `border-gray-700 bg-gray-800 text-gray-300 ${accent.btnHover}`
                    }`}
                  >
                    {statutLabels[s] || s}
                  </button>
                ))}
              </div>
              {myStatut === 'en_route' && (
                <p className="text-gray-600 text-xs mt-2">Les actions se débloquent après confirmation du patient</p>
              )}
            </div>

            {/* Details */}
            <div className="px-5 pb-4 grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-white font-black text-lg">{activeEmergency.nb_victimes || '?'}</p>
                <p className="text-gray-400 text-xs">Victimes</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <Flame className={`w-4 h-4 mx-auto mb-1 ${activeEmergency.feu ? 'text-orange-400' : 'text-gray-600'}`} />
                <p className={`font-black text-lg ${activeEmergency.feu ? 'text-orange-400' : 'text-gray-500'}`}>
                  {activeEmergency.feu ? 'OUI' : 'NON'}
                </p>
                <p className="text-gray-400 text-xs">Incendie</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-yellow-300 font-black text-sm uppercase">{activeEmergency.gravite || 'Critique'}</p>
                <p className="text-gray-400 text-xs">Gravité</p>
              </div>
            </div>
            {activeEmergency.adresse && (
              <div className="px-5 pb-5">
                <div className="flex items-start gap-2 bg-gray-800 rounded-xl px-4 py-3">
                  <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-200 text-sm">{activeEmergency.adresse}</p>
                    {activeEmergency.lat && (
                      <p className="text-gray-500 text-xs font-mono mt-0.5">
                        {Number(activeEmergency.lat).toFixed(5)}, {Number(activeEmergency.lng).toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Co-responders */}
            {activeEmergency.responses?.length > 1 && (
              <div className="px-5 pb-5">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">Autres services</p>
                <div className="flex flex-wrap gap-2">
                  {activeEmergency.responses
                    .filter((r: any) => r.responder_id !== user?.id)
                    .map((r: any) => (
                      <span key={r.id} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1 rounded-lg">
                        {r.responder_role?.toUpperCase()} — {r.statut?.replace(/_/g, ' ')}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency list */}
        <div>
          <h2 className="text-white font-bold text-base mb-3">Urgences actives ({activeList.length})</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement...
            </div>
          ) : activeList.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
              <Shield className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune urgence active</p>
              <p className="text-gray-600 text-sm mt-1">En attente d'alerte...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map(e => {
                const myResp = e.responses?.find((r: any) => r.responder_id === user?.id)
                const hasResponded = !!myResp
                return (
                  <div key={e.id} className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${
                    activeEmergency?.id === e.id ? 'border-gray-600' : 'border-gray-800 hover:border-gray-700'
                  }`}>
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl shrink-0">
                        {TYPE_ICONS[e.type] || '🆘'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-white font-bold text-sm">{TYPE_LABELS[e.type] || e.type}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            e.statut === 'nouveau' ? 'bg-red-600 text-white' :
                            e.statut === 'accepte' ? 'bg-amber-500 text-white' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {e.statut?.toUpperCase()}
                          </span>
                          {hasResponded && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-800 text-green-200">
                              MON STATUT : {myResp.statut?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.nb_victimes || '?'} victime(s)</span>
                          {e.gravite && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{e.gravite}</span>}
                          {e.feu ? <span className="text-orange-400 flex items-center gap-1"><Flame className="w-3 h-3" />Feu actif</span> : null}
                          {e.adresse && <span className="flex items-center gap-1 max-w-[200px] truncate"><MapPin className="w-3 h-3 shrink-0" />{e.adresse}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {!hasResponded && e.statut !== 'termine' && (
                          <button
                            onClick={() => {
                              seenIds.current.add(e.id)
                              setAlarm({
                                id: e.id, type: e.type, description: e.description,
                                nb_victimes: e.nb_victimes, feu: e.feu, gravite: e.gravite,
                                lat: e.lat, lng: e.lng, adresse: e.adresse,
                              })
                            }}
                            className={`px-3 py-1.5 ${accent.listBtnBg} ${accent.listBtnHover} text-white rounded-lg text-xs font-bold transition-colors`}
                          >
                            Voir l'alerte
                          </button>
                        )}
                        {hasResponded && activeEmergency?.id !== e.id && (
                          <button
                            onClick={() => setActiveEmergency(e)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Gérer
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Other responders */}
                    {e.responses?.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {e.responses.map((r: any) => (
                          <span key={r.id} className={`text-[10px] px-2 py-1 rounded-lg border font-semibold ${
                            r.responder_id === user?.id
                              ? 'bg-blue-900/40 border-blue-700/50 text-blue-300'
                              : 'bg-gray-800 border-gray-700 text-gray-400'
                          }`}>
                            {r.responder_role?.toUpperCase()} — {r.statut?.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Completed */}
        {doneList.length > 0 && (
          <div>
            <h2 className="text-gray-500 font-bold text-xs mb-3 uppercase tracking-widest">Interventions récentes</h2>
            <div className="space-y-2">
              {doneList.map(e => (
                <div key={e.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 flex items-center gap-3 opacity-60">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-gray-400 text-sm">{TYPE_ICONS[e.type]} {TYPE_LABELS[e.type] || e.type}</span>
                  <span className="text-gray-600 text-xs ml-auto">
                    {new Date(e.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
