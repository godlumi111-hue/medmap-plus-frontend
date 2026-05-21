'use client'
import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { HOSPITALS, TYPE_LABELS, TYPE_COLORS } from '@/lib/hospitals-data'
import { appointments as appointmentsApi, users as usersApi, wallet as walletApi, hospital as hospitalApi } from '@/lib/api'
import {
  ChevronLeft, Star, MapPin, Phone, Clock, Building2, Bed,
  Zap, Shield, CheckCircle, Calendar, ChevronRight, User,
  CreditCard, X, ArrowRight, Stethoscope, Loader2, AlertCircle,
  Heart, Activity, FileText, Info, DoorOpen, Users, Bell,
} from 'lucide-react'

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]
const UNAVAILABLE = ['09:00', '10:30', '14:00', '15:30']

function getNext7Days() {
  const days: Date[] = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

const SEXE_OPTIONS = ['Homme', 'Femme', 'Autre']

const STATUT_ROOM_COLOR: Record<string, string> = {
  libre:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  occupee: 'bg-amber-50 text-amber-700 border-amber-200',
  pause:   'bg-blue-50 text-blue-700 border-blue-200',
  fermee:  'bg-gray-100 text-gray-400 border-gray-200',
}
const STATUT_ROOM_DOT: Record<string, string> = {
  libre: 'bg-emerald-500', occupee: 'bg-amber-400', pause: 'bg-blue-400', fermee: 'bg-gray-300',
}
const STATUT_ROOM_LABEL: Record<string, string> = {
  libre: 'Libre', occupee: 'Occupée', pause: 'Pause', fermee: 'Fermée',
}

export default function HospitalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const hospital = HOSPITALS.find(h => h.id === id)

  const [dbStructureId, setDbStructureId] = useState<number | null>(null)
  const [walletSolde, setWalletSolde] = useState<number | null>(null)

  // Mode: 'immediate' | 'programme'
  const [mode, setMode] = useState<'choose' | 'immediate' | 'programme'>('choose')

  // ── Immediate mode state ──
  const [liveServices, setLiveServices] = useState<any[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [immMotif, setImmMotif] = useState('')
  const [immSymptomes, setImmSymptomes] = useState('')
  const [immAge, setImmAge] = useState('')
  const [immSexe, setImmSexe] = useState('')
  const [immSubmitting, setImmSubmitting] = useState(false)
  const [immBooked, setImmBooked] = useState(false)
  const [immResult, setImmResult] = useState<any>(null)
  const [immError, setImmError] = useState('')

  // ── Programmed mode state ──
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState<{ label: string; prix: number } | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [symptomes, setSymptomes] = useState('')
  const [agePatient, setAgePatient] = useState('')
  const [sexePatient, setSexePatient] = useState('')
  const [premiereConsult, setPremiereConsult] = useState(true)
  const [antecedents, setAntecedents] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookedApptId, setBookedApptId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const days = getNext7Days()

  useEffect(() => {
    if (!hospital) return
    Promise.all([
      usersApi.structures({ type: 'clinique' }),
      walletApi.me().catch(() => null),
    ]).then(([structures, w]) => {
      const match = structures.find((s: any) =>
        (s.nom || s.structure?.nom)?.toLowerCase().trim() === hospital.nom.toLowerCase().trim()
      )
      if (match) setDbStructureId(match.structure_id ?? match.id)
      if (w) setWalletSolde(parseFloat(w.solde || 0))
    }).catch(() => {})
  }, [hospital])

  useEffect(() => {
    if (user?.telephone && !immAge) {}
  }, [user])

  // Load live services when entering immediate mode
  useEffect(() => {
    if (mode !== 'immediate' || !dbStructureId) return
    setLiveLoading(true)
    hospitalApi.services(dbStructureId)
      .then(data => {
        const svcs = data.services ?? []
        setLiveServices(svcs)
        // Auto-sélectionner le premier service
        if (svcs.length > 0 && !selectedServiceId) {
          setSelectedServiceId(svcs[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLiveLoading(false))
  }, [mode, dbStructureId]) // eslint-disable-line

  if (!hospital) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center py-24 text-center">
          <div>
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500">Établissement introuvable</p>
            <Link href="/hospitals" className="mt-3 text-indigo-600 font-semibold hover:underline block">← Retour</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Immediate booking handler ─────────────────────────────────────────────
  async function handleImmediateBook() {
    setImmError('')
    if (!selectedServiceId) {
      setImmError('Veuillez sélectionner un service avant de continuer.')
      return
    }
    if (!dbStructureId) {
      setImmError('Cet établissement n\'est pas encore connecté à MedMap+.')
      return
    }
    const svc = liveServices.find((s: any) => s.id === selectedServiceId)
    const prixSvc = parseFloat(svc?.prix || 0)
    const totalSvc = prixSvc > 0 ? Math.round(prixSvc * 1.15) : 0
    if (prixSvc > 0 && walletSolde !== null && walletSolde < totalSvc) {
      setImmError(`Solde insuffisant. Votre solde : ${walletSolde.toLocaleString('fr-FR')} FCFA. Total requis : ${totalSvc.toLocaleString('fr-FR')} FCFA (tarif ${prixSvc.toLocaleString('fr-FR')} + commission 15%).`)
      return
    }
    setImmSubmitting(true)
    try {
      const result = await hospitalApi.bookImmediate({
        structure_id: dbStructureId,
        service_id: selectedServiceId,
        motif: immMotif || 'Consultation immédiate',
        symptomes: immSymptomes || undefined,
        age_patient: immAge ? parseInt(immAge) : undefined,
        sexe_patient: immSexe || undefined,
        prix: prixSvc,
      })
      // Update wallet balance locally (total debited = base + 15% commission)
      if (prixSvc > 0 && walletSolde !== null) setWalletSolde(walletSolde - totalSvc)
      setImmResult(result)
      setImmBooked(true)
    } catch (e: any) {
      setImmError(e.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
    setImmSubmitting(false)
  }

  // ── Programmed booking handler ────────────────────────────────────────────
  async function handleBook() {
    if (!selectedService || !selectedDay || !selectedTime) return
    setSubmitting(true)
    setError('')
    try {
      const dateStr = selectedDay.toISOString().split('T')[0]
      const result = await appointmentsApi.book({
        provider_type: 'structure',
        structure_id: dbStructureId || undefined,
        service: selectedService.label,
        date_rdv: dateStr,
        heure_rdv: selectedTime,
        motif: motif || selectedService.label,
        prix: selectedService.prix,
        symptomes: symptomes || undefined,
        age_patient: agePatient ? parseInt(agePatient) : undefined,
        sexe_patient: sexePatient || undefined,
        premiere_consult: premiereConsult,
        antecedents: antecedents || undefined,
      })
      setBookedApptId(result.id || null)
      setBooked(true)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la réservation')
    }
    setSubmitting(false)
  }

  const hasEnoughFunds = walletSolde === null || (selectedService ? walletSolde >= Math.round(selectedService.prix * 1.15) : true)

  // ── Success screens ───────────────────────────────────────────────────────
  if (immBooked && immResult) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 max-w-lg mx-auto px-4 py-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Zap className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Demande envoyée !
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Votre demande de consultation immédiate est en cours de traitement par <strong>{hospital.nom}</strong>.
              La réception va valider et vous attribuer une salle.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-left mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-orange-500 uppercase">Votre ticket</span>
                <span className="font-mono font-extrabold text-orange-700 text-xl">#{immResult.ticket_numero}</span>
              </div>
              <p className="text-sm text-orange-700"><strong>Service :</strong> {immResult.service}</p>
              <p className="text-xs text-orange-500 mt-1">Présentez ce numéro à la réception ou sur votre téléphone.</p>
            </div>

            {immResult.prix > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-left mb-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Tarif consultation</span>
                  <span>{parseInt(immResult.prix).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Commission MedMap+ (15%)</span>
                  <span className="text-indigo-500">+{Math.round(parseInt(immResult.prix) * 0.15).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-indigo-100 pt-1">
                  <span className="text-indigo-700">Total bloqué en séquestre</span>
                  <span className="text-indigo-700">{Math.round(parseInt(immResult.prix) * 1.15).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <p className="text-xs text-indigo-600 mt-1">Libéré à l'établissement après votre confirmation.</p>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-left mb-5">
              <p className="text-xs text-amber-700">
                <strong>Prochaine étape :</strong> La réception va confirmer votre place et vous attribuer une salle. Vous recevrez une notification et un ticket électronique.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/appointments"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-colors">
                <Calendar className="w-4 h-4" /> Voir mes rendez-vous
              </Link>
              <Link href="/hospitals"
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                ← Retour aux hôpitaux
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 max-w-lg mx-auto px-4 py-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Demande envoyée !
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Votre rendez-vous est en attente de confirmation par <strong>{hospital.nom}</strong>.
            </p>
            <div className="bg-indigo-50 rounded-2xl p-4 text-left mb-4">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-3">Récapitulatif</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-semibold text-gray-800">{selectedService?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date & Heure</span>
                  <span className="font-semibold text-gray-800">
                    {selectedDay?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {selectedTime}
                  </span>
                </div>
                {selectedService && selectedService.prix > 0 && (
                  <div className="pt-2 border-t border-indigo-100 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tarif consultation</span>
                      <span>{selectedService.prix.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Commission MedMap+ (15%)</span>
                      <span className="text-indigo-500">+{Math.round(selectedService.prix * 0.15).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-indigo-100 pt-1">
                      <span className="text-gray-600">Total débité</span>
                      <span className="text-indigo-700">{Math.round(selectedService.prix * 1.15).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Réf. : <span className="font-mono font-bold">TKT-{String(bookedApptId || 0).padStart(6, '0')}</span>
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/appointments"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-colors">
                <Calendar className="w-4 h-4" /> Voir mes rendez-vous
              </Link>
              <Link href="/hospitals"
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                ← Retour
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const STEPS = ['Service', 'Informations', 'Date & Heure', 'Confirmation']
  const canProceed = [!!selectedService, !!motif, !!(selectedDay && selectedTime), true]

  const selectedSvc = liveServices.find((s: any) => s.id === selectedServiceId)

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-600 pt-6 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/hospitals" className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white" />
              </Link>
              <span className="text-white/70 text-sm">Hôpitaux & Cliniques</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {hospital.nom}
                  </h1>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${TYPE_COLORS[hospital.type]} bg-white/90`}>
                    {TYPE_LABELS[hospital.type]}
                  </span>
                </div>
                <p className="text-white/75 text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {hospital.adresse} · {hospital.commune}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                    <span className="text-white font-bold text-sm">{hospital.note}</span>
                    <span className="text-white/60 text-xs">({hospital.avis})</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${hospital.ouvert ? 'bg-emerald-400/30 text-emerald-200' : 'bg-gray-400/30 text-gray-200'}`}>
                    {hospital.ouvert ? 'Ouvert' : 'Fermé'}
                  </span>
                  {hospital.urgence24h && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-400/30 text-red-200">
                      Urgences 24h/24
                    </span>
                  )}
                  {dbStructureId && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-200">
                      ✓ Partenaire MedMap+
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">

          {/* ── CHOIX DU MODE ─────────────────────────────────────────── */}
          {mode === 'choose' && (
            <>
              {/* Quick info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-4">
                <a href={`tel:${hospital.telephone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  <Phone className="w-4 h-4 text-indigo-500" /> {hospital.telephone}
                </a>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-indigo-500" /> {hospital.horaires}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Bed className="w-4 h-4 text-indigo-500" /> {hospital.nombreLits} lits
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">À propos</p>
                <p className="text-sm text-gray-600 leading-relaxed">{hospital.description}</p>
              </div>

              {/* Mode choice */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-md overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-4">
                  <p className="text-white font-extrabold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Quel est votre besoin ?
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">Choisissez le type de consultation</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Immediate */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMode('immediate')}
                    className="group relative bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 rounded-2xl p-5 text-left transition-all"
                  >
                    <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center mb-3 transition-colors">
                      <Zap className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-base mb-1">Consultation immédiate</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Je suis malade maintenant et je veux savoir combien de personnes sont devant moi avant de partir.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-orange-600 text-xs font-bold">
                      Voir les files en direct <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </motion.button>

                  {/* Programmed */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMode('programme')}
                    className="group relative bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl p-5 text-left transition-all"
                  >
                    <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center mb-3 transition-colors">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-base mb-1">Rendez-vous programmé</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Je veux réserver un créneau à une date et une heure précises pour plus tard.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-indigo-600 text-xs font-bold">
                      Choisir un créneau <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </motion.button>
                </div>
              </div>
            </>
          )}

          {/* ── MODE CONSULTATION IMMÉDIATE ──────────────────────────── */}
          {mode === 'immediate' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 mt-2">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>

              {/* Disponibilité en direct */}
              <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden mb-4">
                <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <h3 className="font-bold text-orange-900 text-sm">Disponibilité en direct</h3>
                  </div>
                  {dbStructureId && (
                    <button
                      onClick={() => {
                        if (!dbStructureId) return
                        setLiveLoading(true)
                        hospitalApi.services(dbStructureId)
                          .then(data => setLiveServices(data.services ?? []))
                          .catch(() => {})
                          .finally(() => setLiveLoading(false))
                      }}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      Actualiser
                    </button>
                  )}
                </div>

                {!dbStructureId ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    Cet établissement n'est pas encore connecté à MedMap+.
                    <br />Utilisez le rendez-vous programmé ou appelez directement.
                  </div>
                ) : liveLoading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                  </div>
                ) : liveServices.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">Aucun service disponible en ce moment</div>
                ) : (
                  <div className="p-4 space-y-4">
                    {liveServices.map((svc: any) => (
                      <div key={svc.id}>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{svc.nom}</p>
                        <div className="space-y-2">
                          {svc.rooms.map((room: any) => {
                            const colorClass = STATUT_ROOM_COLOR[room.statut] ?? STATUT_ROOM_COLOR.libre
                            const dotClass = STATUT_ROOM_DOT[room.statut] ?? STATUT_ROOM_DOT.libre
                            const label = STATUT_ROOM_LABEL[room.statut] ?? room.statut
                            return (
                              <div key={room.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                                  <div>
                                    <p className="font-semibold text-gray-800 text-sm">{room.nom}</p>
                                    {room.medecin_nom && (
                                      <p className="text-xs text-gray-400">Dr. {room.medecin_nom}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${colorClass}`}>
                                    {label}
                                  </span>
                                  {room.en_attente > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {room.en_attente} en attente · ~{room.eta_min} min
                                    </p>
                                  )}
                                  {room.en_attente === 0 && room.statut === 'libre' && (
                                    <p className="text-xs text-emerald-600 mt-1 font-bold">Disponible maintenant</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire de demande */}
              {dbStructureId && !liveLoading && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <h3 className="font-bold text-gray-800">Demander un ticket maintenant</h3>

                  {/* Choix service */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block">Service souhaité</label>
                    <div className="space-y-2">
                      {liveServices.map((svc: any) => {
                        const totalWaiting = svc.rooms.reduce((sum: number, r: any) => sum + (r.en_attente ?? 0), 0)
                        const isSelected = selectedServiceId === svc.id
                        const prix = parseFloat(svc.prix || 0)
                        return (
                          <button
                            key={svc.id}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                              isSelected
                                ? 'border-orange-400 bg-orange-50 text-orange-800 shadow-sm'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-200 hover:bg-orange-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div>
                                  <span>{svc.nom}</span>
                                  {prix > 0 && (
                                    <span className="ml-2 text-xs font-bold text-indigo-600">
                                      {prix.toLocaleString('fr-FR')} FCFA
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-xs font-medium ${totalWaiting > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {totalWaiting > 0 ? `${totalWaiting} en attente` : 'Disponible'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Âge</label>
                      <input
                        type="number"
                        placeholder="Ex: 35"
                        value={immAge}
                        onChange={e => setImmAge(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Sexe</label>
                      <select
                        value={immSexe}
                        onChange={e => setImmSexe(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      >
                        <option value="">—</option>
                        {SEXE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Motif / Symptômes</label>
                    <textarea
                      placeholder="Décrivez brièvement votre problème…"
                      value={immSymptomes}
                      onChange={e => setImmSymptomes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                    />
                  </div>

                  {immError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                      {immError}
                    </div>
                  )}

                  {/* Payment summary */}
                  {(() => {
                    const svc = liveServices.find((s: any) => s.id === selectedServiceId)
                    const prix = parseFloat(svc?.prix || 0)
                    const commission = Math.round(prix * 0.15)
                    const total = prix + commission
                    const insuffisant = prix > 0 && walletSolde !== null && walletSolde < total
                    return (
                      <div className={`rounded-xl p-4 border text-sm ${insuffisant ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-bold text-xs uppercase ${insuffisant ? 'text-red-500' : 'text-indigo-500'}`}>
                            <CreditCard className="w-3.5 h-3.5 inline mr-1" />Paiement par séquestre
                          </span>
                        </div>
                        {prix > 0 ? (
                          <>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600">Tarif de consultation</span>
                              <span className="font-semibold text-gray-800">{prix.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600">Commission MedMap+ (15%)</span>
                              <span className="font-semibold text-indigo-600">+{commission.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-xs font-extrabold border-t border-indigo-100 pt-1 mb-1">
                              <span className="text-gray-700">Total débité</span>
                              <span className="text-indigo-700">{total.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            {walletSolde !== null && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Votre solde</span>
                                <span className={`font-bold ${insuffisant ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {walletSolde.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>
                            )}
                            <p className={`text-xs mt-2 ${insuffisant ? 'text-red-600 font-semibold' : 'text-indigo-600'}`}>
                              {insuffisant
                                ? 'Solde insuffisant — rechargez votre wallet avant de continuer.'
                                : 'Le montant sera bloqué en séquestre et libéré après votre confirmation de consultation.'}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-indigo-600">
                            Sélectionnez un service pour voir le tarif avant de confirmer.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  <button
                    onClick={handleImmediateBook}
                    disabled={immSubmitting || (() => {
                      const svc = liveServices.find((s: any) => s.id === selectedServiceId)
                      const prix = parseFloat(svc?.prix || 0)
                      return prix > 0 && walletSolde !== null && walletSolde < Math.round(prix * 1.15)
                    })()}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3.5 rounded-2xl font-bold text-sm transition-colors"
                  >
                    {immSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {immSubmitting ? 'Envoi en cours…' : 'Payer et demander mon ticket'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── MODE RENDEZ-VOUS PROGRAMMÉ ───────────────────────────── */}
          {mode === 'programme' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 mt-2">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>

              <div className="bg-white rounded-3xl border border-indigo-100 shadow-md overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-4">
                  <p className="text-white font-extrabold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Rendez-vous programmé
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">Réservez votre consultation en {STEPS.length} étapes</p>
                </div>

                {/* Step indicators */}
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`flex items-center gap-1.5 ${i === step ? 'flex-1' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                            i < step ? 'bg-indigo-600 text-white' :
                            i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                          </div>
                          {i === step && (
                            <span className="text-xs font-bold text-indigo-700">{s}</span>
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 rounded-full ${i < step ? 'bg-indigo-400' : 'bg-gray-100'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2">
                  <AnimatePresence mode="wait">
                    {/* Step 0: Service */}
                    {step === 0 && (
                      <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <p className="text-sm font-bold text-gray-700 mb-3">Choisissez un service</p>
                        <div className="space-y-2">
                          {hospital.servicesAvecPrix?.map((s: any) => (
                            <button
                              key={s.label}
                              onClick={() => setSelectedService(s)}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                selectedService?.label === s.label
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-100 hover:border-indigo-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-indigo-400" />
                                  <span className="font-semibold text-sm text-gray-800">{s.label}</span>
                                </div>
                                <span className="text-sm font-bold text-indigo-700">
                                  {s.prix === 0 ? 'Gratuit' : `${s.prix.toLocaleString('fr-FR')} FCFA`}
                                </span>
                              </div>
                            </button>
                          ))}
                          {/* Fallback if no servicesAvecPrix */}
                          {!hospital.servicesAvecPrix && hospital.services.map((s: string) => (
                            <button
                              key={s}
                              onClick={() => setSelectedService({ label: s, prix: 15000 })}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                selectedService?.label === s
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-100 hover:border-indigo-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-gray-800">{s}</span>
                                <span className="text-sm font-bold text-indigo-700">15 000 FCFA</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 1: Patient info */}
                    {step === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <p className="text-sm font-bold text-gray-700 mb-3">Informations patient</p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Motif de consultation *</label>
                            <textarea
                              value={motif}
                              onChange={e => setMotif(e.target.value)}
                              placeholder="Décrivez brièvement votre motif…"
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Symptômes</label>
                            <textarea
                              value={symptomes}
                              onChange={e => setSymptomes(e.target.value)}
                              placeholder="Symptômes ressentis…"
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-400 mb-1 block">Âge</label>
                              <input
                                type="number"
                                placeholder="Âge"
                                value={agePatient}
                                onChange={e => setAgePatient(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-400 mb-1 block">Sexe</label>
                              <select
                                value={sexePatient}
                                onChange={e => setSexePatient(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                              >
                                <option value="">—</option>
                                {SEXE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={premiereConsult}
                              onChange={e => setPremiereConsult(e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-600">Première consultation dans cet établissement</span>
                          </label>
                          {!premiereConsult && (
                            <div>
                              <label className="text-xs font-bold text-gray-400 mb-1 block">Antécédents médicaux</label>
                              <textarea
                                value={antecedents}
                                onChange={e => setAntecedents(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Date & Heure */}
                    {step === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <p className="text-sm font-bold text-gray-700 mb-3">Choisissez une date</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                          {days.map(d => (
                            <button
                              key={d.toISOString()}
                              onClick={() => { setSelectedDay(d); setSelectedTime(null) }}
                              className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl border-2 w-16 transition-all ${
                                selectedDay?.toDateString() === d.toDateString()
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-100 hover:border-indigo-200'
                              }`}
                            >
                              <span className="text-xs text-gray-400">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                              <span className="text-xl font-extrabold text-gray-900">{d.getDate()}</span>
                              <span className="text-xs text-gray-400">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                            </button>
                          ))}
                        </div>
                        {selectedDay && (
                          <>
                            <p className="text-sm font-bold text-gray-700 mb-3">Choisissez un créneau</p>
                            <div className="grid grid-cols-4 gap-2">
                              {TIME_SLOTS.map(t => {
                                const unavailable = UNAVAILABLE.includes(t)
                                return (
                                  <button
                                    key={t}
                                    disabled={unavailable}
                                    onClick={() => setSelectedTime(t)}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                      unavailable ? 'opacity-30 line-through bg-gray-100 text-gray-400 cursor-not-allowed' :
                                      selectedTime === t ? 'bg-indigo-600 text-white shadow-md' :
                                      'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <p className="text-sm font-bold text-gray-700 mb-4">Confirmation</p>
                        <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 mb-4">
                          <Row label="Établissement" value={hospital.nom} />
                          <Row label="Service" value={selectedService?.label ?? '—'} />
                          <Row label="Date" value={selectedDay?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) ?? '—'} />
                          <Row label="Heure" value={selectedTime ?? '—'} />
                          {selectedService && selectedService.prix > 0 && (
                            <div className="pt-2 border-t border-indigo-100 space-y-1">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Tarif consultation</span>
                                <span>{selectedService.prix.toLocaleString('fr-FR')} FCFA</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Commission MedMap+ (15%)</span>
                                <span className="text-indigo-500">+{Math.round(selectedService.prix * 0.15).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                              <div className="flex justify-between text-sm font-extrabold border-t border-indigo-100 pt-1">
                                <span className="text-gray-700">Total débité</span>
                                <span className="text-indigo-700">{Math.round(selectedService.prix * 1.15).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedService && selectedService.prix > 0 && (
                          <div className="mb-4">
                            {walletSolde !== null && (
                              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 mb-2">
                                <span className="text-xs text-gray-500">Votre solde</span>
                                <span className={`text-sm font-bold ${hasEnoughFunds ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {walletSolde.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>
                            )}
                            {!hasEnoughFunds && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Solde insuffisant. <Link href="/portefeuille" className="font-bold underline">Recharger votre portefeuille</Link></span>
                              </div>
                            )}
                          </div>
                        )}

                        {error && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-3">
                            {error}
                          </div>
                        )}

                        <button
                          onClick={handleBook}
                          disabled={submitting || !hasEnoughFunds}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-3.5 rounded-2xl font-bold text-sm transition-colors"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          {(selectedService?.prix ?? 0) > 0 ? `Payer ${Math.round((selectedService?.prix ?? 0) * 1.15).toLocaleString('fr-FR')} FCFA & Réserver` : 'Confirmer le rendez-vous'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex gap-2 mt-5">
                    {step > 0 && (
                      <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Précédent
                      </button>
                    )}
                    {step < STEPS.length - 1 && (
                      <button
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canProceed[step]}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                      >
                        Continuer <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}
