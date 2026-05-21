'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { PHARMACIES_GARDE, COMMISSION_RATE } from '@/lib/pharmacies-garde-data'
import {
  Search, MapPin, Clock, Phone, Star, CheckCircle, ShoppingBag,
  ChevronRight, Shield, Pill, AlertCircle, Navigation,
  ChevronLeft, SlidersHorizontal, X, Truck, Percent, Building2,
  Zap, Filter,
} from 'lucide-react'

const COMMUNES_FILTER = ['Toutes', 'Plateau', 'Cocody', 'Treichville', 'Marcory', 'Yopougon', 'Abobo', 'Adjamé', 'Port-Bouët', 'Koumassi']

export default function PharmaciesGardePage() {
  const [search, setSearch] = useState('')
  const [filterCommune, setFilterCommune] = useState('Toutes')
  const [filterGarde, setFilterGarde] = useState(false)
  const [filterOuvert, setFilterOuvert] = useState(false)
  const [filterPartenaire, setFilterPartenaire] = useState(false)
  const [filterLivraison, setFilterLivraison] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'note' | 'distance' | 'meds'>('note')

  const filtered = useMemo(() => {
    let list = [...PHARMACIES_GARDE]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.nom.toLowerCase().includes(q) ||
        p.commune.toLowerCase().includes(q)
      )
    }
    if (filterCommune !== 'Toutes') list = list.filter(p => p.commune === filterCommune)
    if (filterGarde) list = list.filter(p => p.garde)
    if (filterOuvert) list = list.filter(p => p.ouvert)
    if (filterPartenaire) list = list.filter(p => p.partenaire)
    if (filterLivraison) list = list.filter(p => p.livraison)

    list.sort((a, b) => {
      if (sortBy === 'note') return b.note - a.note
      if (sortBy === 'distance') return (parseFloat(a.distance || '99') - parseFloat(b.distance || '99'))
      if (sortBy === 'meds') return b.medicamentsDisponibles - a.medicamentsDisponibles
      return 0
    })
    return list
  }, [search, filterCommune, filterGarde, filterOuvert, filterPartenaire, filterLivraison, sortBy])

  const gardesOuvertes = PHARMACIES_GARDE.filter(p => p.garde && p.ouvert).length
  const activeFilters = [
    filterCommune !== 'Toutes',
    filterGarde, filterOuvert, filterPartenaire, filterLivraison,
  ].filter(Boolean).length

  function resetFilters() {
    setFilterCommune('Toutes')
    setFilterGarde(false)
    setFilterOuvert(false)
    setFilterPartenaire(false)
    setFilterLivraison(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-emerald-700 via-teal-600 to-sky-600 py-12 px-4 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-center gap-2 mb-3">
              <Link href="/dashboard/patient" className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white" />
              </Link>
              <span className="text-white/70 text-sm">Dashboard</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Pharmacies de garde
            </h1>
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-100">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                {gardesOuvertes} pharmacie{gardesOuvertes > 1 ? 's' : ''} de garde ouvertes maintenant
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/30 text-emerald-100 px-3 py-1 rounded-full border border-emerald-400/30">
                <Percent className="w-3 h-3" /> Commission MedMap+ : {(COMMISSION_RATE * 100).toFixed(0)}%
              </span>
            </div>

            {/* Commission notice */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 mb-5 border border-white/20">
              <p className="text-white/90 text-xs leading-relaxed">
                <strong className="text-white">Comment ça marche :</strong> Vous payez le prix affiché (prix pharmacie + 10% de commission MedMap+).
                Le paiement est sécurisé jusqu'à votre confirmation de réception. La pharmacie reçoit sa part après livraison.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une pharmacie, une commune..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* Quick filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {[
              { label: 'Toutes', active: !filterGarde && !filterLivraison, action: () => { setFilterGarde(false); setFilterLivraison(false) } },
              { label: '🌙 Garde 24h', active: filterGarde, action: () => setFilterGarde(!filterGarde) },
              { label: '🚚 Livraison', active: filterLivraison, action: () => setFilterLivraison(!filterLivraison) },
              { label: '✓ Partenaire', active: filterPartenaire, action: () => setFilterPartenaire(!filterPartenaire) },
              { label: '● Ouvert', active: filterOuvert, action: () => setFilterOuvert(!filterOuvert) },
            ].map(f => (
              <button
                key={f.label}
                onClick={f.action}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  f.active
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-800">{filtered.length}</span> pharmacie{filtered.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="note">Mieux notées</option>
                <option value="distance">Plus proches</option>
                <option value="meds">Plus de médicaments</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeFilters > 0 || filterCommune !== 'Toutes'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres {(activeFilters + (filterCommune !== 'Toutes' ? 1 : 0)) > 0 && `(${activeFilters + (filterCommune !== 'Toutes' ? 1 : 0)})`}
              </button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm"
            >
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Commune</label>
                <div className="flex flex-wrap gap-2">
                  {COMMUNES_FILTER.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCommune(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        filterCommune === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {(activeFilters + (filterCommune !== 'Toutes' ? 1 : 0)) > 0 && (
                <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600">
                  <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
                </button>
              )}
            </motion.div>
          )}

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Pill className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">Aucune pharmacie trouvée</p>
              <button onClick={resetFilters} className="mt-3 text-sm text-emerald-600 font-semibold hover:underline">
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((pharmacy, i) => (
                <motion.div
                  key={pharmacy.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                    pharmacy.partenaire ? 'border-emerald-100' : 'border-gray-100'
                  }`}
                >
                  {pharmacy.partenaire && (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-1.5 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-xs font-bold text-white">Partenaire MedMap+</span>
                      {pharmacy.livraison && (
                        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-200">
                          <Truck className="w-3 h-3" /> Livraison {pharmacy.delaiLivraison}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        pharmacy.garde ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <Pill className={`w-7 h-7 ${pharmacy.garde ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{pharmacy.nom}</h3>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{pharmacy.commune} · {pharmacy.distance ?? '—'}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 justify-end">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-bold text-gray-800">{pharmacy.note}</span>
                            </div>
                            <p className="text-xs text-gray-400">{pharmacy.avis} avis</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pharmacy.ouvert ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {pharmacy.ouvert ? '● Ouvert' : '● Fermé'}
                          </span>
                          {pharmacy.garde && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              🌙 Garde 24h
                            </span>
                          )}
                          {pharmacy.livraison && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                              <Truck className="w-3 h-3" /> Livraison disponible
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">
                            {pharmacy.medicamentsDisponibles.toLocaleString('fr-FR')} médicaments
                          </span>
                        </div>

                        {/* Horaires & phone */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" /> {pharmacy.horaires}
                          </span>
                          {pharmacy.telephone && (
                            <a href={`tel:${pharmacy.telephone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors">
                              <Phone className="w-3 h-3" /> {pharmacy.telephone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Commission pricing explanation */}
                    {pharmacy.partenaire && (
                      <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Tarification MedMap+</p>
                              <p className="text-xs text-emerald-600">Prix pharmacie + 10% de commission service</p>
                            </div>
                          </div>
                          {pharmacy.livraison && pharmacy.fraisLivraison && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Livraison</p>
                              <p className="text-xs font-bold text-gray-700">{pharmacy.fraisLivraison.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {pharmacy.livraison ? (
                        <Link
                          href={`/medicaments?pharmacy=${pharmacy.id}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" /> Commander
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-400 cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-bold"
                        >
                          <ShoppingBag className="w-4 h-4" /> Pas de livraison
                        </button>
                      )}
                      <a
                        href={`tel:${pharmacy.telephone}`}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                      >
                        <Phone className="w-4 h-4" /> Appeler
                      </a>
                      <a
                        href={`https://www.google.com/maps?q=${pharmacy.lat},${pharmacy.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                      >
                        <Navigation className="w-4 h-4" /> Itinéraire
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Info block */}
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-800 text-sm mb-1">Paiement sécurisé — Escrow MedMap+</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Votre paiement est bloqué en escrow jusqu'à votre confirmation de réception.
                  La pharmacie reçoit le montant hors commission uniquement après que vous confirmez la livraison.
                  En cas de problème, vous êtes intégralement remboursé.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
