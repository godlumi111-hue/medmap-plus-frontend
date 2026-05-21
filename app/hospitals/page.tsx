'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { HOSPITALS, COMMUNES, SPECIALITES_FILTER, TYPE_LABELS, TYPE_COLORS } from '@/lib/hospitals-data'
import {
  Search, MapPin, Star, Phone, Clock, ChevronRight, Building2,
  Heart, Shield, Zap, Filter, CheckCircle, Bed, Users,
  ChevronLeft, SlidersHorizontal, X, DoorOpen, Bell,
} from 'lucide-react'

const FILTERS_TYPE = [
  { value: 'all', label: 'Tous' },
  { value: 'chu', label: 'CHU' },
  { value: 'clinique', label: 'Cliniques' },
  { value: 'polyclinique', label: 'Polycliniques' },
  { value: 'hopital', label: 'Hôpitaux' },
  { value: 'centre', label: 'Centres' },
]

export default function HospitalsPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCommune, setFilterCommune] = useState('Tous')
  const [filterSpecialite, setFilterSpecialite] = useState('Toutes')
  const [filterUrgence, setFilterUrgence] = useState(false)
  const [filterOuvert, setFilterOuvert] = useState(false)
  const [filterPartenaire, setFilterPartenaire] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'note' | 'distance' | 'nom'>('note')

  const filtered = useMemo(() => {
    let list = [...HOSPITALS]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(h =>
        h.nom.toLowerCase().includes(q) ||
        h.commune.toLowerCase().includes(q) ||
        h.services.some(s => s.toLowerCase().includes(q)) ||
        h.specialites.some(s => s.toLowerCase().includes(q))
      )
    }
    if (filterType !== 'all') list = list.filter(h => h.type === filterType)
    if (filterCommune !== 'Tous') list = list.filter(h => h.commune === filterCommune)
    if (filterSpecialite !== 'Toutes') list = list.filter(h => h.specialites.includes(filterSpecialite))
    if (filterUrgence) list = list.filter(h => h.urgence24h)
    if (filterOuvert) list = list.filter(h => h.ouvert)
    if (filterPartenaire) list = list.filter(h => h.partenaire)

    list.sort((a, b) => {
      if (sortBy === 'note') return b.note - a.note
      if (sortBy === 'distance') return (parseFloat(a.distance || '99') - parseFloat(b.distance || '99'))
      return a.nom.localeCompare(b.nom)
    })
    return list
  }, [search, filterType, filterCommune, filterSpecialite, filterUrgence, filterOuvert, filterPartenaire, sortBy])

  const activeFilterCount = [
    filterType !== 'all',
    filterCommune !== 'Tous',
    filterSpecialite !== 'Toutes',
    filterUrgence,
    filterOuvert,
    filterPartenaire,
  ].filter(Boolean).length

  function resetFilters() {
    setFilterType('all')
    setFilterCommune('Tous')
    setFilterSpecialite('Toutes')
    setFilterUrgence(false)
    setFilterOuvert(false)
    setFilterPartenaire(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-600 py-14 px-4 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-300/20 rounded-full blur-3xl" />
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/patient" className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white" />
              </Link>
              <span className="text-white/70 text-sm font-medium">Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Hôpitaux & Cliniques
            </h1>
            <p className="text-white/75 text-base mb-4">
              {HOSPITALS.length} établissements à Abidjan · Réservez un rendez-vous en ligne
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="flex items-center gap-1.5 bg-orange-400/30 text-orange-100 text-xs font-bold px-3 py-1.5 rounded-full">
                <Zap className="w-3.5 h-3.5" /> Consultation immédiate — file d'attente en direct
              </span>
              <span className="flex items-center gap-1.5 bg-white/20 text-white/80 text-xs font-bold px-3 py-1.5 rounded-full">
                <Bell className="w-3.5 h-3.5" /> Notification quand c'est votre tour
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un hôpital, une spécialité..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* Type filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {FILTERS_TYPE.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  filterType === f.value
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-gray-500 font-medium">
              <span className="font-bold text-gray-800">{filtered.length}</span> résultat{filtered.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="note">Mieux notés</option>
                <option value="distance">Les plus proches</option>
                <option value="nom">Nom A–Z</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeFilterCount > 0
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Commune</label>
                  <select
                    value={filterCommune}
                    onChange={e => setFilterCommune(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {COMMUNES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Spécialité</label>
                  <select
                    value={filterSpecialite}
                    onChange={e => setFilterSpecialite(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {SPECIALITES_FILTER.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { label: 'Urgences 24h/24', value: filterUrgence, set: setFilterUrgence },
                  { label: 'Ouvert maintenant', value: filterOuvert, set: setFilterOuvert },
                  { label: 'Partenaire MedMap+', value: filterPartenaire, set: setFilterPartenaire },
                ].map(f => (
                  <button
                    key={f.label}
                    onClick={() => f.set(!f.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      f.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {f.value && <CheckCircle className="w-3.5 h-3.5" />}
                    {f.label}
                  </button>
                ))}
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">Aucun établissement trouvé</p>
              <button onClick={resetFilters} className="mt-3 text-sm text-indigo-600 font-semibold hover:underline">
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((hospital, i) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/hospitals/${hospital.id}`}>
                    <div className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer ${
                      hospital.premium ? 'border-indigo-100' : 'border-gray-100'
                    }`}>
                      {hospital.premium && (
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-1.5 flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-white/80" />
                          <span className="text-xs font-bold text-white">Partenaire Premium MedMap+</span>
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            hospital.type === 'chu' ? 'bg-blue-100' :
                            hospital.type === 'polyclinique' ? 'bg-violet-100' :
                            hospital.type === 'centre' ? 'bg-rose-100' :
                            'bg-indigo-100'
                          }`}>
                            <Building2 className={`w-7 h-7 ${
                              hospital.type === 'chu' ? 'text-blue-600' :
                              hospital.type === 'polyclinique' ? 'text-violet-600' :
                              hospital.type === 'centre' ? 'text-rose-600' :
                              'text-indigo-600'
                            }`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-bold text-gray-900 text-base leading-tight">{hospital.nom}</h3>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[hospital.type]}`}>
                                    {TYPE_LABELS[hospital.type]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <MapPin className="w-3 h-3" />
                                  <span>{hospital.commune} · {hospital.distance ?? '—'}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="flex items-center gap-1 justify-end">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-sm font-bold text-gray-800">{hospital.note}</span>
                                </div>
                                <p className="text-xs text-gray-400">{hospital.avis} avis</p>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {hospital.urgence24h && (
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                  <Zap className="w-3 h-3" /> Urgences 24h
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                hospital.ouvert ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {hospital.ouvert ? 'Ouvert' : 'Fermé'}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">
                                <Bed className="w-3 h-3" /> {hospital.nombreLits} lits
                              </span>
                            </div>

                            {/* Specialties */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {hospital.specialites.slice(0, 4).map(s => (
                                <span key={s} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                                  {s}
                                </span>
                              ))}
                              {hospital.specialites.length > 4 && (
                                <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full border border-gray-100">
                                  +{hospital.specialites.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5" /> {hospital.horaires}
                            </span>
                            {hospital.ouvert && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                <Zap className="w-3 h-3" /> Immédiat dispo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold group-hover:gap-3 transition-all">
                            Consulter <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
