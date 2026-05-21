'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useCart } from '@/lib/cart-context'
import { medicines as medicinesApi, pharmacies as pharmaciesApi } from '@/lib/api'
import { Search, ShoppingBag, CheckCircle, X, Plus, Minus, Loader2, ChevronLeft } from 'lucide-react'

const CATEGORIES = ['Tous', 'Analgésique', 'Antibiotique', 'Antipaludique', 'Gastro-entérologie', 'Antidiabétique', 'Anti-inflammatoire', 'Vitamine', 'Antihypertenseur', 'Antihistaminique', 'Respiratoire']

function MedicamentsContent() {
  const searchParams = useSearchParams()
  const pharmacyIdParam = searchParams.get('pharmacy')
  const pharmacyId = pharmacyIdParam ? parseInt(pharmacyIdParam) : null

  const { addItem, removeItem, items, itemCount, totalAPayer, pharmacyId: cartPharmacyId, pharmacyNom: cartPharmacyNom } = useCart()
  const [meds, setMeds] = useState<any[]>([])
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('Tous')
  const [selectedMed, setSelectedMed] = useState<any | null>(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [medsData] = await Promise.allSettled([
          pharmacyId
            ? pharmaciesApi.medicines(pharmacyId)
            : medicinesApi.search({ limit: 100 })
        ])
        if (medsData.status === 'fulfilled') setMeds(medsData.value)

        if (pharmacyId) {
          const pharmaList = await pharmaciesApi.list()
          const found = pharmaList.find((p: any) => p.id === pharmacyId)
          if (found) setPharmacyInfo(found)
        }
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [pharmacyId])

  const filtered = meds.filter(m => {
    const matchCat = selectedCat === 'Tous' || m.categorie === selectedCat
    const matchSearch = search === '' ||
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      (m.description ?? '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function isInCart(medId: number) {
    return items.some(i => i.medicineId === medId)
  }

  function getCartQty(medId: number) {
    return items.find(i => i.medicineId === medId)?.quantite ?? 0
  }

  function handleAdd(med: any) {
    const effectivePharmacyId = pharmacyId ?? cartPharmacyId
    const effectivePharmacyNom = pharmacyInfo?.nom ?? cartPharmacyNom ?? (effectivePharmacyId ? `Pharmacie #${effectivePharmacyId}` : null)

    if (!effectivePharmacyId) {
      alert('Veuillez d\'abord choisir une pharmacie de garde pour commander.')
      return
    }
    addItem({
      medicineId: med.id,
      nom: med.nom,
      pharmacyId: effectivePharmacyId,
      pharmacyNom: effectivePharmacyNom ?? `Pharmacie #${effectivePharmacyId}`,
      prixBase: parseFloat(med.prix ?? 0),
    }, qty)
    setQty(1)
    setSelectedMed(null)
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="pt-16">
        {/* Header */}
        <div className="bg-white border-b border-bone">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/pharmacies-garde" className="flex items-center gap-1 text-sm text-gray-400 hover:text-emerald-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Pharmacies
                  </Link>
                  {pharmacyInfo && (
                    <>
                      <span className="text-gray-300">/</span>
                      <span className="text-sm font-semibold text-emerald-700">{pharmacyInfo.nom}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'Sora' }}>
                  {pharmacyInfo ? `Stock — ${pharmacyInfo.nom}` : 'Médicaments'}
                </h1>
                {!pharmacyId && <p className="text-slate text-sm mt-0.5">Catalogue général · Pour commander, choisissez une pharmacie</p>}
              </div>
              <Link
                href="/panier"
                className="relative flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <ShoppingBag className="w-4 h-4" />
                Panier
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate" />
              <input
                type="text"
                placeholder="Rechercher un médicament..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-bone focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
              />
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex gap-2 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCat === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-bone text-slate hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Grid */}
              <div className="flex-1">
                <p className="text-sm text-slate mb-4">
                  {filtered.length} médicament{filtered.length !== 1 ? 's' : ''}
                </p>

                {filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">💊</div>
                    <p className="text-slate font-semibold">Aucun médicament trouvé</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((med, i) => {
                      const inCart = isInCart(med.id)
                      return (
                        <motion.div
                          key={med.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                            inCart ? 'border-emerald-400 bg-emerald-50/30' :
                            selectedMed?.id === med.id ? 'border-emerald-500 shadow-lg' : 'border-bone hover:border-emerald-300'
                          }`}
                          onClick={() => { setSelectedMed(selectedMed?.id === med.id ? null : med); setQty(1) }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">{med.categorie}</span>
                            {med.sur_ordonnance && (
                              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full">Ordonnance</span>
                            )}
                          </div>
                          <div className="text-2xl mb-3">💊</div>
                          <h3 className="font-bold text-ink mb-1 text-sm" style={{ fontFamily: 'Sora' }}>{med.nom}</h3>
                          <p className="text-xs text-slate mb-3 line-clamp-2">{med.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-base font-bold text-ink">
                              {med.prix != null ? Number(med.prix).toLocaleString('fr-FR') : '—'} <span className="text-xs font-normal text-slate">F CFA</span>
                            </p>
                            {inCart && (
                              <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" /> ×{getCartQty(med.id)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              <AnimatePresence>
                {selectedMed && (
                  <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="w-80 flex-shrink-0"
                  >
                    <div className="bg-white rounded-2xl border border-bone p-6 sticky top-24">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-ink" style={{ fontFamily: 'Sora' }}>Détails</h3>
                        <button onClick={() => setSelectedMed(null)} className="p-1.5 rounded-lg hover:bg-bone">
                          <X className="w-4 h-4 text-slate" />
                        </button>
                      </div>
                      <div className="text-3xl mb-4">💊</div>
                      <h2 className="text-lg font-bold text-ink mb-1" style={{ fontFamily: 'Sora' }}>{selectedMed.nom}</h2>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">{selectedMed.categorie}</span>

                      <div className="mt-4 space-y-3">
                        {selectedMed.description && (
                          <div className="p-3 bg-paper rounded-xl">
                            <p className="text-xs font-semibold text-slate mb-1">Usage</p>
                            <p className="text-sm text-ink">{selectedMed.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex justify-between font-bold text-base">
                          <span className="text-ink">Prix unitaire</span>
                          <span className="text-emerald-700">{selectedMed.prix != null ? Number(selectedMed.prix).toLocaleString('fr-FR') : '—'} F CFA</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate mb-2">Quantité</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl border-2 border-bone flex items-center justify-center hover:border-emerald-500 hover:text-emerald-600 transition-all">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-bold text-ink w-8 text-center">{qty}</span>
                          <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-xl border-2 border-bone flex items-center justify-center hover:border-emerald-500 hover:text-emerald-600 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold text-ink ml-2">
                            {selectedMed.prix != null ? (Number(selectedMed.prix) * qty).toLocaleString('fr-FR') : '—'} F
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAdd(selectedMed)}
                          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
                        >
                          <ShoppingBag className="w-4 h-4" /> Ajouter au panier
                        </motion.button>
                        {itemCount > 0 && (
                          <Link
                            href="/panier"
                            className="w-full py-3 border-2 border-emerald-500 text-emerald-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
                          >
                            Voir le panier ({itemCount})
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MedicamentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MedicamentsContent />
    </Suspense>
  )
}
