'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { pharmacies as pharmaciesApi, wallet } from '@/lib/api'
import {
  ShoppingBag, Trash2, Plus, Minus, ChevronLeft, Shield,
  Percent, ArrowRight, CheckCircle, Loader2, AlertCircle,
  MapPin, Wallet as WalletIcon, Truck,
} from 'lucide-react'

export default function PanierPage() {
  const { items, removeItem, updateQty, clearCart, totalBase, commission, fraisLivraison, totalAPayer, pharmacyId, pharmacyNom, itemCount } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [adresse, setAdresse] = useState('')
  const [notes, setNotes] = useState('')

  async function handleCheckout() {
    if (!pharmacyId || items.length === 0) return
    if (!adresse.trim()) { setError("Veuillez saisir votre adresse de livraison."); return }
    setError('')
    setPaying(true)
    try {
      // Debit wallet
      await wallet.pay({
        montant: totalAPayer,
        description: `Commande médicaments - ${pharmacyNom}`,
      })
      // Create order
      const order = await pharmaciesApi.placeOrder({
        pharmacy_id: pharmacyId,
        items: items.map(i => ({ medicine_id: i.medicineId, quantite: i.quantite })),
        notes: notes || undefined,
        adresse_livraison: adresse,
      })
      clearCart()
      router.push(`/commande?new=${order.id}`)
    } catch (e: any) {
      setError(e.message || "Erreur lors du paiement. Vérifiez votre solde.")
    } finally {
      setPaying(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Votre panier est vide</h2>
          <p className="text-gray-400 mb-8">Ajoutez des médicaments depuis une pharmacie de garde.</p>
          <Link href="/pharmacies-garde" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
            Parcourir les pharmacies
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Back */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/medicaments" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Continuer mes achats
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            Mon panier
          </h1>
          <p className="text-sm text-gray-500 mb-6">{itemCount} article{itemCount > 1 ? 's' : ''} · {pharmacyNom}</p>

          {/* Items */}
          <div className="space-y-3 mb-6">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item.medicineId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">💊</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{item.nom}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.pharmacyNom}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        {item.prixBase.toLocaleString('fr-FR')} FCFA
                        {item.quantite > 1 && (
                          <span className="text-gray-400 font-normal"> × {item.quantite} = {(item.prixBase * item.quantite).toLocaleString('fr-FR')} FCFA</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.medicineId, item.quantite - 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-gray-900">{item.quantite}</span>
                      <button
                        onClick={() => updateQty(item.medicineId, item.quantite + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.medicineId)}
                        className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <MapPin className="w-4 h-4 text-emerald-500" /> Adresse de livraison *
            </label>
            <input
              type="text"
              placeholder="Ex: Cocody 7ème tranche, Résidence Les Jardins, Apt 4B"
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <input
              type="text"
              placeholder="Instructions pour le livreur (optionnel)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Récapitulatif</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total pharmacie</span>
                <span className="font-semibold text-gray-800">{totalBase.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-emerald-500" /> Commission MedMap+ (15%)
                </span>
                <span className="font-semibold text-emerald-600">+{commission.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-violet-500" /> Frais de livraison
                </span>
                <span className="font-semibold text-violet-600">+{fraisLivraison.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total à payer</span>
                <span className="font-extrabold text-lg text-gray-900">{totalAPayer.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* Escrow notice */}
          <div className="flex items-start gap-3 bg-emerald-50 rounded-xl p-3 mb-5 border border-emerald-100">
            <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              Paiement sécurisé. L'argent est bloqué jusqu'à votre confirmation de réception.
              Après livraison : <strong>{totalBase.toLocaleString('fr-FR')} FCFA</strong> à la pharmacie
              · <strong>{fraisLivraison.toLocaleString('fr-FR')} FCFA</strong> au livreur
              · <strong>{commission.toLocaleString('fr-FR')} FCFA</strong> de commission MedMap+.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 rounded-xl px-4 py-3 mb-4 border border-red-100">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
              {error.toLowerCase().includes('solde') && (
                <a href="/wallet" className="mt-2 block text-xs font-bold text-red-700 underline">
                  → Recharger mon portefeuille
                </a>
              )}
            </div>
          )}

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            disabled={paying}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/20 transition-colors"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Paiement en cours...</>
            ) : (
              <><WalletIcon className="w-5 h-5" /> Payer {totalAPayer.toLocaleString('fr-FR')} FCFA <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
          <p className="text-center text-xs text-gray-400 mt-3">Débit depuis votre portefeuille MedMap+</p>
        </div>
      </div>
    </div>
  )
}
