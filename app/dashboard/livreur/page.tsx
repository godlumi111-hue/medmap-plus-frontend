'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardNav from '@/components/layout/DashboardNav'
import { useAuth } from '@/lib/auth-context'
import { wallet as walletApi } from '@/lib/api'
import {
  Truck, MapPin, Package, CheckCircle, Clock,
  Loader2, RefreshCw, Navigation, User, Building2,
  Zap, Activity, Wallet, ChevronRight, Eye,
} from 'lucide-react'

const STEP_KEYS  = ['vers_pharmacie', 'arrive_pharmacie', 'vers_patient', 'arrive_patient', 'livre']
const STEP_LABELS: Record<string, string> = {
  vers_pharmacie:   'En route → Pharmacie',
  arrive_pharmacie: 'Arrivé à la pharmacie',
  vers_patient:     'En route → Client',
  arrive_patient:   'Arrivé chez le client',
  livre:            'Livraison terminée',
}
const STEP_COLORS: Record<string, string> = {
  vers_pharmacie:   'bg-sky-100 text-sky-700',
  arrive_pharmacie: 'bg-amber-100 text-amber-700',
  vers_patient:     'bg-violet-100 text-violet-700',
  arrive_patient:   'bg-indigo-100 text-indigo-700',
  livre:            'bg-emerald-100 text-emerald-700',
}

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

