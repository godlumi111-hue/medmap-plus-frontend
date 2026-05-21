'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ConversationPanel from '@/components/messaging/ConversationPanel'
import { useAuth } from '@/lib/auth-context'
import { pharmacies, users, wallet } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  ShoppingBag, Package, Wallet as WalletIcon, Clock,
  CheckCircle, XCircle, ChevronRight, Loader2, MapPin,
  Phone, Moon, MessageCircle, Truck, RefreshCw, User,
  TrendingUp, AlertCircle, ChevronDown, ChevronUp, Navigation,
} from 'lucide-react'

const ORDER_STATUS: Record<string, {
  label: string; color: string; dot: string;
  next?: string; nextLabel?: string; nextColor?: string;
}> = {
  en_attente:     { label: 'En attente',     color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   next: 'confirme',       nextLabel: '✓ Accepter',   nextColor: 'bg-emerald-600 hover:bg-emerald-700' },
  confirme:       { label: 'Acceptée',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', next: 'en_preparation', nextLabel: '🔄 Préparer', nextColor: 'bg-amber-600 hover:bg-amber-700' },
  en_preparation: { label: 'En préparation · Attente livreur', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  en_route:       { label: 'Livreur en route vers client',     color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  livre:          { label: 'Livrée',          color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  annule:         { label: 'Annulée',         color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
}

type TabFilter = 'all' | 'en_attente' | 'en_cours' | 'livre' | 'annule'

export default function PharmacieDashboard() {
  const { user } = useAuth()
  const [garde, setGarde] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [chat, setChat] = useState<{ orderId: number; patientUserId: number; patientName: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const loadData = useCallback(() => {
    Promise.allSettled([
      pharmacies.pharmacyOrders(),
      wallet.me(),
      users.myProfile(),
    ]).then(([ord, w, prof]) => {
      if (ord.status === 'fulfilled') setOrders(ord.value)
      if (w.status === 'fulfilled') setWalletData(w.value)
      if (prof.status === 'fulfilled') setProfile(prof.value?.profile ?? null)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Socket.io real-time updates
  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()

    function handleNewOrder() { loadData() }
    function handleOrderUpdate(data: any) {
      setOrders(prev => prev.map(o => {
        if (o.id !== data.order_id) return o
        // Merge only the fields actually present in the event payload
        return {
          ...o,
          ...(data.statut          != null && { statut:          data.statut }),
          ...(data.livreur_statut  != null && { livreur_statut:  data.livreur_statut }),
          ...(data.livreur_id      != null && { livreur_id:      data.livreur_id }),
          ...(data.livreur_prenom  != null && { livreur_prenom:  data.livreur_prenom }),
          ...(data.livreur_nom     != null && { livreur_nom:     data.livreur_nom }),
        }
      }))
    }

    socket.on('order:new', handleNewOrder)
    socket.on('order:update', handleOrderUpdate)
    return () => {
      socket.off('order:new', handleNewOrder)
      socket.off('order:update', handleOrderUpdate)
    }
  }, [user?.id, loadData])

  async function handleStatus(orderId: number, newStatut: string) {
    setUpdatingId(orderId)
    try {
      await pharmacies.updateOrderStatus(orderId, newStatut)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, statut: newStatut } : o))
    } catch {}
    finally { setUpdatingId(null) }
  }

  async function handleRefuse(orderId: number) {
    setUpdatingId(orderId)
    try {
      await pharmacies.updateOrderStatus(orderId, 'annule')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, statut: 'annule' } : o))
    } catch {}
    finally { setUpdatingId(null) }
  }

  const filteredOrders = orders.filter(o => {
    if (tab === 'all') return true
    if (tab === 'en_attente') return ['en_attente', 'en_preparation'].includes(o.statut) && !o.livreur_id
    if (tab === 'en_cours')   return (o.statut === 'en_preparation' && o.livreur_id) || o.statut === 'en_route'
    if (tab === 'livre')      return o.statut === 'livre'
    if (tab === 'annule')     return o.statut === 'annule'
    return true
  })

  const newCount        = orders.filter(o => ['en_attente', 'en_preparation'].includes(o.statut) && !o.livreur_id).length
  const inProgressCount = orders.filter(o => (o.statut === 'en_preparation' && o.livreur_id) || o.statut === 'en_route').length
  const deliveredCount = orders.filter(o => o.statut === 'livre').length
  const solde = walletData?.solde ?? 0
  const pharmacyName = profile?.nom ?? (`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Pharmacie')

  const TABS: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'Toutes', count: orders.length },
    { key: 'en_attente', label: 'Nouvelles', count: newCount },
    { key: 'en_cours', label: 'En cours', count: inProgressCount },
    { key: 'livre', label: 'Livrées', count: deliveredCount },
    { key: 'annule', label: 'Annulées' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 py-10 px-4 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💊</span>
                <p className="text-white/70 text-sm font-medium">Espace Pharmacie</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{pharmacyName}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile?.ville && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5" /> {profile.ville}
                  </span>
                )}
                {profile?.telephone && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 font-semibold">
                    <Phone className="w-3.5 h-3.5" /> {profile.telephone}
                  </span>
                )}
                {newCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs bg-red-500/80 rounded-full px-3 py-1 font-bold animate-pulse">
                    🔔 {newCount} nouvelle{newCount > 1 ? 's' : ''} commande{newCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Garde toggle */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 self-start sm:self-auto">
              <Moon className={`w-4 h-4 ${garde ? 'text-yellow-300' : 'text-white/50'}`} />
              <div>
                <p className="text-sm font-bold">{garde ? 'De garde' : 'Hors garde'}</p>
                <p className="text-[11px] text-white/70">{garde ? 'Ouvert 24h/24' : 'Horaires normaux'}</p>
              </div>
              <button
                onClick={() => setGarde(!garde)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${garde ? 'bg-yellow-400' : 'bg-white/30'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${garde ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Nouvelles', value: loading ? '…' : String(newCount), sub: 'en attente', icon: AlertCircle, grad: 'from-amber-500 to-orange-500' },
              { label: 'En cours', value: loading ? '…' : String(inProgressCount), sub: 'préparation/route', icon: Clock, grad: 'from-blue-500 to-indigo-500' },
              { label: 'Livrées', value: loading ? '…' : String(deliveredCount), sub: 'au total', icon: CheckCircle, grad: 'from-emerald-500 to-teal-500' },
              { label: 'Solde', value: loading ? '…' : `${solde.toLocaleString('fr-FR')} F`, sub: 'FCFA disponible', icon: WalletIcon, grad: 'from-violet-500 to-purple-500' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Orders panel */}
            <div className="lg:col-span-2 space-y-4">

              {/* Tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      tab === t.key
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
                    }`}
                  >
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 ${
                        tab === t.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>{t.count}</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={loadData}
                  className="ml-auto p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Orders list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500 text-sm">Aucune commande</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {tab === 'all' ? 'Les commandes apparaîtront ici' : 'Aucune commande dans cette catégorie'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredOrders.map(cmd => {
                      const st = ORDER_STATUS[cmd.statut] ?? ORDER_STATUS.en_attente
                      const items = Array.isArray(cmd.items) ? cmd.items : []
                      const patientName = `${cmd.patient_prenom ?? ''} ${cmd.patient_nom ?? ''}`.trim() || 'Patient'
                      const isExpanded = expandedOrder === cmd.id
                      const isUpdating = updatingId === cmd.id

                      return (
                        <div key={cmd.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Order row */}
                          <div
                            className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                            onClick={() => setExpandedOrder(isExpanded ? null : cmd.id)}
                          >
                            {/* Status dot */}
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />

                            {/* Patient avatar */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {patientName.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Commande #{cmd.id} · {items.length} article{items.length > 1 ? 's' : ''} · {(cmd.montant_total || 0).toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>

                            {/* Expand icon */}
                            <div className="text-gray-400 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-3">

                                  {/* Patient info */}
                                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">{patientName}</p>
                                      {cmd.patient_tel && (
                                        <p className="text-xs text-gray-500">{cmd.patient_tel}</p>
                                      )}
                                      {cmd.adresse_livraison && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3 text-gray-400" />
                                          <p className="text-xs text-gray-500">{cmd.adresse_livraison}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Livreur info */}
                                  {cmd.livreur_id ? (
                                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
                                          <Truck className="w-3.5 h-3.5" /> Livreur assigné
                                        </p>
                                        <Link
                                          href={`/tracking/${cmd.id}`}
                                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                          <Navigation className="w-3 h-3" /> Suivi en direct
                                        </Link>
                                      </div>
                                      <p className="text-sm font-semibold text-gray-800">
                                        {cmd.livreur_prenom ? `${cmd.livreur_prenom} ${cmd.livreur_nom}` : `Livreur #${cmd.livreur_id}`}
                                      </p>
                                      <p className="text-xs text-violet-600 mt-0.5">
                                        {cmd.livreur_statut === 'vers_pharmacie'   ? '🏃 En route vers la pharmacie' :
                                         cmd.livreur_statut === 'arrive_pharmacie' ? '🏪 Arrivé à la pharmacie — remise en attente' :
                                         cmd.livreur_statut === 'vers_patient'     ? '🚀 En route vers le patient' :
                                         cmd.livreur_statut === 'arrive_patient'   ? '🚪 Arrivé chez le patient' :
                                         cmd.livreur_statut === 'livre'            ? '✅ Livré' :
                                         cmd.livreur_statut ?? '—'}
                                      </p>
                                    </div>
                                  ) : ['en_attente', 'en_preparation'].includes(cmd.statut) ? (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> En attente d'un livreur disponible…
                                      </p>
                                    </div>
                                  ) : null}

                                  {/* Items list */}
                                  {items.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Médicaments</p>
                                      {items.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                          <span className="text-gray-700">• Médicament #{item.medicine_id}</span>
                                          <span className="font-semibold text-gray-900">x{item.quantite}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Total */}
                                  <div className="flex justify-between items-center bg-teal-50 rounded-xl px-3 py-2">
                                    <span className="text-sm font-bold text-teal-900">Total</span>
                                    <span className="text-base font-bold text-teal-700">
                                      {(cmd.montant_total || 0).toLocaleString('fr-FR')} FCFA
                                    </span>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-wrap gap-2">
                                    {/* Message button */}
                                    <button
                                      onClick={() => setChat({
                                        orderId: cmd.id,
                                        patientUserId: cmd.patient_user_id,
                                        patientName,
                                      })}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-teal-300 hover:text-teal-600 transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> Message
                                    </button>

                                    {/* Refuse button */}
                                    {['en_attente', 'confirme', 'en_preparation'].includes(cmd.statut) && !cmd.livreur_id && (
                                      <button
                                        onClick={() => handleRefuse(cmd.id)}
                                        disabled={isUpdating}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                                      >
                                        <XCircle className="w-3.5 h-3.5" /> Refuser
                                      </button>
                                    )}

                                    {/* "Commande remise au livreur" — only when livreur is at pharmacy */}
                                    {cmd.livreur_statut === 'arrive_pharmacie' && (
                                      <button
                                        onClick={async () => {
                                          setUpdatingId(cmd.id)
                                          try {
                                            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
                                            await fetch(`${base}/pharmacies/orders/${cmd.id}/pharmacy-handoff`, {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                Authorization: `Bearer ${localStorage.getItem('medmap_token')}`,
                                              },
                                            })
                                            setOrders(prev => prev.map(o => o.id === cmd.id ? { ...o, livreur_statut: 'vers_patient', statut: 'en_route' } : o))
                                          } catch {}
                                          setUpdatingId(null)
                                        }}
                                        disabled={isUpdating}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 shadow-md"
                                      >
                                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '📦 Commande remise au livreur'}
                                      </button>
                                    )}

                                    {/* Next step button (normal flow) */}
                                    {st.next && cmd.livreur_statut !== 'arrive_pharmacie' && (
                                      <button
                                        onClick={() => handleStatus(cmd.id, st.next!)}
                                        disabled={isUpdating}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 ${st.nextColor}`}
                                      >
                                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : st.nextLabel}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">

              {/* Wallet */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-medium">Solde disponible</p>
                      <p className="text-white text-2xl font-bold mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {loading ? '…' : `${solde.toLocaleString('fr-FR')} F`}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <WalletIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-3">
                    Vous recevez 100% du prix de vos médicaments. La commission MedMap+ (15%) est ajoutée en supplément au prix payé par le client.
                  </p>
                  <Link href="/portefeuille" className="block text-center bg-teal-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-teal-700 transition-colors">
                    Voir le portefeuille
                  </Link>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Accès rapides</h3>
                {[
                  { label: 'Catalogue médicaments', icon: Package, href: '/medicaments', color: 'text-teal-600' },
                  { label: 'Pharmacies de garde', icon: Moon, href: '/pharmacies-garde', color: 'text-amber-600' },
                  { label: 'Portefeuille', icon: WalletIcon, href: '/portefeuille', color: 'text-emerald-600' },
                ].map((a, i) => (
                  <Link key={i} href={a.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 group">
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                  </Link>
                ))}
              </div>

              {/* Légende statuts */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Flux de livraison</h3>
                <div className="space-y-2">
                  {Object.entries(ORDER_STATUS).filter(([k]) => k !== 'annule').map(([key, st]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                      <span className="text-xs text-gray-600">{st.label}</span>
                      {st.next && <span className="text-gray-300 text-xs">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation panel */}
      {chat && user && (
        <ConversationPanel
          isOpen={!!chat}
          onClose={() => setChat(null)}
          currentUserId={user.id}
          otherUserId={chat.patientUserId}
          otherUserName={chat.patientName}
          contextType="order"
          contextId={chat.orderId}
          contextLabel={`Commande #${chat.orderId}`}
        />
      )}
    </div>
  )
}
