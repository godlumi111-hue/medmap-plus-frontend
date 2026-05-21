'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { medical, appointments, wallet, personalCare, messaging } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Calendar, FileText, ArrowUpRight, Hospital, FlaskConical,
  Bell, CreditCard, Loader2, ChevronDown, ChevronUp,
  Activity, Heart, Clock, CheckCircle, XCircle, AlertCircle,
  Pill, Stethoscope, RefreshCw, User, History, MapPin, Phone,
  Crown, Target, UserCheck, MessageSquare, Users, Sparkles, Trash2,
} from 'lucide-react'

// ── Composant compte à rebours pour le banner "Votre tour" ────────────────────
function CalledCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const end = new Date(deadline).getTime()
    const tick = () => setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [deadline])
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  const expired = remaining === 0
  return (
    <span className={`font-mono text-2xl font-extrabold tabular-nums ${expired ? 'text-red-500' : remaining < 60 ? 'text-orange-500' : 'text-white'}`}>
      {expired ? 'Temps écoulé' : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </span>
  )
}

type Section = 'rdv' | 'ordonnances' | 'orientations' | 'hospitalisations' | 'examens' | 'rappels' | 'paiements' | 'perso'

const SECTION_CONFIG: Record<Section, { label: string; icon: any; color: string; bg: string }> = {
  rdv:             { label: 'Rendez-vous',      icon: Calendar,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  ordonnances:     { label: 'Ordonnances',       icon: FileText,      color: 'text-teal-600',    bg: 'bg-teal-50' },
  orientations:    { label: 'Orientations',      icon: ArrowUpRight,  color: 'text-blue-600',    bg: 'bg-blue-50' },
  hospitalisations:{ label: 'Hospitalisations',  icon: Hospital,      color: 'text-rose-600',    bg: 'bg-rose-50' },
  examens:         { label: 'Examens',           icon: FlaskConical,  color: 'text-purple-600',  bg: 'bg-purple-50' },
  rappels:         { label: 'Rappels MediA',     icon: Bell,          color: 'text-amber-600',   bg: 'bg-amber-50' },
  paiements:       { label: 'Paiements',         icon: CreditCard,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  perso:           { label: 'Médecins & Coachs', icon: Crown,         color: 'text-violet-600',  bg: 'bg-violet-50' },
}

const URGENCE_COLOR: Record<string, string> = {
  normal:      'bg-gray-100 text-gray-700',
  urgent:      'bg-orange-100 text-orange-700',
  tres_urgent: 'bg-red-100 text-red-700',
}
const URGENCE_LABEL: Record<string, string> = {
  normal: 'Normal', urgent: 'Urgent', tres_urgent: 'Très urgent',
}

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function MonEspacePage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('rdv')
  const [dossier, setDossier] = useState<any>(null)
  const [rdvList, setRdvList] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [togglingReminder, setTogglingReminder] = useState<number | null>(null)
  const [confirmingRdv, setConfirmingRdv] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [cancellingAssign, setCancellingAssign] = useState<number | null>(null)
  const [confirmingRenewal, setConfirmingRenewal] = useState<number | null>(null)
  const [arrivingAtMeeting, setArrivingAtMeeting] = useState<number | null>(null)
  const [validatingPatientSession, setValidatingPatientSession] = useState<number | null>(null)
  const [payTarget, setPayTarget] = useState<any | null>(null)
  const [payStep, setPayStep] = useState<'duree' | 'planning' | 'paiement'>('duree')
  const [payDuree, setPayDuree] = useState(1)
  const [payJours, setPayJours] = useState<number[]>([1, 3])
  const [payHeure, setPayHeure] = useState('09:00')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [payWallet, setPayWallet] = useState<number | null>(null)
  const [calledBanner, setCalledBanner] = useState<{
    room_nom: string; service_nom: string; deadline: string; appointment_id: number
  } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dos, rdv, w, assigns] = await Promise.allSettled([
        medical.patientFile(),
        appointments.mine(),
        wallet.me(),
        personalCare.mine(),
      ])
      if (dos.status === 'fulfilled') setDossier(dos.value)
      if (rdv.status === 'fulfilled') setRdvList(rdv.value)
      if (w.status === 'fulfilled') setWalletData(w.value)
      if (assigns.status === 'fulfilled') { setAssignments(assigns.value); setAssignmentsError(null) }
      else setAssignmentsError((assigns as any).reason?.message || 'Erreur chargement suivi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Socket: écoute les événements temps réel (appel patient, fin de délai)
  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()

    function onPatientCalled(data: any) {
      // Show banner only if this appointment belongs to this patient
      setCalledBanner({
        room_nom: data.room_nom || 'Salle de consultation',
        service_nom: data.service_nom || data.service || 'Consultation',
        deadline: data.deadline,
        appointment_id: data.appointment_id,
      })
    }
    function onPatientTimeout() {
      setCalledBanner(null)
    }
    function onConsultationStart() {
      setCalledBanner(null)
    }

    socket.on('patient:called', onPatientCalled)
    socket.on('patient:timeout', onPatientTimeout)
    socket.on('consultation:started', onConsultationStart)
    return () => {
      socket.off('patient:called', onPatientCalled)
      socket.off('patient:timeout', onPatientTimeout)
      socket.off('consultation:started', onConsultationStart)
    }
  }, [user?.id])

  async function handleConfirmConsultation(rdvId: number) {
    if (!confirm('Confirmer que la consultation a bien eu lieu ? Le paiement sera libéré à l\'établissement.')) return
    setConfirmingRdv(rdvId)
    try {
      await appointments.patientConfirm(rdvId)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setConfirmingRdv(null) }
  }

  async function handleAcceptReferral(id: number) {
    try {
      await medical.acceptReferral(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleRefuseReferral(id: number) {
    if (!confirm('Refuser cette orientation ?')) return
    try {
      await medical.refuseReferral(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleAcceptHospitalization(id: number) {
    try {
      await medical.acceptHospitalization(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleRefuseHospitalization(id: number) {
    if (!confirm('Refuser cette hospitalisation ?')) return
    try {
      await medical.refuseHospitalization(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleAcceptExam(id: number) {
    try {
      await medical.acceptExam(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleRefuseExam(id: number) {
    if (!confirm('Refuser ces examens ?')) return
    try {
      await medical.refuseExam(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleConfirmExam(id: number) {
    if (!confirm('Confirmer la réalisation des examens et valider le paiement ?')) return
    try {
      await medical.confirmExam(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function handleConfirmHospitalization(id: number) {
    if (!confirm('Confirmer votre sortie et valider le paiement de l\'hospitalisation ?')) return
    try {
      await medical.confirmHospitalization(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
  }

  async function toggleReminder(id: number) {
    setTogglingReminder(id)
    try {
      await medical.toggleReminder(id)
      loadData()
    } catch {}
    finally { setTogglingReminder(null) }
  }

  const prescriptions = dossier?.prescriptions ?? []
  const referrals = dossier?.referrals ?? []
  const hospitalizations = dossier?.hospitalizations ?? []
  const exams = dossier?.exams ?? []
  const reminders = dossier?.reminders ?? []
  const payments = dossier?.payments ?? []

  const pendingReferrals = referrals.filter((r: any) => r.statut === 'attribuee').length
  const pendingHosp = hospitalizations.filter((h: any) => h.statut === 'en_attente').length
  const activeReminders = reminders.filter((r: any) => r.actif).length

  const SECTIONS: Section[] = ['rdv', 'ordonnances', 'orientations', 'hospitalisations', 'examens', 'rappels', 'paiements', 'perso']

  const sectionBadge = (s: Section) => {
    if (s === 'rdv') return rdvList.length
    if (s === 'ordonnances') return prescriptions.length
    if (s === 'orientations') return pendingReferrals > 0 ? pendingReferrals : referrals.length
    if (s === 'hospitalisations') return hospitalizations.length
    if (s === 'examens') return exams.length
    if (s === 'rappels') return reminders.filter((r: any) => r.actif).length
    if (s === 'paiements') return payments.length
    if (s === 'perso') return assignments.length
    return 0
  }

  async function handleCancelAssignment(id: number) {
    if (!confirm('Annuler ce suivi personnalisé ?')) return
    setCancellingAssign(id)
    try {
      await personalCare.cancel(id)
      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setCancellingAssign(null) }
  }

  async function handleConfirmRenewal(id: number, confirm_: boolean) {
    setConfirmingRenewal(id)
    try {
      await personalCare.confirmRenewal(id, confirm_)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setConfirmingRenewal(null) }
  }

  async function openChatWithProvider(providerId: number) {
    try {
      const conv = await messaging.createConversation(providerId, 'personal_care')
      window.location.href = `/messages?conv=${conv.id}`
    } catch (e: any) { alert(e.message || 'Erreur messagerie') }
  }

  async function handlePatientArrives(id: number) {
    setArrivingAtMeeting(id)
    try {
      await personalCare.patientArrives(id)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setArrivingAtMeeting(null) }
  }

  async function handlePatientValidateSession(assignId: number) {
    setValidatingPatientSession(assignId)
    try {
      await personalCare.validateTodaySession(assignId)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setValidatingPatientSession(null) }
  }

  function openPayModal(a: any) {
    setPayTarget(a); setPayStep('duree'); setPayDuree(1)
    setPayJours([1, 3]); setPayHeure('09:00'); setPayError(''); setPayWallet(null)
  }

  async function handlePay() {
    if (!payTarget) return
    setPaying(true); setPayError('')
    try {
      await personalCare.payRequest(payTarget.id, { duree_mois: payDuree, jours: payJours, heure: payHeure })
      setPayTarget(null)
      loadData()
    } catch (err: any) { setPayError(err.message || 'Erreur lors du paiement') }
    finally { setPaying(false) }
  }

  const PAY_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const PAY_HEURES = ['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00']
  const PAY_DUREES = [
    { mois: 1, label: '1 mois', desc: 'Essai sans engagement' },
    { mois: 3, label: '3 mois', desc: 'Résultats tangibles' },
    { mois: 6, label: '6 mois', desc: 'Transformation durable', popular: true },
    { mois: 12, label: '1 an', desc: 'Suivi complet annuel' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />

      {/* ── Banner "C'est votre tour" ────────────────────────────────────────── */}
      <AnimatePresence>
        {calledBanner && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-extrabold text-base">C'est votre tour !</p>
                  <p className="text-white/80 text-sm font-medium">
                    {calledBanner.service_nom} — {calledBanner.room_nom}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">Présentez-vous immédiatement</p>
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-white/70 text-xs mb-1">Temps restant</p>
                <CalledCountdown deadline={calledBanner.deadline} />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/ticket/${calledBanner.appointment_id}`}
                  className="bg-white text-emerald-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  Voir mon ticket
                </Link>
                <button
                  onClick={() => setCalledBanner(null)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`pt-16 ${calledBanner ? 'mt-20' : ''}`}>

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 py-10 px-4 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl" />
          <div className="max-w-5xl mx-auto relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🩺</span>
              <p className="text-white/70 text-sm font-medium">Espace personnel de santé</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
              {user ? `${user.prenom} ${user.nom}` : 'Mon espace santé'}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {pendingReferrals > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-blue-400/80 rounded-full px-3 py-1 font-bold animate-pulse">
                  ↗ {pendingReferrals} orientation(s) en attente
                </span>
              )}
              {pendingHosp > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-rose-400/80 rounded-full px-3 py-1 font-bold animate-pulse">
                  🏥 {pendingHosp} hospitalisation(s) en attente
                </span>
              )}
              {activeReminders > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-amber-400/80 rounded-full px-3 py-1 font-bold">
                  🔔 {activeReminders} rappel(s) actif(s)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Stats row */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Rendez-vous" value={rdvList.length} icon={Calendar} color="text-indigo-600" bg="bg-indigo-50" />
              <StatCard label="Ordonnances" value={prescriptions.length} icon={FileText} color="text-teal-600" bg="bg-teal-50" />
              <StatCard label="Orientations" value={referrals.length} icon={ArrowUpRight} color="text-blue-600" bg="bg-blue-50" />
              <StatCard label="Rappels actifs" value={activeReminders} icon={Bell} color="text-amber-600" bg="bg-amber-50" />
            </div>
          )}

          <div className="flex gap-1.5 flex-wrap">
            {SECTIONS.map(s => {
              const cfg = SECTION_CONFIG[s]
              const count = sectionBadge(s)
              return (
                <button key={s} onClick={() => setActiveSection(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeSection === s ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
                  }`}>
                  <cfg.icon className="w-3.5 h-3.5" />
                  {cfg.label}
                  {count > 0 && (
                    <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 ${activeSection === s ? 'bg-white/30' : 'bg-gray-100'}`}>{count}</span>
                  )}
                </button>
              )
            })}
            <button onClick={loadData} className="ml-auto p-1.5 rounded-full hover:bg-gray-100">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* ── RDV ── */}
              {activeSection === 'rdv' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-500" /> Mes rendez-vous ({rdvList.length})</h2>
                  </div>
                  {rdvList.length === 0 ? (
                    <div className="text-center py-16">
                      <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm font-semibold">Aucun rendez-vous</p>
                      <Link href="/carte" className="mt-3 inline-block text-teal-600 text-xs font-bold hover:underline">Trouver un médecin →</Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {rdvList.map(rdv => {
                        const statusColor: Record<string, string> = {
                          en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
                          confirme: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          refuse: 'bg-red-50 text-red-600 border-red-200',
                          annule: 'bg-gray-50 text-gray-500 border-gray-200',
                          termine: 'bg-teal-50 text-teal-700 border-teal-200',
                        }
                        const statusLabel: Record<string, string> = {
                          en_attente: 'En attente', confirme: 'Confirmé', refuse: 'Refusé', annule: 'Annulé', termine: 'Terminé',
                        }
                        const hasPresc = rdv.prescriptions?.length > 0
                        const isExp = expanded === rdv.id
                        return (
                          <div key={rdv.id} className="hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : rdv.id)}>
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{rdv.structure_nom || rdv.provider_nom || 'Consultation'}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[rdv.statut] ?? statusColor.en_attente}`}>
                                    {statusLabel[rdv.statut] ?? rdv.statut}
                                  </span>
                                  {hasPresc && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-bold">📋 Ordonnance</span>}
                                  {rdv.consultation_statut === 'effectuee' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">⏳ À confirmer</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {rdv.heure_rdv?.slice(0, 5)}
                                  {rdv.service ? ` · ${rdv.service}` : ''}
                                </p>
                              </div>
                              {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <AnimatePresence>
                              {isExp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    {rdv.motif && <p className="text-xs text-gray-600"><span className="font-semibold">Motif:</span> {rdv.motif}</p>}
                                    {rdv.prix > 0 && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-semibold">Paiement:</span> {parseInt(rdv.prix).toLocaleString('fr-FR')} FCFA
                                        {rdv.paiement_statut === 'bloque' && ' (en séquestre)'}
                                        {rdv.paiement_statut === 'libere' && ' (libéré)'}
                                        {rdv.paiement_statut === 'rembourse' && ' (remboursé)'}
                                      </p>
                                    )}
                                    {rdv.consultation_statut === 'effectuee' && rdv.paiement_statut !== 'libere' && (
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-indigo-700 mb-2">
                                          Votre médecin a enregistré la fin de la consultation. Confirmez pour libérer le paiement et activer votre orientation.
                                        </p>
                                        <button
                                          onClick={() => handleConfirmConsultation(rdv.id)}
                                          disabled={confirmingRdv === rdv.id}
                                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                                        >
                                          {confirmingRdv === rdv.id
                                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirmation…</>
                                            : <><CheckCircle className="w-3.5 h-3.5" /> Confirmer la consultation</>
                                          }
                                        </button>
                                      </div>
                                    )}
                                    {hasPresc && rdv.prescriptions.map((p: any, i: number) => {
                                      const meds = typeof p.medicaments === 'string' ? JSON.parse(p.medicaments) : p.medicaments
                                      return (
                                        <div key={i} className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                                          <p className="text-xs font-bold text-teal-700 mb-1">📋 Ordonnance</p>
                                          {meds?.map((m: any, j: number) => (
                                            <p key={j} className="text-xs text-gray-700">• <strong>{m.nom}</strong> {m.dosage} — {m.frequence} x {m.duree}</p>
                                          ))}
                                        </div>
                                      )
                                    })}
                                    <div className="flex gap-2 pt-1">
                                      <Link href={`/appointments`} className="text-xs text-indigo-600 font-semibold hover:underline">
                                        Voir tous mes RDV →
                                      </Link>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Ordonnances ── */}
              {activeSection === 'ordonnances' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-teal-500" /> Mes ordonnances ({prescriptions.length})</h2>
                  </div>
                  {prescriptions.length === 0 ? (
                    <div className="text-center py-16">
                      <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucune ordonnance</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {prescriptions.map((p: any) => {
                        const meds = typeof p.medicaments === 'string' ? JSON.parse(p.medicaments) : (p.medicaments ?? [])
                        const isSortie = p.type === 'sortie'
                        const isExp = expanded === p.id
                        return (
                          <div key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : p.id)}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSortie ? 'bg-rose-50' : 'bg-teal-50'}`}>
                                <Pill className={`w-5 h-5 ${isSortie ? 'text-rose-500' : 'text-teal-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{meds.length > 0 ? `${meds.length} médicament(s)` : 'Consignes de sortie'}</p>
                                  {isSortie && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Ordonnance de sortie</span>}
                                </div>
                                <p className="text-xs text-gray-400">
                                  {isSortie && (p.hosp_service || 'Hospitalisation')} {isSortie && '· '}
                                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <AnimatePresence>
                              {isExp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    {meds.length > 0 && meds.map((m: any, i: number) => (
                                      <div key={i} className={`rounded-xl p-3 border space-y-0.5 ${isSortie ? 'bg-rose-50 border-rose-100' : 'bg-teal-50 border-teal-100'}`}>
                                        <p className={`text-sm font-bold ${isSortie ? 'text-rose-800' : 'text-teal-800'}`}>{m.nom}</p>
                                        {m.dosage && <p className="text-xs text-gray-600">Dosage: {m.dosage}</p>}
                                        {m.frequence && <p className="text-xs text-gray-600">Fréquence: {m.frequence}</p>}
                                        {m.duree && <p className="text-xs text-gray-600">Durée: {m.duree}</p>}
                                        {m.instructions && <p className="text-xs text-gray-500 italic">{m.instructions}</p>}
                                      </div>
                                    ))}
                                    {isSortie && (p.consignes || p.recommandations || p.rdv_controle || p.repos_jours) && (
                                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                                        {p.repos_jours > 0 && <p className="text-xs text-gray-700"><span className="font-bold">Repos médical:</span> {p.repos_jours} jour(s)</p>}
                                        {p.rdv_controle && <p className="text-xs text-gray-700"><span className="font-bold">RDV de contrôle:</span> {new Date(p.rdv_controle).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                                        {p.consignes && <p className="text-xs text-gray-700"><span className="font-bold">Consignes:</span> {p.consignes}</p>}
                                        {p.recommandations && <p className="text-xs text-gray-700"><span className="font-bold">Recommandations:</span> {p.recommandations}</p>}
                                      </div>
                                    )}
                                    {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Orientations ── */}
              {activeSection === 'orientations' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-blue-500" /> Mes orientations ({referrals.length})</h2>
                  </div>
                  {referrals.length === 0 ? (
                    <div className="text-center py-16">
                      <ArrowUpRight className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucune orientation</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {referrals.map((r: any) => {
                        const statutColor: Record<string, string> = {
                          envoyee_reception: 'bg-gray-100 text-gray-500 border-gray-200',
                          en_traitement:     'bg-amber-50 text-amber-700 border-amber-200',
                          attribuee:         'bg-blue-50 text-blue-700 border-blue-200',
                          acceptee:          'bg-emerald-50 text-emerald-700 border-emerald-200',
                          refusee:           'bg-red-50 text-red-600 border-red-200',
                          annulee:           'bg-gray-50 text-gray-600 border-gray-200',
                        }
                        const statutLabel: Record<string, string> = {
                          envoyee_reception: 'En attente de votre confirmation',
                          en_traitement:     'En traitement à la réception',
                          attribuee:         'Salle attribuée — Action requise',
                          acceptee:          'Acceptée',
                          refusee:           'Refusée',
                          annulee:           'Annulée',
                        }
                        const isExp = expanded === r.id
                        return (
                          <div key={r.id} className={`hover:bg-gray-50/50 transition-colors ${r.statut === 'attribuee' ? 'bg-blue-50/30' : ''}`}>
                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : r.id)}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.statut === 'attribuee' ? 'bg-blue-100' : 'bg-blue-50'}`}>
                                <ArrowUpRight className={`w-5 h-5 ${r.statut === 'attribuee' ? 'text-blue-600' : 'text-blue-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{r.specialite}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statutColor[r.statut] ?? 'bg-gray-100 text-gray-500'}`}>
                                    {statutLabel[r.statut] ?? r.statut}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCE_COLOR[r.urgence]}`}>{URGENCE_LABEL[r.urgence]}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {r.statut === 'attribuee' && r.date_proposee && ` · RDV : ${new Date(r.date_proposee).toLocaleDateString('fr-FR')} à ${r.heure_proposee?.slice(0,5) ?? ''}`}
                                </p>
                              </div>
                              {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <AnimatePresence>
                              {isExp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">

                                    {/* Status-specific info banners */}
                                    {r.statut === 'envoyee_reception' && (
                                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                        <p className="text-xs text-gray-600">
                                          Votre médecin a créé une orientation vers <strong>{r.specialite}</strong>.
                                          Veuillez confirmer votre première consultation pour que la réception puisse vous attribuer une salle.
                                        </p>
                                      </div>
                                    )}
                                    {r.statut === 'en_traitement' && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-xs text-amber-700 font-medium">
                                          La réception de l'établissement est en train d'attribuer une salle de <strong>{r.specialite}</strong>.
                                          Vous serez notifié(e) dès l'attribution.
                                        </p>
                                      </div>
                                    )}
                                    {r.statut === 'attribuee' && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                        <p className="text-xs font-bold text-blue-800">Orientation prête — votre action est requise</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <p className="text-blue-500 font-medium">Spécialité</p>
                                            <p className="font-bold text-blue-900">{r.specialite}</p>
                                          </div>
                                          {r.assigned_room_nom && (
                                            <div>
                                              <p className="text-blue-500 font-medium">Salle</p>
                                              <p className="font-bold text-blue-900">{r.assigned_room_nom}</p>
                                            </div>
                                          )}
                                          {r.date_proposee && (
                                            <div>
                                              <p className="text-blue-500 font-medium">Date</p>
                                              <p className="font-bold text-blue-900">
                                                {new Date(r.date_proposee).toLocaleDateString('fr-FR')}
                                                {r.heure_proposee ? ` à ${r.heure_proposee.slice(0,5)}` : ''}
                                              </p>
                                            </div>
                                          )}
                                          {r.tarif > 0 && (
                                            <div>
                                              <p className="text-blue-500 font-medium">Tarif</p>
                                              <p className="font-bold text-blue-900">{parseInt(r.tarif).toLocaleString('fr-FR')} FCFA</p>
                                            </div>
                                          )}
                                        </div>
                                        {r.urgence && r.urgence !== 'normal' && (
                                          <p className="text-xs font-bold text-orange-600">⚠ {URGENCE_LABEL[r.urgence]}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Common info fields */}
                                    {r.motif && <p className="text-xs text-gray-600"><span className="font-semibold">Motif :</span> {r.motif}</p>}
                                    {r.resume_medical && (
                                      <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Résumé médical</p>
                                        <p className="text-xs text-gray-700">{r.resume_medical}</p>
                                      </div>
                                    )}
                                    {r.examens_necessaires && (
                                      <p className="text-xs text-gray-600"><span className="font-semibold">Examens :</span> {r.examens_necessaires}</p>
                                    )}

                                    {/* Accept/refuse buttons — only when attribuee */}
                                    {r.statut === 'attribuee' && (
                                      <div className="flex gap-2 pt-2">
                                        <button onClick={() => handleRefuseReferral(r.id)}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all">
                                          <XCircle className="w-3.5 h-3.5" /> Refuser
                                        </button>
                                        <button onClick={() => handleAcceptReferral(r.id)}
                                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all">
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          {r.tarif > 0 ? `Accepter & Payer — ${parseInt(r.tarif).toLocaleString('fr-FR')} FCFA` : 'Accepter'}
                                        </button>
                                      </div>
                                    )}

                                    {r.statut === 'acceptee' && r.new_appointment_id && (
                                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                        <p className="text-xs font-semibold text-emerald-700">
                                          ✅ Rendez-vous spécialisé créé (#{r.new_appointment_id})
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Hospitalisations ── */}
              {activeSection === 'hospitalisations' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Hospital className="w-4 h-4 text-rose-500" /> Hospitalisations ({hospitalizations.length})</h2>
                  </div>
                  {hospitalizations.length === 0 ? (
                    <div className="text-center py-16">
                      <Hospital className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucune hospitalisation</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {hospitalizations.map((h: any) => {
                        const statutColor: Record<string, string> = {
                          envoyee_reception: 'bg-gray-100 text-gray-500 border-gray-200',
                          en_traitement: 'bg-amber-50 text-amber-700 border-amber-200',
                          attribuee: 'bg-blue-50 text-blue-700 border-blue-200',
                          acceptee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          refusee: 'bg-red-50 text-red-600 border-red-200',
                          en_cours: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                          termine: 'bg-teal-50 text-teal-700 border-teal-200',
                          annulee: 'bg-gray-50 text-gray-500 border-gray-200',
                        }
                        const statutLabel: Record<string, string> = {
                          envoyee_reception: 'Soumise', en_traitement: 'En traitement', attribuee: 'Chambre attribuée',
                          acceptee: 'Acceptée', refusee: 'Refusée', en_cours: 'En cours', termine: 'Terminée', annulee: 'Annulée',
                        }
                        const isExp = expanded === (h.id + 10000)
                        return (
                          <div key={h.id} className="hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : h.id + 10000)}>
                              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <Hospital className="w-5 h-5 text-rose-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{h.service || 'Hospitalisation'}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statutColor[h.statut] ?? ''}`}>{statutLabel[h.statut] ?? h.statut}</span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCE_COLOR[h.urgence]}`}>{URGENCE_LABEL[h.urgence]}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{h.duree_estimee ? ` · ${h.duree_estimee}` : ''}</p>
                              </div>
                              {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <AnimatePresence>
                              {isExp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                      <p className="text-xs font-semibold text-gray-600 mb-1">Motif</p>
                                      <p className="text-xs text-gray-700">{h.motif}</p>
                                    </div>
                                    {h.chambre && <p className="text-xs text-gray-600"><span className="font-semibold">Chambre:</span> {h.chambre}</p>}
                                    {h.frais > 0 && <p className="text-xs text-gray-600"><span className="font-semibold">Frais estimés:</span> {parseInt(h.frais).toLocaleString('fr-FR')} FCFA</p>}
                                    {h.examens && <p className="text-xs text-gray-600"><span className="font-semibold">Examens prévus:</span> {h.examens}</p>}
                                    {h.commentaire && <p className="text-xs text-gray-500 italic">{h.commentaire}</p>}

                                    {(h.statut === 'en_traitement' || h.statut === 'envoyee_reception') && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-700 font-medium">
                                        En cours de traitement par la réception — une chambre vous sera attribuée bientôt.
                                      </div>
                                    )}
                                    {h.statut === 'attribuee' && (
                                      <div className="space-y-2 pt-1">
                                        {h.assigned_room_nom && <p className="text-xs text-blue-700 font-semibold">Chambre attribuée : {h.assigned_room_nom}</p>}
                                        <div className="flex gap-2">
                                          <button onClick={() => handleRefuseHospitalization(h.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all">
                                            <XCircle className="w-3.5 h-3.5" /> Refuser
                                          </button>
                                          <button onClick={() => handleAcceptHospitalization(h.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all">
                                            <CheckCircle className="w-3.5 h-3.5" /> {h.frais > 0 ? `Accepter & Payer (${parseInt(h.frais).toLocaleString('fr-FR')} F)` : 'Accepter'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {h.statut === 'acceptee' && (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-xs text-emerald-700 font-medium">
                                        Hospitalisation acceptée — vous êtes en attente dans l'unité attribuée.
                                      </div>
                                    )}
                                    {h.statut === 'termine' && (
                                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-2 text-xs text-teal-700 font-medium">
                                        Hospitalisation terminée. Consultez vos ordonnances pour l'ordonnance de sortie.
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Examens ── */}
              {activeSection === 'examens' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-500" /> Examens complémentaires ({exams.length})</h2>
                  </div>
                  {exams.length === 0 ? (
                    <div className="text-center py-16">
                      <FlaskConical className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucun examen prescrit</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {exams.map((e: any) => {
                        const examList = typeof e.examens === 'string' ? JSON.parse(e.examens) : (e.examens ?? [])
                        const statutColor: Record<string, string> = {
                          envoyee_reception: 'bg-gray-100 text-gray-500 border-gray-200',
                          en_traitement: 'bg-amber-50 text-amber-700 border-amber-200',
                          attribuee: 'bg-blue-50 text-blue-700 border-blue-200',
                          acceptee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          refusee: 'bg-red-50 text-red-600 border-red-200',
                          realise: 'bg-teal-50 text-teal-700 border-teal-200',
                          annule: 'bg-gray-50 text-gray-500 border-gray-200',
                        }
                        const isExp = expanded === (e.id + 20000)
                        return (
                          <div key={e.id} className="hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : e.id + 20000)}>
                              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <FlaskConical className="w-5 h-5 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{examList.slice(0, 2).join(', ')}{examList.length > 2 ? ` +${examList.length - 2}` : ''}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statutColor[e.statut] ?? ''}`}>
                                    {({'envoyee_reception':'Soumis','en_traitement':'En traitement','attribuee':'Planifié','acceptee':'Accepté','refusee':'Refusé','realise':'Réalisé','annule':'Annulé'} as any)[e.statut] ?? e.statut}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCE_COLOR[e.urgence]}`}>{URGENCE_LABEL[e.urgence]}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                              </div>
                              {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <AnimatePresence>
                              {isExp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {examList.map((ex: string, i: number) => (
                                        <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-2.5 py-1 font-semibold">{ex}</span>
                                      ))}
                                    </div>
                                    {e.motif && <p className="text-xs text-gray-600"><span className="font-semibold">Motif:</span> {e.motif}</p>}
                                    {e.laboratoire && <p className="text-xs text-gray-600"><span className="font-semibold">Laboratoire:</span> {e.laboratoire}</p>}
                                    {e.date_proposee && <p className="text-xs text-gray-600"><span className="font-semibold">Date proposée:</span> {new Date(e.date_proposee).toLocaleDateString('fr-FR')}</p>}
                                    {e.frais > 0 && <p className="text-xs text-gray-600"><span className="font-semibold">Frais:</span> {parseInt(e.frais).toLocaleString('fr-FR')} FCFA</p>}
                                    {(e.statut === 'envoyee_reception' || e.statut === 'en_traitement') && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-700 font-medium">
                                        Examen en cours de traitement par la réception — vous recevrez une notification quand il est planifié.
                                      </div>
                                    )}
                                    {e.statut === 'attribuee' && (
                                      <div className="space-y-2">
                                        {e.assigned_room_nom && <p className="text-xs text-blue-700 font-semibold">Salle planifiée : {e.assigned_room_nom}</p>}
                                        {(e.tarif > 0 || e.frais > 0) && (
                                          <p className="text-xs font-bold text-gray-800">Montant : {parseInt(e.tarif || e.frais).toLocaleString('fr-FR')} FCFA</p>
                                        )}
                                        <div className="flex gap-2">
                                          <button onClick={() => handleRefuseExam(e.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all">
                                            <XCircle className="w-3.5 h-3.5" /> Refuser
                                          </button>
                                          <button onClick={() => handleAcceptExam(e.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition-all">
                                            <CheckCircle className="w-3.5 h-3.5" /> {(e.tarif > 0 || e.frais > 0) ? `Accepter & Payer (${parseInt(e.tarif || e.frais).toLocaleString('fr-FR')} F)` : 'Accepter'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {e.statut === 'acceptee' && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-xs text-blue-700 font-medium">
                                        Examen accepté — vous êtes dans la file de la salle. Rendez-vous à l'heure prévue.
                                      </div>
                                    )}
                                    {e.statut === 'realise' && e.paiement_statut !== 'libere' && (
                                      <div className="space-y-2">
                                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-2 text-xs text-teal-700 font-medium">
                                          Vos examens sont réalisés. Confirmez pour valider le paiement.
                                        </div>
                                        <button onClick={() => handleConfirmExam(e.id)}
                                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition-all">
                                          <CheckCircle className="w-3.5 h-3.5" /> Confirmer les résultats & libérer le paiement
                                        </button>
                                      </div>
                                    )}
                                    {e.resultats && (
                                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                        <p className="text-xs font-semibold text-emerald-700 mb-1">Résultats</p>
                                        <p className="text-xs text-gray-700">{e.resultats}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Rappels MediA ── */}
              {activeSection === 'rappels' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Rappels MediA ({reminders.length})</h2>
                  </div>
                  {reminders.length === 0 ? (
                    <div className="text-center py-16">
                      <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucun rappel</p>
                      <p className="text-xs text-gray-400 mt-1">Les rappels sont créés automatiquement depuis vos ordonnances</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {reminders.map((r: any) => {
                        const typeIcon: Record<string, string> = { medicament: '💊', rdv: '📅', examen: '🔬', controle: '🩺' }
                        const isToggling = togglingReminder === r.id
                        return (
                          <div key={r.id} className={`flex items-center gap-3 px-5 py-4 transition-colors ${r.actif ? 'hover:bg-gray-50/50' : 'opacity-50 hover:bg-gray-50/50'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${r.actif ? 'bg-amber-50' : 'bg-gray-50'}`}>
                              {typeIcon[r.type] ?? '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900">{r.titre}</p>
                              {r.description && <p className="text-xs text-gray-500 truncate">{r.description}</p>}
                              <div className="flex items-center gap-2 mt-0.5">
                                {r.horaire && <span className="text-xs text-amber-600 font-semibold">⏰ {r.horaire}</span>}
                                {r.date_debut && <span className="text-xs text-gray-400">{new Date(r.date_debut).toLocaleDateString('fr-FR')}</span>}
                                {r.date_fin && <span className="text-xs text-gray-400">→ {new Date(r.date_fin).toLocaleDateString('fr-FR')}</span>}
                              </div>
                            </div>
                            <button onClick={() => toggleReminder(r.id)} disabled={isToggling}
                              className={`flex-shrink-0 w-10 h-6 rounded-full transition-all ${r.actif ? 'bg-amber-500' : 'bg-gray-200'} relative`}>
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 text-white animate-spin absolute inset-0 m-auto" />
                              ) : (
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${r.actif ? 'left-5' : 'left-1'}`} />
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Paiements ── */}
              {activeSection === 'paiements' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Historique des paiements ({payments.length})</h2>
                  </div>
                  {payments.length === 0 ? (
                    <div className="text-center py-16">
                      <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucun paiement médical</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {payments.map((p: any) => {
                        const statutColor: Record<string, string> = {
                          en_attente: 'text-amber-600',
                          confirme: 'text-emerald-600',
                          rembourse: 'text-blue-600',
                          annule: 'text-gray-500',
                        }
                        const statutLabel: Record<string, string> = {
                          en_attente: 'En séquestre', confirme: 'Libéré', rembourse: 'Remboursé', annule: 'Annulé',
                        }
                        return (
                          <div key={p.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <CreditCard className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900">{p.description || 'Paiement médical'}</p>
                              <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-sm text-gray-900">{parseInt(p.montant).toLocaleString('fr-FR')} F</p>
                              <p className={`text-xs font-semibold ${statutColor[p.statut] ?? 'text-gray-500'}`}>{statutLabel[p.statut] ?? p.statut}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Médecins & Coachs personnels ── */}
              {activeSection === 'perso' && (
                <div>
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-violet-500" /> Médecins & Coachs Personnels ({assignments.length})
                    </h2>
                    <Link href="/medecins" className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Trouver un prestataire
                    </Link>
                  </div>
                  {assignmentsError ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-gray-700 text-sm font-semibold mb-1">Impossible de charger le suivi personnel</p>
                      <p className="text-xs text-red-500 font-mono mb-4 max-w-xs mx-auto break-all">{assignmentsError}</p>
                      <button onClick={loadData} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Réessayer
                      </button>
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-8 h-8 text-violet-300" />
                      </div>
                      <p className="text-gray-500 text-sm font-semibold mb-1">Aucun suivi en cours</p>
                      <p className="text-xs text-gray-400 mb-4">Demandez un médecin ou coach personnel depuis la liste des professionnels</p>
                      <Link href="/medecins" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                        <Target className="w-4 h-4" /> Trouver un prestataire
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {assignments.map((a: any) => {
                        const provider = a.provider ?? {}
                        const profile = provider.profile ?? {}
                        const isCoach = a.provider_type === 'coach'
                        const name = isCoach
                          ? `${provider.prenom} ${provider.nom}`
                          : `Dr. ${provider.prenom} ${provider.nom}`
                        const specialite = profile.specialite
                        const isCancelling = cancellingAssign === a.id
                        const isRenewing = confirmingRenewal === a.id
                        const escrow = a.escrow ?? {}
                        const sessions = a.sessions ?? {}
                        const hasSessionToConfirm = sessions.a_confirmer > 0
                        const colorClass = isCoach ? 'from-violet-500 to-purple-600' : 'from-sky-500 to-blue-600'
                        const textColor = isCoach ? 'text-violet-600' : 'text-sky-600'

                        return (
                          <div key={a.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-gradient-to-br ${colorClass}`}>
                                <span className="text-white font-extrabold text-base">
                                  {provider.prenom?.[0]}{provider.nom?.[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{name}</p>
                                    <p className={`text-xs font-semibold mt-0.5 ${textColor}`}>{specialite}</p>
                                  </div>
                                  {/* Status badge */}
                                  {a.statut === 'pending' && (
                                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">En attente</span>
                                  )}
                                  {a.statut === 'accepted' && (
                                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Accepté ✓</span>
                                  )}
                                  {a.statut === 'meeting_scheduled' && (
                                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">RDV fixé 📅</span>
                                  )}
                                  {a.statut === 'meeting_done' && (
                                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">RDV effectué ✓</span>
                                  )}
                                  {a.statut === 'actif' && (
                                    <span className={`flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isCoach ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>
                                      {isCoach ? 'Coach actif' : 'Médecin perso'}
                                    </span>
                                  )}
                                  {a.statut === 'rejete' && (
                                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Refusé</span>
                                  )}
                                </div>

                                {/* ── PENDING state ── */}
                                {a.statut === 'pending' && (
                                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                                    <p className="text-xs text-amber-800 font-semibold mb-1">⏳ En attente de réponse de {name}</p>
                                    <p className="text-xs text-gray-500">Vous serez notifié(e) dès que votre demande sera traitée.</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Demande envoyée le {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                )}

                                {/* ── ACCEPTED state ── */}
                                {a.statut === 'accepted' && (
                                  <div className="mt-3">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                      <p className="text-xs font-bold text-emerald-800 mb-1">🎉 {name} a accepté votre demande !</p>
                                      <p className="text-xs text-gray-600">En attente que {name} fixe une date de premier rendez-vous.</p>
                                    </div>
                                  </div>
                                )}

                                {/* ── MEETING SCHEDULED state ── */}
                                {a.statut === 'meeting_scheduled' && (
                                  <div className="mt-3">
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                                      <p className="text-xs font-bold text-blue-800 mb-1">📅 Rendez-vous initial fixé !</p>
                                      {a.meeting_date ? (
                                        <p className="text-xs text-gray-700">
                                          {name} vous attend le{' '}
                                          <strong>{new Date(a.meeting_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                                          {a.meeting_heure ? ` à ${a.meeting_heure}` : ''}
                                        </p>
                                      ) : null}
                                      <p className="text-xs text-gray-500 mt-1">Confirmez votre présence lors du rendez-vous.</p>
                                    </div>
                                    {a.meeting_patient_arrived ? (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                        <p className="text-xs text-emerald-700 font-semibold">✓ Vous avez confirmé votre présence. En attente de {name}…</p>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handlePatientArrives(a.id)}
                                        disabled={arrivingAtMeeting === a.id}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        {arrivingAtMeeting === a.id
                                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirmation…</>
                                          : <><UserCheck className="w-3.5 h-3.5" /> Je suis présent(e) au rendez-vous</>}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* ── MEETING DONE state ── */}
                                {a.statut === 'meeting_done' && (
                                  <div className="mt-3">
                                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-3">
                                      <p className="text-xs font-bold text-teal-800 mb-1">🎉 Réunion initiale effectuée !</p>
                                      <p className="text-xs text-gray-600">Les deux parties ont confirmé leur présence. Payez le premier mois pour démarrer votre suivi personnalisé.</p>
                                    </div>
                                    <button
                                      onClick={() => openPayModal(a)}
                                      className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Crown className="w-3.5 h-3.5" /> Payer et démarrer le suivi
                                    </button>
                                  </div>
                                )}

                                {/* ── ACTIVE state ── */}
                                {a.statut === 'actif' && (
                                  <>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span className="text-xs text-gray-500">
                                        Fin : {new Date(a.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      <div className="bg-violet-50 rounded-xl p-2 text-center">
                                        <p className="text-xs font-extrabold text-violet-700">{(escrow.montant_total || a.montant_total || 0).toLocaleString('fr-FR')} F</p>
                                        <p className="text-[10px] text-violet-500">Séquestre</p>
                                      </div>
                                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                                        <p className="text-xs font-extrabold text-gray-700">{sessions.effectuees || 0}/{sessions.total || 0}</p>
                                        <p className="text-[10px] text-gray-400">Séances</p>
                                      </div>
                                      <div className={`rounded-xl p-2 text-center ${hasSessionToConfirm ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                        <p className={`text-xs font-extrabold ${hasSessionToConfirm ? 'text-emerald-700' : 'text-gray-400'}`}>
                                          {sessions.a_confirmer || 0}
                                        </p>
                                        <p className={`text-[10px] ${hasSessionToConfirm ? 'text-emerald-600' : 'text-gray-400'}`}>À confirmer</p>
                                      </div>
                                    </div>

                                    {sessions.a_confirmer > 0 && (
                                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-sky-800 mb-2">
                                          📅 Séance prévue aujourd'hui — Le prestataire est-il venu ?
                                        </p>
                                        <button
                                          onClick={() => handlePatientValidateSession(a.id)}
                                          disabled={validatingPatientSession === a.id}
                                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                        >
                                          {validatingPatientSession === a.id
                                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validation…</>
                                            : <><CheckCircle className="w-3.5 h-3.5" /> Oui, le prestataire est venu</>}
                                        </button>
                                      </div>
                                    )}

                                    {a.confirmation_pending && (
                                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-amber-800 mb-2">Renouvellement du suivi — continuer ?</p>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleConfirmRenewal(a.id, false)} disabled={isRenewing}
                                            className="flex-1 py-1.5 border border-red-200 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                                            Non, arrêter
                                          </button>
                                          <button onClick={() => handleConfirmRenewal(a.id, true)} disabled={isRenewing}
                                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                                            {isRenewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                            Oui, renouveler
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex gap-2 mt-3">
                                      <button onClick={() => openChatWithProvider(provider.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${isCoach ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'border-sky-200 text-sky-700 hover:bg-sky-50'}`}>
                                        <MessageSquare className="w-3.5 h-3.5" /> Message
                                      </button>
                                      <button onClick={() => handleCancelAssignment(a.id)} disabled={isCancelling}
                                        className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                                        {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Annuler
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* ── REJECTED state ── */}
                                {a.statut === 'rejete' && (
                                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                                    <p className="text-xs text-red-700 font-semibold mb-1">Demande refusée</p>
                                    <p className="text-xs text-gray-500">{name} n'est pas disponible pour le moment.</p>
                                    <Link href="/medecins" className="inline-block mt-2 text-xs font-bold text-violet-600 hover:underline">
                                      Chercher un autre prestataire →
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Wallet balance card */}
          {walletData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Solde portefeuille</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {walletData.solde?.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <Link href="/portefeuille" className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                Gérer
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment Modal (for accepted requests) ── */}
      <AnimatePresence>
        {payTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

              {/* Header */}
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 rounded-t-3xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Confirmer le suivi</span>
                  </div>
                  <p className="font-bold text-white text-base">
                    {payTarget.provider_type === 'coach'
                      ? `${payTarget.provider?.prenom} ${payTarget.provider?.nom}`
                      : `Dr. ${payTarget.provider?.prenom} ${payTarget.provider?.nom}`}
                  </p>
                  <p className="text-purple-200 text-xs">{payTarget.provider?.profile?.specialite}</p>
                </div>
                <button onClick={() => setPayTarget(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                  <XCircle className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-1 px-5 pt-4 pb-1">
                {(['duree', 'planning', 'paiement'] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${payStep === s ? 'bg-violet-600 text-white' : (i < (['duree','planning','paiement'] as const).indexOf(payStep) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400')}`}>
                      {i + 1}
                    </div>
                    {i < 2 && <div className="flex-1 h-0.5 bg-gray-100" />}
                  </div>
                ))}
              </div>

              <div className="p-5">
                {payStep === 'duree' ? (
                  <>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm">Durée d'engagement</h4>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {PAY_DUREES.map(d => {
                        const isCoach = payTarget.provider_type === 'coach'
                        const tarifMensuel = isCoach
                          ? (payTarget.provider?.profile?.tarif_mensuel || 40000)
                          : ((payTarget.provider?.profile?.tarif || 0) * 4 || 48000)
                        return (
                          <button key={d.mois} onClick={() => setPayDuree(d.mois)}
                            className={`relative px-4 py-3 rounded-xl border-2 text-left transition-all ${payDuree === d.mois ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}>
                            {d.popular && <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">POP</span>}
                            <p className={`font-bold text-sm ${payDuree === d.mois ? 'text-violet-700' : 'text-gray-800'}`}>{d.label}</p>
                            <p className="text-[11px] text-gray-500">{d.desc}</p>
                            <p className={`text-xs font-bold mt-1 ${payDuree === d.mois ? 'text-violet-600' : 'text-gray-500'}`}>
                              {(tarifMensuel * d.mois).toLocaleString('fr-FR')} F
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    <button onClick={() => setPayStep('planning')}
                      className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                      Suivant : Planning →
                    </button>
                  </>
                ) : payStep === 'planning' ? (
                  <>
                    <button onClick={() => setPayStep('duree')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                      <History className="w-4 h-4" /> Retour
                    </button>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Jours de présence</h4>
                    <p className="text-xs text-gray-400 mb-3">Choisissez les jours où votre prestataire interviendra</p>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {PAY_JOURS.map((j, idx) => (
                        <button key={idx} onClick={() => setPayJours(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx].sort())}
                          className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${payJours.includes(idx) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-violet-300'}`}>
                          {j.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm">Heure de début</h4>
                    <div className="grid grid-cols-5 gap-2 mb-5">
                      {PAY_HEURES.map(h => (
                        <button key={h} onClick={() => setPayHeure(h)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${payHeure === h ? 'bg-violet-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-700'}`}>
                          {h}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setPayStep('paiement'); wallet.me().then(w => setPayWallet(parseFloat(w.solde))).catch(() => {}) }}
                      disabled={payJours.length === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      Suivant : Paiement →
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setPayStep('planning')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                      <History className="w-4 h-4" /> Retour
                    </button>
                    <h4 className="font-bold text-gray-900 mb-4 text-sm">Récapitulatif & Paiement</h4>
                    {(() => {
                      const isCoach = payTarget.provider_type === 'coach'
                      const tarifMensuel = isCoach
                        ? (payTarget.provider?.profile?.tarif_mensuel || 40000)
                        : ((payTarget.provider?.profile?.tarif || 0) * 4 || 48000)
                      const montantTotal = Math.round(tarifMensuel * payDuree)
                      const commission = Math.round(montantTotal * 0.15)
                      const soldeOk = payWallet !== null && payWallet >= montantTotal
                      return (
                        <>
                          <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Durée</span><span className="font-semibold">{payDuree} mois</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Planning</span><span className="font-semibold">{payJours.map(j => PAY_JOURS[j].slice(0,3)).join(', ')} – {payHeure}</span></div>
                            <div className="h-px bg-gray-200" />
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Tarif mensuel</span><span className="font-semibold">{tarifMensuel.toLocaleString('fr-FR')} F</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-extrabold text-gray-900">{montantTotal.toLocaleString('fr-FR')} F CFA</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Commission MedMap+ (15%)</span><span className="text-gray-500">{commission.toLocaleString('fr-FR')} F</span></div>
                          </div>

                          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3 mb-4 text-xs text-gray-600 space-y-1">
                            <p>✓ Fonds bloqués en <strong>séquestre</strong> — libérés après validation des séances</p>
                            <p>✓ Remboursement si séances non effectuées par le prestataire</p>
                          </div>

                          <div className={`rounded-xl p-3 mb-4 flex items-center gap-3 ${payWallet === null ? 'bg-gray-50' : soldeOk ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                            {payWallet === null ? (
                              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${soldeOk ? 'bg-green-100' : 'bg-red-100'}`}>
                                  {soldeOk ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-gray-700">Solde portefeuille</p>
                                  <p className={`text-sm font-extrabold ${soldeOk ? 'text-green-700' : 'text-red-600'}`}>{payWallet.toLocaleString('fr-FR')} F CFA</p>
                                </div>
                                {!soldeOk && <Link href="/portefeuille" className="text-xs font-bold text-red-600 underline flex-shrink-0">Recharger</Link>}
                              </>
                            )}
                          </div>

                          {payError && <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4"><p className="text-xs text-red-700">{payError}</p></div>}

                          <button onClick={handlePay} disabled={paying || !soldeOk || payWallet === null}
                            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                            {paying
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Paiement…</>
                              : <><Crown className="w-4 h-4" /> Payer {montantTotal.toLocaleString('fr-FR')} F et démarrer</>}
                          </button>
                          <p className="text-xs text-center text-gray-400 mt-2">Paiement sécurisé · Fonds en séquestre</p>
                        </>
                      )
                    })()}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
