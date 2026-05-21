'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { appointments as appointmentsApi } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Calendar, Clock, ChevronLeft, CheckCircle, AlertCircle, XCircle,
  Building2, Stethoscope, PawPrint, Loader2, Plus,
  MapPin, ChevronDown, ChevronUp, Ticket, FileText, Activity,
  RefreshCw, Pill,
} from 'lucide-react'

const STATUT_CONFIG: Record<string, { label: string; color: string; borderColor: string }> = {
  en_attente: { label: 'En attente',  color: 'bg-amber-50 text-amber-700',    borderColor: 'border-l-amber-400' },
  confirme:   { label: 'Confirmé',    color: 'bg-emerald-50 text-emerald-700', borderColor: 'border-l-emerald-500' },
  refuse:     { label: 'Refusé',      color: 'bg-red-50 text-red-600',        borderColor: 'border-l-red-400' },
  annule:     { label: 'Annulé',      color: 'bg-gray-50 text-gray-500',      borderColor: 'border-l-gray-300' },
  termine:    { label: 'Terminé',     color: 'bg-teal-50 text-teal-700',      borderColor: 'border-l-teal-400' },
}

function ApptCard({ appt, onCancel, onConfirmConsultation, confirming }: {
  appt: any
  onCancel: (id: number) => void
  onConfirmConsultation: (id: number) => void
  confirming: number | null
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUT_CONFIG[appt.statut] ?? STATUT_CONFIG.en_attente

  const providerName = appt.doctor_nom
    ? `Dr. ${appt.doctor_prenom ?? ''} ${appt.doctor_nom}`.trim()
    : appt.structure_nom || 'Prestataire médical'

  const isUpcoming = ['en_attente', 'confirme'].includes(appt.statut)
  const dateRdv = new Date(appt.date_rdv)
  const hasPresc = appt.prescriptions && appt.prescriptions.length > 0
  const canConfirmConsultation = appt.statut === 'confirme'
    && appt.consultation_statut === 'effectuee'
  const isConfirming = confirming === appt.id

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden ${cfg.borderColor}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            appt.doctor_id ? 'bg-sky-50' : 'bg-indigo-50'
          }`}>
            {appt.provider_type === 'medecin'
              ? <Stethoscope className="w-5 h-5 text-sky-600" />
              : appt.provider_type === 'veterinaire'
                ? <PawPrint className="w-5 h-5 text-orange-500" />
                : <Building2 className="w-5 h-5 text-indigo-600" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900 text-sm">{providerName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{appt.service ?? 'Consultation'}</p>
              </div>
              <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {dateRdv.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {appt.heure_rdv?.slice(0, 5)}
              </span>
              {hasPresc && (
                <span className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
                  <FileText className="w-3 h-3" /> Ordonnance
                </span>
              )}
            </div>

            {/* Consultation effectuée — action requise */}
            {canConfirmConsultation && (
              <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-xs font-bold text-indigo-700 mb-2">
                  ✅ L'établissement a enregistré votre consultation.
                </p>
                <p className="text-xs text-indigo-600 mb-2">
                  Confirmez que la consultation a bien eu lieu pour libérer le paiement.
                </p>
                <button
                  onClick={() => onConfirmConsultation(appt.id)}
                  disabled={isConfirming}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {isConfirming
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirmation…</>
                    : <><CheckCircle className="w-3.5 h-3.5" /> J'ai eu ma consultation</>
                  }
                </button>
              </div>
            )}

            {/* Fonds en attente de confirmation patient */}
            {appt.statut === 'confirme' && appt.consultation_statut === 'attente' && appt.paiement_statut === 'bloque' && (
              <p className="mt-2 text-xs text-gray-400 italic">
                💳 Paiement en séquestre — libéré après consultation
              </p>
            )}

            {/* Paiement libéré */}
            {appt.paiement_statut === 'libere' && (
              <p className="mt-2 text-xs text-teal-600 font-semibold">✅ Paiement libéré</p>
            )}

            {/* Remboursement */}
            {appt.paiement_statut === 'rembourse' && (
              <p className="mt-2 text-xs text-amber-600 font-semibold">↩ Remboursé</p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {appt.statut === 'confirme' && (
                <Link
                  href={`/ticket/${appt.id}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" /> Voir le ticket
                </Link>
              )}
              {isUpcoming && appt.statut === 'en_attente' && (
                <button
                  onClick={() => onCancel(appt.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Moins</> : <><ChevronDown className="w-3.5 h-3.5" /> Détails</>}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-gray-100 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                {appt.specialite && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Spécialité</p>
                    <p className="text-sm font-semibold text-gray-700">{appt.specialite}</p>
                  </div>
                )}
                {appt.cabinet && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />Cabinet</p>
                    <p className="text-sm font-semibold text-gray-700">{appt.cabinet}</p>
                  </div>
                )}
                {appt.structure_adresse && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                    <p className="text-sm font-semibold text-gray-700">{appt.structure_adresse}</p>
                  </div>
                )}
                {appt.motif && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Motif</p>
                    <p className="text-sm text-gray-700">{appt.motif}</p>
                  </div>
                )}
                {appt.symptomes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Symptômes</p>
                    <p className="text-sm text-gray-700">{appt.symptomes}</p>
                  </div>
                )}
                {appt.prix && (
                  <div className="col-span-2 bg-indigo-50 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Honoraire médecin</span>
                      <span className="font-semibold text-gray-800">{parseInt(appt.prix).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Commission MedMap+ (15%)</span>
                      <span className="font-semibold text-indigo-600">+{Math.round(parseInt(appt.prix) * 0.15).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold border-t border-indigo-100 pt-1">
                      <span className="text-gray-700">Total payé</span>
                      <span className="text-indigo-700">{Math.round(parseInt(appt.prix) * 1.15).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Réf.</p>
                  <p className="font-mono text-xs text-gray-600">TKT-{String(appt.id).padStart(6,'0')}</p>
                </div>
              </div>

              {/* Prescriptions */}
              {hasPresc && (
                <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 mt-2">
                  <p className="text-xs font-bold text-teal-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Ordonnance médicale
                  </p>
                  {appt.prescriptions.map((p: any, pi: number) => {
                    const meds = typeof p.medicaments === 'string' ? JSON.parse(p.medicaments) : p.medicaments
                    return (
                      <div key={pi} className="space-y-2">
                        {meds?.map((m: any, mi: number) => (
                          <div key={mi} className="bg-white rounded-lg p-2.5 border border-teal-100">
                            <div className="flex items-start gap-2">
                              <Pill className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-gray-800">{m.nom} {m.dosage && `— ${m.dosage}`}</p>
                                {m.frequence && <p className="text-xs text-gray-500">{m.frequence}{m.duree ? ` pendant ${m.duree}` : ''}</p>}
                                {m.instructions && <p className="text-xs text-gray-400 italic">{m.instructions}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {p.notes && (
                          <p className="text-xs text-gray-500 italic px-1">Note: {p.notes}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Prescrit le {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [appts, setAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [confirming, setConfirming] = useState<number | null>(null)

  function loadAppts() {
    return appointmentsApi.mine()
      .then(setAppts)
      .catch(() => setAppts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAppts() }, [])

  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()
    const refresh = () => appointmentsApi.mine().then(setAppts).catch(() => {})
    socket.on('appointment:update', refresh)
    socket.on('prescription:new', refresh)
    return () => {
      socket.off('appointment:update', refresh)
      socket.off('prescription:new', refresh)
    }
  }, [user?.id])

  async function cancelAppt(id: number) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    try {
      await appointmentsApi.updateStatus(id, 'annule')
      setAppts(prev => prev.map(a => a.id === id ? { ...a, statut: 'annule' } : a))
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'annulation')
    }
  }

  async function confirmConsultation(id: number) {
    if (!confirm('Confirmer que votre consultation a bien eu lieu ? Les fonds seront libérés à l\'établissement.')) return
    setConfirming(id)
    try {
      await appointmentsApi.patientConfirm(id)
      setAppts(prev => prev.map(a => a.id === id
        ? { ...a, statut: 'termine', consultation_statut: 'confirmee', paiement_statut: 'libere' }
        : a
      ))
    } catch (e: any) {
      alert(e.message || 'Erreur')
    } finally { setConfirming(null) }
  }

  const upcoming = appts.filter(a => ['en_attente','confirme'].includes(a.statut))
  const past = appts.filter(a => ['refuse','annule','termine'].includes(a.statut))
  const displayed = filter === 'all' ? appts : filter === 'upcoming' ? upcoming : past

  // Count RDV needing patient action
  const actionNeeded = appts.filter(a => a.statut === 'confirme' && a.consultation_statut === 'effectuee').length

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/dashboard/patient" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Dashboard
              </Link>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Mes rendez-vous
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  {upcoming.length} à venir · {past.length} passé{past.length > 1 ? 's' : ''}
                  {actionNeeded > 0 && ` · `}
                  {actionNeeded > 0 && (
                    <span className="text-indigo-600 font-bold">{actionNeeded} action{actionNeeded > 1 ? 's' : ''} requise{actionNeeded > 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setLoading(true); loadAppts() }} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
                <Link
                  href="/medecins"
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Médecin
                </Link>
                <Link
                  href="/hospitals"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Hôpital
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Action needed banner */}
        {actionNeeded > 0 && (
          <div className="bg-indigo-600 text-white text-sm font-semibold text-center py-2.5 px-4">
            ⚡ {actionNeeded} consultation{actionNeeded > 1 ? 's' : ''} en attente de votre confirmation
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* Filter tabs */}
          <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 mb-5 shadow-sm">
            {([
              { id: 'upcoming', label: `À venir (${upcoming.length})` },
              { id: 'past',     label: `Passés (${past.length})` },
              { id: 'all',      label: `Tous (${appts.length})` },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                  filter === t.id ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>
          ) : displayed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="font-bold text-gray-500 text-lg mb-1">
                {filter === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous'}
              </p>
              <p className="text-sm text-gray-400 mb-6">Prenez rendez-vous avec un médecin ou un hôpital.</p>
              <div className="flex justify-center gap-3">
                <Link href="/medecins" className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-700 transition-colors">
                  <Stethoscope className="w-4 h-4" /> Médecins
                </Link>
                <Link href="/hospitals" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                  <Building2 className="w-4 h-4" /> Hôpitaux
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((appt, i) => (
                <motion.div key={appt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <ApptCard
                    appt={appt}
                    onCancel={cancelAppt}
                    onConfirmConsultation={confirmConsultation}
                    confirming={confirming}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
