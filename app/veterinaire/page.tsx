'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { vet as vetApi, appointments, wallet } from '@/lib/api'
import {
  PawPrint, Search, MapPin, Phone, Star, CheckCircle, AlertCircle,
  X, ChevronRight, Loader2, RefreshCw, Calendar, Clock, Stethoscope,
  Home, Zap, Shield, CreditCard,
} from 'lucide-react'

// ── New animals API (pet_animals table) ──────────────────────────────────────
const ANIMALS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace('/v1', '')
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('medmap_token')
}
async function fetchMyAnimals() {
  const res = await fetch(`${ANIMALS_URL}/animals/my`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) return []
  return res.json()
}
async function linkAppointmentToAnimal(animalId: number, appointmentId: number) {
  await fetch(`${ANIMALS_URL}/animals/${animalId}/link-appointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ appointment_id: appointmentId }),
  })
}

function animalEmoji(species: string) {
  if (species === 'Chien') return '🐕'
  if (species === 'Chat') return '🐈'
  if (species === 'Oiseau') return '🐦'
  if (species === 'Lapin') return '🐇'
  return '🐾'
}

const SOINS = [
  { label: 'Consultation générale', prix: 15000 },
  { label: 'Vaccination', prix: 10000 },
  { label: 'Urgence', prix: 30000 },
  { label: 'Chirurgie', prix: 80000 },
  { label: 'Bilan de santé', prix: 20000 },
  { label: 'Soins dentaires', prix: 25000 },
  { label: 'Toilettage médical', prix: 12000 },
  { label: 'Radiologie', prix: 35000 },
  { label: 'Analyse sanguine', prix: 18000 },
]

const HEURES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

function StarRating({ note }: { note: number | null }) {
  if (!note) return <span className="text-xs text-gray-400">Nouveau</span>
  return (
    <span className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-xs font-bold text-gray-700">{note.toFixed(1)}</span>
    </span>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {children}
    </span>
  )
}

type BookStep = 'animal' | 'soin' | 'datetime' | 'symptomes' | 'confirm'

interface BookState {
  vetInfo: any
  animal: any | null
  soin: typeof SOINS[0] | null
  date: string
  heure: string
  symptomes: string
  urgence: boolean
}

export default function VeterinairePage() {
  const { user } = useAuth()
  const [vets, setVets] = useState<any[]>([])
  const [animaux, setAnimaux] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [villeFilter, setVilleFilter] = useState('')
  const [urgent, setUrgent] = useState(false)

  const [preselectedAnimal, setPreselectedAnimal] = useState<any>(null)
  const [booking, setBooking] = useState<BookState | null>(null)
  const [step, setStep] = useState<BookStep>('animal')
  const [booking_saving, setBookingSaving] = useState(false)
  const [booking_error, setBookingError] = useState('')
  const [booking_success, setBookingSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vList, wData] = await Promise.all([
        vetApi.list(villeFilter ? { ville: villeFilter } : undefined),
        user?.role === 'patient' ? wallet.me() : Promise.resolve(null),
      ])
      setVets(vList)
      if (wData) setWalletData(wData)

      if (user?.role === 'patient') {
        const aList = await fetchMyAnimals()
        setAnimaux(aList)
      }
    } catch {}
    finally { setLoading(false) }
  }, [villeFilter, user?.role])

  useEffect(() => { load() }, [load])

  // Read pre-selected animal from sessionStorage (set by /animal dossier page)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem('vet_preselect_animal')
    if (stored) {
      try {
        setPreselectedAnimal(JSON.parse(stored))
        sessionStorage.removeItem('vet_preselect_animal')
      } catch {}
    }
  }, [])

  const filtered = vets.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.nom?.toLowerCase().includes(q) || v.ville?.toLowerCase().includes(q) || v.services?.some((s: string) => s.toLowerCase().includes(q))
    const matchUrgent = !urgent || v.urgences
    return matchQ && matchUrgent
  })

  function openBooking(vetInfo: any) {
    if (!user) return
    // If an animal was pre-selected from /animal page, use it and skip to 'soin' step
    const initialAnimal = preselectedAnimal
      ? (animaux.find((x: any) => x.id === preselectedAnimal.id) ?? animaux[0] ?? null)
      : null
    setBooking({ vetInfo, animal: initialAnimal, soin: null, date: '', heure: '', symptomes: '', urgence: false })
    setStep(initialAnimal ? 'soin' : 'animal')
    setBookingError('')
    setBookingSuccess(false)
    setPreselectedAnimal(null)
  }

  function closeBooking() {
    setBooking(null)
    setBookingError('')
    setBookingSuccess(false)
  }

  async function confirmBooking() {
    if (!booking || !booking.animal || !booking.soin || !booking.date || !booking.heure) return
    setBookingSaving(true)
    setBookingError('')
    try {
      const motif = `[${booking.animal.name} - ${booking.animal.species}] ${booking.soin.label}${booking.urgence ? ' · URGENCE' : ''}${booking.symptomes ? ` · ${booking.symptomes}` : ''}`
      const result = await appointments.book({
        provider_type: 'veterinaire',
        structure_id: booking.vetInfo.structure_id,
        service: booking.soin.label,
        date_rdv: booking.date,
        heure_rdv: booking.heure,
        type_rdv: booking.urgence ? 'urgence' : 'consultation',
        motif,
        prix: booking.soin.prix,
        symptomes: booking.symptomes || undefined,
        animal_id: booking.animal.id,
        animal_nom: booking.animal.name,
        animal_espece: booking.animal.species,
      })
      // Link appointment to the pet dossier
      if (result?.id || result?.appointment_id) {
        const apptId = result.id ?? result.appointment_id
        await linkAppointmentToAnimal(booking.animal.id, apptId).catch(() => {})
      }
      setBookingSuccess(true)
    } catch (e: any) {
      setBookingError(e.message)
    } finally {
      setBookingSaving(false)
    }
  }

  const solde = walletData?.solde ?? 0
  const canAfford = booking ? solde >= (booking.soin?.prix ?? 0) : false

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 py-12 px-4 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-300/20 rounded-full blur-3xl" />
          <div className="max-w-5xl mx-auto relative text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <PawPrint className="w-4 h-4" />
              <span className="text-sm font-semibold">Santé animale</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Vétérinaires & Cliniques
            </h1>
            <p className="text-white/80 text-sm max-w-xl mx-auto">
              Trouvez un vétérinaire proche de vous et prenez rendez-vous en ligne pour vos animaux.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                placeholder="Nom, ville, service…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 w-40"
                placeholder="Ville"
                value={villeFilter}
                onChange={e => setVilleFilter(e.target.value)}
              />
            </div>
            <button
              onClick={() => setUrgent(u => !u)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${urgent ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
            >
              <Zap className="w-3.5 h-3.5" /> Urgences
            </button>
            <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Pre-selected animal banner */}
          {preselectedAnimal && (
            <div className="flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 mb-5">
              <span className="text-2xl">{animalEmoji(preselectedAnimal.species)}</span>
              <div className="flex-1">
                <p className="font-bold text-pink-900 text-sm">
                  RDV pour {preselectedAnimal.name}
                </p>
                <p className="text-xs text-pink-600">Choisissez un vétérinaire ci-dessous pour continuer</p>
              </div>
              <button onClick={() => setPreselectedAnimal(null)} className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center hover:bg-pink-200">
                <X className="w-3.5 h-3.5 text-pink-500" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <PawPrint className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <p className="font-bold text-gray-500 text-lg">Aucun vétérinaire trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Essayez de modifier votre recherche ou votre ville</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((v, i) => (
                <motion.div
                  key={v.structure_id ?? v.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-pink-500 to-rose-600 p-4 text-white">
                    {v.partenaire && (
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" /> Partenaire
                        </span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl mb-3">🏥</div>
                    <h3 className="font-bold text-base leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{v.nom}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StarRating note={v.note} />
                      {v.urgences && <Badge color="bg-red-500/80 text-white">🚨 Urgences</Badge>}
                      {v.soins_domicile && <Badge color="bg-white/20 text-white"><Home className="w-3 h-3" /> Domicile</Badge>}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    {v.adresse && (
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-pink-400" />
                        <span>{v.adresse}{v.ville ? `, ${v.ville}` : ''}</span>
                      </div>
                    )}
                    {v.telephone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5 text-pink-400" />
                        <span>{v.telephone}</span>
                      </div>
                    )}
                    {v.horaires && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-pink-400" />
                        <span className="line-clamp-1">{v.horaires}</span>
                      </div>
                    )}

                    {v.services && v.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.services.slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full font-medium">{s}</span>
                        ))}
                        {v.services.length > 3 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">+{v.services.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Queue count */}
                    {v.queue_count > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-semibold">{v.queue_count} animal{v.queue_count > 1 ? 'x' : ''} en salle</span>
                      </div>
                    )}

                    {user?.role === 'patient' ? (
                      <button
                        onClick={() => openBooking(v)}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4" /> Prendre RDV
                      </button>
                    ) : (
                      <div className="text-center text-xs text-gray-400 py-1.5">Connectez-vous en tant que patient pour réserver</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {booking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) closeBooking() }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Réservation</p>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{booking.vetInfo.nom}</h3>
                </div>
                <button onClick={closeBooking} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {booking_success ? (
                <div className="p-8 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${booking.urgence ? 'bg-red-100' : 'bg-emerald-100'}`}>
                    {booking.urgence
                      ? <span className="text-3xl">🚨</span>
                      : <CheckCircle className="w-8 h-8 text-emerald-600" />
                    }
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">
                    {booking.urgence ? 'Urgence envoyée !' : 'Rendez-vous confirmé !'}
                  </h4>
                  <p className="text-sm text-gray-500 mb-1">
                    {booking.soin?.label} pour <strong>{booking.animal?.name}</strong>
                  </p>
                  {booking.urgence ? (
                    <p className="text-sm text-red-600 font-semibold mb-4">
                      La clinique a reçu votre demande urgente. Rendez-vous immédiatement à {booking.vetInfo?.nom}.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">
                      Le {new Date(booking.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {booking.heure}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-6">
                    Le paiement de {booking.soin?.prix?.toLocaleString('fr-FR')} FCFA a été bloqué en séquestre. Il sera libéré après confirmation des soins.
                  </p>
                  <button onClick={closeBooking} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl">
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Step indicators */}
                  <div className="flex items-center gap-1">
                    {(['animal', 'soin', 'datetime', 'symptomes', 'confirm'] as BookStep[]).map((s, i) => (
                      <div key={s} className={`h-1.5 rounded-full flex-1 transition-all ${
                        step === s ? 'bg-pink-500' : (['animal', 'soin', 'datetime', 'symptomes', 'confirm'] as BookStep[]).indexOf(step) > i ? 'bg-pink-300' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>

                  {/* Step: animal */}
                  {step === 'animal' && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Choisir l'animal</h4>
                      <p className="text-xs text-gray-400 mb-4">Quel animal emmènes-vous en consultation ?</p>
                      {animaux.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">
                          <PawPrint className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          Aucun animal enregistré.{' '}
                          <a href="/animal" className="text-pink-600 font-semibold underline">Ajouter un animal</a>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {animaux.map(a => (
                            <button
                              key={a.id}
                              onClick={() => { setBooking(b => b ? { ...b, animal: a } : b); setStep('soin') }}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                booking.animal?.id === a.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                              }`}
                            >
                              <span className="text-2xl">{animalEmoji(a.species)}</span>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{a.name}</p>
                                <p className="text-xs text-gray-400">{a.species}{a.breed ? ` · ${a.breed}` : ''}{a.weight ? ` · ${a.weight} kg` : ''}</p>
                              </div>
                              {booking.animal?.id === a.id && <CheckCircle className="w-4 h-4 text-pink-500 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step: soin */}
                  {step === 'soin' && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Type de soin</h4>
                      <p className="text-xs text-gray-400 mb-4">Quel type de soin souhaitez-vous ?</p>
                      <div className="space-y-2">
                        {SOINS.map(s => (
                          <button
                            key={s.label}
                            onClick={() => { setBooking(b => b ? { ...b, soin: s } : b); setStep('datetime') }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                              booking.soin?.label === s.label ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-pink-400" />
                              <span className="font-semibold text-gray-900 text-sm">{s.label}</span>
                            </div>
                            <span className="text-sm font-bold text-pink-600">{s.prix.toLocaleString('fr-FR')} F</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step: datetime */}
                  {step === 'datetime' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 mb-1">Date & heure</h4>

                      {/* Urgence toggle at top */}
                      <label className="flex items-center gap-3 cursor-pointer bg-red-50 border border-red-100 rounded-2xl p-3">
                        <div
                          onClick={() => setBooking(b => b ? { ...b, urgence: !b.urgence } : b)}
                          className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${booking.urgence ? 'bg-red-500' : 'bg-gray-200'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${booking.urgence ? 'left-7' : 'left-1'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">C'est une urgence</p>
                          <p className="text-xs text-gray-500">Prise en charge immédiate, sans rendez-vous</p>
                        </div>
                      </label>

                      {booking.urgence ? (
                        /* Urgence mode — no date/time needed */
                        <div className="space-y-3">
                          <div className="bg-red-600 rounded-2xl p-5 text-white text-center">
                            <div className="text-4xl mb-2">🚨</div>
                            <h5 className="font-bold text-lg mb-1">Prise en charge immédiate</h5>
                            <p className="text-red-100 text-sm">Votre demande sera envoyée maintenant à la clinique.</p>
                            <p className="text-red-100 text-xs mt-1">Date : aujourd'hui · Heure : maintenant</p>
                          </div>

                          {/* Queue info for this clinic */}
                          {booking.vetInfo?.queue_count !== undefined && (
                            <div className={`flex items-center gap-3 rounded-2xl p-4 border ${
                              booking.vetInfo.queue_count === 0
                                ? 'bg-emerald-50 border-emerald-200'
                                : booking.vetInfo.queue_count < 3
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <span className="text-2xl">
                                {booking.vetInfo.queue_count === 0 ? '✅' : booking.vetInfo.queue_count < 3 ? '⏳' : '🔴'}
                              </span>
                              <div>
                                <p className="font-bold text-sm text-gray-800">
                                  {booking.vetInfo.queue_count === 0
                                    ? 'Aucun animal en attente'
                                    : `${booking.vetInfo.queue_count} animal${booking.vetInfo.queue_count > 1 ? 'x' : ''} en attente`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {booking.vetInfo.queue_count === 0
                                    ? 'Prise en charge directe possible'
                                    : `Temps estimé : ~${booking.vetInfo.queue_count * 15} min`}
                                </p>
                              </div>
                            </div>
                          )}

                          {!booking.vetInfo?.urgences && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700">
                                Cette clinique n'a pas de service d'urgences déclaré. Appelez avant de vous déplacer.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Normal mode — date/time picker */
                        <div className="space-y-4">
                          <p className="text-xs text-gray-400">Choisissez votre créneau</p>
                          <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1.5">Date</label>
                            <input
                              type="date"
                              min={today}
                              value={booking.date}
                              onChange={e => setBooking(b => b ? { ...b, date: e.target.value } : b)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1.5">Heure</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {HEURES.map(h => (
                                <button
                                  key={h}
                                  onClick={() => setBooking(b => b ? { ...b, heure: h } : b)}
                                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                    booking.heure === h ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-pink-300'
                                  }`}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step: symptomes */}
                  {step === 'symptomes' && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Symptômes & motif</h4>
                      <p className="text-xs text-gray-400 mb-4">Décrivez les symptômes observés (optionnel)</p>
                      <textarea
                        rows={5}
                        placeholder="Ex: Mon chien boite depuis hier soir, il refuse de mettre la patte droite par terre…"
                        value={booking.symptomes}
                        onChange={e => setBooking(b => b ? { ...b, symptomes: e.target.value } : b)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                  )}

                  {/* Step: confirm */}
                  {step === 'confirm' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 mb-1">Récapitulatif</h4>

                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{animalEmoji(booking.animal?.species ?? '')}</span>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{booking.animal?.name}</p>
                            <p className="text-xs text-gray-400">{booking.animal?.species}{booking.animal?.breed ? ` · ${booking.animal.breed}` : ''}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400 mb-0.5">Vétérinaire</p>
                            <p className="font-semibold text-gray-800">{booking.vetInfo.nom}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-0.5">Soin</p>
                            <p className="font-semibold text-gray-800">{booking.soin?.label}</p>
                          </div>
                          {booking.urgence ? (
                            <div className="col-span-2">
                              <span className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded-full">🚨 URGENCE — Prise en charge immédiate</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="text-gray-400 mb-0.5">Date</p>
                                <p className="font-semibold text-gray-800">{booking.date ? new Date(booking.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Heure</p>
                                <p className="font-semibold text-gray-800">{booking.heure || '—'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-pink-900">Montant total</span>
                          <span className="text-lg font-bold text-pink-700">{booking.soin?.prix?.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-pink-600 mb-3">
                          <span>Votre solde</span>
                          <span className="font-semibold">{solde.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {!canAfford && (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-600">Solde insuffisant. <a href="/portefeuille" className="font-bold underline">Recharger</a></p>
                          </div>
                        )}
                        {canAfford && (
                          <div className="flex items-center gap-2 text-xs text-pink-700">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Paiement bloqué en séquestre jusqu'à confirmation des soins</span>
                          </div>
                        )}
                      </div>

                      {booking_error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-600">{booking_error}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex gap-2 pt-2">
                    {step !== 'animal' && (
                      <button
                        onClick={() => {
                          const steps: BookStep[] = ['animal', 'soin', 'datetime', 'symptomes', 'confirm']
                          setStep(steps[steps.indexOf(step) - 1])
                        }}
                        className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-50"
                      >
                        Retour
                      </button>
                    )}
                    {step !== 'confirm' ? (
                      <button
                        onClick={() => {
                          const steps: BookStep[] = ['animal', 'soin', 'datetime', 'symptomes', 'confirm']
                          const next = steps[steps.indexOf(step) + 1]
                          if (step === 'animal' && !booking.animal) return
                          if (step === 'soin' && !booking.soin) return
                          if (step === 'datetime' && !booking.urgence && (!booking.date || !booking.heure)) return
                          // For urgence: auto-fill date/heure with now
                          if (step === 'datetime' && booking.urgence) {
                            const now = new Date()
                            const dateStr = now.toISOString().slice(0, 10)
                            const heureStr = now.toTimeString().slice(0, 5)
                            setBooking(b => b ? { ...b, date: dateStr, heure: heureStr } : b)
                          }
                          setStep(next)
                        }}
                        className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={
                          (step === 'animal' && !booking.animal) ||
                          (step === 'soin' && !booking.soin) ||
                          (step === 'datetime' && !booking.urgence && (!booking.date || !booking.heure))
                        }
                      >
                        {step === 'datetime' && booking.urgence ? (
                          <><Zap className="w-4 h-4" /> Envoyer l'urgence</>
                        ) : (
                          <>Suivant <ChevronRight className="w-4 h-4" /></>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={confirmBooking}
                        disabled={booking_saving || !canAfford}
                        className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {booking_saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Payer & réserver</>}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
