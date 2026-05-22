'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ConversationPanel from '@/components/messaging/ConversationPanel'
import { useAuth } from '@/lib/auth-context'
import { pharmacies } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Package, ChevronLeft, Loader2, MessageCircle,
  CheckCircle, Clock, Truck, ShoppingBag, MapPin,
  ChevronDown, ChevronUp, RefreshCw, XCircle,
  Percent, Shield, Navigation, ThumbsUp,
} from 'lucide-react'

const ORDER_STATUS: Record<string, {
  label: string; desc: string; color: string; dot: string; step: number; icon: React.ReactNode
}> = {
  en_attente:     { label: 'En attente',     desc: 'Votre commande attend la confirmation de la pharmacie',   color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   step: 0, icon: <Clock className="w-4 h-4" /> },
  confirme:       { label: 'Acceptée',        desc: 'La pharmacie a accepté votre commande',                  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', step: 1, icon: <CheckCircle className="w-4 h-4" /> },
  en_preparation: { label: 'En préparation', desc: 'La pharmacie prépare vos médicaments',                    color: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500',    step: 2, icon: <Package className="w-4 h-4" /> },
  en_route:       { label: 'En route',        desc: 'Le livreur est en route vers vous',                      color: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  step: 3, icon: <Truck className="w-4 h-4" /> },
  livre:          { label: 'Livré',           desc: 'Votre commande a été livrée',                            color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500',    step: 4, icon: <CheckCircle className="w-4 h-4" /> },
  annule:         { label: 'Annulée',         desc: 'Cette commande a été annulée',                           color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400',     step: -1, icon: <XCircle className="w-4 h-4" /> },
}

const STEPS = ['en_attente', 'confirme', 'en_preparation', 'en_route', 'livre']

function CommandeContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const newOrderId = searchParams.get('new') ? parseInt(searchParams.get('new')!) : null
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(newOrderId)
  const [chat, setChat] = useState<{ orderId: number; pharmacyUserId: number; pharmacyName: string } | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)

  const loadOrders = useCallback(() => {
    pharmacies.myOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    if (!user?.id) return               
    connectSocket(user.id)
    const socket = getSocket()
    function handleUpdate(data: any) {
      setOrders(prev => prev.map(o => o.id === data.order_id ? {
        ...o,
        ...(data.statut ? { statut: data.statut } : {}),
        ...(data.livreur_statut ? { livreur_statut: data.livreur_statut } : {}),
        ...(data.paiement_statut ? { paiement_statut: data.paiement_statut } : {}),
      } : o))
    }
    socket.on('order:update', handleUpdate)
    return () => { socket.off('order:update', handleUpdate) }
  }, [user?.id])

  async function confirmReceipt(orderId: number) {
    setConfirming(orderId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacies/orders/${orderId}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('medmap_token')}`,
        },
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, statut: 'livre', paiement_statut: 'libere' } : o))
      }
    } catch {}
    setConfirming(null)
  }

  const activeOrders = orders.filter(o => !['livre', 'annule'].includes(o.statut))
  const pastOrders = orders.filter(o => ['livre', 'annule'].includes(o.statut))

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/dashboard/patient" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Mes commandes</h1>
              <p className="text-sm text-gray-500">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
            </div>
            <button onClick={loadOrders} className="ml-auto p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-semibold text-gray-500 mb-2">Aucune commande</p>
              <p className="text-sm text-gray-400 mb-6">Commandez des médicaments via les pharmacies de garde</p>
              <Link href="/pharmacies-garde" className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                <ShoppingBag className="w-4 h-4" /> Pharmacies de garde
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {activeOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    En cours ({activeOrders.length})
                  </p>
                  <div className="space-y-3">
                    {activeOrders.map((order, i) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        expanded={expanded === order.id}
                        onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                        onChat={(pharmacyUserId, pharmacyName) => setChat({ orderId: order.id, pharmacyUserId, pharmacyName })}
                        onConfirmReceipt={() => confirmReceipt(order.id)}
                        confirming={confirming === order.id}
                        delay={i * 0.06}
                      />
                    ))}
                  </div>
                </div>
              )}

              {pastOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    Historique ({pastOrders.length})
                  </p>
                  <div className="space-y-3">
                    {pastOrders.map((order, i) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        expanded={expanded === order.id}
                        onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                        onChat={(pharmacyUserId, pharmacyName) => setChat({ orderId: order.id, pharmacyUserId, pharmacyName })}
                        onConfirmReceipt={() => confirmReceipt(order.id)}
                        confirming={confirming === order.id}
                        delay={i * 0.04}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {chat && user && (
        <ConversationPanel
          isOpen={!!chat}
          onClose={() => setChat(null)}
          currentUserId={user.id}
          otherUserId={chat.pharmacyUserId}
          otherUserName={chat.pharmacyName}
          contextType="order"
          contextId={chat.orderId}
          contextLabel={`Commande #${chat.orderId}`}
        />
      )}
    </div>
  )
}

