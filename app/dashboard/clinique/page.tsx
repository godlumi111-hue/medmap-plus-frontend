'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { appointments, users, wallet, medical, hospital } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Calendar, Wallet as WalletIcon, CheckCircle, XCircle,
  ChevronRight, Loader2, MapPin, Phone, MessageCircle,
  User, RefreshCw, Building2, ChevronDown, ChevronUp,
  AlertCircle, Clock, Plus, Trash2, FileText, Activity,
  Stethoscope, Heart, ArrowUpRight, Hospital, FlaskConical,
  Users, DoorOpen, CreditCard, History, Settings,
  LayoutDashboard, Bell, ArrowRight, Bed, UserCheck,
  PlayCircle, StopCircle, ChevronLeft, SkipForward, List,
  TrendingUp, Banknote, Receipt, Shield, LogOut,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type MainTab = 'reception' | 'caisse' | 'salles' | 'medecins' | 'historique' | 'messagerie'

const MAIN_TABS: { id: MainTab; label: string; icon: any }[] = [
  { id: 'reception',  label: 'Réception',  icon: Bell },
  { id: 'caisse',     label: 'Caisse',     icon: CreditCard },
  { id: 'salles',     label: 'Salles',     icon: DoorOpen },
  { id: 'medecins',   label: 'Médecins',   icon: Stethoscope },
  { id: 'historique', label: 'Historique', icon: History },
  { id: 'messagerie', label: 'Messagerie', icon: MessageCircle },
]

