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
  Search, Plus, Minus, ArrowDownCircle, ArrowUpCircle, BarChart3,
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
  const [mainView, setMainView] = useState<'commandes' | 'stock'>('commandes')

  // Stock management states
  const [stock, setStock] = useState<any[]>([])
  const [stockMovements, setStockMovements] = useState<any[]>([])
  const [stockSearch, setStockSearch] = useState('')
  const [stockLoading, setStockLoading] = useState(false)
  const [stockUpdating, setStockUpdating] = useState<number | null>(null)
  const [stockModal, setStockModal] = useState<{ med: any; type: 'entree' | 'sortie' } | null>(null)
  const [stockQty, setStockQty] = useState('')
  const [stockMotif, setStockMotif] = useState('')
  const [stockErr, setStockErr] = useState('')

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

  const loadStock = useCallback(async () => {
    setStockLoading(true)
    try {
      const [s, m] = await Promise.all([pharmacies.myStock(), pharmacies.stockMovements()])
      setStock(s)
      setStockMovements(m)
    } catch {}
    setStockLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (mainView === 'stock') loadStock()
  }, [mainView, loadStock])

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

  async function handleStockAction() {
    if (!stockModal || !stockQty || parseInt(stockQty) <= 0) {
      setStockErr('Quantité invalide')
      return
    }
    setStockErr('')
    setStockUpdating(stockModal.med.id)
    try {
      if (stockModal.type === 'entree') {
        await pharmacies.stockEntree({ medicine_id: stockModal.med.id, quantite: parseInt(stockQty), motif: stockMotif || undefined })
      } else {
        await pharmacies.stockSortie({ medicine_id: stockModal.med.id, quantite: parseInt(stockQty), motif: stockMotif || undefined })
      }
      setStockModal(null)
      setStockQty('')
      setStockMotif('')
      await loadStock()
    } catch (e: any) {
      setStockErr(e.message || 'Erreur')
    }
    setStockUpdating(null)
  }

  function stockStatus(qty: number) {
    if (qty === 0) return { label: 'Rupture', color: 'bg-red-100 text-red-700 border-red-200' }
    if (qty <= 10) return { label: 'Faible', color: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }

  const filteredStock = stock.filter(m =>
    !stockSearch || m.nom.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (m.categorie || '').toLowerCase().includes(stockSearch.toLowerCase())
  )

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

        {/* Hero — split éditorial */}
        <div className="relative bg-white border-b border-gray-100 overflow-hidden" style={{ minHeight: 230 }}>
          {/* Photo droite */}
          <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/pharmatie.jpg" alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white" />
          </div>
          {/* Contenu gauche */}
          <div className="relative max-w-5xl mx-auto px-6 py-8 lg:py-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <p className="text-emerald-700 text-xs font-bold uppercase tracking-widest">Espace Pharmacie</p>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>{pharmacyName}</h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {profile?.ville && (
                <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5" /> {profile.ville}
                </span>
              )}
              {profile?.telephone && (
                <span className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 font-semibold">
                  <Phone className="w-3.5 h-3.5" /> {profile.telephone}
                </span>
              )}
              {newCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5 font-bold animate-pulse">
                  🔔 {newCount} nouvelle{newCount > 1 ? 's' : ''} commande{newCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {/* Garde toggle */}
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 w-fit">
              <Moon className={`w-4 h-4 ${garde ? 'text-amber-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-bold text-gray-900">{garde ? 'De garde' : 'Hors garde'}</p>
                <p className="text-[11px] text-gray-500">{garde ? 'Ouvert 24h/24' : 'Horaires normaux'}</p>
              </div>
              <button
                onClick={() => setGarde(!garde)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${garde ? 'bg-amber-400' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${garde ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats bandeau */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
              {[
                { label: 'Nouvelles commandes', value: loading ? '…' : String(newCount), accent: 'text-amber-600' },
                { label: 'En cours', value: loading ? '…' : String(inProgressCount), accent: 'text-blue-600' },
                { label: 'Livrées', value: loading ? '…' : String(deliveredCount), accent: 'text-emerald-600' },
                { label: 'Solde FCFA', value: loading ? '…' : `${solde.toLocaleString('fr-FR')} F`, accent: 'text-violet-600' },
              ].map(s => (
                <div key={s.label} className="py-4 px-4 sm:px-6 text-center">
                  <p className={`text-2xl font-extrabold ${s.accent}`} style={{ fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Main view tabs */}
          <div className="flex gap-2">
            {([
              { key: 'commandes', label: 'Commandes', icon: ShoppingBag },
              { key: 'stock',     label: 'Gestion du stock', icon: BarChart3 },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setMainView(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mainView === key
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {key === 'commandes' && newCount > 0 && (
                  <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 ${mainView === key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {mainView === 'stock' && (
            <StockPanel
              stock={filteredStock}
              movements={stockMovements}
              loading={stockLoading}
              search={stockSearch}
              onSearch={setStockSearch}
              onRefresh={loadStock}
              onEntree={med => { setStockModal({ med, type: 'entree' }); setStockQty(''); setStockMotif(''); setStockErr('') }}
              onSortie={med => { setStockModal({ med, type: 'sortie' }); setStockQty(''); setStockMotif(''); setStockErr('') }}
              stockStatus={stockStatus}
            />
          )}

          {mainView === 'commandes' && (
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
                                                Authorization: `Bearer ${sessionStorage.getItem('medmap_token')}`,
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
          )}
        </div>
      </div>

      {/* Stock entry/exit modal */}
      <AnimatePresence>
        {stockModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setStockModal(null) }}
          >
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4"
            >
              <div className={`flex items-center gap-2 font-bold text-lg ${stockModal.type === 'entree' ? 'text-emerald-700' : 'text-red-700'}`}>
                {stockModal.type === 'entree'
                  ? <ArrowDownCircle className="w-5 h-5" />
                  : <ArrowUpCircle className="w-5 h-5" />}
                {stockModal.type === 'entree' ? 'Entrée stock' : 'Sortie stock'}
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="font-semibold text-gray-900 text-sm">{stockModal.med.nom}</p>
                <p className="text-xs text-gray-500 mt-0.5">Stock actuel : {stockModal.med.stock_local} unité{stockModal.med.stock_local !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Quantité *</label>
                <input
                  type="number" min="1" value={stockQty}
                  onChange={e => setStockQty(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Motif (optionnel)</label>
                <input
                  type="text" value={stockMotif}
                  onChange={e => setStockMotif(e.target.value)}
                  placeholder={stockModal.type === 'entree' ? 'Ex: Livraison fournisseur' : 'Ex: Vente comptoir'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {stockErr && <p className="text-xs text-red-600 font-medium">{stockErr}</p>}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button onClick={() => setStockModal(null)}
                  className="py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleStockAction} disabled={!!stockUpdating}
                  className={`py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                    stockModal.type === 'entree' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  {stockUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

// ─── Stock Panel Component ─────────────────────────────────────────────────────

function StockPanel({ stock, movements, loading, search, onSearch, onRefresh, onEntree, onSortie, stockStatus }: {
  stock: any[]; movements: any[]; loading: boolean; search: string;
  onSearch: (s: string) => void; onRefresh: () => void;
  onEntree: (m: any) => void; onSortie: (m: any) => void;
  stockStatus: (qty: number) => { label: string; color: string };
}) {
  const [showMovements, setShowMovements] = useState(false)

  return (
    <div className="space-y-4">
      {/* Search + refresh bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Rechercher un médicament…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          />
        </div>
        <button onClick={onRefresh} className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors" title="Actualiser">
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stock list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Médicaments en stock</h3>
          <span className="text-xs text-gray-400">{stock.length} médicament{stock.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">Aucun médicament trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stock.map(med => {
              const st = stockStatus(med.stock_local)
              return (
                <div key={med.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{med.nom}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{med.categorie}</span>
                      <span className="font-semibold text-gray-700">{med.prix ? `${med.prix.toLocaleString('fr-FR')} F` : '—'}</span>
                      <span className="font-bold text-gray-900">{med.stock_local} unité{med.stock_local !== 1 ? 's' : ''}</span>
                    </div>
                    {(med.derniere_entree || med.derniere_sortie) && (
                      <div className="flex gap-3 mt-0.5 text-[10px] text-gray-400">
                        {med.derniere_entree && <span>↓ {new Date(med.derniere_entree).toLocaleDateString('fr-FR')}</span>}
                        {med.derniere_sortie && <span>↑ {new Date(med.derniere_sortie).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => onEntree(med)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all border border-emerald-200">
                      <Plus className="w-3 h-3" /> Entrée
                    </button>
                    <button onClick={() => onSortie(med)} disabled={med.stock_local === 0}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-all border border-red-200 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Minus className="w-3 h-3" /> Sortie
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Movement history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowMovements(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-bold text-gray-900 text-sm">Historique des mouvements</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{movements.length} entrée{movements.length !== 1 ? 's' : ''}</span>
            {showMovements ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        <AnimatePresence>
          {showMovements && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              {movements.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">Aucun mouvement enregistré</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {movements.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.type === 'entree' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {m.type === 'entree'
                          ? <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                          : <ArrowUpCircle className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{m.medicine_nom}</p>
                        {m.motif && <p className="text-[10px] text-gray-400">{m.motif}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${m.type === 'entree' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'entree' ? '+' : '-'}{m.quantite}
                        </p>
                        <p className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