export default function CommandePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CommandeContent />
    </Suspense>
  )
}

function OrderCard({
  order, expanded, onToggle, onChat, onConfirmReceipt, confirming, delay = 0,
}: {
  order: any
  expanded: boolean
  onToggle: () => void
  onChat: (pharmacyUserId: number, pharmacyName: string) => void
  onConfirmReceipt: () => void
  confirming: boolean
  delay?: number
}) {
  const st = ORDER_STATUS[order.statut] ?? ORDER_STATUS.en_attente
  const isCancelled = order.statut === 'annule'
  const isDelivered = order.statut === 'livre'
  const isEnRoute = order.statut === 'en_route'
  const items = Array.isArray(order.items) ? order.items : []
  const currentStep = STEPS.indexOf(order.statut)
  const montantTotal   = parseFloat(order.montant_total || order.total || 0)
  const commission     = parseFloat(order.commission || 0)
  const fraisLivraison = parseFloat(order.frais_livraison || 700)
  const montantPharmacie = Math.max(0, parseFloat((montantTotal - commission - fraisLivraison).toFixed(2)))

  // Live tracking simulation for en_route orders
  const [trackStep, setTrackStep] = useState(0)
  useEffect(() => {
    if (!isEnRoute) return
    const steps = ['Livreur parti de la pharmacie', 'En route · 2.5 km restants', 'Bientôt arrivé · 500m']
    const interval = setInterval(() => {
      setTrackStep(prev => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 8000)
    return () => clearInterval(interval)
  }, [isEnRoute])

  const TRACK_STEPS = ['Livreur parti de la pharmacie', 'En route · 2.5 km restants', 'Bientôt arrivé · 500m']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${
        isCancelled ? 'border-red-100' : isDelivered ? 'border-teal-100' : isEnRoute ? 'border-violet-100' : 'border-gray-100'
      }`}
    >
      {/* Live tracking banner */}
      {isEnRoute && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
          <Truck className="w-4 h-4 text-white animate-bounce" />
          <span className="text-xs font-bold text-white">{TRACK_STEPS[trackStep]}</span>
          <div className="ml-auto flex gap-1">
            {TRACK_STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i <= trackStep ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-4 cursor-pointer" onClick={onToggle}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot} ${!isCancelled && !isDelivered ? 'animate-pulse' : ''}`} />
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCancelled ? 'bg-red-50' : isDelivered ? 'bg-teal-50' : 'bg-teal-50'
        }`}>
          <span className={isCancelled ? 'text-red-400' : 'text-teal-600'}>{st.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">Commande #{order.id}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {order.pharmacy_nom ?? 'Pharmacie'} · {items.length} article{items.length > 1 ? 's' : ''} · {montantTotal.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </div>

      {/* Progress bar */}
      {!isCancelled && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={`flex-1 h-1.5 rounded-full transition-all ${idx <= currentStep ? 'bg-teal-500' : 'bg-gray-100'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{st.desc}</p>
        </div>
      )}

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-50"
          >
            <div className="p-4 space-y-3">

              {/* Pharmacy info */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Pharmacie</p>
                <p className="text-sm font-bold text-gray-800">{order.pharmacy_nom ?? 'Pharmacie partenaire'}</p>
                {order.pharmacy_tel && <p className="text-xs text-gray-500 mt-0.5">{order.pharmacy_tel}</p>}
              </div>

              {/* Delivery address */}
              {order.adresse_livraison && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Adresse de livraison</p>
                    <p className="text-sm text-gray-700">{order.adresse_livraison}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              {items.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Articles commandés</p>
                  <div className="space-y-1">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">Médicament #{item.medicine_id}</span>
                        <span className="font-semibold text-gray-900">×{item.quantite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Livreur info */}
              {order.livreur_id && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Livreur assigné
                    </p>
                    {['vers_pharmacie','arrive_pharmacie','vers_patient','arrive_patient'].includes(order.livreur_statut) && (
                      <Link href={`/tracking/${order.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors">
                        <Navigation className="w-3 h-3" /> Suivi live
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {order.livreur_prenom ? `${order.livreur_prenom} ${order.livreur_nom}` : `Livreur #${order.livreur_id}`}
                      </p>
                      <p className="text-xs text-violet-600 mt-0.5">
                        {order.livreur_statut === 'vers_pharmacie'   ? '🏃 En route vers la pharmacie' :
                         order.livreur_statut === 'arrive_pharmacie' ? '🏪 Arrivé à la pharmacie' :
                         order.livreur_statut === 'vers_patient'     ? '🚀 En route vers vous !' :
                         order.livreur_statut === 'arrive_patient'   ? '🚪 Livreur à votre porte' :
                         order.livreur_statut === 'livre'            ? '✅ Livré' : '⏳ Assigné'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission breakdown */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> Détail du paiement
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Médicaments (pharmacie)</span>
                    <span className="font-semibold">{montantPharmacie.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Frais de livraison</span>
                    <span className="font-semibold">{fraisLivraison.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Commission MedMap+ (10%)</span>
                    <span className="font-semibold">{commission.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-emerald-200">
                    <span>Total payé</span>
                    <span>{montantTotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Escrow status */}
              {order.paiement_statut && (
                <div className={`flex items-center gap-2 rounded-xl p-3 ${
                  order.paiement_statut === 'libere' ? 'bg-teal-50 border border-teal-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                  <Shield className={`w-4 h-4 flex-shrink-0 ${order.paiement_statut === 'libere' ? 'text-teal-600' : 'text-amber-500'}`} />
                  <div>
                    <p className={`text-xs font-bold ${order.paiement_statut === 'libere' ? 'text-teal-800' : 'text-amber-800'}`}>
                      Paiement {order.paiement_statut === 'libere' ? 'libéré ✓' : 'en escrow · sécurisé'}
                    </p>
                    <p className={`text-xs ${order.paiement_statut === 'libere' ? 'text-teal-600' : 'text-amber-600'}`}>
                      {order.paiement_statut === 'libere'
                        ? `Pharmacie +${montantPharmacie.toLocaleString('fr-FR')} F · Livreur +${fraisLivraison.toLocaleString('fr-FR')} F · Commission ${commission.toLocaleString('fr-FR')} F`
                        : 'Sera libéré après votre confirmation de réception'}
                    </p>
                  </div>
                </div>
              )}

              {/* Date */}
              <p className="text-xs text-gray-400 text-center">
                Passée le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

              {/* Confirm receipt button — only when livreur has arrived at patient */}
              {order.livreur_statut === 'arrive_patient' && order.paiement_statut !== 'libere' && (
                <motion.button
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={onConfirmReceipt}
                  disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-60"
                >
                  {confirming
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmation…</>
                    : <><ThumbsUp className="w-4 h-4" /> Confirmer la réception</>
                  }
                </motion.button>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => onChat(0, order.pharmacy_nom ?? 'Pharmacie')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-teal-300 hover:text-teal-600 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Contacter
                </button>
                <Link href="/pharmacies-garde" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition-all">
                  <ShoppingBag className="w-3.5 h-3.5" /> Renouveler
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
