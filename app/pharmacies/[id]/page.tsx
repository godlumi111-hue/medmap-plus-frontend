'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { pharmacies as pharmaciesApi, wallet as walletApi } from '@/lib/api'
import {
  MapPin, Clock, Phone, Star, CheckCircle, ShoppingBag,
  Loader2, ArrowLeft, Plus, Minus, X, AlertCircle,
  Lock, Pill, ChevronRight, Truck, Shield, Wallet,
  Package, Navigation,
} from 'lucide-react'

interface CartItem {
  medicine_id: number
  nom: string
  prix_local: number
  quantite: number
}

export default function PharmacyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pharmacyId = Number(params.id)

  const [pharmacy, setPharmacy] = useState<any>(null)
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'confirm' | 'success'>('cart')
  const [ordering, setOrdering] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [pharmaList, meds, w] = await Promise.allSettled([
          pharmaciesApi.list(),
          pharmaciesApi.medicines(pharmacyId),
          walletApi.me(),
        ])
        if (pharmaList.status === 'fulfilled') {
          const found = pharmaList.value.find((p: any) => p.structure_id === pharmacyId || p.id === pharmacyId)
          setPharmacy(found ?? null)
        }
        if (meds.status === 'fulfilled') setMedicines(meds.value)
        if (w.status === 'fulfilled') setWalletBalance(w.value?.solde ?? 0)
      } catch {}
      finally { setLoading(false) }
    }
    loadData()
  }, [pharmacyId])

  const filteredMeds = medicines.filter(m =>
    search === '' || (m.nom ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const total = cart.reduce((s, item) => s + item.prix_local * item.quantite, 0)
  const commission = Math.round(total * 0.10)
  const totalWithCommission = total + commission

  function addToCart(med: any) {
    setCart(prev => {
      const existing = prev.find(i => i.medicine_id === med.medicine_id)
      if (existing) {
        return prev.map(i => i.medicine_id === med.medicine_id ? { ...i, quantite: i.quantite + 1 } : i)
      }
      return [...prev, { medicine_id: med.medicine_id, nom: med.nom, prix_local: med.prix_local, quantite: 1 }]
    })
  }

  function removeFromCart(id: number) {
    setCart(prev => prev.filter(i => i.medicine_id !== id))
  }

  function updateQty(id: number, delta: number) {
    setCart(prev => prev
      .map(i => i.medicine_id === id ? { ...i, quantite: Math.max(1, i.quantite + delta) } : i)
      .filter(i => i.quantite > 0)
    )
  }

  const getQty = (id: number) => cart.find(i => i.medicine_id === id)?.quantite ?? 0

  async function placeOrder() {
    if (ordering) return
    setOrdering(true)
    try {
      // 1. Place order
      const order = await pharmaciesApi.placeOrder({
        pharmacy_id: pharmacyId,
        items: cart.map(i => ({ medicine_id: i.medicine_id, quantite: i.quantite })),
        notes: '',
      })
      // 2. Pay via wallet (escrow)
      await walletApi.pay({
        montant: totalWithCommission,
        structure_id: pharmacyId,
        description: `Commande médicaments #${order.id} - ${pharmacy?.nom ?? 'Pharmacie'}`,
      })
      setOrderId(order.id)
      setCheckoutStep('success')
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la commande')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-5">
            <Link href="/pharmacies-garde" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 mb-4 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Retour aux pharmacies
            </Link>
            {pharmacy ? (
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${
                  pharmacy.pharmacy_profile?.garde
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-br from-teal-100 to-teal-200'
                }`}>
                  💊
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {pharmacy.nom}
                    </h1>
                    {pharmacy.partenaire && (
                      <span className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle className="w-3 h-3" /> Partenaire officiel
                      </span>
                    )}
                    {pharmacy.pharmacy_profile?.garde && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        🌙 De garde
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {pharmacy.adresse && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-500" /> {pharmacy.adresse}
                      </span>
                    )}
                    {pharmacy.pharmacy_profile?.horaires && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-500" /> {pharmacy.pharmacy_profile.horaires}
                      </span>
                    )}
                    {pharmacy.telephone && (
                      <a href={`tel:${pharmacy.telephone}`} className="flex items-center gap-1.5 hover:text-teal-600">
                        <Phone className="w-3.5 h-3.5 text-teal-500" /> {pharmacy.telephone}
                      </a>
                    )}
                    {pharmacy.note > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        {Number(pharmacy.note).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Pharmacie introuvable</p>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { icon: Shield, label: 'Paiement sécurisé (séquestre)' },
              { icon: Truck, label: 'Livraison 30-45 min' },
              { icon: Navigation, label: 'Suivi temps réel' },
              { icon: CheckCircle, label: 'Remboursement garanti' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                <b.icon className="w-3.5 h-3.5 text-teal-500" /> {b.label}
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un médicament..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm bg-white shadow-sm"
            />
          </div>

          {/* Medicines grid */}
          {filteredMeds.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">
                {medicines.length === 0 ? 'Aucun médicament référencé dans cette pharmacie' : 'Aucun médicament correspond à votre recherche'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeds.map((med, i) => {
                const inCart = getQty(med.medicine_id)
                return (
                  <motion.div
                    key={med.medicine_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-white rounded-2xl border-2 p-4 transition-all ${
                      inCart > 0 ? 'border-teal-400 shadow-lg shadow-teal-500/10' : 'border-gray-100 hover:border-teal-200'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-semibold">{med.categorie}</span>
                      {med.sur_ordonnance && (
                        <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Ordonnance
                        </span>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-sky-50 rounded-xl flex items-center justify-center text-2xl mb-3">💊</div>

                    {/* Info */}
                    <h3 className="font-bold text-gray-900 text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>{med.nom}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{med.description}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-lg font-bold text-teal-600">{Number(med.prix_local).toLocaleString('fr-FR')}</span>
                        <span className="text-xs text-gray-400 ml-1">F CFA</span>
                      </div>
                      {med.stock_local <= 5 && med.stock_local > 0 && (
                        <span className="text-xs text-amber-600 font-semibold">Plus que {med.stock_local}!</span>
                      )}
                      {med.stock_local === 0 && (
                        <span className="text-xs text-red-500 font-semibold">Rupture</span>
                      )}
                    </div>

                    {/* Add to cart */}
                    {inCart > 0 ? (
                      <div className="flex items-center justify-between">
                        <button onClick={() => updateQty(med.medicine_id, -1)} className="w-9 h-9 rounded-xl border-2 border-teal-200 flex items-center justify-center hover:bg-teal-50 transition-colors">
                          <Minus className="w-4 h-4 text-teal-600" />
                        </button>
                        <span className="text-lg font-bold text-gray-900">{inCart}</span>
                        <button onClick={() => updateQty(med.medicine_id, 1)} className="w-9 h-9 rounded-xl border-2 border-teal-200 flex items-center justify-center hover:bg-teal-50 transition-colors">
                          <Plus className="w-4 h-4 text-teal-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(med)}
                        disabled={med.stock_local === 0}
                        className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Floating cart button */}
        {cart.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
            <motion.button
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => setShowCart(true)}
              className="flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl shadow-teal-500/40 hover:opacity-90 transition-all"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantite, 0)}
                </span>
              </div>
              <span>Voir le panier</span>
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">
                {totalWithCommission.toLocaleString('fr-FR')} F
              </span>
            </motion.button>
          </div>
        )}

        {/* Cart / Checkout Modal */}
        <AnimatePresence>
          {showCart && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
              onClick={() => { if (checkoutStep === 'success') { setShowCart(false); setCart([]); setCheckoutStep('cart') } }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {checkoutStep === 'success' ? (
                  // Success screen
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Commande confirmée !</h2>
                    <p className="text-gray-500 mb-2">Votre commande #{orderId} a été envoyée à la pharmacie.</p>
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-teal-600" />
                        <p className="text-sm font-semibold text-teal-800">Paiement sécurisé actif</p>
                      </div>
                      <p className="text-xs text-teal-700">
                        {totalWithCommission.toLocaleString('fr-FR')} F CFA sont bloqués en séquestre.
                        L'argent sera libéré à la pharmacie uniquement après votre confirmation de réception.
                      </p>
                    </div>
                    <Link
                      href={`/tracking/${orderId}`}
                      className="flex items-center justify-center gap-2 w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold mb-3 hover:bg-teal-700 transition-colors"
                      onClick={() => { setShowCart(false); setCart([]); setCheckoutStep('cart') }}
                    >
                      <Navigation className="w-5 h-5" /> Suivre ma livraison
                    </Link>
                    <button
                      onClick={() => { setShowCart(false); setCart([]); setCheckoutStep('cart') }}
                      className="w-full py-3 text-gray-500 text-sm font-semibold hover:text-gray-700"
                    >
                      Fermer
                    </button>
                  </div>
                ) : checkoutStep === 'confirm' ? (
                  // Confirm payment
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <button onClick={() => setCheckoutStep('cart')} className="p-2 rounded-xl hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Confirmer le paiement</h2>
                      <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Médicaments ({cart.reduce((s, i) => s + i.quantite, 0)} articles)</span>
                        <span className="font-semibold">{total.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Commission MedMap+ (10%)</span>
                        <span className="font-semibold">{commission.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                        <span>Total à payer</span>
                        <span className="text-teal-600 text-lg">{totalWithCommission.toLocaleString('fr-FR')} F</span>
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-5 flex gap-3">
                      <Lock className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-teal-800">Paiement sécurisé séquestre</p>
                        <p className="text-xs text-teal-700 mt-0.5">
                          L'argent est bloqué jusqu'à votre confirmation de réception. Remboursement garanti en cas de problème.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 flex gap-2">
                      <Wallet className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        Solde disponible : <strong>{walletBalance.toLocaleString('fr-FR')} F CFA</strong>
                        {walletBalance < totalWithCommission && (
                          <span className="text-red-500 ml-1">— Solde insuffisant</span>
                        )}
                      </p>
                    </div>

                    <button
                      onClick={placeOrder}
                      disabled={ordering || walletBalance < totalWithCommission}
                      className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                      {ordering ? 'Traitement...' : `Payer ${totalWithCommission.toLocaleString('fr-FR')} F`}
                    </button>

                    {walletBalance < totalWithCommission && (
                      <Link href="/portefeuille" className="block text-center mt-3 text-teal-600 text-sm font-semibold hover:underline">
                        Recharger mon portefeuille →
                      </Link>
                    )}
                  </div>
                ) : (
                  // Cart items
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>
                        Mon panier ({cart.reduce((s, i) => s + i.quantite, 0)} articles)
                      </h2>
                      <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <div className="space-y-3 mb-5">
                      {cart.map(item => (
                        <div key={item.medicine_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg flex-shrink-0">💊</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.nom}</p>
                            <p className="text-xs text-teal-600 font-semibold">{item.prix_local.toLocaleString('fr-FR')} F / unité</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(item.medicine_id, -1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white">
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="w-6 text-center font-bold text-gray-900 text-sm">{item.quantite}</span>
                            <button onClick={() => updateQty(item.medicine_id, 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white">
                              <Plus className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-gray-900">{(item.prix_local * item.quantite).toLocaleString('fr-FR')} F</span>
                            <button onClick={() => removeFromCart(item.medicine_id)} className="ml-1 p-1 text-gray-300 hover:text-red-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-4 mb-5">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Sous-total</span>
                        <span className="font-semibold">{total.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Commission (10%)</span>
                        <span className="font-semibold">{commission.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-gray-100">
                        <span>Total</span>
                        <span className="text-teal-600">{totalWithCommission.toLocaleString('fr-FR')} F CFA</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckoutStep('confirm')}
                      className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Commander maintenant
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
