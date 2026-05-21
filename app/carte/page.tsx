'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { users } from '@/lib/api'
import {
  MapPin, Search, Filter, Star, Phone, Clock, Navigation,
  Calendar, ShoppingBag, CheckCircle, X, Building2, Stethoscope, Pill, PawPrint,
  Loader2
} from 'lucide-react'

type FilterType = 'tous' | 'hopital' | 'pharmacie' | 'veterinaire'

const filterButtons: { id: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'tous',        label: 'Tous',                icon: <MapPin className="w-4 h-4" />,      color: 'bg-ink text-white' },
  { id: 'hopital',     label: 'Hôpitaux / Cliniques', icon: <Building2 className="w-4 h-4" />,   color: 'bg-sky/10 text-sky border border-sky/20' },
  { id: 'pharmacie',   label: 'Pharmacies',           icon: <Pill className="w-4 h-4" />,        color: 'bg-primary/10 text-primary border border-primary/20' },
  { id: 'veterinaire', label: 'Vétérinaires',         icon: <PawPrint className="w-4 h-4" />,    color: 'bg-orange-50 text-orange-600 border border-orange-100' },
]

const pinColors: Record<string, string> = {
  hopital:     '#0EA5E9',
  pharmacie:   '#0D9488',
  veterinaire: '#F97316',
}

function pinEmoji(type: string) {
  if (type === 'hopital') return '🏥'
  if (type === 'pharmacie') return '💊'
  return '🐾'
}

function structureType(s: any): FilterType {
  const t = (s.structure?.type ?? '').toLowerCase()
  if (t.includes('pharma')) return 'pharmacie'
  if (t.includes('vet')) return 'veterinaire'
  return 'hopital'
}

function pinPosition(index: number, total: number) {
  const cols = Math.ceil(Math.sqrt(total))
  const col = index % cols
  const row = Math.floor(index / cols)
  const x = 20 + (col / Math.max(cols - 1, 1)) * 60
  const y = 20 + (row / Math.max(Math.ceil(total / cols) - 1, 1)) * 55
  return { x: Math.min(x, 80), y: Math.min(y, 75) }
}