const STATUT_ROOM: Record<string, { label: string; color: string; dot: string }> = {
  libre:   { label: 'Libre',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  occupee: { label: 'Occupée', color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  pause:   { label: 'Pause',   color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400' },
  fermee:  { label: 'Fermée',  color: 'bg-gray-100 text-gray-500 border-gray-200',         dot: 'bg-gray-400' },
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    confirme:   'bg-emerald-100 text-emerald-700',
    refuse:     'bg-red-100 text-red-600',
    annule:     'bg-gray-100 text-gray-500',
    termine:    'bg-teal-100 text-teal-700',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', confirme: 'Confirmé', refuse: 'Refusé',
    annule: 'Annulé', termine: 'Terminé',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: any) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-500',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CliniqueHopitalDashboard() {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState<MainTab>('reception')
  const [dashData, setDashData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedAppt, setExpandedAppt] = useState<number | null>(null)
  const [walletData, setWalletData] = useState<any>(null)
  const [histAppts, setHistAppts] = useState<any[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [pendingReferrals, setPendingReferrals] = useState<any[]>([])
  const [pendingExams, setPendingExams] = useState<any[]>([])
  const [pendingHosp, setPendingHosp] = useState<any[]>([])

  // Medical forms (prescription, referral, etc.)
  const [inlineForm, setInlineForm] = useState<'prescription' | 'referral' | 'hospitalization' | 'exams' | null>(null)
  const [activeApptId, setActiveApptId] = useState<number | null>(null)

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await hospital.dashboard()
      setDashData(data)
    } catch (e) { console.error(e) }
  }, [])

  const loadAllPending = useCallback(async () => {
    const [refs, exams, hosp] = await Promise.allSettled([
      hospital.pendingReferrals(),
      hospital.pendingExams(),
      hospital.pendingHospitalizations(),
    ])
    if (refs.status  === 'fulfilled') setPendingReferrals(refs.value)
    if (exams.status === 'fulfilled') setPendingExams(exams.value)
    if (hosp.status  === 'fulfilled') setPendingHosp(hosp.value)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)

    Promise.all([
      hospital.dashboard(),
      wallet.me().catch(() => null),
    ]).then(([dash, w]) => {
      setDashData(dash)
      setWalletData(w)
    }).catch(console.error)
      .finally(() => setLoading(false))

    loadAllPending().catch(console.error)

    // Socket
    connectSocket(user.id)
    const socket = getSocket()

    function onAppointmentNew(data: any) {
      setDashData((prev: any) => {
        if (!prev) return prev
        return { ...prev, pending: [data, ...prev.pending], stats: { ...prev.stats, en_attente: (prev.stats?.en_attente ?? 0) + 1 } }
      })
    }
    function onQueueUpdate(data: any) {
      setDashData((prev: any) => {
        if (!prev) return prev
        return { ...prev, services: data.services }
      })
    }
    function onMedicalEvent() { loadAllPending() }

    function onQueuePatientJoined() { refreshDashboard() }

    socket.on('appointment:new', onAppointmentNew)
    socket.on('queue:update', onQueueUpdate)
    socket.on('queue:patient_joined', onQueuePatientJoined)
    socket.on('referral:new', onMedicalEvent)
    socket.on('referral:confirmed', onMedicalEvent)
    socket.on('hospitalization:new', onMedicalEvent)
    socket.on('exam:new', onMedicalEvent)
    socket.on('medical:requests_confirmed', onMedicalEvent)

    // Join hospital room
    if (dashData?.structure_id) {
      socket.emit('join:hospital', dashData.structure_id)
    }

    return () => {
      socket.off('appointment:new', onAppointmentNew)
      socket.off('queue:update', onQueueUpdate)
      socket.off('queue:patient_joined', onQueuePatientJoined)
      socket.off('referral:new', onMedicalEvent)
      socket.off('referral:confirmed', onMedicalEvent)
      socket.off('hospitalization:new', onMedicalEvent)
      socket.off('exam:new', onMedicalEvent)
      socket.off('medical:requests_confirmed', onMedicalEvent)
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (dashData?.structure_id) {
      const socket = getSocket()
      socket.emit('join:hospital', dashData.structure_id)
    }
  }, [dashData?.structure_id])

  async function handleConfirm(apptId: number, roomId?: number) {
    setActionLoading(`confirm-${apptId}`)
    try {
      const result = await hospital.receptionConfirm(apptId, roomId)
      await refreshDashboard()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(apptId: number) {
    if (!confirm('Confirmer le refus de cette consultation ?')) return
    setActionLoading(`reject-${apptId}`)
    try {
      await hospital.receptionReject(apptId)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleNextPatient(roomId: number) {
    setActionLoading(`next-${roomId}`)
    try {
      const r = await hospital.nextPatient(roomId)
      if (r.next_patient) {
        alert(`Patient appelé : ${r.next_patient.patient_nom || 'Patient #' + r.next_patient.patient_id}`)
      } else {
        alert('File vide — salle marquée libre.')
      }
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleFinishConsultation(roomId: number) {
    setActionLoading(`finish-${roomId}`)
    try {
      await hospital.finishConsultation(roomId)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleRoomStatus(roomId: number, statut: string) {
    setActionLoading(`room-${roomId}`)
    try {
      await hospital.roomStatus(roomId, statut)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleStartConsultation(roomId: number) {
    setActionLoading(`start-${roomId}`)
    try {
      await hospital.startConsultation(roomId)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handlePatientAbsent(roomId: number) {
    setActionLoading(`absent-${roomId}`)
    try {
      const r = await hospital.patientAbsent(roomId)
      if (r.permanently_absent) {
        alert('Patient marqué absent définitivement.')
      } else {
        alert('Patient remis en fin de file.')
      }
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleFinishExam(roomId: number, resultats?: string) {
    setActionLoading(`finish-${roomId}`)
    try {
      await hospital.finishExam(roomId, resultats)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleFinishHosp(roomId: number) {
    setActionLoading(`finish-${roomId}`)
    try {
      await hospital.finishHospitalization(roomId)
      await refreshDashboard()
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleDischargeHosp(hospId: number, data: any) {
    setActionLoading(`discharge-${hospId}`)
    try {
      await hospital.dischargeHospitalization(hospId, data)
      await refreshDashboard()
    } catch (e: any) { alert(e.message); throw e }
    finally { setActionLoading(null) }
  }

  async function handleAssignReferral(referralId: number, data: { room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number }) {
    try {
      await hospital.assignReferral(referralId, data)
      await loadAllPending()
    } catch (e: any) { alert(e.message); throw e }
  }

  async function handleAssignExam(examId: number, data: { room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number }) {
    try {
      await hospital.assignExam(examId, data)
      await loadAllPending()
    } catch (e: any) { alert(e.message); throw e }
  }

  async function handleAssignHosp(hospId: number, data: { room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number }) {
    try {
      await hospital.assignHospitalization(hospId, data)
      await loadAllPending()
    } catch (e: any) { alert(e.message); throw e }
  }

  async function handleAddPrescription(appointmentId: number, data: { medicaments: any[]; notes?: string }) {
    try {
      await hospital.addPrescription(appointmentId, data)
      await refreshDashboard()
    } catch (e: any) {
      alert(e.message)
      throw e
    }
  }

  async function loadHistorique() {
    setHistLoading(true)
    try {
      const all = await appointments.mine()
      setHistAppts(all.filter((a: any) => ['confirme','termine','refuse','annule'].includes(a.statut)))
    } catch (e) { console.error(e) }
    finally { setHistLoading(false) }
  }

  useEffect(() => {
    if (mainTab === 'historique' && histAppts.length === 0) loadHistorique()
  }, [mainTab]) // eslint-disable-line

  const stats = dashData?.stats ?? {}
  const pending = dashData?.pending ?? []
  const confirmedToday = dashData?.confirmed_today ?? []
  const services = dashData?.services ?? []
  const queueDetails = dashData?.queue_details ?? []
  const payments = dashData?.payments ?? []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Gestion Hospitalière
                  </h1>
                  <p className="text-white/70 text-sm">
                    {user?.prenom} {user?.nom} · {stats.total_rdv ?? 0} rendez-vous aujourd'hui
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshDashboard}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
                <div className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold text-white">
                  {walletData?.solde != null
                    ? `${parseInt(walletData.solde).toLocaleString('fr-FR')} FCFA`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'En attente', value: stats.en_attente ?? 0, color: 'text-amber-300' },
                { label: 'Confirmés', value: stats.confirme ?? 0, color: 'text-emerald-300' },
                { label: 'Terminés', value: stats.termine ?? 0, color: 'text-teal-300' },
                { label: 'Immédiats', value: stats.immediates ?? 0, color: 'text-violet-300' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2 text-center">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-white/70 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="max-w-7xl mx-auto px-4 pb-0">
            <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
              {MAIN_TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMainTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                      mainTab === tab.id
                        ? 'border-white text-white'
                        : 'border-transparent text-white/60 hover:text-white/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === 'reception' && (pending.length > 0) && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pending.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mainTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── RÉCEPTION ───────────────────────────────────────────────── */}
              {mainTab === 'reception' && (
                <ReceptionTab
                  pending={pending}
                  confirmedToday={confirmedToday}
                  services={services}
                  actionLoading={actionLoading}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                  expandedAppt={expandedAppt}
                  setExpandedAppt={setExpandedAppt}
                  pendingReferrals={pendingReferrals}
                  pendingExams={pendingExams}
                  pendingHosp={pendingHosp}
                  onAssignReferral={handleAssignReferral}
                  onAssignExam={handleAssignExam}
                  onAssignHosp={handleAssignHosp}
                  onRefreshAll={loadAllPending}
                />
              )}

              {/* ── CAISSE ──────────────────────────────────────────────────── */}
              {mainTab === 'caisse' && (
                <CaisseTab payments={payments} walletSolde={walletData?.solde ?? 0} />
              )}

              {/* ── SALLES ──────────────────────────────────────────────────── */}
              {mainTab === 'salles' && (
                <SallesTab
                  services={services}
                  queueDetails={queueDetails}
                  actionLoading={actionLoading}
                  onNextPatient={handleNextPatient}
                  onFinishConsultation={handleFinishConsultation}
                  onFinishExam={handleFinishExam}
                  onFinishHosp={handleFinishHosp}
                  onRoomStatus={handleRoomStatus}
                  onStartConsultation={handleStartConsultation}
                  onPatientAbsent={handlePatientAbsent}
                  onAddPrescription={handleAddPrescription}
                  onDischargeHosp={handleDischargeHosp}
                  onRefresh={refreshDashboard}
                />
              )}

              {/* ── MÉDECINS ────────────────────────────────────────────────── */}
              {mainTab === 'medecins' && (
                <MedecinsTab services={services} />
              )}

              {/* ── HISTORIQUE ──────────────────────────────────────────────── */}
              {mainTab === 'historique' && (
                <HistoriqueTab appts={histAppts} loading={histLoading} onRefresh={loadHistorique} />
              )}

              {/* ── MESSAGERIE ──────────────────────────────────────────────── */}
              {mainTab === 'messagerie' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-12" style={{ minHeight: 500 }}>
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Messagerie patients</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">
                      Ouvrez la fiche d'un rendez-vous dans l'onglet Réception pour envoyer un message directement au patient.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── TAB RÉCEPTION ─────────────────────────────────────────────────────────────

function ReceptionTab({ pending, confirmedToday, services, actionLoading, onConfirm, onReject, expandedAppt, setExpandedAppt, pendingReferrals, pendingExams, pendingHosp, onAssignReferral, onAssignExam, onAssignHosp, onRefreshAll }: any) {
  const [selectedRoom, setSelectedRoom] = useState<Record<number, number>>({})
  const allRooms = services.flatMap((s: any) => s.rooms.map((r: any) => ({ ...r, service_nom: s.nom, service_prix: s.prix, room_prix: r.prix ?? 0 })))

  return (
    <div className="space-y-6">
      {/* Files en attente par salle (overview) */}
      {services.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" /> Aperçu des files d'attente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((svc: any) => (
              <div key={svc.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-bold text-gray-800 text-sm mb-2">{svc.nom}</p>
                {svc.rooms.map((r: any) => {
                  const s = STATUT_ROOM[r.statut] ?? STATUT_ROOM.libre
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <span className="text-xs text-gray-700 font-medium">{r.nom}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {r.en_attente > 0 ? `${r.en_attente} en attente` : s.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh button */}
      {(pendingReferrals?.length > 0 || pendingExams?.length > 0 || pendingHosp?.length > 0) && (
        <div className="flex justify-end">
          <button onClick={onRefreshAll} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>
      )}

      {/* Orientations en attente */}
      {pendingReferrals?.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
            Orientations à attribuer
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingReferrals.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingReferrals.map((ref: any) => (
              <ReferralAttributionCard key={ref.id} referral={ref} allRooms={allRooms} onAssign={onAssignReferral} />
            ))}
          </div>
        </div>
      )}

      {/* Examens en attente */}
      {pendingExams?.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-500" />
            Examens à planifier
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingExams.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingExams.map((exam: any) => (
              <ExamAttributionCard key={exam.id} exam={exam} allRooms={allRooms} onAssign={onAssignExam} />
            ))}
          </div>
        </div>
      )}

      {/* Hospitalisations en attente */}
      {pendingHosp?.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Bed className="w-4 h-4 text-rose-500" />
            Hospitalisations à attribuer
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingHosp.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingHosp.map((h: any) => (
              <HospAttributionCard key={h.id} hosp={h} allRooms={allRooms} onAssign={onAssignHosp} />
            ))}
          </div>
        </div>
      )}

      {/* Nouvelles demandes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Nouvelles demandes
            {pending.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucune demande en attente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((appt: any) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                allRooms={allRooms}
                selectedRoom={selectedRoom}
                setSelectedRoom={setSelectedRoom}
                actionLoading={actionLoading}
                onConfirm={onConfirm}
                onReject={onReject}
                expanded={expandedAppt === appt.id}
                onToggle={() => setExpandedAppt(expandedAppt === appt.id ? null : appt.id)}
                showActions
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmés aujourd'hui */}
      {confirmedToday.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" /> Confirmés aujourd'hui
          </h2>
          <div className="space-y-3">
            {confirmedToday.map((appt: any) => (
              <div key={appt.id} className="bg-white rounded-2xl border border-emerald-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-bold text-gray-800 text-sm">
                    {appt.patient_prenom} {appt.patient_nom}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appt.heure_rdv?.slice(0, 5)} · {appt.service_nom || appt.service}
                    {appt.room_nom && ` · ${appt.room_nom}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {appt.ticket_numero && (
                    <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold">
                      #{appt.ticket_numero}
                    </span>
                  )}
                  {appt.queue_statut && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      appt.queue_statut === 'en_consultation' ? 'bg-amber-100 text-amber-700' :
                      appt.queue_statut === 'appele' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {appt.queue_statut === 'en_attente' ? 'En file' :
                       appt.queue_statut === 'appele' ? 'Appelé' :
                       appt.queue_statut === 'en_consultation' ? 'En consultation' : appt.queue_statut}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const URGENCE_COLOR: Record<string, string> = {
  normal:       'bg-gray-100 text-gray-600',
  urgent:       'bg-amber-100 text-amber-700',
  tres_urgent:  'bg-red-100 text-red-700',
}
const URGENCE_LABEL: Record<string, string> = {
  normal:       'Normal',
  urgent:       '⚠ Urgent',
  tres_urgent:  '🚨 Très urgent',
}

// Tarifs officiels par service (synchronisés avec hospital_services.prix)
const SERVICE_TARIFS: Record<string, number> = {
  'Consultation générale': 15000,
  'Cardiologie':           50000,
  'Pédiatrie':             40000,
  'Ophtalmologie':         45000,
  'Gynécologie':           40000,
  'Urgences':              60000,
}

function ReferralAttributionCard({ referral: ref, allRooms, onAssign }: any) {
  const [expanded, setExpanded] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [dateRdv, setDateRdv] = useState(ref.date_proposee ?? '')
  const [heureRdv, setHeureRdv] = useState(ref.heure_proposee ?? '09:00')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const isBlocked   = ref.statut === 'envoyee_reception'
  const isAttribuee = ref.statut === 'attribuee'
  const isUrgent    = ref.urgence === 'urgent' || ref.urgence === 'tres_urgent'

  // Rooms matching the referred specialty (case-insensitive substring match)
  const matchingRooms: any[] = allRooms.filter((r: any) =>
    r.statut !== 'fermee' &&
    r.service_nom?.toLowerCase().includes((ref.specialite ?? '').toLowerCase())
  )

  // Best auto-select: libre first → fewest en_attente
  const bestRoom: any | undefined = matchingRooms.length > 0
    ? [...matchingRooms].sort((a, b) => {
        if (a.statut === 'libre' && b.statut !== 'libre') return -1
        if (b.statut === 'libre' && a.statut !== 'libre') return 1
        return (a.en_attente ?? 0) - (b.en_attente ?? 0)
      })[0]
    : undefined

  // Auto-select best room on first open
  useEffect(() => {
    if (bestRoom && !selectedRoom) setSelectedRoom(String(bestRoom.id))
  }, [bestRoom?.id]) // eslint-disable-line

  const selectedRoomData = allRooms.find((r: any) => String(r.id) === selectedRoom)
  const autoTarif = selectedRoomData
    ? (selectedRoomData.service_prix || SERVICE_TARIFS[selectedRoomData.service_nom] || ref.tarif || 0)
    : (ref.tarif || 0)

  const noMatchingRooms = matchingRooms.length === 0

  async function handleAssign() {
    if (isBlocked) return
    setLoading(true)
    try {
      await onAssign(ref.id, {
        room_id:   selectedRoom ? parseInt(selectedRoom) : undefined,
        date_rdv:  isUrgent ? undefined : (dateRdv || undefined),
        heure_rdv: isUrgent ? undefined : (heureRdv || undefined),
        tarif:     autoTarif || undefined,
      })
      setDone(true)
    } catch { /* onAssign already alerts */ }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700">
          Orientation {ref.specialite} attribuée — patient notifié.
        </p>
      </div>
    )
  }

  const borderColor = isBlocked ? 'border-gray-200' :
    ref.urgence === 'tres_urgent' ? 'border-red-300' :
    ref.urgence === 'urgent' ? 'border-orange-300' : 'border-blue-200'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${borderColor} ${isBlocked ? 'opacity-80' : ''}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBlocked ? 'bg-gray-100' : 'bg-blue-50'}`}>
            <ArrowUpRight className={`w-5 h-5 ${isBlocked ? 'text-gray-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">
                {ref.patient_prenom} {ref.patient_nom}
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBlocked ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                → {ref.specialite}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCE_COLOR[ref.urgence] ?? URGENCE_COLOR.normal}`}>
                {URGENCE_LABEL[ref.urgence] ?? ref.urgence}
              </span>
              {isBlocked && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Attente confirmation patient
                </span>
              )}
              {isAttribuee && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Salle attribuée
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Dr. {ref.emetteur_prenom} {ref.emetteur_nom}
              {ref.motif && ` · ${ref.motif}`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">

              {/* Blocked state banner */}
              {isBlocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">En attente de confirmation patient</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Le patient doit d'abord confirmer que la consultation générale a bien eu lieu.
                      L'attribution de salle sera débloquée dès sa confirmation.
                    </p>
                  </div>
                </div>
              )}

              {/* Medical details */}
              {ref.resume_medical && (
                <div className="bg-gray-50 rounded-xl p-2 text-xs">
                  <p className="text-gray-400 font-bold mb-0.5">Résumé médical</p>
                  <p className="text-gray-700">{ref.resume_medical}</p>
                </div>
              )}
              {ref.symptomes_observes && (
                <div className="bg-gray-50 rounded-xl p-2 text-xs">
                  <p className="text-gray-400 font-bold mb-0.5">Symptômes</p>
                  <p className="text-gray-700">{ref.symptomes_observes}</p>
                </div>
              )}
              {ref.examens_necessaires && (
                <div className="bg-gray-50 rounded-xl p-2 text-xs">
                  <p className="text-gray-400 font-bold mb-0.5">Examens nécessaires</p>
                  <p className="text-gray-700">{ref.examens_necessaires}</p>
                </div>
              )}

              {/* Attribution form */}
              {!isAttribuee && (
                <div className={`rounded-xl p-3 space-y-3 ${isBlocked ? 'bg-gray-50 border border-gray-200' : isUrgent ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
                  <p className={`text-xs font-bold ${isBlocked ? 'text-gray-400' : isUrgent ? 'text-amber-700' : 'text-blue-700'}`}>
                    {isBlocked ? 'Attribution bloquée — en attente du patient' : isUrgent ? '⚠ Attribution urgente — prise en charge immédiate' : 'Attribution de salle'}
                  </p>

                  {/* Service demandé */}
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500 font-medium">Service demandé</span>
                    <span className="text-sm font-bold text-gray-900">{ref.specialite}</span>
                  </div>

                  {/* Aucune salle trouvée pour ce service */}
                  {noMatchingRooms && !isBlocked && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 font-medium flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Aucune salle {ref.specialite} disponible. Choisissez manuellement ci-dessous.
                    </div>
                  )}

                  {/* Salle proposée automatiquement */}
                  {selectedRoomData && !isBlocked && (
                    <div className={`rounded-xl border px-3 py-2.5 space-y-1 ${
                      selectedRoomData.statut === 'libre'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {String(selectedRoom) === String(bestRoom?.id) ? 'Salle proposée automatiquement' : 'Salle sélectionnée'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUT_ROOM[selectedRoomData.statut]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUT_ROOM[selectedRoomData.statut]?.dot ?? 'bg-gray-400'}`} />
                          {STATUT_ROOM[selectedRoomData.statut]?.label ?? selectedRoomData.statut}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-gray-900">{selectedRoomData.nom}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Service : <strong>{selectedRoomData.service_nom}</strong></span>
                        <span>·</span>
                        <span>File : <strong>{selectedRoomData.en_attente ?? 0} patient{(selectedRoomData.en_attente ?? 0) !== 1 ? 's' : ''}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Modification manuelle — dropdown filtré sur la spécialité */}
                  {!isBlocked && (
                    <div>
                      <label className="text-xs text-gray-400 font-medium block mb-1">
                        {matchingRooms.length > 0 ? 'Modifier la salle (optionnel)' : 'Choisir une salle manuellement'}
                      </label>
                      <select
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white"
                        value={selectedRoom}
                        onChange={e => setSelectedRoom(e.target.value)}
                      >
                        <option value="">— Sélectionner —</option>
                        {/* Rooms matching specialty first */}
                        {matchingRooms.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.nom}{r.statut === 'libre' ? ' ✓ Libre' : ` (${r.en_attente ?? 0} en attente)`}
                          </option>
                        ))}
                        {/* Separator + other rooms if no match */}
                        {matchingRooms.length === 0 && allRooms
                          .filter((r: any) => r.statut !== 'fermee')
                          .map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.service_nom} — {r.nom}{r.statut === 'libre' ? ' ✓ Libre' : ` (${r.en_attente ?? 0} en attente)`}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Tarif auto-rempli — lecture seule */}
                  {(selectedRoom || ref.tarif) && (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 font-medium">Tarif {ref.specialite}</span>
                      <span className="text-sm font-extrabold text-gray-900">
                        {autoTarif ? `${parseInt(String(autoTarif)).toLocaleString('fr-FR')} FCFA` : '—'}
                      </span>
                    </div>
                  )}

                  {/* Date / Heure — uniquement si NORMAL */}
                  {!isUrgent && !isBlocked && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Date du rendez-vous</label>
                        <input type="date"
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
                          value={dateRdv}
                          onChange={e => setDateRdv(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                        <input type="time"
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
                          value={heureRdv}
                          onChange={e => setHeureRdv(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Urgent info */}
                  {isUrgent && !isBlocked && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Le patient sera ajouté en tête de file et notifié immédiatement.
                    </p>
                  )}

                  <button
                    onClick={handleAssign}
                    disabled={loading || isBlocked || !selectedRoom}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      isBlocked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isUrgent
                          ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white'
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {isBlocked ? 'En attente du patient…' : isUrgent ? 'Attribuer en urgence' : 'Confirmer l\'attribution'}
                  </button>
                </div>
              )}

              {/* Already attributed */}
              {isAttribuee && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
                  <p className="font-bold text-emerald-700 mb-1">Salle attribuée — en attente du patient</p>
                  {ref.assigned_room_nom && <p className="text-emerald-600">Salle : {ref.assigned_room_nom}</p>}
                  {ref.date_proposee && <p className="text-emerald-600">Date : {new Date(ref.date_proposee).toLocaleDateString('fr-FR')} à {ref.heure_proposee?.slice(0,5) ?? ''}</p>}
                  {ref.tarif && <p className="text-emerald-600">Tarif : {parseInt(ref.tarif).toLocaleString('fr-FR')} FCFA</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Carte d'attribution — Examens ─────────────────────────────────────────────
function ExamAttributionCard({ exam, allRooms, onAssign }: any) {
  const [expanded, setExpanded] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [dateRdv, setDateRdv] = useState(exam.date_proposee ?? '')
  const [heureRdv, setHeureRdv] = useState(exam.heure_rdv ?? '08:00')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const isBlocked   = exam.statut === 'envoyee_reception'
  const isAttribuee = exam.statut === 'attribuee'
  const isUrgent    = exam.urgence === 'urgent' || exam.urgence === 'tres_urgent'
  const examList: string[] = (() => { try { const p = typeof exam.examens === 'string' ? JSON.parse(exam.examens) : exam.examens; return Array.isArray(p) ? p : [p] } catch { return [exam.examens] } })()
  const examLabel = examList.slice(0,2).join(', ') + (examList.length > 2 ? ` +${examList.length - 2}` : '')

  // Match rooms: laboratoire field or "labora"/"examen" in service name
  const matchingRooms: any[] = allRooms.filter((r: any) =>
    r.statut !== 'fermee' && (
      (exam.laboratoire && r.service_nom?.toLowerCase().includes(exam.laboratoire.toLowerCase())) ||
      r.service_nom?.toLowerCase().includes('labora') ||
      r.service_nom?.toLowerCase().includes('examen') ||
      r.service_nom?.toLowerCase().includes('imagerie')
    )
  )
  const fallbackRooms: any[] = matchingRooms.length > 0 ? matchingRooms : allRooms.filter((r: any) => r.statut !== 'fermee')
  const bestRoom: any | undefined = fallbackRooms.length > 0
    ? [...fallbackRooms].sort((a, b) => {
        if (a.statut === 'libre' && b.statut !== 'libre') return -1
        if (b.statut === 'libre' && a.statut !== 'libre') return 1
        return (a.en_attente ?? 0) - (b.en_attente ?? 0)
      })[0]
    : undefined

  useEffect(() => { if (bestRoom && !selectedRoom) setSelectedRoom(String(bestRoom.id)) }, [bestRoom?.id]) // eslint-disable-line

  const selectedRoomData = allRooms.find((r: any) => String(r.id) === selectedRoom)
  const autoTarif = selectedRoomData
    ? (selectedRoomData.service_prix || exam.tarif || exam.frais || 0)
    : (exam.tarif || exam.frais || 0)

  async function handleAssign() {
    if (isBlocked) return
    setLoading(true)
    try {
      await onAssign(exam.id, {
        room_id: selectedRoom ? parseInt(selectedRoom) : undefined,
        date_rdv: isUrgent ? undefined : (dateRdv || undefined),
        heure_rdv: isUrgent ? undefined : (heureRdv || undefined),
        tarif: autoTarif || undefined,
      })
      setDone(true)
    } catch { /* onAssign already alerts */ }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-500" />
      <p className="text-sm font-semibold text-emerald-700">Examens planifiés — patient notifié.</p>
    </div>
  )

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isBlocked ? 'border-gray-200 opacity-80' : isUrgent ? 'border-amber-300' : 'border-purple-200'}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBlocked ? 'bg-gray-100' : 'bg-purple-50'}`}>
            <FlaskConical className={`w-5 h-5 ${isBlocked ? 'text-gray-400' : 'text-purple-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{exam.patient_prenom} {exam.patient_nom}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🔬 {examLabel}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCE_COLOR[exam.urgence] ?? URGENCE_COLOR.normal}`}>{URGENCE_LABEL[exam.urgence] ?? exam.urgence}</span>
              {isBlocked && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Attente confirmation</span>}
              {isAttribuee && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Salle attribuée</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Dr. {exam.emetteur_prenom} {exam.emetteur_nom}{exam.motif ? ` · ${exam.motif}` : ''}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
              {isBlocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Le patient doit confirmer sa consultation actuelle avant que vous puissiez planifier cet examen.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {examList.map((ex: string, i: number) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-2.5 py-1 font-semibold">{ex}</span>
                ))}
              </div>
              {!isAttribuee && (
                <div className={`rounded-xl p-3 space-y-3 ${isBlocked ? 'bg-gray-50 border border-gray-200' : isUrgent ? 'bg-amber-50 border border-amber-200' : 'bg-purple-50 border border-purple-100'}`}>
                  <p className={`text-xs font-bold ${isBlocked ? 'text-gray-400' : isUrgent ? 'text-amber-700' : 'text-purple-700'}`}>
                    {isBlocked ? 'Attribution bloquée' : isUrgent ? '⚠ Planification urgente' : 'Planification des examens'}
                  </p>
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500 font-medium">Examens demandés</span>
                    <span className="text-sm font-bold text-gray-900">{examLabel}</span>
                  </div>
                  {selectedRoomData && !isBlocked && (
                    <div className={`rounded-xl border px-3 py-2.5 space-y-1 ${selectedRoomData.statut === 'libre' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{String(selectedRoom) === String(bestRoom?.id) ? 'Salle proposée' : 'Salle sélectionnée'}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUT_ROOM[selectedRoomData.statut]?.color ?? ''}`}>{STATUT_ROOM[selectedRoomData.statut]?.label ?? selectedRoomData.statut}</span>
                      </div>
                      <p className="text-sm font-extrabold text-gray-900">{selectedRoomData.nom}</p>
                      <p className="text-xs text-gray-500">Service : <strong>{selectedRoomData.service_nom}</strong> · File : <strong>{selectedRoomData.en_attente ?? 0}</strong></p>
                    </div>
                  )}
                  {!isBlocked && (
                    <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                      <option value="">— Sélectionner une salle —</option>
                      {(matchingRooms.length > 0 ? matchingRooms : fallbackRooms).map((r: any) => (
                        <option key={r.id} value={r.id}>{r.service_nom} — {r.nom}{r.statut === 'libre' ? ' ✓' : ` (${r.en_attente ?? 0} en attente)`}</option>
                      ))}
                    </select>
                  )}
                  {(selectedRoom || exam.tarif || exam.frais) && (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 font-medium">Tarif examens</span>
                      <span className="text-sm font-extrabold text-gray-900">{autoTarif ? `${parseInt(String(autoTarif)).toLocaleString('fr-FR')} FCFA` : '—'}</span>
                    </div>
                  )}
                  {!isUrgent && !isBlocked && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Date</label>
                        <input type="date" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" value={dateRdv} onChange={e => setDateRdv(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                        <input type="time" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" value={heureRdv} onChange={e => setHeureRdv(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <button onClick={handleAssign} disabled={loading || isBlocked || !selectedRoom}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${isBlocked ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isUrgent ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {isBlocked ? 'En attente…' : isUrgent ? 'Planifier en urgence' : 'Confirmer la planification'}
                  </button>
                </div>
              )}
              {isAttribuee && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
                  <p className="font-bold text-emerald-700 mb-1">Planifié — en attente d'acceptation patient</p>
                  {exam.assigned_room_nom && <p className="text-emerald-600">Salle : {exam.assigned_room_nom}</p>}
                  {exam.date_proposee && <p className="text-emerald-600">Date : {new Date(exam.date_proposee).toLocaleDateString('fr-FR')}</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Carte d'attribution — Hospitalisations ────────────────────────────────────
function HospAttributionCard({ hosp, allRooms, onAssign }: any) {
  const [expanded, setExpanded] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const isBlocked   = hosp.statut === 'envoyee_reception'
  const isAttribuee = hosp.statut === 'attribuee'
  const isUrgent    = hosp.urgence === 'urgent' || hosp.urgence === 'tres_urgent'

  // Match rooms by hosp.service or "hospitali" / "chambre" in service name
  const matchingRooms: any[] = allRooms.filter((r: any) =>
    r.statut !== 'fermee' && (
      (hosp.service && r.service_nom?.toLowerCase().includes(hosp.service.toLowerCase())) ||
      r.service_nom?.toLowerCase().includes('hospitali') ||
      r.service_nom?.toLowerCase().includes('chambre') ||
      r.nom?.toLowerCase().includes('chambre') ||
      r.nom?.toLowerCase().includes('lit')
    )
  )
  const fallbackRooms: any[] = matchingRooms.length > 0 ? matchingRooms : allRooms.filter((r: any) => r.statut !== 'fermee')
  const bestRoom: any | undefined = fallbackRooms.length > 0
    ? [...fallbackRooms].sort((a, b) => {
        if (a.statut === 'libre' && b.statut !== 'libre') return -1
        if (b.statut === 'libre' && a.statut !== 'libre') return 1
        return (a.en_attente ?? 0) - (b.en_attente ?? 0)
      })[0]
    : undefined

  useEffect(() => { if (bestRoom && !selectedRoom) setSelectedRoom(String(bestRoom.id)) }, [bestRoom?.id]) // eslint-disable-line

  const selectedRoomData = allRooms.find((r: any) => String(r.id) === selectedRoom)
  const autoTarif = selectedRoomData
    ? (selectedRoomData.room_prix || selectedRoomData.service_prix || hosp.frais || 0)
    : (hosp.frais || 0)

  async function handleAssign() {
    if (isBlocked) return
    setLoading(true)
    try {
      await onAssign(hosp.id, { room_id: selectedRoom ? parseInt(selectedRoom) : undefined, tarif: autoTarif || undefined })
      setDone(true)
    } catch { /* onAssign already alerts */ }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-500" />
      <p className="text-sm font-semibold text-emerald-700">Chambre attribuée — patient notifié.</p>
    </div>
  )

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isBlocked ? 'border-gray-200 opacity-80' : isUrgent ? 'border-red-300' : 'border-rose-200'}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBlocked ? 'bg-gray-100' : 'bg-rose-50'}`}>
            <Bed className={`w-5 h-5 ${isBlocked ? 'text-gray-400' : 'text-rose-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{hosp.patient_prenom} {hosp.patient_nom}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">🏥 {hosp.service || 'Hospitalisation'}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCE_COLOR[hosp.urgence] ?? URGENCE_COLOR.normal}`}>{URGENCE_LABEL[hosp.urgence] ?? hosp.urgence}</span>
              {isBlocked && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Attente confirmation</span>}
              {isAttribuee && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Chambre attribuée</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Dr. {hosp.emetteur_prenom} {hosp.emetteur_nom}{hosp.motif ? ` · ${hosp.motif}` : ''}{hosp.duree_estimee ? ` · Durée : ${hosp.duree_estimee}` : ''}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
              {isBlocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Le patient doit confirmer sa consultation actuelle avant que vous puissiez attribuer une chambre.</p>
                </div>
              )}
              {hosp.motif && <div className="bg-gray-50 rounded-xl p-2 text-xs"><p className="text-gray-400 font-bold mb-0.5">Motif</p><p className="text-gray-700">{hosp.motif}</p></div>}
              {!isAttribuee && (
                <div className={`rounded-xl p-3 space-y-3 ${isBlocked ? 'bg-gray-50 border border-gray-200' : isUrgent ? 'bg-red-50 border border-red-200' : 'bg-rose-50 border border-rose-100'}`}>
                  <p className={`text-xs font-bold ${isBlocked ? 'text-gray-400' : isUrgent ? 'text-red-700' : 'text-rose-700'}`}>
                    {isBlocked ? 'Attribution bloquée' : isUrgent ? '🚨 Hospitalisation urgente' : 'Attribution de chambre'}
                  </p>
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500 font-medium">Service demandé</span>
                    <span className="text-sm font-bold text-gray-900">{hosp.service || 'Hospitalisation'}</span>
                  </div>
                  {selectedRoomData && !isBlocked && (
                    <div className={`rounded-xl border px-3 py-2.5 space-y-1 ${selectedRoomData.statut === 'libre' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{String(selectedRoom) === String(bestRoom?.id) ? 'Chambre proposée' : 'Chambre sélectionnée'}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUT_ROOM[selectedRoomData.statut]?.color ?? ''}`}>{STATUT_ROOM[selectedRoomData.statut]?.label ?? selectedRoomData.statut}</span>
                      </div>
                      <p className="text-sm font-extrabold text-gray-900">{selectedRoomData.nom}</p>
                      <p className="text-xs text-gray-500">Service : <strong>{selectedRoomData.service_nom}</strong></p>
                    </div>
                  )}
                  {!isBlocked && (
                    <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                      <option value="">— Sélectionner une chambre —</option>
                      {(matchingRooms.length > 0 ? matchingRooms : fallbackRooms).map((r: any) => (
                        <option key={r.id} value={r.id}>{r.service_nom} — {r.nom}{r.statut === 'libre' ? ' ✓' : ` (${r.en_attente ?? 0} en attente)`}</option>
                      ))}
                    </select>
                  )}
                  {(selectedRoom || hosp.frais) && (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 font-medium">Frais d'hospitalisation</span>
                      <span className="text-sm font-extrabold text-gray-900">{autoTarif ? `${parseInt(String(autoTarif)).toLocaleString('fr-FR')} FCFA` : '—'}</span>
                    </div>
                  )}
                  {isUrgent && !isBlocked && <p className="text-xs text-red-600 font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Patient prioritaire — admission immédiate.</p>}
                  <button onClick={handleAssign} disabled={loading || isBlocked || !selectedRoom}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${isBlocked ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bed className="w-4 h-4" />}
                    {isBlocked ? 'En attente…' : isUrgent ? 'Admettre en urgence' : 'Attribuer la chambre'}
                  </button>
                </div>
              )}
              {isAttribuee && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
                  <p className="font-bold text-emerald-700 mb-1">Chambre attribuée — en attente d'acceptation patient</p>
                  {hosp.assigned_room_nom && <p className="text-emerald-600">Chambre : {hosp.assigned_room_nom}</p>}
                  {hosp.frais && <p className="text-emerald-600">Frais : {parseInt(hosp.frais).toLocaleString('fr-FR')} FCFA</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AppointmentCard({ appt, allRooms, selectedRoom, setSelectedRoom, actionLoading, onConfirm, onReject, expanded, onToggle, showActions }: any) {
  const isImmediate = appt.type_consultation === 'immediate'
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isImmediate ? 'border-orange-200' : 'border-gray-100'}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isImmediate ? 'bg-orange-100' : 'bg-indigo-50'}`}>
            {isImmediate ? <Zap className="w-5 h-5 text-orange-500" /> : <Calendar className="w-5 h-5 text-indigo-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">
                {appt.patient_prenom} {appt.patient_nom}
              </p>
              {isImmediate && (
                <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">IMMÉDIAT</span>
              )}
              {appt.ticket_numero && (
                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{appt.ticket_numero}</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {appt.service} · {isImmediate ? 'Maintenant' : `${appt.date_rdv} à ${appt.heure_rdv?.slice(0,5)}`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
              <div className="grid grid-cols-2 gap-3 pt-3">
                <Info label="Patient" value={`${appt.patient_prenom} ${appt.patient_nom}`} />
                <Info label="Téléphone" value={appt.patient_tel ?? '—'} />
                <Info label="Service" value={appt.service} />
                <Info label="Motif" value={appt.motif ?? '—'} />
                {appt.symptomes && <Info label="Symptômes" value={appt.symptomes} />}
                {appt.prix > 0 && <Info label="Montant" value={`${parseInt(appt.prix).toLocaleString('fr-FR')} FCFA`} />}
              </div>

              {showActions && (
                <>
                  {/* Choix de salle */}
                  {allRooms.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">Attribuer une salle (optionnel)</p>
                      <select
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                        value={selectedRoom[appt.id] ?? ''}
                        onChange={e => setSelectedRoom((prev: any) => ({ ...prev, [appt.id]: e.target.value ? parseInt(e.target.value) : undefined }))}
                      >
                        <option value="">Attribution automatique (recommandé)</option>
                        {allRooms.map((r: any) => (
                          <option key={r.id} value={r.id} disabled={r.statut === 'fermee'}>
                            {r.service_nom} · {r.nom} ({r.en_attente} en attente)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => onConfirm(appt.id, selectedRoom[appt.id])}
                      disabled={actionLoading === `confirm-${appt.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                    >
                      {actionLoading === `confirm-${appt.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Confirmer & Attribuer
                    </button>
                    <button
                      onClick={() => onReject(appt.id)}
                      disabled={actionLoading === `reject-${appt.id}`}
                      className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-red-100"
                    >
                      {actionLoading === `reject-${appt.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Refuser
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// ── TAB CAISSE ────────────────────────────────────────────────────────────────

function CaisseTab({ payments, walletSolde }: any) {
  const totalBloque = payments.filter((p: any) => ['en_attente','bloque'].includes(p.statut)).reduce((s: number, p: any) => s + parseFloat(p.montant ?? 0), 0)
  const totalConfirme = payments.filter((p: any) => ['confirme','libere'].includes(p.statut)).reduce((s: number, p: any) => s + parseFloat(p.montant ?? 0) - parseFloat(p.commission ?? 0), 0)
  const totalCommission = payments.filter((p: any) => ['confirme','libere'].includes(p.statut)).reduce((s: number, p: any) => s + parseFloat(p.commission ?? 0), 0)

  const PAY_STATUS: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    bloque:     'bg-amber-100 text-amber-700',
    confirme:   'bg-emerald-100 text-emerald-700',
    libere:     'bg-teal-100 text-teal-700',
    dispute:    'bg-red-100 text-red-600',
    rembourse:  'bg-gray-100 text-gray-500',
  }
  const PAY_LABELS: Record<string, string> = {
    en_attente: 'Séquestre', bloque: 'Séquestre', confirme: 'Libéré', libere: 'Libéré',
    dispute: 'Litige', rembourse: 'Remboursé',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={WalletIcon} label="Solde portefeuille" value={`${parseInt(walletSolde ?? 0).toLocaleString('fr-FR')} FCFA`} color="indigo" />
        <StatCard icon={Shield} label="En séquestre" value={`${totalBloque.toLocaleString('fr-FR')} FCFA`} color="amber" />
        <StatCard icon={CheckCircle} label="Libéré (net)" value={`${totalConfirme.toLocaleString('fr-FR')} FCFA`} color="emerald" />
        <StatCard icon={TrendingUp} label="Comm. MedMap+" value={`${totalCommission.toLocaleString('fr-FR')} FCFA`} color="violet" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-500" /> Transactions
          </h3>
          <span className="text-xs text-gray-400">{payments.length} entrées</span>
        </div>
        <div className="divide-y divide-gray-50">
          {payments.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Aucune transaction</div>
          )}
          {payments.map((p: any) => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {p.payer_prenom} {p.payer_nom}
                </p>
                <p className="text-xs text-gray-400">
                  {p.description ?? p.service_nom ?? 'Consultation'}
                  {p.ticket_numero && ` · #${p.ticket_numero}`}
                  {' · '}{new Date(p.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">
                  {parseInt(p.montant).toLocaleString('fr-FR')} FCFA
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PAY_STATUS[p.statut] ?? 'bg-gray-100 text-gray-500'}`}>
                  {PAY_LABELS[p.statut] ?? p.statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ deadline }: { deadline: string }) {
  const [secsLeft, setSecsLeft] = useState(() => {
    const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })

  useEffect(() => {
    if (secsLeft <= 0) return
    const t = setInterval(() => {
      setSecsLeft(s => {
        const next = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
        if (next <= 0) clearInterval(t)
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [deadline])

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const urgent = secsLeft <= 60 && secsLeft > 0
  const expired = secsLeft === 0

  return (
    <span className={`font-mono font-bold text-sm ${expired ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-blue-700'}`}>
      {expired ? 'Expiré' : `${mins}:${String(secs).padStart(2, '0')}`}
    </span>
  )
}

// ── ExamFinishPanel ───────────────────────────────────────────────────────────

function ExamFinishPanel({ roomId, onFinish, loading }: { roomId: number; onFinish: (id: number, resultats?: string) => void; loading: boolean }) {
  const [resultats, setResultats] = useState('')
  return (
    <div className="mt-3 space-y-2">
      <textarea
        className="w-full text-xs border border-purple-200 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400 resize-none bg-white"
        rows={3}
        placeholder="Résultats de l'examen (optionnel) — ex: NFS normale, glycémie: 5,2 mmol/L..."
        value={resultats}
        onChange={e => setResultats(e.target.value)}
      />
      <button
        onClick={() => onFinish(roomId, resultats || undefined)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        Examen terminé — Notifier le patient
      </button>
    </div>
  )
}

// ── HospDischargePanel ────────────────────────────────────────────────────────

interface DischargeMed { nom: string; dosage: string; frequence: string; duree: string }

function HospDischargePanel({ hospId, onDischarge, loading }: { hospId: number; onDischarge: (id: number, data: any) => Promise<void>; loading: boolean }) {
  const [meds, setMeds] = useState<DischargeMed[]>([])
  const [consignes, setConsignes] = useState('')
  const [recommandations, setRecommandations] = useState('')
  const [rdvControle, setRdvControle] = useState('')
  const [reposJours, setReposJours] = useState('')
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  function addMed() { setMeds(m => [...m, { nom: '', dosage: '', frequence: 'Matin et soir', duree: '7 jours' }]) }
  function removeMed(i: number) { setMeds(m => m.filter((_, j) => j !== i)) }
  function updateMed(i: number, field: keyof DischargeMed, val: string) {
    setMeds(m => m.map((med, j) => j === i ? { ...med, [field]: val } : med))
  }

  async function handleSubmit() {
    try {
      await onDischarge(hospId, {
        medicaments: meds.filter(m => m.nom.trim()).map(m => ({ nom: m.nom, dosage: m.dosage, frequence: m.frequence, duree: m.duree })),
        consignes: consignes || undefined,
        recommandations: recommandations || undefined,
        rdv_controle: rdvControle || undefined,
        repos_jours: reposJours ? parseInt(reposJours) : undefined,
        notes: notes || undefined,
      })
    } catch { /* handled by parent */ }
  }

  return (
    <div className="mt-3 border border-rose-200 rounded-xl bg-rose-50 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-bold text-rose-700 flex items-center gap-2">
          <LogOut className="w-3.5 h-3.5" /> Marquer sorti + Ordonnance de sortie
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-rose-400" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-rose-100">
          {/* Médicaments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-rose-700">Médicaments prescrits</p>
              <button onClick={addMed} className="text-xs text-rose-600 font-bold hover:text-rose-800">+ Ajouter</button>
            </div>
            {meds.length === 0 && <p className="text-xs text-gray-400 italic">Aucun médicament — cliquez sur + Ajouter</p>}
            {meds.map((med, i) => (
              <div key={i} className="bg-white border border-rose-100 rounded-xl p-2 space-y-1.5 mb-2">
                <div className="flex gap-2">
                  <input className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Nom du médicament" value={med.nom} onChange={e => updateMed(i, 'nom', e.target.value)} />
                  <button onClick={() => removeMed(i)} className="text-xs text-red-400 hover:text-red-600 font-bold px-1">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Dosage" value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} />
                  <input className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Fréquence" value={med.frequence} onChange={e => updateMed(i, 'frequence', e.target.value)} />
                  <input className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Durée" value={med.duree} onChange={e => updateMed(i, 'duree', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          {/* Repos */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Repos médical (jours)</p>
              <input type="number" min={0} className="w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none" placeholder="0" value={reposJours} onChange={e => setReposJours(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">RDV de contrôle</p>
              <input type="date" className="w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none" value={rdvControle} onChange={e => setRdvControle(e.target.value)} />
            </div>
          </div>
          {/* Consignes */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Consignes de sortie</p>
            <textarea rows={2} className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none resize-none" placeholder="Ex: Éviter l'effort physique pendant 2 semaines..." value={consignes} onChange={e => setConsignes(e.target.value)} />
          </div>
          {/* Recommandations */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Recommandations</p>
            <textarea rows={2} className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none resize-none" placeholder="Ex: Alimentation légère, éviter alcool..." value={recommandations} onChange={e => setRecommandations(e.target.value)} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Valider la sortie & créer l'ordonnance
          </button>
        </div>
      )}
    </div>
  )
}

// ── TAB SALLES ────────────────────────────────────────────────────────────────

type ConsultPanel = 'ordonnance' | 'orientation' | 'hospitalisation' | 'examens' | null

interface MedicamentLine { nom: string; posologie: string; frequence: string; duree: string }

function SallesTab({ services, queueDetails, actionLoading, onNextPatient, onFinishConsultation, onFinishExam, onFinishHosp, onRoomStatus, onStartConsultation, onPatientAbsent, onAddPrescription, onDischargeHosp, onRefresh }: any) {
  const [openPanel, setOpenPanel] = useState<Record<number, ConsultPanel>>({})
  const [prescMeds, setPrescMeds] = useState<Record<number, MedicamentLine[]>>({})
  const [prescNotes, setPrescNotes] = useState<Record<number, string>>({})
  const [prescLoading, setPrescLoading] = useState<number | null>(null)
  const [prescDone, setPrescDone] = useState<number | null>(null)

  const [refData, setRefData] = useState<Record<number, any>>({})
  const [refLoading, setRefLoading] = useState<number | null>(null)
  const [refDone, setRefDone] = useState<number | null>(null)

  const [hospData, setHospData] = useState<Record<number, any>>({})
  const [hospLoading, setHospLoading] = useState<number | null>(null)
  const [hospDone, setHospDone] = useState<number | null>(null)

  const [examData, setExamData] = useState<Record<number, any>>({})
  const [examLoading, setExamLoading] = useState<number | null>(null)
  const [examDone, setExamDone] = useState<number | null>(null)

  const queueByRoom: Record<number, any[]> = {}
  queueDetails.forEach((e: any) => {
    if (!queueByRoom[e.room_id]) queueByRoom[e.room_id] = []
    queueByRoom[e.room_id].push(e)
  })

  function togglePanel(roomId: number, panel: ConsultPanel) {
    setOpenPanel(p => ({ ...p, [roomId]: p[roomId] === panel ? null : panel }))
  }

  function getMeds(roomId: number): MedicamentLine[] {
    return prescMeds[roomId] ?? [{ nom: '', posologie: '', frequence: 'matin et soir', duree: '7 jours' }]
  }
  function setMeds(roomId: number, meds: MedicamentLine[]) {
    setPrescMeds(p => ({ ...p, [roomId]: meds }))
  }
  function updateMed(roomId: number, idx: number, field: keyof MedicamentLine, val: string) {
    const meds = [...getMeds(roomId)]
    meds[idx] = { ...meds[idx], [field]: val }
    setMeds(roomId, meds)
  }
  function addMed(roomId: number) {
    setMeds(roomId, [...getMeds(roomId), { nom: '', posologie: '', frequence: '1x/jour', duree: '7 jours' }])
  }
  function removeMed(roomId: number, idx: number) {
    setMeds(roomId, getMeds(roomId).filter((_, i) => i !== idx))
  }

  async function submitPrescription(roomId: number, apptId: number) {
    const meds = getMeds(roomId).filter(m => m.nom.trim())
    if (!meds.length) return alert('Ajoutez au moins un médicament.')
    setPrescLoading(roomId)
    try {
      await onAddPrescription(apptId, { medicaments: meds, notes: prescNotes[roomId] || undefined })
      setPrescDone(roomId)
      setOpenPanel(p => ({ ...p, [roomId]: null }))
      setTimeout(() => setPrescDone(null), 3000)
    } catch { /* onAddPrescription already alerts */ }
    finally { setPrescLoading(null) }
  }

  async function submitReferral(roomId: number, apptId: number) {
    const d = refData[roomId] ?? {}
    if (!d.specialite || !d.motif) return alert('Spécialité et motif requis.')
    setRefLoading(roomId)
    try {
      await medical.refer(apptId, {
        specialite: d.specialite,
        motif: d.motif,
        urgence: d.urgence || 'normal',
        commentaire: d.notes,
      })
      setRefDone(roomId)
      setOpenPanel(p => ({ ...p, [roomId]: null }))
      setTimeout(() => setRefDone(null), 3000)
      onRefresh()
    } catch (e: any) { alert(e.message) }
    finally { setRefLoading(null) }
  }

  async function submitHospitalisation(roomId: number, apptId: number) {
    const d = hospData[roomId] ?? {}
    if (!d.motif || !d.service_destination) return alert('Motif et service requis.')
    setHospLoading(roomId)
    try {
      await medical.hospitalize(apptId, { motif: d.motif, service: d.service_destination, duree_estimee: d.duree_estimee, commentaire: d.notes })
      setHospDone(roomId)
      setOpenPanel(p => ({ ...p, [roomId]: null }))
      setTimeout(() => setHospDone(null), 3000)
    } catch (e: any) { alert(e.message) }
    finally { setHospLoading(null) }
  }

  async function submitExamens(roomId: number, apptId: number) {
    const d = examData[roomId] ?? {}
    if (!d.examens) return alert('Décrivez les examens requis.')
    setExamLoading(roomId)
    try {
      await medical.requestExams(apptId, { examens: [d.examens], urgence: d.urgence ? 'oui' : undefined, motif: d.notes })
      setExamDone(roomId)
      setOpenPanel(p => ({ ...p, [roomId]: null }))
      setTimeout(() => setExamDone(null), 3000)
    } catch (e: any) { alert(e.message) }
    finally { setExamLoading(null) }
  }

  return (
    <div className="space-y-6">
      {services.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun service configuré</p>
          <p className="text-xs text-gray-400 mt-1">Les services sont créés automatiquement au démarrage</p>
        </div>
      )}

      {services.map((svc: any) => (
        <div key={svc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              {svc.nom}
              {svc.specialite && svc.specialite !== svc.nom && (
                <span className="text-xs text-indigo-500 font-normal">· {svc.specialite}</span>
              )}
            </h3>
          </div>

          <div className="divide-y divide-gray-50">
            {svc.rooms.map((room: any) => {
              const s = STATUT_ROOM[room.statut] ?? STATUT_ROOM.libre
              const queue = queueByRoom[room.id] ?? []
              const called = queue.find((e: any) => e.statut === 'appele')
              const inConsultation = queue.find((e: any) => e.statut === 'en_consultation')
              const waiting = queue.filter((e: any) => e.statut === 'en_attente')
              const panel = openPanel[room.id] ?? null
              const activeAppt = inConsultation ?? called
              const activeEntryType = inConsultation?.entry_type || called?.entry_type || 'consultation'
              const isExamRoom = activeEntryType === 'exam'
              const isHospRoom = activeEntryType === 'hospitalization'

              return (
                <div key={room.id} className="px-5 py-4">
                  {/* ── Room header ── */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${s.color}`}>
                        <DoorOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 text-sm">{room.nom}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${s.color}`}>{s.label}</span>
                          {inConsultation && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                              {isExamRoom ? 'Examen en cours' : isHospRoom ? 'Patient hospitalisé' : 'En consultation'}
                            </span>
                          )}
                          {called && !inConsultation && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold animate-pulse">Appelé</span>
                          )}
                        </div>
                        {room.medecin_nom && (
                          <p className="text-xs text-gray-400">Dr. {room.medecin_nom}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {room.en_attente > 0 ? `${room.en_attente} patient(s) en attente` : 'File vide'}
                          {room.eta_min > 0 && ` · ~${room.eta_min} min`}
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {/* Room status dropdown */}
                      <select
                        className="text-xs border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-400 bg-white"
                        value={room.statut}
                        onChange={e => onRoomStatus(room.id, e.target.value)}
                        disabled={actionLoading === `room-${room.id}`}
                      >
                        <option value="libre">Libre</option>
                        <option value="occupee">Occupée</option>
                        <option value="pause">Pause</option>
                        <option value="fermee">Fermée</option>
                      </select>

                      {/* Next patient */}
                      {!called && !inConsultation && (
                        <button
                          onClick={() => onNextPatient(room.id)}
                          disabled={actionLoading === `next-${room.id}` || room.statut === 'fermee'}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          {actionLoading === `next-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
                          Patient suivant
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Called patient banner ── */}
                  {called && !inConsultation && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5" /> Patient appelé
                          </p>
                          <p className="text-sm font-bold text-blue-900 mt-0.5">
                            {called.patient_nom_real ?? called.patient_nom} {called.patient_prenom}
                          </p>
                          {called.ticket_numero && (
                            <p className="text-xs text-blue-600 font-mono">#{called.ticket_numero}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-500 mb-1">Temps restant</p>
                          {called.deadline ? (
                            <Countdown deadline={called.deadline} />
                          ) : (
                            <span className="font-mono font-bold text-sm text-blue-700">5:00</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onStartConsultation(room.id)}
                          disabled={actionLoading === `start-${room.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          {actionLoading === `start-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                          Patient présent
                        </button>
                        <button
                          onClick={() => onPatientAbsent(room.id)}
                          disabled={actionLoading === `absent-${room.id}`}
                          className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          {actionLoading === `absent-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Absent
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── In-consultation panel ── */}
                  {inConsultation && (
                    <div className={`mt-3 rounded-xl p-3 border ${isExamRoom ? 'bg-purple-50 border-purple-200' : isHospRoom ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className={`text-xs font-bold flex items-center gap-1.5 ${isExamRoom ? 'text-purple-700' : isHospRoom ? 'text-rose-700' : 'text-amber-700'}`}>
                            {isExamRoom ? <><FlaskConical className="w-3.5 h-3.5" /> Examen en cours</> : isHospRoom ? <><Bed className="w-3.5 h-3.5" /> Patient hospitalisé</> : <><Stethoscope className="w-3.5 h-3.5" /> Consultation en cours</>}
                          </p>
                          <p className={`text-sm font-bold mt-0.5 ${isExamRoom ? 'text-purple-900' : isHospRoom ? 'text-rose-900' : 'text-amber-900'}`}>
                            {inConsultation.patient_nom_real ?? inConsultation.patient_nom} {inConsultation.patient_prenom}
                          </p>
                          {isExamRoom && inConsultation.exam_liste && (
                            <p className="text-xs text-purple-600 mt-0.5">
                              {(() => { try { const e = typeof inConsultation.exam_liste === 'string' ? JSON.parse(inConsultation.exam_liste) : inConsultation.exam_liste; return Array.isArray(e) ? e.slice(0,3).join(', ') : String(e) } catch { return '' } })()}
                            </p>
                          )}
                          {isHospRoom && (inConsultation.hosp_service || inConsultation.hosp_motif) && (
                            <p className="text-xs text-rose-600 mt-0.5">{inConsultation.hosp_service || inConsultation.hosp_motif}</p>
                          )}
                          {inConsultation.ticket_numero && (
                            <p className={`text-xs font-mono ${isExamRoom ? 'text-purple-500' : isHospRoom ? 'text-rose-500' : 'text-amber-600'}`}>#{inConsultation.ticket_numero}</p>
                          )}
                        </div>
                        {prescDone === room.id && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Ordonnance envoyée
                          </span>
                        )}
                        {refDone === room.id && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Orientation envoyée
                          </span>
                        )}
                        {hospDone === room.id && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Hospitalisation enregistrée
                          </span>
                        )}
                        {examDone === room.id && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Examens demandés
                          </span>
                        )}
                      </div>

                      {/* Action buttons — context-sensitive */}
                      {isExamRoom ? (
                        <ExamFinishPanel
                          roomId={room.id}
                          onFinish={onFinishExam}
                          loading={actionLoading === `finish-${room.id}`}
                        />
                      ) : isHospRoom && inConsultation.hospitalization_id ? (
                        <HospDischargePanel
                          hospId={inConsultation.hospitalization_id}
                          onDischarge={onDischargeHosp}
                          loading={actionLoading === `discharge-${inConsultation.hospitalization_id}`}
                        />
                      ) : isHospRoom ? (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onFinishHosp(room.id)}
                            disabled={actionLoading === `finish-${room.id}`}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors ml-auto"
                          >
                            {actionLoading === `finish-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Fin d'hospitalisation
                          </button>
                        </div>
                      ) : (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {([
                          { key: 'ordonnance', label: 'Ordonnance', icon: FileText, color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200' },
                          { key: 'orientation', label: 'Orienter', icon: ArrowUpRight, color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                          { key: 'hospitalisation', label: 'Hospitaliser', icon: Bed, color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
                          { key: 'examens', label: 'Examens', icon: FlaskConical, color: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
                        ] as { key: ConsultPanel; label: string; icon: any; color: string }[]).map(({ key, label, icon: Icon, color }) => (
                          <button
                            key={key}
                            onClick={() => togglePanel(room.id, key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                              panel === key ? color.replace('hover:', '') : color
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => onFinishConsultation(room.id)}
                          disabled={actionLoading === `finish-${room.id}`}
                          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors ml-auto"
                        >
                          {actionLoading === `finish-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Terminer
                        </button>
                      </div>
                      )}

                      {/* ── Ordonnance form ── */}
                      <AnimatePresence>
                        {panel === 'ordonnance' && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="mt-3 border-t border-amber-200 pt-3 space-y-2">
                              <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Ordonnance médicale</p>
                              {getMeds(room.id).map((med, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-violet-100 p-2 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400"
                                      placeholder="Médicament"
                                      value={med.nom}
                                      onChange={e => updateMed(room.id, idx, 'nom', e.target.value)}
                                    />
                                    {getMeds(room.id).length > 1 && (
                                      <button onClick={() => removeMed(room.id, idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <input
                                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400"
                                      placeholder="Posologie"
                                      value={med.posologie}
                                      onChange={e => updateMed(room.id, idx, 'posologie', e.target.value)}
                                    />
                                    <select
                                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400 bg-white"
                                      value={med.frequence}
                                      onChange={e => updateMed(room.id, idx, 'frequence', e.target.value)}
                                    >
                                      <option value="matin">Matin</option>
                                      <option value="matin et soir">Matin et soir</option>
                                      <option value="3x/jour">3x/jour</option>
                                      <option value="1x/semaine">1x/semaine</option>
                                      <option value="si nécessaire">Si nécessaire</option>
                                    </select>
                                    <select
                                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400 bg-white"
                                      value={med.duree}
                                      onChange={e => updateMed(room.id, idx, 'duree', e.target.value)}
                                    >
                                      <option value="3 jours">3 jours</option>
                                      <option value="5 jours">5 jours</option>
                                      <option value="7 jours">7 jours</option>
                                      <option value="10 jours">10 jours</option>
                                      <option value="1 mois">1 mois</option>
                                      <option value="3 mois">3 mois</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                              <button onClick={() => addMed(room.id)} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Ajouter un médicament
                              </button>
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 resize-none"
                                rows={2}
                                placeholder="Notes (optionnel)"
                                value={prescNotes[room.id] ?? ''}
                                onChange={e => setPrescNotes(p => ({ ...p, [room.id]: e.target.value }))}
                              />
                              <button
                                onClick={() => submitPrescription(room.id, inConsultation.appointment_id)}
                                disabled={prescLoading === room.id}
                                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                              >
                                {prescLoading === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                Envoyer l'ordonnance + rappels MediA
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Orientation form ── */}
                      <AnimatePresence>
                        {panel === 'orientation' && (() => {
                          const urgNiv = refData[room.id]?.urgence || 'normal'
                          const isUrgent = urgNiv === 'urgent'
                          return (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="mt-3 border-t border-amber-200 pt-3 space-y-2">
                                <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> Orientation vers un spécialiste</p>

                                {/* Urgence selector — 2 levels only */}
                                <div className="flex gap-2">
                                  {[
                                    { v: 'normal', label: 'Normal',    cls: 'border-gray-300 text-gray-600 ring-gray-400' },
                                    { v: 'urgent', label: '⚠ Urgent', cls: 'border-amber-400 text-amber-700 bg-amber-50 ring-amber-400' },
                                  ].map(({ v, label, cls }) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => setRefData(p => ({ ...p, [room.id]: { ...p[room.id], urgence: v } }))}
                                      className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all ${urgNiv === v ? cls + ' ring-2 ring-offset-1' : 'border-gray-200 text-gray-400 bg-white'}`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>

                                {/* Urgent banner */}
                                {isUrgent && (
                                  <div className="rounded-xl p-2.5 text-xs font-semibold flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700">
                                    ⚠ Prise en charge immédiate — la réception attribuera une salle disponible sans planification.
                                  </div>
                                )}

                                <select
                                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white"
                                  value={refData[room.id]?.specialite ?? ''}
                                  onChange={e => setRefData(p => ({ ...p, [room.id]: { ...p[room.id], specialite: e.target.value } }))}
                                >
                                  <option value="">Choisir la spécialité</option>
                                  {['Cardiologie','Dermatologie','Gynécologie','Neurologie','Ophtalmologie','Orthopédie','Pédiatrie','Psychiatrie','Radiologie','Urologie'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <textarea
                                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                                  rows={2}
                                  placeholder="Motif de l'orientation *"
                                  value={refData[room.id]?.motif ?? ''}
                                  onChange={e => setRefData(p => ({ ...p, [room.id]: { ...p[room.id], motif: e.target.value } }))}
                                />
                                {!isUrgent && (
                                  <textarea
                                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                                    rows={2}
                                    placeholder="Résumé médical / observations (optionnel)"
                                    value={refData[room.id]?.notes ?? ''}
                                    onChange={e => setRefData(p => ({ ...p, [room.id]: { ...p[room.id], notes: e.target.value } }))}
                                  />
                                )}

                                <button
                                  onClick={() => submitReferral(room.id, inConsultation.appointment_id)}
                                  disabled={refLoading === room.id}
                                  className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                  {refLoading === room.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <ArrowUpRight className="w-3.5 h-3.5" />}
                                  {isUrgent ? 'Orienter en urgence' : 'Terminer & Orienter'}
                                </button>
                              </div>
                            </motion.div>
                          )
                        })()}
                      </AnimatePresence>

                      {/* ── Hospitalisation form ── */}
                      <AnimatePresence>
                        {panel === 'hospitalisation' && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="mt-3 border-t border-amber-200 pt-3 space-y-2">
                              <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5"><Bed className="w-3.5 h-3.5" /> Demande d'hospitalisation</p>
                              <select
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 bg-white"
                                value={hospData[room.id]?.service_destination ?? ''}
                                onChange={e => setHospData(p => ({ ...p, [room.id]: { ...p[room.id], service_destination: e.target.value } }))}
                              >
                                <option value="">Service de destination</option>
                                {['Médecine générale','Chirurgie','Maternité','Pédiatrie','Réanimation','Cardiologie','Neurologie','Oncologie'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 resize-none"
                                rows={2}
                                placeholder="Motif d'hospitalisation *"
                                value={hospData[room.id]?.motif ?? ''}
                                onChange={e => setHospData(p => ({ ...p, [room.id]: { ...p[room.id], motif: e.target.value } }))}
                              />
                              <input
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400"
                                placeholder="Durée estimée (ex: 3 jours)"
                                value={hospData[room.id]?.duree_estimee ?? ''}
                                onChange={e => setHospData(p => ({ ...p, [room.id]: { ...p[room.id], duree_estimee: e.target.value } }))}
                              />
                              <button
                                onClick={() => submitHospitalisation(room.id, inConsultation.appointment_id)}
                                disabled={hospLoading === room.id}
                                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                              >
                                {hospLoading === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bed className="w-3.5 h-3.5" />}
                                Enregistrer l'hospitalisation
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Examens form ── */}
                      <AnimatePresence>
                        {panel === 'examens' && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="mt-3 border-t border-amber-200 pt-3 space-y-2">
                              <p className="text-xs font-bold text-pink-700 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Demande d'examens</p>
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-400 resize-none"
                                rows={3}
                                placeholder="Examens requis (NFS, glycémie, radiographie...) *"
                                value={examData[room.id]?.examens ?? ''}
                                onChange={e => setExamData(p => ({ ...p, [room.id]: { ...p[room.id], examens: e.target.value } }))}
                              />
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox"
                                  checked={examData[room.id]?.urgence ?? false}
                                  onChange={e => setExamData(p => ({ ...p, [room.id]: { ...p[room.id], urgence: e.target.checked } }))}
                                  className="rounded"
                                />
                                Urgence
                              </label>
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-400 resize-none"
                                rows={2}
                                placeholder="Notes complémentaires"
                                value={examData[room.id]?.notes ?? ''}
                                onChange={e => setExamData(p => ({ ...p, [room.id]: { ...p[room.id], notes: e.target.value } }))}
                              />
                              <button
                                onClick={() => submitExamens(room.id, inConsultation.appointment_id)}
                                disabled={examLoading === room.id}
                                className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                              >
                                {examLoading === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                                Demander les examens
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── Waiting queue list ── */}
                  {waiting.length > 0 && (
                    <div className="mt-3">
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                          <List className="w-3.5 h-3.5" /> File d'attente
                        </p>
                        {waiting.map((e: any, i: number) => (
                          <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 flex-shrink-0">{i + 1}</span>
                            <span className="font-medium">{e.patient_nom_real ?? e.patient_nom} {e.patient_prenom}</span>
                            {e.ticket_numero && <span className="font-mono text-gray-400">#{e.ticket_numero}</span>}
                            <span className="text-gray-400 ml-auto">~{(i + 1) * 15} min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── TAB MÉDECINS ──────────────────────────────────────────────────────────────

function MedecinsTab({ services }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
        <p className="font-bold mb-1">Gestion des médecins</p>
        <p>Les médecins peuvent être assignés aux salles via l'onglet Salles. La gestion complète des profils médecins est disponible dans les paramètres.</p>
      </div>
      {services.map((svc: any) => (
        <div key={svc.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="font-bold text-gray-800 mb-3">{svc.nom}</p>
          <div className="space-y-2">
            {svc.rooms.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-gray-700">{r.nom}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {r.medecin_nom ? `Dr. ${r.medecin_nom}` : 'Non assigné'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── TAB HISTORIQUE ────────────────────────────────────────────────────────────

function HistoriqueTab({ appts, loading, onRefresh }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-800">Historique des consultations</h2>
        <button onClick={onRefresh} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : appts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun historique disponible</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {appts.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {a.patient_prenom ?? '—'} {a.patient_nom ?? ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {a.service} · {a.date_rdv} · {a.heure_rdv?.slice(0,5)}
                    {a.ticket_numero && ` · #${a.ticket_numero}`}
                  </p>
                </div>
                <Badge status={a.statut} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
