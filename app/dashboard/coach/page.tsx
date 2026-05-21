'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { wallet, personalCare } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Wallet as WalletIcon, CheckCircle, Loader2,
  MessageCircle, RefreshCw, Star, Crown, Calendar,
  Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp,
  Shield, Target, Activity,
} from 'lucide-react'

function getInitials(prenom = '', nom = '') {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

const GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500', 'from-indigo-500 to-blue-700',
]
function grad(id: number) { return GRADIENTS[id % GRADIENTS.length] }

export default function CoachDashboard() {
  const { user } = useAuth()
  const [walletData, setWalletData] = useState<any>(null)
  const [providerDash, setProviderDash] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [handlingRequest, setHandlingRequest] = useState<number | null>(null)
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null)
  const [settlingId, setSettlingId] = useState<number | null>(null)
  const [schedulingMeetingFor, setSchedulingMeetingFor] = useState<number | null>(null)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingHeure, setMeetingHeure] = useState('09:00')
  const [schedulingMeeting, setSchedulingMeeting] = useState<number | null>(null)
  const [providerArrivingId, setProviderArrivingId] = useState<number | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      wallet.me(),
      personalCare.providerDashboard(),
      personalCare.providerPatients(),
      personalCare.providerRequests(),
    ]).then(([w, dash, pats, reqs]) => {
      if (w.status === 'fulfilled') setWalletData(w.value)
      if (dash.status === 'fulfilled') setProviderDash(dash.value)
      if (pats.status === 'fulfilled') setPatients(pats.value)
      if (reqs.status === 'fulfilled') setPendingRequests(reqs.value)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()
    socket.on('personal_care:update', loadData)
    return () => { socket.off('personal_care:update', loadData) }
  }, [user?.id, loadData])

  async function handleAccept(id: number) {
    setHandlingRequest(id)
    try {
      await personalCare.acceptRequest(id)
      setPendingRequests(prev => prev.filter(r => r.id !== id))
    } catch {}
    finally { setHandlingRequest(null) }
  }

  async function handleReject(id: number) {
    setHandlingRequest(id)
    try {
      await personalCare.rejectRequest(id)
      setPendingRequests(prev => prev.filter(r => r.id !== id))
    } catch {}
    finally { setHandlingRequest(null) }
  }

  async function handleScheduleMeeting(assignmentId: number) {
    if (!meetingDate || !meetingHeure) { alert('Choisissez une date et une heure.'); return }
    setSchedulingMeeting(assignmentId)
    try {
      await personalCare.scheduleMeeting(assignmentId, { meeting_date: meetingDate, meeting_heure: meetingHeure })
      setSchedulingMeetingFor(null)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setSchedulingMeeting(null) }
  }

  async function handleProviderArrives(assignmentId: number) {
    setProviderArrivingId(assignmentId)
    try {
      await personalCare.providerArrives(assignmentId)
      loadData()
    } catch (e: any) { alert(e.message || 'Erreur') }
    finally { setProviderArrivingId(null) }
  }

  async function handleSettle(assignmentId: number) {
    setSettlingId(assignmentId)
    try {
      await personalCare.settle(assignmentId)
      loadData()
    } catch {}
    finally { setSettlingId(null) }
  }

  const coachName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`
  const solde = walletData?.solde ?? 0
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 py-10 px-4 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-300/20 rounded-full blur-3xl" />
          <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-violet-300" />
                <p className="text-white/70 text-sm font-medium">Espace Coach Santé</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{coachName}</h1>
              <p className="text-white/60 text-sm mt-1">{today}</p>
              {pendingRequests.length > 0 && (
                <span className="inline-flex items-center gap-1.5 mt-3 text-xs bg-amber-400/80 rounded-full px-3 py-1 font-bold animate-pulse">
                  🔔 {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
                </span>
              )}
            </div>

            {/* Wallet */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 self-start sm:self-auto">
              <WalletIcon className="w-5 h-5 text-violet-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-white/60">Portefeuille</p>
                <p className="text-lg font-extrabold">{solde.toLocaleString('fr-FR')} <span className="text-sm font-normal text-white/70">F</span></p>
              </div>
              <Link href="/portefeuille" className="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 transition-colors font-semibold">
                Voir
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Stats */}
          {providerDash && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Patients actifs', value: String(providerDash.nb_patients_actifs ?? 0), sub: 'en suivi', icon: Users, grad: 'from-violet-500 to-purple-600' },
                { label: 'En séquestre', value: `${(providerDash.escrow_total ?? 0).toLocaleString('fr-FR')} F`, sub: 'bloqué', icon: Shield, grad: 'from-amber-500 to-orange-500' },
                { label: 'Libéré', value: `${(providerDash.revenu_net ?? 0).toLocaleString('fr-FR')} F`, sub: 'net (après 15%)', icon: TrendingUp, grad: 'from-emerald-500 to-teal-500' },
                { label: 'À valider', value: String(providerDash.seances_a_valider ?? 0), sub: 'séances', icon: AlertCircle, grad: 'from-rose-500 to-pink-500' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Demandes en attente ── */}
          <AnimatePresence>
            {pendingRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-base">🔔</div>
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Sora' }}>Demandes de coaching</h2>
                  <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-extrabold text-sm">{getInitials(req.prenom, req.nom)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{req.prenom} {req.nom}</p>
                          <p className="text-xs text-gray-500">{req.email}</p>
                          {req.telephone && <p className="text-xs text-gray-500">{req.telephone}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Le {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {req.notes && (
                        <div className="bg-white rounded-lg p-2.5 mb-3 border border-amber-100">
                          <p className="text-xs text-gray-600 italic">"{req.notes}"</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={handlingRequest === req.id}
                          className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {handlingRequest === req.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Refuser'}
                        </button>
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={handlingRequest === req.id}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {handlingRequest === req.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '✓ Accepter'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Patients actifs ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Sora' }}>
                <span className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-violet-600" />
                </span>
                Patients en suivi
              </h2>
              <button onClick={loadData} className="p-1.5 rounded-full hover:bg-gray-100">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-500 text-sm">Aucun patient en suivi actif</p>
                <p className="text-xs text-gray-400 mt-1">Les demandes acceptées apparaîtront ici une fois payées</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((p) => {
                  const isExpanded = expandedPatient === p.id
                  const isSchedulingThis = schedulingMeetingFor === p.id
                  const todaySessions = p.sessions_today ?? []
                  const stats = p.sessions_stats ?? {}
                  const escrow = p.escrow ?? {}
                  const isFinished = p.statut === 'actif' && new Date(p.date_fin) < new Date()
                  const patientName = `${p.patient.prenom} ${p.patient.nom}`

                  return (
                    <div key={p.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        onClick={() => setExpandedPatient(isExpanded ? null : p.id)}
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${grad(p.patient_id)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-sm font-extrabold">{getInitials(p.patient.prenom, p.patient.nom)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{patientName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.statut === 'accepted' && 'Accepté — RDV initial à fixer'}
                            {p.statut === 'meeting_scheduled' && `RDV : ${p.meeting_date ? new Date(p.meeting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}${p.meeting_heure ? ` à ${p.meeting_heure}` : ''}`}
                            {p.statut === 'meeting_done' && 'RDV effectué — En attente paiement'}
                            {p.statut === 'actif' && `${stats.effectuees ?? 0}/${stats.total ?? 0} séances · ${(escrow.montant_total ?? 0).toLocaleString('fr-FR')} F`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.statut === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                            p.statut === 'meeting_scheduled' ? 'bg-blue-50 text-blue-700' :
                            p.statut === 'meeting_done' ? 'bg-teal-50 text-teal-700' :
                            'bg-violet-50 text-violet-700'
                          }`}>
                            {p.statut === 'accepted' ? 'Accepté' :
                             p.statut === 'meeting_scheduled' ? 'RDV fixé' :
                             p.statut === 'meeting_done' ? 'RDV fait' : 'Actif'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100"
                          >
                            <div className="p-4 space-y-3">

                              {/* Contact */}
                              {p.patient.email && (
                                <div className="flex gap-2 flex-wrap">
                                  <a href={`mailto:${p.patient.email}`} className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors font-medium text-gray-700">
                                    <MessageCircle className="w-3.5 h-3.5" /> {p.patient.email}
                                  </a>
                                </div>
                              )}

                              {/* ACCEPTED: schedule initial meeting */}
                              {p.statut === 'accepted' && (
                                isSchedulingThis ? (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                                    <p className="text-xs font-bold text-blue-800">Fixer le rendez-vous initial</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] text-gray-500 font-semibold">Date</label>
                                        <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                                          min={new Date().toISOString().slice(0,10)}
                                          className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-gray-500 font-semibold">Heure</label>
                                        <select value={meetingHeure} onChange={e => setMeetingHeure(e.target.value)}
                                          className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400">
                                          {['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00'].map(h => (
                                            <option key={h} value={h}>{h}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => setSchedulingMeetingFor(null)}
                                        className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                                        Annuler
                                      </button>
                                      <button onClick={() => handleScheduleMeeting(p.id)} disabled={schedulingMeeting === p.id}
                                        className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                                        {schedulingMeeting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        Confirmer le RDV
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => { setSchedulingMeetingFor(p.id); setMeetingDate(''); setMeetingHeure('09:00') }}
                                    className="w-full py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Fixer le rendez-vous initial
                                  </button>
                                )
                              )}

                              {/* MEETING SCHEDULED: mark arrival + reschedule */}
                              {p.statut === 'meeting_scheduled' && (
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500 flex gap-3">
                                    <span className={p.meeting_patient_arrived ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                                      {p.meeting_patient_arrived ? '✓ Patient présent' : '○ Patient absent'}
                                    </span>
                                    <span className={p.meeting_provider_arrived ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                                      {p.meeting_provider_arrived ? '✓ Vous étiez présent' : '○ Votre présence'}
                                    </span>
                                  </div>
                                  {!p.meeting_provider_arrived ? (
                                    <button onClick={() => handleProviderArrives(p.id)} disabled={providerArrivingId === p.id}
                                      className="w-full py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                                      {providerArrivingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                      ✓ J'étais présent au rendez-vous
                                    </button>
                                  ) : !p.meeting_patient_arrived ? (
                                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 text-center font-semibold">En attente que le patient confirme sa présence</p>
                                  ) : null}
                                  {isSchedulingThis ? (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                                      <p className="text-xs font-bold text-blue-800">Modifier le rendez-vous</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] text-gray-500 font-semibold">Date</label>
                                          <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                                            min={new Date().toISOString().slice(0,10)}
                                            className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-gray-500 font-semibold">Heure</label>
                                          <select value={meetingHeure} onChange={e => setMeetingHeure(e.target.value)}
                                            className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400">
                                            {['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00'].map(h => (
                                              <option key={h} value={h}>{h}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => setSchedulingMeetingFor(null)}
                                          className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                                          Annuler
                                        </button>
                                        <button onClick={() => handleScheduleMeeting(p.id)} disabled={schedulingMeeting === p.id}
                                          className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                                          {schedulingMeeting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                          Modifier
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setSchedulingMeetingFor(p.id); setMeetingDate(''); setMeetingHeure('09:00') }}
                                      className="w-full py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                                      Modifier la date du RDV
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* MEETING DONE: waiting for patient */}
                              {p.statut === 'meeting_done' && (
                                <div className="bg-teal-50 border border-teal-100 rounded-xl p-2.5">
                                  <p className="text-xs text-teal-700 font-semibold">🎉 Réunion confirmée — En attente du paiement de {patientName}</p>
                                </div>
                              )}

                              {/* ACTIF: session stats */}
                              {p.statut === 'actif' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { label: 'Début', value: p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—' },
                                      { label: 'Fin', value: p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—' },
                                      { label: 'Séances', value: `${stats.effectuees ?? 0}/${stats.total ?? 0}` },
                                      { label: 'Séquestre', value: `${(escrow.montant_total ?? 0).toLocaleString('fr-FR')} F` },
                                    ].map(d => (
                                      <div key={d.label} className="bg-gray-50 rounded-xl p-2.5">
                                        <p className="text-[10px] text-gray-400 mb-0.5">{d.label}</p>
                                        <p className="text-xs font-bold text-gray-800">{d.value}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {todaySessions.length > 0 && (
                                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5">
                                      <p className="text-xs font-bold text-sky-700">📅 Séance aujourd'hui à {todaySessions[0].heure_debut?.slice(0,5)}</p>
                                      <p className="text-[10px] text-sky-500 mt-0.5">Le patient valide lui-même sa séance</p>
                                    </div>
                                  )}

                                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs font-bold text-violet-800">Séquestre</p>
                                        <p className="text-xs text-violet-600 mt-0.5">
                                          {(escrow.montant_total ?? 0).toLocaleString('fr-FR')} F total •{' '}
                                          {(escrow.montant_libere ?? 0).toLocaleString('fr-FR')} F libéré
                                        </p>
                                        <p className="text-[10px] text-violet-400 mt-0.5">Commission MedMap+ : 15%</p>
                                      </div>
                                      {isFinished && escrow.statut === 'bloque' ? (
                                        <button onClick={() => handleSettle(p.id)} disabled={settlingId === p.id}
                                          className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                                          {settlingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Clôturer & encaisser'}
                                        </button>
                                      ) : escrow.statut === 'libere' ? (
                                        <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" /> Libéré
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
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

          {/* Commission info */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ fontFamily: 'Sora' }}>Politique de règlement MedMap+</h3>
                <ul className="mt-2 space-y-1">
                  {[
                    'Le paiement est mis en séquestre à la réservation',
                    'Libération proportionnelle aux séances validées par les 2 parties',
                    '15% de commission prélevés par MedMap+ sur les séances effectuées',
                    'Remboursement patient pour toute absence non signalée de votre part',
                    "Pénalité de 15% appliquée en cas d'annulation de contrat",
                  ].map((t, i) => (
                    <li key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                      <span className="text-white/40 font-bold flex-shrink-0">{i + 1}.</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