export default function CartePage() {
  const [structures, setStructures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('tous')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    users.structures()
      .then(data => setStructures(Array.isArray(data) ? data : []))
      .catch(() => setStructures([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = structures.filter(s => {
    const type = structureType(s)
    const name = s.structure?.nom ?? ''
    const ville = s.structure?.ville ?? ''
    const matchesFilter = activeFilter === 'tous' || type === activeFilter
    const matchesSearch = search === '' ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      ville.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const selected = structures.find(s => s.id === selectedId)

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="pt-16 h-screen flex flex-col">
        {/* Search & Filters Bar */}
        <div className="bg-white border-b border-bone px-4 py-3 space-y-3">
          <div className="flex gap-3 max-w-7xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
              <input
                type="text"
                placeholder="Rechercher une structure..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-bone rounded-xl text-sm font-medium hover:bg-bone transition-colors">
              <Filter className="w-4 h-4" /> Filtres
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 max-w-7xl mx-auto">
            {filterButtons.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeFilter === f.id ? f.color + ' shadow-md scale-105' : 'bg-bone text-slate hover:bg-primary/5 hover:text-primary'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Simulated Map */}
          <div className="flex-1 relative bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(#0D9488 1px, transparent 1px), linear-gradient(90deg, #0D9488 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />
            <svg className="absolute inset-0 w-full h-full opacity-30">
              <path d="M 0 60% Q 30% 50% 60% 55% T 100% 50%" stroke="#94a3b8" strokeWidth="8" fill="none" />
              <path d="M 30% 0 Q 40% 40% 50% 60% T 45% 100%" stroke="#94a3b8" strokeWidth="6" fill="none" />
              <path d="M 0 30% Q 50% 25% 70% 40% T 100% 35%" stroke="#94a3b8" strokeWidth="5" fill="none" />
              <path d="M 20% 0 Q 25% 50% 30% 100%" stroke="#cbd5e1" strokeWidth="3" fill="none" />
              <path d="M 70% 0 Q 65% 50% 70% 100%" stroke="#cbd5e1" strokeWidth="3" fill="none" />
              <path d="M 0 75% Q 50% 70% 100% 75%" stroke="#cbd5e1" strokeWidth="3" fill="none" />
            </svg>

            <div className="absolute text-xs text-slate/50 font-medium" style={{ left: '52%', top: '36%' }}>Cocody</div>
            <div className="absolute text-xs text-slate/50 font-medium" style={{ left: '32%', top: '55%' }}>Plateau</div>
            <div className="absolute text-xs text-slate/50 font-medium" style={{ left: '58%', top: '25%' }}>Deux Plateaux</div>
            <div className="absolute text-xs text-slate/50 font-medium" style={{ left: '15%', top: '42%' }}>Yopougon</div>
            <div className="absolute text-xs text-slate/50 font-medium" style={{ left: '40%', top: '72%' }}>Marcory</div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              filtered.map((s, i) => {
                const type = structureType(s)
                const pos = pinPosition(i, filtered.length)
                const garde = s.pharmacy_profile?.garde
                return (
                  <motion.button
                    key={s.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.3 }}
                    onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className="relative">
                      {selectedId === s.id && (
                        <div className="absolute inset-0 rounded-full animate-ping opacity-40"
                          style={{ backgroundColor: pinColors[type] }} />
                      )}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white"
                        style={{ backgroundColor: pinColors[type] }}
                      >
                        {pinEmoji(type)}
                      </div>
                      {garde && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                      {s.partenaire && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="bg-white text-xs font-semibold text-ink px-2 py-0.5 rounded-full shadow mt-1 text-center max-w-24 truncate border border-bone">
                      {s.structure?.nom ?? 'Structure'}
                    </div>
                  </motion.button>
                )
              })
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl p-3 shadow-md border border-bone text-xs space-y-1.5">
              <p className="font-semibold text-ink mb-2">Légende</p>
              {[
                { color: '#0EA5E9', label: 'Hôpital / Clinique' },
                { color: '#0D9488', label: 'Pharmacie' },
                { color: '#F97316', label: 'Vétérinaire' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-slate">{l.label}</span>
                </div>
              ))}
              <hr className="border-bone my-1" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate">De garde</span>
              </div>
            </div>

            {/* My location indicator */}
            <div className="absolute" style={{ left: '48%', top: '55%' }}>
              <div className="relative">
                <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
              </div>
            </div>
          </div>

          {/* Side Panel — selected structure */}
          <AnimatePresence>
            {selectedId && selected && (
              <motion.div
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                className="w-80 bg-white border-l border-bone overflow-y-auto flex-shrink-0"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-ink" style={{ fontFamily: 'Sora' }}>
                      {selected.structure?.nom ?? 'Structure'}
                    </h3>
                    <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-bone">
                      <X className="w-4 h-4 text-slate" />
                    </button>
                  </div>

                  {selected.partenaire ? (
                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-4 w-fit">
                      <CheckCircle className="w-3.5 h-3.5" /> Partenaire MedMap+
                    </div>
                  ) : (
                    <div className="bg-bone text-slate px-3 py-1.5 rounded-full text-xs font-semibold mb-4 w-fit">
                      Non partenaire
                    </div>
                  )}

                  <div className="space-y-3">
                    {selected.structure?.adresse && (
                      <div className="flex items-start gap-2 text-sm text-slate">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{selected.structure.adresse}, {selected.structure?.ville}</span>
                      </div>
                    )}
                    {selected.structure?.telephone && (
                      <div className="flex items-center gap-2 text-sm text-slate">
                        <Phone className="w-4 h-4 text-primary" />
                        <span>{selected.structure.telephone}</span>
                      </div>
                    )}
                    {selected.pharmacy_profile?.horaires && (
                      <div className="flex items-center gap-2 text-sm text-slate">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{selected.pharmacy_profile.horaires}</span>
                      </div>
                    )}
                    {selected.note && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{selected.note}</span>
                        <span className="text-slate">/5</span>
                      </div>
                    )}
                    {selected.pharmacy_profile?.garde && (
                      <div className="bg-green-50 text-green-700 border border-green-100 px-3 py-2 rounded-xl text-xs font-semibold">
                        Pharmacie de garde
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-5">
                    <button
                      onClick={() => {
                        const addr = selected.structure?.adresse ?? selected.structure?.nom ?? ''
                        window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank')
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary to-sky text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                    >
                      <Navigation className="w-4 h-4" /> Voir l'itinéraire
                    </button>

                    {selected.partenaire && structureType(selected) === 'pharmacie' && (
                      <Link href="/medicaments" className="flex items-center justify-center gap-2 py-2.5 border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary hover:text-white transition-all">
                        <ShoppingBag className="w-4 h-4" /> Commander
                      </Link>
                    )}

                    {selected.partenaire && structureType(selected) !== 'pharmacie' && (
                      <Link href="/appointments" className="flex items-center justify-center gap-2 py-2.5 border-2 border-sky text-sky rounded-xl text-sm font-semibold hover:bg-sky hover:text-white transition-all">
                        <Calendar className="w-4 h-4" /> Prendre RDV
                      </Link>
                    )}

                    <Link href={`/structure/${selected.id}`} className="flex items-center justify-center gap-2 py-2 text-sm text-slate hover:text-primary transition-colors">
                      Voir les détails
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Structures list sidebar (no selection) */}
          {!selectedId && (
            <div className="w-80 bg-white border-l border-bone overflow-y-auto flex-shrink-0">
              <div className="p-4">
                <p className="text-sm font-semibold text-ink mb-3">
                  {loading ? 'Chargement...' : `${filtered.length} structure${filtered.length !== 1 ? 's' : ''} trouvée${filtered.length !== 1 ? 's' : ''}`}
                </p>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-8 h-8 text-bone mx-auto mb-2" />
                    <p className="text-sm text-slate">Aucune structure trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(s => {
                      const type = structureType(s)
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedId(s.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bone text-left transition-all border border-transparent hover:border-bone"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: pinColors[type] + '20' }}
                          >
                            {pinEmoji(type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">
                              {s.structure?.nom ?? 'Structure'}
                            </p>
                            <p className="text-xs text-slate truncate">
                              {s.structure?.ville}
                              {s.pharmacy_profile?.garde ? ' • Garde' : ''}
                            </p>
                          </div>
                          {s.partenaire && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
