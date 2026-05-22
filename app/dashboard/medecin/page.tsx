'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ConversationPanel from '@/components/messaging/ConversationPanel'
import { useAuth } from '@/lib/auth-context'
import { appointments, users, wallet, personalCare } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Calendar, Wallet as WalletIcon, CheckCircle, XCircle,
  ChevronRight, Loader2, MapPin, Phone, MessageCircle,
  User, RefreshCw, Stethoscope, Video, Home, ChevronDown,
  ChevronUp, AlertCircle, Star, Crown,
} from 'lucide-react'

const APPT_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  en_attente: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  confirme:   { label: 'Confirmé',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  refuse:     { label: 'Refusé',     color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  annule:     { label: 'Annulé',     color: 'bg-gray-50 text-gray-500 border-gray-200',          dot: 'bg-gray-400' },
  termine:    { label: 'Terminé',    color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
}

type TabFilter = 'all' | 'en_attente' | 'confirme' | 'termine'

export default function MedecinDashboard() {
  const { user } = useAuth()
  const [rdvList, setRdvList] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [chat, setChat] = useState<{ apptId: number; patientUserId: number; patientName: string } | null>(null)
  const [disponible, setDisponible] = useState(true)
  const [providerDash, setProviderDash] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [handlingRequest, setHandlingRequest] = useState<number | null>(null)
  const [schedulingMeetingFor, setSchedulingMeetingFor] = useState<number | null>(null)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingHeure, setMeetingHeure] = useState('09:00')
  const [schedulingMeeting, setSchedulingMeeting] = useState<number | null>(null)
  const [providerArrivingId, setProviderArrivingId] = useState<number | null>(null)

  const loadData = useCallback(() => {
    Promise.allSettled([
      appointments.mine(),
      wallet.me(),
      users.myProfile(),
      personalCare.providerDashboard(),
      personalCare.providerPatients(),
      personalCare.providerRequests(),
    ]).then(([rdv, w, prof, dash, pats, reqs]) => {
      if (rdv.status === 'fulfilled') setRdvList(rdv.value)
      if (w.status === 'fulfilled') setWalletData(w.value)
      if (prof.status === 'fulfilled') {
        setProfile(prof.value?.profile ?? null)
        setDisponible(prof.value?.profile?.disponible ?? true)
      }
      if (dash.status === 'fulfilled') setProviderDash(dash.value)
      if (pats.status === 'fulfilled') setPatients(pats.value)
      if (reqs.status === 'fulfilled') setPendingRequests(reqs.value)
    }).finally(() => setLoading(false))
  }, [])

  async function handleAccept(requestId: number) {
    setHandlingRequest(requestId)
    try {
      await personalCare.acceptRequest(requestId)
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    } catch {}
    finally { setHandlingRequest(null) }
  }

  async function handleReject(requestId: number) {
    setHandlingRequest(requestId)
    try {
      await personalCare.rejectRequest(requestId)
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
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

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()
    socket.on('appointment:new', loadData)
    return () => { socket.off('appointment:new', loadData) }
  }, [user?.id, loadData])

  async function handleStatus(apptId: number, statut: string) {
    setUpdatingId(apptId)
    try {
      await appointments.updateStatus(apptId, statut)
      setRdvList(prev => prev.map(r => r.id === apptId ? { ...r, statut } : r))
    } catch {}
    finally { setUpdatingId(null) }
  }

  const filtered = rdvList.filter(r => {
    if (tab === 'all') return true
    return r.statut === tab
  })

  const newCount = rdvList.filter(r => r.statut === 'en_attente').length
  const confirmedCount = rdvList.filter(r => r.statut === 'confirme').length
  const doneCount = rdvList.filter(r => r.statut === 'termine').length
  const solde = walletData?.solde ?? 0
  const doctorName = `Dr ${user?.prenom ?? ''} ${user?.nom ?? ''}`

  const TABS: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tous', count: rdvList.length },
    { key: 'en_attente', label: 'À valider', count: newCount },
    { key: 'confirme', label: 'Confirmés', count: confirmedCount },
    { key: 'termine', label: 'Terminés', count: doneCount },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative py-10 px-4 text-white overflow-hidden" style={{ minHeight: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/doctor-team.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-950/95 via-blue-900/88 to-indigo-900/60" />
          <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🩺</span>
                <p className="text-white/70 text-sm font-medium">Espace Médecin</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{doctorName}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile?.specialite && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 font-semibold">
                    <Stethoscope className="w-3.5 h-3.5" /> {profile.specialite}
                  </span>
                )}
                {profile?.cabinet && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5" /> {profile.cabinet}
                  </span>
                )}
                {newCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs bg-amber-400/80 rounded-full px-3 py-1 font-bold animate-pulse">
                    🔔 {newCount} RDV à valider
                  </span>
                )}
              </div>
            </div>

            {/* Disponibilité */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 self-start sm:self-auto">
              <div className={`w-3 h-3 rounded-full ${disponible ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <p className="text-sm font-bold">{disponible ? 'Disponible' : 'Indisponible'}</p>
                <p className="text-[11px] text-white/70">{disponible ? 'Accepte des RDV' : 'Aucun RDV'}</p>
              </div>
              <button
                onClick={() => setDisponible(!disponible)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${disponible ? 'bg-emerald-400' : 'bg-white/30'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${disponible ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'À valider', value: loading ? '…' : String(newCount), sub: 'en attente', icon: AlertCircle, grad: 'from-amber-500 to-orange-500' },
              { label: 'Confirmés', value: loading ? '…' : String(confirmedCount), sub: 'planifiés', icon: CheckCircle, grad: 'from-emerald-500 to-teal-500' },
              { label: 'Terminés', value: loading ? '…' : String(doneCount), sub: 'consultations', icon: Star, grad: 'from-sky-500 to-blue-500' },
              { label: 'Solde', value: loading ? '…' : `${solde.toLocaleString('fr-FR')} F`, sub: 'FCFA', icon: WalletIcon, grad: 'from-violet-500 to-purple-500' },
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

          {/* ── Demandes en attente ── */}
          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-base">🔔</span>
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Sora' }}>
                  Demandes en attente
                </h2>
                <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-extrabold text-sm">{req.prenom?.[0]}{req.nom?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{req.prenom} {req.nom}</p>
                        <p className="text-xs text-gray-500">{req.email}</p>
                        {req.telephone && <p className="text-xs text-gray-500">{req.telephone}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          Demande le {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
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
            </div>
          )}

          {/* ── Suivi personnel ── */}
          {(providerDash || patients.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Sora' }}>
                  <span className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">👑</span>
                  Suivi personnel
                </h2>
                {providerDash && (
                  <span className="text-xs text-violet-600 font-semibold">{providerDash.nb_patients_actifs} actif{providerDash.nb_patients_actifs > 1 ? 's' : ''}</span>
                )}
              </div>
              {providerDash && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'En séquestre', value: `${(providerDash.escrow_total || 0).toLocaleString('fr-FR')} F`, color: 'text-violet-600 bg-violet-50' },
                    { label: 'Revenus libérés', value: `${(providerDash.revenu_libere || 0).toLocaleString('fr-FR')} F`, color: 'text-green-600 bg-green-50' },
                    { label: 'Séances aujourd\'hui', value: String(providerDash.seances_aujourd_hui || 0), color: 'text-blue-600 bg-blue-50' },
                    { label: 'Séances totales', value: String(providerDash.seances_effectuees_total || 0), color: 'text-teal-600 bg-teal-50' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                      <p className="text-lg font-extrabold">{s.value}</p>
                      <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {patients.map(p => {
                  const patientName = `${p.patient.prenom} ${p.patient.nom}`
                  const isSchedulingThis = schedulingMeetingFor === p.id

                  return (
                    <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-extrabold">{p.patient.prenom?.[0]}{p.patient.nom?.[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{patientName}</p>
                          <p className="text-xs text-gray-400">
                            {p.statut === 'accepted' && 'Accepté — RDV initial à fixer'}
                            {p.statut === 'meeting_scheduled' && `RDV : ${p.meeting_date ? new Date(p.meeting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}${p.meeting_heure ? ` à ${p.meeting_heure}` : ''}`}
                            {p.statut === 'meeting_done' && 'RDV effectué — En attente du paiement'}
                            {p.statut === 'actif' && `${p.sessions_stats?.effectuees || 0}/${p.sessions_stats?.total || 0} séances · ${(p.escrow?.montant_total || 0).toLocaleString('fr-FR')} F`}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.statut === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                          p.statut === 'meeting_scheduled' ? 'bg-blue-50 text-blue-700' :
                          p.statut === 'meeting_done' ? 'bg-teal-50 text-teal-700' :
                          'bg-violet-50 text-violet-700'
                        }`}>
                          {p.statut === 'accepted' ? 'Accepté' :
                           p.statut === 'meeting_scheduled' ? 'RDV fixé' :
                           p.statut === 'meeting_done' ? 'RDV fait' : 'Actif'}
                        </span>
                      </div>

                      {/* Accepted: schedule meeting */}
                      {p.statut === 'accepted' && (
                        <div>
                          {isSchedulingThis ? (
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
                                <button onClick={() => handleScheduleMeeting(p.id)}
                                  disabled={schedulingMeeting === p.id}
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
                          )}
                        </div>
                      )}

                      {/* Meeting scheduled: provider marks arrival */}
                      {p.statut === 'meeting_scheduled' && (
                        <div>
                          <div className="text-xs text-gray-500 mb-2 flex gap-3">
                            <span className={p.meeting_patient_arrived ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                              {p.meeting_patient_arrived ? '✓ Patient présent' : '○ Patient absent'}
                            </span>
                            <span className={p.meeting_provider_arrived ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                              {p.meeting_provider_arrived ? '✓ Vous étiez présent' : '○ Votre présence'}
                            </span>
                          </div>
                          {!p.meeting_provider_arrived && (
                            <button onClick={() => handleProviderArrives(p.id)}
                              disabled={providerArrivingId === p.id}
                              className="w-full py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {providerArrivingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              ✓ J'étais présent au rendez-vous
                            </button>
                          )}
                          {p.meeting_provider_arrived && !p.meeting_patient_arrived && (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 text-center">En attente de la confirmation du patient</p>
                          )}
                        </div>
                      )}

                      {/* Meeting done: waiting for patient payment */}
                      {p.statut === 'meeting_done' && (
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-2.5">
                          <p className="text-xs text-teal-700 font-semibold">🎉 Réunion confirmée — En attente du paiement par {patientName}</p>
                        </div>
                      )}

                      {/* Active: session stats */}
                      {p.statut === 'actif' && p.sessions_today?.length > 0 && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5">
                          <p className="text-xs text-sky-700 font-semibold">📅 Séance planifiée aujourd'hui à {p.sessions_today[0].heure_debut?.slice(0,5)}</p>
                          <p className="text-[10px] text-sky-500 mt-0.5">Le patient valide lui-même sa séance</p>
                        </div>
                      )}
                    </div>
                  )
                })}
                {patients.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun patient en suivi personnel pour l'instant.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Appointments list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      tab === t.key
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600'
                    }`}
                  >
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 ${
                        tab === t.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>{t.count}</span>
                    )}
                  </button>
                ))}
                <button onClick={loadData} className="ml-auto p-1.5 rounded-full hover:bg-gray-100">
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500 text-sm">Aucun rendez-vous</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filtered.map(rdv => {
                      const st = APPT_STATUS[rdv.statut] ?? APPT_STATUS.en_attente
                      const patientName = [rdv.patient_prenom, rdv.patient_nom].filter(Boolean).join(' ') || 'Patient'
                      const isExpanded = expanded === rdv.id
                      const isUpdating = updatingId === rdv.id

                      return (
                        <div key={rdv.id} className="hover:bg-gray-50/50 transition-colors">
                          <div
                            className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                            onClick={() => setExpanded(isExpanded ? null : rdv.id)}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {patientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {rdv.heure_rdv?.slice(0, 5)}
                                {rdv.service ? ` · ${rdv.service}` : ''}
                                {rdv.type_rdv ? ` · ${rdv.type_rdv}` : ''}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-3">
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <p className="font-semibold text-sm text-gray-800">{patientName}</p>
                                    </div>
                                    {rdv.patient_tel && (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-xs text-gray-600">{rdv.patient_tel}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-sky-50 rounded-xl p-2.5">
                                      <p className="text-xs text-sky-500 font-semibold mb-0.5">Date</p>
                                      <p className="text-sm font-bold text-sky-900">
                                        {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                      </p>
                                    </div>
                                    <div className="bg-sky-50 rounded-xl p-2.5">
                                      <p className="text-xs text-sky-500 font-semibold mb-0.5">Heure</p>
                                      <p className="text-sm font-bold text-sky-900">{rdv.heure_rdv?.slice(0, 5)}</p>
                                    </div>
                                  </div>

                                  {rdv.motif && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Motif</p>
                                      <p className="text-sm text-gray-700">{rdv.motif}</p>
                                    </div>
                                  )}

                                  {rdv.prix && (
                                    <div className="bg-sky-50 rounded-xl px-3 py-2 space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span className="font-bold text-sky-900">Votre honoraire</span>
                                        <span className="font-bold text-sky-700">{Number(rdv.prix).toLocaleString('fr-FR')} FCFA</span>
                                      </div>
                                      <div className="flex justify-between text-xs text-gray-400">
                                        <span>Commission MedMap+ (15% ajouté au client)</span>
                                        <span>+{Math.round(Number(rdv.prix) * 0.15).toLocaleString('fr-FR')} FCFA</span>
                                      </div>
                                      <div className="flex justify-between text-xs font-semibold text-sky-600 border-t border-sky-100 pt-1">
                                        <span>Total débité au patient</span>
                                        <span>{Math.round(Number(rdv.prix) * 1.15).toLocaleString('fr-FR')} FCFA</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => setChat({ apptId: rdv.id, patientUserId: rdv.patient_user_id, patientName })}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-sky-300 hover:text-sky-600 transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> Message
                                    </button>

                                    {rdv.statut === 'en_attente' && (
                                      <>
                                        <button
                                          onClick={() => handleStatus(rdv.id, 'refuse')}
                                          disabled={isUpdating}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                                        >
                                          <XCircle className="w-3.5 h-3.5" /> Refuser
                                        </button>
                                        <button
                                          onClick={() => handleStatus(rdv.id, 'confirme')}
                                          disabled={isUpdating}
                                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all disabled:opacity-50"
                                        >
                                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirmer</>}
                                        </button>
                                      </>
                                    )}

                                    {rdv.statut === 'confirme' && (
                                      <>
                                        {rdv.type_rdv === 'teleconsultation' && (
                                          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white transition-all">
                                            <Video className="w-3.5 h-3.5" /> Téléconsultation
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleStatus(rdv.id, 'termine')}
                                          disabled={isUpdating}
                                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition-all disabled:opacity-50"
                                        >
                                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Terminer'}
                                        </button>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const ticket = await appointments.ticket(rdv.id)
                                              alert(`🎫 Ticket : ${ticket.ticket_id}\nPatient : ${ticket.patient}\nDate : ${ticket.date} à ${ticket.heure?.slice(0,5)}`)
                                            } catch {}
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition-all"
                                        >
                                          🎫 Ticket
                                        </button>
                                      </>
                                    )}
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
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-sky-500 to-blue-600 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-medium">Solde honoraires</p>
                      <p className="text-white text-2xl font-bold mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {loading ? '…' : `${solde.toLocaleString('fr-FR')} F`}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <WalletIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <Link href="/portefeuille" className="block text-center bg-sky-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-sky-700 transition-colors">
                    Voir le portefeuille
                  </Link>
                </div>
              </div>

              {profile && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Mon profil</h3>
                  {[
                    { label: 'Spécialité', value: profile.specialite },
                    { label: 'Cabinet', value: profile.cabinet },
                    { label: 'Expérience', value: profile.experience_ans ? `${profile.experience_ans} ans` : null },
                    { label: 'Tarif', value: profile.tarif ? `${Number(profile.tarif).toLocaleString('fr-FR')} FCFA` : null },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{f.label}</span>
                      <span className="font-semibold text-gray-800">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Accès rapides</h3>
                {[
                  { label: 'Portefeuille', icon: WalletIcon, href: '/portefeuille', color: 'text-emerald-600' },
                  { label: 'Prendre un RDV', icon: Calendar, href: '/appointments', color: 'text-sky-600' },
                ].map((a, i) => (
                  <Link key={i} href={a.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 group">
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {chat && user && (
        <ConversationPanel
          isOpen={!!chat}
          onClose={() => setChat(null)}
          currentUserId={user.id}
          otherUserId={chat.patientUserId}
          otherUserName={chat.patientName}
          contextType="appointment"
          contextId={chat.apptId}
          contextLabel={`RDV #${chat.apptId}`}
        />
      )}
    </div>
  )
}
