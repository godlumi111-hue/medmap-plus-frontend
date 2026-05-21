'use client'
import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { users } from '@/lib/api'
import {
  MapPin, Phone, Star, Clock, CheckCircle, Calendar, ShoppingBag,
  Navigation, ArrowLeft, Building2, Stethoscope, Mail, Loader2
} from 'lucide-react'

export default function StructureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [structure, setStructure] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const numId = parseInt(id)
    if (isNaN(numId)) { setNotFound(true); setLoading(false); return }
    users.structure(numId)
      .then(data => {
        if (!data) { setNotFound(true) } else { setStructure(data) }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound || !structure) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-5xl mb-4">🏥</div>
            <h2 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: 'Sora' }}>Structure introuvable</h2>
            <p className="text-slate mb-4">Cette structure n'existe pas ou a été supprimée.</p>
            <Link href="/carte" className="text-primary font-semibold hover:underline">
              Retour à la carte
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const info = structure.structure ?? {}
  const pharmacyProfile = structure.pharmacy_profile ?? {}
  const clinicProfile = structure.clinic_profile ?? {}
  const vetProfile = structure.vet_profile ?? {}

  const typeStr = (info.type ?? '').toLowerCase()
  const isPharmacy = typeStr.includes('pharma')
  const isVet = typeStr.includes('vet')
  const isClinic = !isPharmacy

  const services: string[] = clinicProfile.services ?? vetProfile.services ?? []
  const hasUrgence = clinicProfile.urgence24h ?? false
  const isGarde = pharmacyProfile.garde ?? false
  const horaires = pharmacyProfile.horaires ?? clinicProfile.horaires ?? vetProfile.horaires ?? null

  const bannerGradient = isPharmacy
    ? 'bg-gradient-to-br from-primary/80 to-teal-700'
    : isVet
    ? 'bg-gradient-to-br from-orange-400 to-amber-600'
    : 'bg-gradient-to-br from-sky/80 to-blue-600'

  const emoji = isPharmacy ? '💊' : isVet ? '🐾' : '🏥'

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="pt-16">
        {/* Hero Banner */}
        <div className={`relative h-56 overflow-hidden ${bannerGradient}`}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }}
          />
          <div className="relative h-full flex items-center px-4 sm:px-8">
            <div className="max-w-5xl mx-auto w-full flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-5xl flex-shrink-0">
                {emoji}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {structure.partenaire && (
                    <span className="text-xs bg-white/20 text-white border border-white/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Partenaire MedMap+
                    </span>
                  )}
                  {hasUrgence && (
                    <span className="text-xs bg-red-500/80 text-white px-2.5 py-1 rounded-full font-semibold">
                      Urgences 24h
                    </span>
                  )}
                  {isGarde && (
                    <span className="text-xs bg-green-500/80 text-white px-2.5 py-1 rounded-full font-semibold">
                      De garde
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Sora' }}>{info.nom ?? 'Structure'}</h1>
                <p className="text-white/70 mt-1">{info.type ?? ''}</p>
              </div>
            </div>
          </div>
          <Link href="/carte" className="absolute top-4 left-4 flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-5">
              {/* Informations générales */}
              <div className="bg-white rounded-2xl border border-bone p-6">
                <h2 className="font-bold text-ink mb-4" style={{ fontFamily: 'Sora' }}>Informations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    info.adresse   && { icon: <MapPin className="w-4 h-4 text-primary" />, label: 'Adresse',   value: info.adresse },
                    info.ville     && { icon: <MapPin className="w-4 h-4 text-slate" />,   label: 'Ville',     value: info.ville },
                    info.telephone && { icon: <Phone className="w-4 h-4 text-primary" />,  label: 'Téléphone', value: info.telephone },
                    info.email     && { icon: <Mail className="w-4 h-4 text-primary" />,   label: 'Email',     value: info.email },
                    horaires       && { icon: <Clock className="w-4 h-4 text-primary" />,  label: 'Horaires',  value: horaires },
                    clinicProfile.nombre_lits && { icon: <Building2 className="w-4 h-4 text-sky" />, label: 'Capacité', value: `${clinicProfile.nombre_lits} lits` },
                  ].filter(Boolean).map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-paper">
                      <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-xs text-slate">{item.label}</p>
                        <p className="text-sm font-semibold text-ink">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services */}
              {services.length > 0 && (
                <div className="bg-white rounded-2xl border border-bone p-6">
                  <h2 className="font-bold text-ink mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora' }}>
                    <Stethoscope className="w-4 h-4 text-primary" /> Services disponibles
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s: string) => (
                      <span key={s} className="text-sm bg-sky/10 text-sky border border-sky/20 px-3 py-1.5 rounded-full font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Avis */}
              <div className="bg-white rounded-2xl border border-bone p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-ink" style={{ fontFamily: 'Sora' }}>Avis patients</h2>
                  {structure.note && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xl font-bold text-ink">{structure.note}</span>
                      <span className="text-sm text-slate">/5</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate text-center py-4">
                  Les avis seront disponibles prochainement.
                </p>
              </div>
            </div>

            {/* Sidebar actions */}
            <div>
              <div className="bg-white rounded-2xl border border-bone p-5 sticky top-24 space-y-3">
                <h2 className="font-bold text-ink mb-2" style={{ fontFamily: 'Sora' }}>Actions</h2>

                {structure.note && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="text-lg font-bold text-ink">{structure.note} / 5</p>
                      <p className="text-xs text-slate">Note MedMap+</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const addr = info.adresse ?? info.nom ?? ''
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank')
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-bone text-ink rounded-xl text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Navigation className="w-4 h-4" /> Voir l'itinéraire
                </button>

                {info.telephone && (
                  <a
                    href={`tel:${info.telephone}`}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-bone text-ink rounded-xl text-sm font-semibold hover:border-primary hover:text-primary transition-all"
                  >
                    <Phone className="w-4 h-4" /> Appeler
                  </a>
                )}

                {structure.partenaire && isClinic && (
                  <Link
                    href="/appointments"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sky to-blue-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-sky/20"
                  >
                    <Calendar className="w-4 h-4" /> Prendre un RDV
                  </Link>
                )}

                {structure.partenaire && isPharmacy && (
                  <Link
                    href="/medicaments"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-sky text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    <ShoppingBag className="w-4 h-4" /> Commander médicaments
                  </Link>
                )}

                {!structure.partenaire && (
                  <div className="p-3 bg-bone rounded-xl text-xs text-slate text-center">
                    Cette structure n'est pas encore partenaire MedMap+.
                  </div>
                )}

                {isGarde && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                    <p className="text-sm font-semibold text-green-700">De garde</p>
                    {horaires && <p className="text-xs text-green-600 mt-0.5">{horaires}</p>}
                  </div>
                )}

                {hasUrgence && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm font-semibold text-red-700">Urgences 24h/24 — 7j/7</p>
                    {info.telephone && (
                      <a href={`tel:${info.telephone}`} className="text-xs text-red-600 hover:underline mt-0.5 block">
                        Appeler maintenant
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
