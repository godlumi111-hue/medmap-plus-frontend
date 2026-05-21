'use client'
import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { appointments, hospital as hospitalApi } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  CheckCircle, Calendar, Clock, MapPin, User, Building2,
  Download, Share2, ChevronLeft, Shield, Stethoscope,
  Phone, Printer, Bell, Users, DoorOpen, AlertCircle,
  RefreshCw, Loader2,
} from 'lucide-react'

function TicketCountdown({ deadline }: { deadline: string }) {
  const [secsLeft, setSecsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
  )
  useEffect(() => {
    if (secsLeft <= 0) return
    const t = setInterval(() => {
      setSecsLeft(s => {
        const n = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
        if (n <= 0) clearInterval(t)
        return n
      })
    }, 1000)
    return () => clearInterval(t)
  }, [deadline])
  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const expired = secsLeft === 0
  const urgent = secsLeft <= 60 && !expired
  return (
    <div className={`text-center mt-3 p-3 rounded-xl ${expired ? 'bg-red-50 border border-red-200' : urgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-100'}`}>
      <p className={`text-xs font-bold mb-1 ${expired ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-blue-600'}`}>
        {expired ? 'Délai expiré' : 'Temps restant pour vous présenter'}
      </p>
      <p className={`font-mono font-extrabold text-3xl ${expired ? 'text-red-700' : urgent ? 'text-orange-700' : 'text-blue-800'}`}>
        {expired ? '0:00' : `${mins}:${String(secs).padStart(2, '0')}`}
      </p>
      {expired && (
        <p className="text-xs text-red-500 mt-1">Contactez la réception</p>
      )}
    </div>
  )
}