function apiGet(path: string) {
  return fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem('medmap_token')}` },
  }).then(r => r.json())
}

async function apiPost(path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('medmap_token')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Erreur')
  return res.json()
}

export default function LivreurDashboard() {
  const { user } = useAuth()
  const [available, setAvailable]   = useState<any[]>([])
  const [myDeliveries, setMyDeliveries] = useState<any[]>([])
  const [history, setHistory]       = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [accepting, setAccepting]   = useState<number | null>(null)
  const [tab, setTab]               = useState<'disponibles' | 'active' | 'historique'>('disponibles')

  const load = useCallback(async () => {
    try {
      const [avail, mine, hist, wlt] = await Promise.allSettled([
        apiGet('/pharmacies/orders/available-deliveries'),
        apiGet('/pharmacies/orders/my-deliveries'),
        apiGet('/pharmacies/orders/livreur-history'),
        walletApi.me(),
      ])
      if (avail.status === 'fulfilled' && Array.isArray(avail.value)) setAvailable(avail.value)
      if (mine.status === 'fulfilled' && Array.isArray(mine.value))  setMyDeliveries(mine.value)
      if (hist.status === 'fulfilled' && Array.isArray(hist.value))  setHistory(hist.value)
      if (wlt.status  === 'fulfilled') setWalletData(wlt.value)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function acceptDelivery(orderId: number) {
    setAccepting(orderId)
    try {
      await apiPost(`/pharmacies/orders/${orderId}/accept-delivery`)
      await load()
      setTab('active')
    } catch (e: any) {
      alert(e.message)
    } finally { setAccepting(null) }
  }

  const solde       = walletData?.solde ?? 0
  const activeCount = myDeliveries.length
  const totalGained = history.reduce((s: number, o: any) => s + (parseFloat(o.frais_livraison) || 700), 0)

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardNav />

      {/* Hero — split éditorial */}
      <div className="pt-16 relative bg-white border-b border-gray-100 overflow-hidden" style={{ minHeight: 230 }}>
        {/* Photo droite */}
        <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/livreur.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white" />
        </div>
        {/* Contenu gauche */}
        <div className="relative max-w-4xl mx-auto px-6 py-8 lg:py-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-violet-600 rounded-full" />
            <p className="text-violet-700 text-xs font-bold uppercase tracking-widest">Espace Livreur</p>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Bonjour, {user?.prenom} 👋
          </h1>
          <p className="text-gray-500 text-sm mb-4">MedMap+ · Livreur partenaire</p>
          {available.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-4 py-1.5 text-sm font-bold animate-pulse">
              📦 {available.length} livraison{available.length > 1 ? 's' : ''} disponible{available.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Stats bandeau */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="py-4 px-4 text-center">
              <p className="text-2xl font-extrabold text-amber-600" style={{ fontFamily: 'Sora, sans-serif' }}>{available.length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Disponibles</p>
            </div>
            <div className="py-4 px-4 text-center">
              <p className="text-2xl font-extrabold text-violet-600" style={{ fontFamily: 'Sora, sans-serif' }}>{activeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">En cours</p>
            </div>
            <div className="py-4 px-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-600" style={{ fontFamily: 'Sora, sans-serif' }}>{loading ? '…' : `${solde.toLocaleString('fr-FR')} F`}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Portefeuille</p>
            </div>
          </div>
        </div>
      </div>

      <main className="pb-16 px-4 sm:px-6 max-w-4xl mx-auto pt-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 mb-5 shadow-sm">
          {([
            { id: 'disponibles', label: `Disponibles (${available.length})` },
            { id: 'active',      label: `En cours (${activeCount})` },
            { id: 'historique',  label: `Historique (${history.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-3">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : (
          <AnimatePresence mode="wait">

            {/* DISPONIBLES */}
            {tab === 'disponibles' && (
              <motion.div key="disp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {available.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="font-semibold text-gray-500">Aucune livraison disponible</p>
                    <p className="text-sm text-gray-400 mt-1">Les nouvelles demandes apparaîtront ici automatiquement.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {available.map((order, i) => {
                      const livFee = parseFloat(order.frais_livraison) || 700
                      return (
                        <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                            <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b border-amber-100">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-bold text-amber-700">Commande #{order.id}</span>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                +{livFee.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Pharmacie</p>
                                  <p className="font-bold text-gray-900 text-sm">{order.pharmacy_nom}</p>
                                  <p className="text-xs text-gray-500 line-clamp-1">{order.pharmacy_adresse}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Livraison</p>
                                  <p className="font-bold text-gray-900 text-sm">{order.patient_prenom} {order.patient_nom}</p>
                                  <p className="text-xs text-gray-500 line-clamp-1">{order.adresse_livraison || 'Adresse non précisée'}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  {Array.isArray(order.items) ? order.items.length : 0} article{Array.isArray(order.items) && order.items.length > 1 ? 's' : ''}
                                </p>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => acceptDelivery(order.id)}
                                  disabled={accepting === order.id}
                                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 shadow-md shadow-violet-500/20"
                                >
                                  {accepting === order.id
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Acceptation…</>
                                    : <><Truck className="w-4 h-4" /> Accepter</>
                                  }
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* EN COURS */}
            {tab === 'active' && (
              <motion.div key="active" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {myDeliveries.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="font-semibold text-gray-500">Aucune livraison en cours</p>
                    <button onClick={() => setTab('disponibles')} className="mt-3 text-sm text-violet-600 font-semibold hover:underline">
                      Voir les livraisons disponibles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myDeliveries.map(order => {
                      const livreurStatut = order.livreur_statut || 'vers_pharmacie'
                      const currentIdx    = STEP_KEYS.indexOf(livreurStatut)
                      const livFee        = parseFloat(order.frais_livraison) || 700

                      return (
                        <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-3 flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Commande #{order.id}</span>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STEP_COLORS[livreurStatut] ?? 'bg-white/20 text-white'}`}>
                                {STEP_LABELS[livreurStatut] ?? livreurStatut}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="px-4 pt-4 pb-2">
                              <div className="flex items-center gap-0">
                                {STEP_KEYS.map((s, idx) => (
                                  <div key={s} className="flex items-center flex-1 last:flex-none">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                      idx < currentIdx  ? 'bg-emerald-500 text-white' :
                                      idx === currentIdx ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      {idx < currentIdx ? '✓' : idx + 1}
                                    </div>
                                    {idx < STEP_KEYS.length - 1 && (
                                      <div className={`h-1 flex-1 mx-1 rounded-full ${idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between mt-1 px-0.5">
                                <span className="text-[9px] text-gray-400">Pharmacie</span>
                                <span className="text-[9px] text-gray-400">Arrivé</span>
                                <span className="text-[9px] text-gray-400">Vers client</span>
                                <span className="text-[9px] text-gray-400">Arrivé</span>
                                <span className="text-[9px] text-gray-400">Livré</span>
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <p className="text-xs text-gray-400 mb-1"><Building2 className="w-3 h-3 inline mr-1" />Pharmacie</p>
                                  <p className="font-bold text-gray-900 text-sm">{order.pharmacy_nom}</p>
                                  {order.pharmacy_tel && (
                                    <a href={`tel:${order.pharmacy_tel}`} className="text-xs text-violet-600">{order.pharmacy_tel}</a>
                                  )}
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <p className="text-xs text-gray-400 mb-1"><User className="w-3 h-3 inline mr-1" />Client</p>
                                  <p className="font-bold text-gray-900 text-sm">{order.patient_prenom} {order.patient_nom}</p>
                                  {order.patient_tel && (
                                    <a href={`tel:${order.patient_tel}`} className="text-xs text-violet-600">{order.patient_tel}</a>
                                  )}
                                </div>
                              </div>

                              {order.adresse_livraison && (
                                <div className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
                                  <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-indigo-700">{order.adresse_livraison}</p>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                                  <Wallet className="w-4 h-4" />
                                  Gains : {livFee.toLocaleString('fr-FR')} FCFA
                                  <span className="text-xs font-normal text-gray-400">(après confirmation client)</span>
                                </div>
                                <Link
                                  href={`/tracking/${order.id}`}
                                  className="flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Suivi
                                </Link>
                              </div>

                              {/* Status info — no action buttons */}
                              {livreurStatut === 'arrive_pharmacie' && (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-800 flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                  En attente de la pharmacie pour remettre la commande
                                </div>
                              )}
                              {livreurStatut === 'arrive_patient' && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-indigo-800 flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                  En attente de la confirmation du patient
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* HISTORIQUE */}
            {tab === 'historique' && (
              <motion.div key="hist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {history.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Activity className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="font-semibold text-gray-500">Aucune livraison effectuée</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Gains totaux</p>
                        <p className="text-2xl font-bold text-emerald-600">{totalGained.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {history.map((order, i) => {
                        const livFee = parseFloat(order.frais_livraison) || 700
                        return (
                          <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">Commande #{order.id}</p>
                                <p className="text-xs text-gray-500 truncate">{order.pharmacy_nom} → {order.patient_prenom} {order.patient_nom}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-emerald-600">+{livFee.toLocaleString('fr-FR')} FCFA</p>
                                <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>
    </div>
  )

}
