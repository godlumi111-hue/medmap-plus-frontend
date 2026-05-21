'use client'
import { useState, useEffect, useCallback, use } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { pharmacies as pharmaciesApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  ChevronLeft, Clock, Package,
  CheckCircle, Loader2, ThumbsUp,
  Navigation, Store, Home, Truck, Star, Phone,
} from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// Leaflet requires browser — load dynamically, no SSR
const LiveMap = dynamic(() => import('@/components/tracking/LiveMap'), { ssr: false })

// ── Status labels / styles ─────────────────────────────────────────────────
const STATUS: Record<string, { label: string; sub: string; color: string; bg: string; icon: any }> = {
  vers_pharmacie:   { label: 'En route vers la pharmacie',  sub: 'Le livreur récupère votre commande',    color: 'text-sky-600',     bg: 'bg-sky-50',     icon: Truck },
  arrive_pharmacie: { label: 'Arrivé à la pharmacie',       sub: 'Remise de la commande en cours',        color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Store },
  vers_patient:     { label: 'En route vers le client',     sub: 'Le livreur arrive bientôt !',           color: 'text-indigo-600',  bg: 'bg-indigo-50',  icon: Navigation },
  arrive_patient:   { label: 'Le livreur est là !',         sub: 'Confirmez la réception de la commande', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Home },
  livre:            { label: 'Livraison confirmée',          sub: "Merci d'avoir utilisé MedMap+",         color: 'text-teal-600',    bg: 'bg-teal-50',    icon: CheckCircle },
}

const STEPS = [
  { key: 'vers_pharmacie',   label: 'Vers pharmacie', icon: Truck },
  { key: 'arrive_pharmacie', label: 'Pharmacie',      icon: Store },
  { key: 'vers_patient',     label: 'Vers client',    icon: Navigation },
  { key: 'arrive_patient',   label: 'À la porte',     icon: Home },
  { key: 'livre',            label: 'Livré',          icon: CheckCircle },
]
const STEP_IDX: Record<string, number> = {
  vers_pharmacie: 0, arrive_pharmacie: 1, vers_patient: 2, arrive_patient: 3, livre: 4,
}