// Simple QR-code visual (SVG-based, no external lib needed)
function QRDisplay({ value }: { value: string }) {
  const hash = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const size = 9
  const cells = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size)
    const col = i % size
    const isBorder = row === 0 || row === size - 1 || col === 0 || col === size - 1
    const isCornerBox = (row < 3 && col < 3) || (row < 3 && col > size - 4) || (row > size - 4 && col < 3)
    if (isBorder || isCornerBox) return true
    return ((hash * (i + 7) * (row + 3)) % 11) < 5
  })

  return (
    <div className="inline-block p-3 bg-white rounded-xl shadow-inner border border-gray-100">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 126 }}>
        {cells.map((filled, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${filled ? 'bg-gray-900' : 'bg-white'}`} />
        ))}
      </div>
    </div>
  )
}

const QUEUE_STATUT_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: 'En file d\'attente', color: 'bg-amber-100 text-amber-700', icon: Users },
  appele:     { label: 'Appelé — présentez-vous !', color: 'bg-blue-100 text-blue-700', icon: Bell },
  en_consultation: { label: 'En consultation', color: 'bg-violet-100 text-violet-700', icon: Stethoscope },
  termine:    { label: 'Terminé', color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
}

const APPT_STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente de confirmation',
  confirme:   'Confirmé',
  refuse:     'Refusé',
  annule:     'Annulé',
  termine:    'Terminé',
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [appt, setAppt] = useState<any>(null)
  const [ticketInfo, setTicketInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [printed, setPrinted] = useState(false)
  const [calledAlert, setCalledAlert] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const [calledDeadline, setCalledDeadline] = useState<string | null>(null)

  const loadTicket = useCallback(async () => {
    try {
      const data = await hospitalApi.myTicket(parseInt(id))
      setAppt(data)
      setTicketInfo(data.queue_info ?? null)
    } catch {
      // Fallback to appointment list
      try {
        const list = await appointments.mine()
        const found = list.find((a: any) => String(a.id) === String(id))
        setAppt(found ?? null)
      } catch {}
    }
  }, [id])

  useEffect(() => {
    loadTicket().finally(() => setLoading(false))
  }, [loadTicket])

  // Socket: listen for queue updates and "patient called"
  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()

    function onPatientCalled(data: any) {
      if (data.appointment_id && String(data.appointment_id) !== String(id)) return
      setCalledAlert(true)
      if (data.deadline) setCalledDeadline(data.deadline)
      setTicketInfo((prev: any) => prev ? { ...prev, statut: 'appele', deadline: data.deadline } : prev)
    }

    function onPatientTimeout(data: any) {
      if (data.appointment_id && String(data.appointment_id) !== String(id)) return
      setCalledAlert(false)
      setTicketInfo((prev: any) => prev ? { ...prev, statut: 'en_attente' } : prev)
    }

    function onQueuePosition(data: any) {
      if (!ticketInfo?.entry_id || data.queue_entry_id !== ticketInfo.entry_id) return
      setTicketInfo((prev: any) => prev ? {
        ...prev,
        personnes_avant: data.position,
        eta_min: data.eta_min,
      } : prev)
    }

    function onApptUpdate(data: any) {
      if (String(data.id) !== String(id)) return
      setAppt((prev: any) => prev ? { ...prev, ...data } : prev)
      if (data.queue_position !== undefined) {
        setTicketInfo((prev: any) => prev ? { ...prev, personnes_avant: data.queue_position } : prev)
      }
    }

    socket.on('patient:called', onPatientCalled)
    socket.on('patient:timeout', onPatientTimeout)
    socket.on('queue:position', onQueuePosition)
    socket.on('appointment:update', onApptUpdate)

    return () => {
      socket.off('patient:called', onPatientCalled)
      socket.off('patient:timeout', onPatientTimeout)
      socket.off('queue:position', onQueuePosition)
      socket.off('appointment:update', onApptUpdate)
    }
  }, [user?.id, id, ticketInfo?.entry_id])

  function handlePrint() {
    setPrinted(true)
    window.print()
    setTimeout(() => setPrinted(false), 2000)
  }

  async function handlePatientConfirm() {
    if (confirmLoading || confirmDone) return
    setConfirmLoading(true)
    try {
      await hospitalApi.patientConfirm(parseInt(id))
      setAppt((prev: any) => prev ? { ...prev, consultation_statut: 'confirmee', paiement_statut: 'libere' } : prev)
      setConfirmDone(true)
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la confirmation')
    } finally {
      setConfirmLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 border-4 border-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!appt || appt.statut === 'refuse' || appt.statut === 'annule') {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-300" />
          </div>
          {!appt ? (
            <>
              <p className="font-bold text-gray-600 text-lg mb-2">Ticket introuvable</p>
              <p className="text-sm text-gray-400 mb-6">Ce ticket n'existe pas ou a expiré.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-600 text-lg mb-2">Ticket non disponible</p>
              <p className="text-sm text-gray-400 mb-6">
                Statut : <strong>{APPT_STATUT_LABELS[appt.statut] ?? appt.statut}</strong>
              </p>
            </>
          )}
          <Link href="/appointments" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Calendar className="w-4 h-4" /> Mes rendez-vous
          </Link>
        </div>
      </div>
    )
  }

  // Pending confirmation screen
  if (appt.statut === 'en_attente') {
    return (
      <div className="min-h-screen bg-[#F8FAFB]">
        <Navbar />
        <div className="pt-16 max-w-lg mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/appointments" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" /> Mes rendez-vous
            </Link>
          </div>
          <div className="bg-white rounded-3xl border border-amber-100 shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              En attente de confirmation
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Votre demande est transmise. La réception va valider et vous attribuer une salle.
            </p>
            {appt.ticket_numero && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-4">
                <p className="text-xs font-bold text-amber-500 uppercase mb-1">Votre numéro de ticket</p>
                <p className="font-mono font-extrabold text-3xl text-amber-700">#{appt.ticket_numero}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-2 mb-5">
              <Row label="Service" value={appt.service ?? '—'} />
              <Row label="Type" value={appt.type_consultation === 'immediate' ? 'Consultation immédiate' : 'Rendez-vous programmé'} />
              {appt.structure_nom && <Row label="Établissement" value={appt.structure_nom} />}
            </div>
            <button onClick={loadTicket} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mx-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser le statut
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main ticket view (confirme / termine)
  const doctorName = appt.doctor_nom
    ? `Dr. ${appt.doctor_prenom ?? ''} ${appt.doctor_nom ?? ''}`.trim()
    : appt.structure_nom ?? 'Prestataire médical'
  const structureNom = appt.structure_nom ?? appt.structure?.nom ?? ''
  const ticketRef = appt.ticket_numero ? `#${appt.ticket_numero}` : `TKT-${String(appt.id).padStart(6, '0')}`
  const dateRdv = new Date(`${appt.date_rdv}T${appt.heure_rdv || '00:00'}`)

  const queueInfo = ticketInfo
  const queueStatutMeta = queueInfo ? (QUEUE_STATUT_LABELS[queueInfo.statut] ?? QUEUE_STATUT_LABELS.en_attente) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-md mx-auto px-4 py-8">

          <div className="flex items-center justify-between mb-6">
            <Link href="/appointments" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Mes rendez-vous
            </Link>
            <button onClick={loadTicket} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualiser
            </button>
          </div>

          {/* Called alert */}
          {calledAlert && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-blue-600 text-white rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-lg"
            >
              <Bell className="w-6 h-6 flex-shrink-0 animate-bounce" />
              <div>
                <p className="font-extrabold text-base">C'est votre tour !</p>
                <p className="text-blue-100 text-sm">
                  Veuillez vous présenter{appt.room_nom ? ` en ${appt.room_nom}` : ' à la salle indiquée'}.
                </p>
              </div>
              <button onClick={() => setCalledAlert(false)} className="ml-auto text-blue-200 hover:text-white text-xl font-bold">×</button>
            </motion.div>
          )}

          {/* Queue status card */}
          {queueInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 mb-4 ${
                queueInfo.statut === 'appele' ? 'bg-blue-50 border-blue-200' :
                queueInfo.statut === 'en_consultation' ? 'bg-violet-50 border-violet-200' :
                'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Position dans la file</p>
                {queueStatutMeta && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${queueStatutMeta.color}`}>
                    {queueStatutMeta.label}
                  </span>
                )}
              </div>

              {queueInfo.statut === 'en_attente' && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-indigo-700">{queueInfo.personnes_avant}</p>
                    <p className="text-xs text-gray-500 mt-1">personne(s) avant vous</p>
                  </div>
                  <div className="flex-1">
                    {queueInfo.eta_min > 0 ? (
                      <>
                        <div className="h-2 bg-gray-200 rounded-full mb-1 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${Math.max(10, 100 - queueInfo.personnes_avant * 15)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">Temps estimé : <strong>~{queueInfo.eta_min} min</strong></p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-emerald-600">Vous êtes le prochain !</p>
                    )}
                  </div>
                </div>
              )}

              {queueInfo.statut === 'appele' && (
                <div>
                  <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-blue-600 animate-bounce" />
                    <div>
                      <p className="font-extrabold text-blue-800 text-lg">C'est votre tour !</p>
                      <p className="text-sm text-blue-600">
                        Présentez-vous{appt.room_nom ? ` en ${appt.room_nom}` : ' à la salle indiquée'}
                      </p>
                    </div>
                  </div>
                  {(calledDeadline ?? queueInfo.deadline) && (
                    <TicketCountdown deadline={calledDeadline ?? queueInfo.deadline} />
                  )}
                </div>
              )}

              {queueInfo.statut === 'en_consultation' && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-extrabold text-violet-800 text-lg">Consultation en cours</p>
                    <p className="text-sm text-violet-600">Vous êtes avec le médecin</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Room assignment */}
          {appt.room_nom && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
              <DoorOpen className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs text-indigo-400 font-bold uppercase">Salle attribuée</p>
                <p className="font-extrabold text-indigo-800">{appt.room_nom}</p>
              </div>
            </div>
          )}

          {/* Ticket card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative"
            id="ticket-card"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-100 rounded-full border-4 border-indigo-50 z-10" />

            <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100/50 overflow-hidden border border-indigo-100">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 p-6 text-white relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider">MedMap+ · Ticket Électronique</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white/70 text-xs mb-1">Établissement</p>
                      <h2 className="text-xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {structureNom || doctorName}
                      </h2>
                      {structureNom && doctorName !== structureNom && (
                        <p className="text-white/80 text-sm mt-1">{doctorName}</p>
                      )}
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span className="text-sm font-bold text-white">
                      {APPT_STATUT_LABELS[appt.statut] ?? appt.statut}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dashed divider */}
              <div className="relative px-5 py-0">
                <div className="border-t-2 border-dashed border-gray-200" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-6 h-6 bg-indigo-50 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-6 h-6 bg-indigo-50 rounded-full" />
              </div>

              {/* Ticket info */}
              <div className="px-5 py-5">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {dateRdv.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Heure
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {appt.type_consultation === 'immediate' ? 'Immédiat' : dateRdv.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Patient
                    </p>
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {user ? `${user.prenom} ${user.nom}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Service</p>
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {appt.service ?? appt.type ?? 'Consultation'}
                    </p>
                  </div>
                  {appt.room_nom && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                        <DoorOpen className="w-3 h-3" /> Salle
                      </p>
                      <p className="font-bold text-indigo-700 text-sm">{appt.room_nom}</p>
                    </div>
                  )}
                  {queueInfo?.personnes_avant !== undefined && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Devant vous
                      </p>
                      <p className="font-bold text-gray-900 text-sm">
                        {queueInfo.personnes_avant === 0 ? 'Aucun — immédiat' : `${queueInfo.personnes_avant} personne(s)`}
                      </p>
                    </div>
                  )}
                  {appt.prix && appt.prix > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 font-medium mb-1">Montant</p>
                      <p className="font-extrabold text-indigo-700 text-lg">
                        {parseInt(appt.prix).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  )}
                </div>

                {/* Reference */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Référence ticket</p>
                      <p className="font-mono font-extrabold text-gray-900 text-lg tracking-widest">{ticketRef}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium mb-0.5">N° Dossier</p>
                      <p className="font-mono font-bold text-gray-600">#{String(appt.id).padStart(4, '0')}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 mb-5">
                  <QRDisplay value={`${ticketRef}-${appt.id}-medmap`} />
                  <p className="text-xs text-gray-400 text-center">
                    Présentez ce QR code à l'accueil de l'établissement
                  </p>
                </div>

                {appt.motif && (
                  <div className="bg-indigo-50 rounded-xl p-3 mb-4 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-700 mb-1">Motif de consultation</p>
                    <p className="text-xs text-indigo-600">{appt.motif}</p>
                  </div>
                )}

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Instructions :</strong> Arrivez avec votre ticket (papier ou téléphone).
                    Vous serez notifié(e) dès que c'est votre tour. Gardez votre téléphone à portée.
                  </p>
                </div>
              </div>

              {/* Bottom tear */}
              <div className="relative px-5 py-0">
                <div className="border-t-2 border-dashed border-gray-200" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-6 h-6 bg-indigo-50 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-6 h-6 bg-indigo-50 rounded-full" />
              </div>

              <div className="px-5 py-4 bg-gray-50 text-center">
                <p className="text-xs text-gray-400">MedMap+ · Santé numérique à portée de main · medmap.ci</p>
              </div>
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-100 rounded-full border-4 border-indigo-50 z-10" />
          </motion.div>

          {/* Patient confirmation banner (after consultation) */}
          {(appt.consultation_statut === 'effectuee' && !confirmDone && appt.paiement_statut !== 'libere') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mt-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-800 text-base">Consultation terminée !</p>
                  <p className="text-sm text-emerald-600 mt-1">
                    Confirmez pour valider le paiement et libérer les fonds à l'établissement.
                  </p>
                  {appt.prix > 0 && (
                    <p className="text-sm font-bold text-emerald-700 mt-1">
                      Montant : {parseInt(appt.prix).toLocaleString('fr-FR')} FCFA
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handlePatientConfirm}
                disabled={confirmLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
              >
                {confirmLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirmation…</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirmer et libérer le paiement</>
                )}
              </button>
            </motion.div>
          )}

          {(confirmDone || appt.paiement_statut === 'libere') && appt.statut === 'termine' && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mt-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-teal-500" />
              <p className="text-sm font-semibold text-teal-700">Consultation confirmée — Paiement libéré. Merci !</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl font-bold text-sm transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              {printed ? 'Impression…' : 'Imprimer'}
            </button>
            <button
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({ title: `Ticket ${ticketRef}`, text: `Mon rendez-vous médical — Réf: ${ticketRef}` })
                }
              }}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-2xl font-semibold text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Partager
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Ce ticket est valable uniquement pour ce rendez-vous
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}