function fmt(m: number) {
  if (m <= 0) return '< 1 min'
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, '0')}`
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const orderId  = parseInt(id)
  const { user } = useAuth()
  const role     = user?.role   // 'patient' | 'pharmacie' | 'livreur' | …

  const [tracking, setTracking]     = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone]             = useState(false)

  // ETA / distance / progress — updated by LiveMap via onUpdate callback
  const [etaMin, setEtaMin]     = useState(0)
  const [distM, setDistM]       = useState(0)
  const [progress, setProgress] = useState(0)

  // ── Polling: refresh tracking every 10 s ──────────────────────────────────
  const fetchTracking = useCallback(async () => {
    try { setTracking(await pharmaciesApi.tracking(orderId)) }
    catch {}
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    fetchTracking()
    const i = setInterval(fetchTracking, 10_000)
    return () => clearInterval(i)
  }, [fetchTracking])

  // ── Socket : mise à jour temps réel du statut ──────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()
    function onOrderUpdate(data: any) {
      if (data.order_id !== orderId) return
      setTracking((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          ...(data.livreur_statut != null && { livreur_statut: data.livreur_statut }),
          ...(data.statut         != null && { statut:         data.statut }),
        }
      })
    }
    socket.on('order:update', onOrderUpdate)
    return () => { socket.off('order:update', onOrderUpdate) }
  }, [user?.id, orderId])

  const phase = tracking?.livreur_statut ?? ''

  // Positions
  const pharmacyPos = { lat: tracking?.pharmacy?.lat ?? 5.3520, lng: tracking?.pharmacy?.lng ?? -4.0070 }
  const clientPos   = { lat: tracking?.client_lat    ?? (pharmacyPos.lat + 0.018), lng: tracking?.client_lng ?? (pharmacyPos.lng + 0.022) }

  // ── LiveMap callbacks ──────────────────────────────────────────────────────

  function handleUpdate({ etaMin, distM, progress }: { etaMin: number; distM: number; progress: number }) {
    setEtaMin(etaMin)
    setDistM(distM)
    setProgress(progress)
  }

  async function handlePhaseComplete(event: 'arrive_pharmacie' | 'arrive_patient') {
    // Notify backend (idempotent, safe to call multiple times)
    try {
      await fetch(`${BASE_URL}/pharmacies/orders/${orderId}/sim-arrive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('medmap_token')}`,
        },
        body: JSON.stringify({ event }),
      })
    } catch {}
    // Update UI immediately — next poll will confirm from DB
    setTracking((prev: any) => prev ? { ...prev, livreur_statut: event } : prev)
  }

  // ── Role-based actions ─────────────────────────────────────────────────────

  async function handlePharmacyHandoff() {
    setConfirming(true)
    try {
      await pharmaciesApi.pharmacyHandoff(orderId)
      setTracking((prev: any) => prev ? { ...prev, livreur_statut: 'vers_patient' } : prev)
    } catch {}
    setConfirming(false)
  }

  async function handleConfirmReceipt() {
    setConfirming(true)
    try {
      await pharmaciesApi.confirmReceipt(orderId)
      setTracking((prev: any) => prev ? { ...prev, livreur_statut: 'livre', statut: 'livre' } : prev)
      setDone(true)
    } catch {}
    setConfirming(false)
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  )

  if (!tracking) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <Package className="w-16 h-16 text-gray-200" />
      <p className="text-gray-500 font-semibold text-lg">Suivi introuvable</p>
      <Link href="/commande" className="text-indigo-600 text-sm font-bold hover:underline">← Mes commandes</Link>
    </div>
  )

  const currentStep = STEP_IDX[phase] ?? -1
  const cfg         = STATUS[phase] ?? STATUS.vers_pharmacie
  const CfgIcon     = cfg.icon
  const isMoving    = ['vers_pharmacie', 'vers_patient'].includes(phase)
  const isActive    = phase && phase !== 'livre'

  const showPharmacyHandoff = role === 'pharmacie' && phase === 'arrive_pharmacie' && !done
  const showPatientConfirm  = role === 'patient'   && phase === 'arrive_patient'   && !done

  return (
    <div className="min-h-screen bg-[#F8FAFB]">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/commande" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Retour</span>
        </Link>
        <p className="flex-1 text-sm font-bold text-gray-900">Suivi commande #{orderId}</p>
        {isActive && (
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">EN DIRECT</span>
          </div>
        )}
      </div>

      {/* ── Map — 55 vh, not full-screen ──────────────────────────────────── */}
      <div className="relative h-[55vh] bg-slate-100">
        {tracking.livreur ? (
          <LiveMap
            pharmacyPos={pharmacyPos}
            clientPos={clientPos}
            phase={phase}
            onUpdate={handleUpdate}
            onPhaseComplete={handlePhaseComplete}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 font-semibold">En attente d'un livreur…</p>
            </div>
          </div>
        )}

        {/* ETA floating chip */}
        {isMoving && (etaMin > 0 || distM > 0) && (
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-3 text-center min-w-[78px] pointer-events-none">
            <Clock className="w-4 h-4 text-indigo-500 mx-auto mb-0.5" />
            <p className="text-xl font-black text-gray-900 leading-none">{etaMin > 0 ? etaMin : '< 1'}</p>
            <p className="text-[10px] text-gray-400 font-semibold mb-1">min</p>
            {distM > 0 && (
              <>
                <div className="w-full h-px bg-gray-100 mb-1" />
                <p className="text-xs font-bold text-indigo-600">{fmtDist(distM)}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable info panel ─────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-3 pb-12">

        {/* Status banner */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${cfg.bg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm flex-shrink-0">
            <CfgIcon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{cfg.sub}</p>
          </div>
          {isMoving && etaMin > 0 && (
            <span className={`text-lg font-black flex-shrink-0 ${cfg.color}`}>{fmt(etaMin)}</span>
          )}
        </div>

        {/* Progress steps + bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="relative flex items-start justify-between gap-1">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
            {STEPS.map((step, i) => {
              const d = i < currentStep
              const a = i === currentStep
              const Icon = step.icon
              return (
                <div key={step.key} className="relative z-10 flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    d ? 'bg-teal-500' : a ? 'bg-indigo-500 ring-4 ring-indigo-100' : 'bg-gray-100'
                  }`}>
                    {d
                      ? <CheckCircle className="w-4 h-4 text-white" />
                      : <Icon className={`w-3.5 h-3.5 ${a ? 'text-white' : 'text-gray-400'}`} />
                    }
                  </div>
                  <p className={`text-[9px] font-semibold text-center leading-tight ${
                    d ? 'text-teal-600' : a ? 'text-indigo-600' : 'text-gray-400'
                  }`}>{step.label}</p>
                </div>
              )
            })}
          </div>

          {/* Animated progress bar */}
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full"
              animate={{
                width: `${Math.min(
                  ((currentStep + (isMoving ? progress : 0)) / (STEPS.length - 1)) * 100,
                  100
                )}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Livreur card */}
        {tracking.livreur && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🛵</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{tracking.livreur.prenom} {tracking.livreur.nom}</p>
              <p className="text-xs text-gray-500">Livreur MedMap+</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                ))}
                <span className="text-xs text-gray-400 ml-1">5.0</span>
              </div>
            </div>
            {tracking.livreur.telephone && (
              <a href={`tel:${tracking.livreur.telephone}`}
                className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-emerald-600" />
              </a>
            )}
          </div>
        )}

        {/* Addresses */}
        <div className="space-y-2">
          {tracking.pharmacy?.nom && (
            <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
              <span className="text-lg flex-shrink-0">💊</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-800">{tracking.pharmacy.nom}</p>
                {tracking.pharmacy.adresse && (
                  <p className="text-xs text-amber-600 truncate">{tracking.pharmacy.adresse}</p>
                )}
              </div>
            </div>
          )}
          {tracking.adresse_livraison && (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <span className="text-lg flex-shrink-0">🏠</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-800">Adresse de livraison</p>
                <p className="text-xs text-emerald-700 truncate">{tracking.adresse_livraison}</p>
              </div>
            </div>
          )}
        </div>

        {/* No livreur yet */}
        {!tracking.livreur && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">En attente d'un livreur</p>
            <p className="text-sm text-gray-400 mt-1">Un livreur va bientôt accepter votre commande</p>
          </div>
        )}

        {/* ── PHARMACIE: "Commande remise au livreur" ───────────────────────── */}
        {showPharmacyHandoff && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
              <span className="text-2xl">🛵</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Le livreur est arrivé à la pharmacie !</p>
                <p className="text-xs text-amber-600">Remettez-lui la commande pour démarrer la livraison</p>
              </div>
            </div>
            <button
              onClick={handlePharmacyHandoff}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-amber-500/25 disabled:opacity-60 active:scale-[.98] transition-transform"
            >
              {confirming
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirmation…</>
                : <>🤝 Commande remise au livreur</>
              }
            </button>
          </motion.div>
        )}

        {/* ── PATIENT: "J'ai reçu ma commande" ─────────────────────────────── */}
        {showPatientConfirm && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-3 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Le livreur est à votre porte !</p>
                <p className="text-xs text-emerald-600">Confirmez la réception pour libérer le paiement</p>
              </div>
            </div>
            <button
              onClick={handleConfirmReceipt}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/25 disabled:opacity-60 active:scale-[.98] transition-transform"
            >
              {confirming
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirmation…</>
                : <><ThumbsUp className="w-5 h-5" /> J'ai reçu ma commande</>
              }
            </button>
          </motion.div>
        )}

        {/* Delivered */}
        {(phase === 'livre' || done) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center mb-3">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-bold text-teal-800 text-lg">Livraison confirmée !</p>
              <p className="text-sm text-teal-600 mt-1">Merci d'avoir utilisé MedMap+</p>
            </div>
            <Link href="/commande"
              className="block w-full text-center bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-colors">
              Retour à mes commandes
            </Link>
          </motion.div>
        )}

      </div>
    </div>
  )
}
