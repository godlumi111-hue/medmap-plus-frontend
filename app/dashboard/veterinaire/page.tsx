'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ConversationPanel from '@/components/messaging/ConversationPanel'
import { useAuth } from '@/lib/auth-context'
import { vet as vetApi, wallet } from '@/lib/api'
import { getSocket, connectSocket } from '@/lib/socket'
import {
  Calendar, Wallet as WalletIcon, CheckCircle, XCircle, ChevronRight,
  Loader2, MapPin, Phone, MessageCircle, User, RefreshCw, PawPrint,
  ChevronDown, ChevronUp, AlertCircle, Clock, Syringe, FileText,
  Plus, X, Stethoscope, Shield, Star, DoorOpen, Users, Zap,
  LayoutDashboard, Building2, Activity, Banknote, FlaskConical,
  BedDouble, TrendingUp, ArrowUpRight, Bell, CheckCheck,
  SkipForward, UserCheck, Scissors,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type DashTab = 'apercu' | 'reception' | 'salles' | 'consultations' | 'caisse'

const APPT_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  en_attente: { label: 'À valider',  color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  confirme:   { label: 'Confirmé',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  refuse:     { label: 'Refusé',     color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  annule:     { label: 'Annulé',     color: 'bg-gray-50 text-gray-500 border-gray-200',          dot: 'bg-gray-400' },
  termine:    { label: 'Terminé',    color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  consultation:    'Consultation',
  vaccination:     'Vaccination',
  urgence:         'Urgence',
  chirurgie:       'Chirurgie',
  soins:           'Soins',
  hospitalisation: 'Hospitalisation',
  examens:         'Examens',
}

const ROOM_TYPE_COLORS: Record<string, string> = {
  consultation:    'bg-blue-100 text-blue-700',
  vaccination:     'bg-emerald-100 text-emerald-700',
  urgence:         'bg-red-100 text-red-700',
  chirurgie:       'bg-purple-100 text-purple-700',
  soins:           'bg-orange-100 text-orange-700',
  hospitalisation: 'bg-pink-100 text-pink-700',
  examens:         'bg-teal-100 text-teal-700',
}

interface PrescMed { nom: string; dosage: string; frequence: string; duree: string; instructions: string }
interface VaccineForm { nom: string; date_admin: string; prochaine_date: string; lot: string; notes: string }
interface ExamForm { type_examen: string; description: string; prix: string }
interface HospForm { motif: string; duree_estimee: string; salle: string; prix: string }
interface SurgForm { type_chirurgie: string; motif: string; urgence: string; observations: string; recommandations: string }

const emptyMed = (): PrescMed => ({ nom: '', dosage: '', frequence: '', duree: '', instructions: '' })
const emptyVaccine = (): VaccineForm => ({ nom: '', date_admin: new Date().toISOString().split('T')[0], prochaine_date: '', lot: '', notes: '' })
const emptyExam = (): ExamForm => ({ type_examen: '', description: '', prix: '' })
const emptyHosp = (): HospForm => ({ motif: '', duree_estimee: '', salle: '', prix: '' })
const emptySurg = (): SurgForm => ({ type_chirurgie: '', motif: '', urgence: 'normal', observations: '', recommandations: '' })

// ── Sous-composants panels ─────────────────────────────────────────────────────

function PrescriptionPanel({ apptId, onClose, onDone }: { apptId: number; onClose: () => void; onDone: () => void }) {
  const [meds, setMeds] = useState<PrescMed[]>([emptyMed()])
  const [consignes, setConsignes] = useState('')
  const [recommandations, setRecommandations] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    const valid = meds.filter(m => m.nom.trim())
    if (!valid.length) { setError('Ajoutez au moins un médicament'); return }
    setSaving(true); setError('')
    try {
      await vetApi.addPrescription(apptId, { medicaments: valid, consignes, recommandations })
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-pink-500" /> Ordonnance vétérinaire
        </h4>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        {meds.map((m, i) => (
          <div key={i} className="bg-pink-50 rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <input placeholder="Médicament *" value={m.nom} onChange={e => { const n=[...meds];n[i].nom=e.target.value;setMeds(n) }}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-300" />
              <input placeholder="Dosage" value={m.dosage} onChange={e => { const n=[...meds];n[i].dosage=e.target.value;setMeds(n) }}
                className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-300" />
            </div>
            <div className="flex gap-2">
              <input placeholder="Fréquence" value={m.frequence} onChange={e => { const n=[...meds];n[i].frequence=e.target.value;setMeds(n) }}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-300" />
              <input placeholder="Durée" value={m.duree} onChange={e => { const n=[...meds];n[i].duree=e.target.value;setMeds(n) }}
                className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-300" />
              {meds.length > 1 && (
                <button onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-3 h-3 text-red-500" />
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => setMeds([...meds, emptyMed()])} className="flex items-center gap-1.5 text-xs text-pink-600 font-bold">
          <Plus className="w-3.5 h-3.5" /> Ajouter médicament
        </button>
      </div>
      <textarea rows={2} placeholder="Consignes de soins…" value={consignes} onChange={e => setConsignes(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-pink-300" />
      <textarea rows={2} placeholder="Recommandations (alimentation, repos…)" value={recommandations} onChange={e => setRecommandations(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-pink-300" />
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><FileText className="w-3.5 h-3.5" /> Émettre l'ordonnance</>}
      </button>
    </div>
  )
}

function VaccinePanel({ apptId, animalNom, onClose, onDone }: { apptId: number; animalNom: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<VaccineForm>(emptyVaccine())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!form.nom.trim()) { setError('Nom du vaccin requis'); return }
    setSaving(true); setError('')
    try {
      await vetApi.addVaccine(apptId, form)
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Syringe className="w-4 h-4 text-blue-500" /> Vaccin — {animalNom}
        </h4>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 block mb-1">Nom du vaccin *</label>
          <input placeholder="Ex: Rage, Typhus, Parvo…" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Date admin.</label>
          <input type="date" value={form.date_admin} onChange={e => setForm(f => ({ ...f, date_admin: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Prochain rappel</label>
          <input type="date" value={form.prochaine_date} onChange={e => setForm(f => ({ ...f, prochaine_date: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 block mb-1">N° de lot</label>
          <input placeholder="Numéro de lot" value={form.lot} onChange={e => setForm(f => ({ ...f, lot: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Syringe className="w-3.5 h-3.5" /> Enregistrer le vaccin</>}
      </button>
    </div>
  )
}

function ExamPanel({ apptId, onClose, onDone }: { apptId: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<ExamForm>(emptyExam())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const EXAM_TYPES = ['Analyse de sang', 'Radiographie', 'Échographie', 'Analyse d\'urine', 'Analyse de selles', 'Scanner', 'Biopsie', 'Culture bactérienne', 'Autre']

  async function submit() {
    if (!form.type_examen.trim()) { setError('Type d\'examen requis'); return }
    setSaving(true); setError('')
    try {
      await vetApi.requestExam(apptId, { type_examen: form.type_examen, description: form.description, prix: form.prix ? parseFloat(form.prix) : undefined })
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-teal-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-teal-500" /> Demande d'examen
        </h4>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 block">Type d'examen *</label>
        <select value={form.type_examen} onChange={e => setForm(f => ({ ...f, type_examen: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-300">
          <option value="">Sélectionner…</option>
          {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs font-bold text-gray-500 block">Description / Motif</label>
        <textarea rows={2} placeholder="Précisez le motif de l'examen…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-teal-300" />
        <label className="text-xs font-bold text-gray-500 block">Tarif estimé (FCFA)</label>
        <input type="number" placeholder="Ex: 15000" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-300" />
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><FlaskConical className="w-3.5 h-3.5" /> Envoyer la demande</>}
      </button>
    </div>
  )
}

function HospitalizationPanel({ apptId, rooms, onClose, onDone }: { apptId: number; rooms: any[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<HospForm>(emptyHosp())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hospRooms = rooms.filter(r => r.type === 'hospitalisation' || r.nom.toLowerCase().includes('hospital'))

  async function submit() {
    if (!form.motif.trim()) { setError('Motif requis'); return }
    setSaving(true); setError('')
    try {
      await vetApi.requestHospitalization(apptId, {
        motif: form.motif,
        duree_estimee: form.duree_estimee,
        salle: form.salle,
        prix: form.prix ? parseFloat(form.prix) : undefined,
      })
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-purple-500" /> Hospitalisation animale
        </h4>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 block">Motif *</label>
        <textarea rows={2} placeholder="Motif de l'hospitalisation…" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Durée estimée</label>
            <input placeholder="Ex: 2 jours" value={form.duree_estimee} onChange={e => setForm(f => ({ ...f, duree_estimee: e.target.value }))}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Tarif (FCFA)</label>
            <input type="number" placeholder="Ex: 50000" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300" />
          </div>
        </div>
        {hospRooms.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Salle</label>
            <select value={form.salle} onChange={e => setForm(f => ({ ...f, salle: e.target.value }))}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300">
              <option value="">Sélectionner une salle…</option>
              {hospRooms.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
            </select>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><BedDouble className="w-3.5 h-3.5" /> Demander l'hospitalisation</>}
      </button>
    </div>
  )
}

function SurgeryPanel({ apptId, onClose, onDone }: { apptId: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<SurgForm>(emptySurg())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const SURG_TYPES = ['Stérilisation', 'Chirurgie orthopédique', 'Retrait de tumeur', 'Extraction dentaire', 'Laparotomie exploratrice', 'Césarienne', 'Correction hernie', 'Autre']

  async function submit() {
    if (!form.type_chirurgie.trim()) { setError('Type de chirurgie requis'); return }
    setSaving(true); setError('')
    try {
      await vetApi.requestSurgery(apptId, {
        type_chirurgie: form.type_chirurgie,
        motif: form.motif,
        urgence: form.urgence,
        observations: form.observations,
        recommandations: form.recommandations,
      })
      onDone()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Scissors className="w-4 h-4 text-orange-500" /> Chirurgie animale
        </h4>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 block">Type de chirurgie *</label>
        <select value={form.type_chirurgie} onChange={e => setForm(f => ({ ...f, type_chirurgie: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-300">
          <option value="">Sélectionner…</option>
          {SURG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs font-bold text-gray-500 block">Urgence</label>
        <select value={form.urgence} onChange={e => setForm(f => ({ ...f, urgence: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-300">
          <option value="normal">Normale (programmable)</option>
          <option value="urgent">Urgente (24-48h)</option>
          <option value="tres_urgent">Très urgente (immédiate)</option>
        </select>
        <label className="text-xs font-bold text-gray-500 block">Motif</label>
        <textarea rows={2} placeholder="Motif de la chirurgie…" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
        <label className="text-xs font-bold text-gray-500 block">Observations</label>
        <textarea rows={2} placeholder="Observations pré-opératoires…" value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
        <label className="text-xs font-bold text-gray-500 block">Recommandations post-op</label>
        <textarea rows={2} placeholder="Soins post-opératoires…" value={form.recommandations} onChange={e => setForm(f => ({ ...f, recommandations: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
        <div className="bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <Banknote className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-700 font-semibold">Tarif chirurgie : <strong>80 000 FCFA</strong> (automatique)</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Scissors className="w-3.5 h-3.5" /> Recommander la chirurgie</>}
      </button>
    </div>
  )
}

function Countdown({ deadline }: { deadline: string }) {
  const [secsLeft, setSecsLeft] = useState(() => {
    const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })
  useEffect(() => {
    if (secsLeft <= 0) return
    const t = setInterval(() => {
      setSecsLeft(() => {
        const next = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
        if (next <= 0) clearInterval(t)
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [deadline])
  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const expired = secsLeft === 0
  const urgent = secsLeft <= 60 && !expired
  return (
    <span className={`font-mono font-bold text-sm ${expired ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-pink-700'}`}>
      {expired ? 'Expiré' : `${mins}:${String(secs).padStart(2, '0')}`}
    </span>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function VeterinairesDashboard() {
  const { user } = useAuth()
  const [dashTab, setDashTab] = useState<DashTab>('reception')
  const [dashData, setDashData] = useState<any>(null)
  const [caisseData, setCaisseData] = useState<any>(null)
  const [walletData, setWalletData] = useState<any>(null)
  const [vetServicesData, setVetServicesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [showPanel, setShowPanel] = useState<{ id: number; type: 'presc'|'vaccine'|'exam'|'hosp'|'surg' } | null>(null)
  const [chat, setChat] = useState<{ apptId: number; patientUserId: number; patientName: string } | null>(null)
  const [assignRoom, setAssignRoom] = useState<{ apptId: number; rooms: any[] } | null>(null)
  const [assigningSaving, setAssigningSaving] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openRoomPanel, setOpenRoomPanel] = useState<Record<number, string | null>>({})
  const [roomActionDone, setRoomActionDone] = useState<Record<number, string | null>>({})

  const loadData = useCallback(async () => {
    try {
      const [dash, w, caisse, services] = await Promise.allSettled([
        vetApi.dashboard(), wallet.me(), vetApi.caisse(), vetApi.vetServices(),
      ])
      if (dash.status     === 'fulfilled') setDashData(dash.value)
      if (w.status        === 'fulfilled') setWalletData(w.value)
      if (caisse.status   === 'fulfilled') setCaisseData(caisse.value)
      if (services.status === 'fulfilled') setVetServicesData(services.value)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!user?.id) return
    connectSocket(user.id)
    const socket = getSocket()
    socket.on('appointment:new', loadData)
    return () => { socket.off('appointment:new', loadData) }
  }, [user?.id, loadData])

  async function handleConfirm(apptId: number) {
    setUpdatingId(apptId)
    try {
      await vetApi.confirmAppointment(apptId)
      await loadData()
      const rdv = (dashData?.appointments ?? []).find((r: any) => r.id === apptId)
      if (rdv) setAssignRoom({ apptId, rooms: dashData?.rooms ?? [] })
    } catch {} finally { setUpdatingId(null) }
  }

  async function handleReject(apptId: number) {
    setUpdatingId(apptId)
    try { await vetApi.rejectAppointment(apptId); await loadData() }
    catch {} finally { setUpdatingId(null) }
  }

  async function handleFinish(apptId: number) {
    setUpdatingId(apptId)
    try { await vetApi.finishAppointment(apptId); await loadData() }
    catch {} finally { setUpdatingId(null) }
  }

  async function handleNextPatient(roomId: number) {
    setActionLoading(`next-${roomId}`)
    try { await vetApi.nextPatientByRoom(roomId); await loadData() }
    catch {} finally { setActionLoading(null) }
  }

  async function handleStartConsultation(roomId: number) {
    setActionLoading(`start-${roomId}`)
    try { await vetApi.startConsultation(roomId); await loadData() }
    catch {} finally { setActionLoading(null) }
  }

  async function handlePatientAbsent(roomId: number) {
    setActionLoading(`absent-${roomId}`)
    try { await vetApi.patientAbsent(roomId); await loadData() }
    catch {} finally { setActionLoading(null) }
  }

  async function handleFinishConsultation(roomId: number) {
    setActionLoading(`finish-${roomId}`)
    try { await vetApi.finishConsultation(roomId); await loadData() }
    catch {} finally { setActionLoading(null) }
  }

  async function handleRoomStatus(roomId: number, statut: string) {
    setActionLoading(`room-${roomId}`)
    try { await vetApi.roomStatus(roomId, statut as any); await loadData() }
    catch {} finally { setActionLoading(null) }
  }

  function toggleRoomPanel(roomId: number, panel: string) {
    setOpenRoomPanel(prev => ({ ...prev, [roomId]: prev[roomId] === panel ? null : panel }))
  }

  const rdvList: any[] = dashData?.appointments ?? []
  const pending   = rdvList.filter(r => r.statut === 'en_attente')
  const confirmed = rdvList.filter(r => r.statut === 'confirme')
  const done      = rdvList.filter(r => r.statut === 'termine')
  const solde = walletData?.solde ?? 0
  const vetName = dashData?.structure?.nom ?? (`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Vétérinaire')

  const TABS: { key: DashTab; label: string; icon: any; badge?: number }[] = [
    { key: 'apercu',        label: 'Aperçu',      icon: LayoutDashboard },
    { key: 'reception',     label: 'Réception',   icon: Bell,           badge: pending.length },
    { key: 'salles',        label: 'Salles & File',icon: DoorOpen },
    { key: 'consultations', label: 'Consultations',icon: Stethoscope,   badge: confirmed.length },
    { key: 'caisse',        label: 'Caisse',       icon: Banknote },
  ]

  // ── Render appointment card (shared between tabs) ────────────────────────────

  function renderApptCard(rdv: any, showActions: 'reception' | 'consultation') {
    const st = APPT_STATUS[rdv.statut] ?? APPT_STATUS.en_attente
    const patientName = [rdv.patient_prenom, rdv.patient_nom].filter(Boolean).join(' ') || 'Propriétaire'
    const animalNom = rdv.animal_nom || rdv.animal_espece
      ? `${rdv.animal_nom ?? ''}${rdv.animal_espece ? ` (${rdv.animal_espece})` : ''}` : null
    const isExpanded = expanded === rdv.id
    const isUpdating = updatingId === rdv.id

    return (
      <div key={rdv.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setExpanded(isExpanded ? null : rdv.id)}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-base flex-shrink-0">
            {rdv.animal_espece === 'Chien' ? '🐕' : rdv.animal_espece === 'Chat' ? '🐈' : rdv.animal_espece === 'Oiseau' ? '🐦' : '🐾'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
              {animalNom && <span className="text-xs text-pink-600 font-medium">— {animalNom}</span>}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
              {rdv.type_rdv === 'urgence' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">🚨 Urgence</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {rdv.heure_rdv?.slice(0,5)}
              {rdv.service ? ` · ${rdv.service}` : ''}
              {rdv.prix ? ` · ${Number(rdv.prix).toLocaleString('fr-FR')} F` : ''}
            </p>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">Propriétaire</p>
                    <p className="font-semibold text-sm text-gray-800">{patientName}</p>
                    {rdv.patient_tel && <p className="text-xs text-gray-500">{rdv.patient_tel}</p>}
                  </div>
                  {animalNom && (
                    <div className="bg-pink-50 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-xl">{rdv.animal_espece === 'Chien' ? '🐕' : rdv.animal_espece === 'Chat' ? '🐈' : '🐾'}</span>
                      <div>
                        <p className="font-bold text-pink-900 text-sm">{rdv.animal_nom ?? '—'}</p>
                        <p className="text-[10px] text-pink-500">{rdv.animal_espece}</p>
                      </div>
                    </div>
                  )}
                </div>

                {rdv.motif && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Motif</p>
                    <p className="text-sm text-gray-700">{rdv.motif}</p>
                  </div>
                )}

                {rdv.payment_statut && (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                    rdv.payment_statut === 'bloque' ? 'bg-amber-50 text-amber-700' :
                    rdv.payment_statut === 'libere' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    {rdv.payment_statut === 'bloque' ? 'Paiement en séquestre' : rdv.payment_statut === 'libere' ? 'Paiement libéré' : rdv.payment_statut}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setChat({ apptId: rdv.id, patientUserId: rdv.patient_user_id ?? rdv.patient_id, patientName })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-pink-300 hover:text-pink-600">
                    <MessageCircle className="w-3.5 h-3.5" /> Message
                  </button>

                  {showActions === 'reception' && rdv.statut === 'en_attente' && (
                    <>
                      <button onClick={() => handleReject(rdv.id)} disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                      <button onClick={() => handleConfirm(rdv.id)} disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-50">
                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirmer</>}
                      </button>
                    </>
                  )}

                  {showActions === 'consultation' && rdv.statut === 'confirme' && (
                    <>
                      <button onClick={() => setAssignRoom({ apptId: rdv.id, rooms: dashData?.rooms ?? [] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                        <DoorOpen className="w-3.5 h-3.5" /> Salle
                      </button>
                      <button onClick={() => setShowPanel(p => p?.id === rdv.id && p?.type === 'presc' ? null : { id: rdv.id, type: 'presc' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 text-xs font-semibold text-pink-600 hover:bg-pink-50">
                        <FileText className="w-3.5 h-3.5" /> Ordonnance
                      </button>
                      <button onClick={() => setShowPanel(p => p?.id === rdv.id && p?.type === 'vaccine' ? null : { id: rdv.id, type: 'vaccine' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                        <Syringe className="w-3.5 h-3.5" /> Vaccin
                      </button>
                      <button onClick={() => setShowPanel(p => p?.id === rdv.id && p?.type === 'exam' ? null : { id: rdv.id, type: 'exam' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 text-xs font-semibold text-teal-600 hover:bg-teal-50">
                        <FlaskConical className="w-3.5 h-3.5" /> Examen
                      </button>
                      <button onClick={() => setShowPanel(p => p?.id === rdv.id && p?.type === 'hosp' ? null : { id: rdv.id, type: 'hosp' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-semibold text-purple-600 hover:bg-purple-50">
                        <BedDouble className="w-3.5 h-3.5" /> Hospitalisation
                      </button>
                      <button onClick={() => setShowPanel(p => p?.id === rdv.id && p?.type === 'surg' ? null : { id: rdv.id, type: 'surg' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 text-xs font-semibold text-orange-600 hover:bg-orange-50">
                        <Scissors className="w-3.5 h-3.5" /> Chirurgie
                      </button>
                      <button onClick={() => handleFinish(rdv.id)} disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white disabled:opacity-50">
                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCheck className="w-3.5 h-3.5" /> Soins terminés</>}
                      </button>
                    </>
                  )}
                </div>

                {showPanel !== null && showPanel.id === rdv.id && showPanel.type === 'presc' && (
                  <PrescriptionPanel apptId={rdv.id} onClose={() => setShowPanel(null)} onDone={() => { setShowPanel(null); loadData() }} />
                )}
                {showPanel !== null && showPanel.id === rdv.id && showPanel.type === 'vaccine' && (
                  <VaccinePanel apptId={rdv.id} animalNom={rdv.animal_nom ?? 'Animal'} onClose={() => setShowPanel(null)} onDone={() => { setShowPanel(null); loadData() }} />
                )}
                {showPanel !== null && showPanel.id === rdv.id && showPanel.type === 'exam' && (
                  <ExamPanel apptId={rdv.id} onClose={() => setShowPanel(null)} onDone={() => { setShowPanel(null); loadData() }} />
                )}
                {showPanel !== null && showPanel.id === rdv.id && showPanel.type === 'hosp' && (
                  <HospitalizationPanel apptId={rdv.id} rooms={dashData?.rooms ?? []} onClose={() => setShowPanel(null)} onDone={() => { setShowPanel(null); loadData() }} />
                )}
                {showPanel !== null && showPanel.id === rdv.id && showPanel.type === 'surg' && (
                  <SurgeryPanel apptId={rdv.id} onClose={() => setShowPanel(null)} onDone={() => { setShowPanel(null); loadData() }} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Tab: Aperçu ──────────────────────────────────────────────────────────────

  function TabApercu() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'À valider',   value: pending.length,   sub: 'en attente',    icon: AlertCircle, grad: 'from-amber-500 to-orange-500' },
            { label: 'Confirmés',   value: confirmed.length, sub: 'planifiés',     icon: Clock,       grad: 'from-pink-500 to-rose-500' },
            { label: 'Terminés',    value: done.length,      sub: "aujourd'hui",   icon: CheckCircle, grad: 'from-emerald-500 to-teal-500' },
            { label: 'Solde',       value: `${solde.toLocaleString('fr-FR')} F`, sub: 'FCFA', icon: WalletIcon, grad: 'from-violet-500 to-purple-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{loading ? '…' : String(s.value)}</p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ma structure */}
          {dashData?.structure && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-pink-500" /> Ma structure
              </h3>
              <div className="space-y-1.5 text-xs text-gray-600">
                {dashData.structure.adresse && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-pink-400 mt-0.5 flex-shrink-0" /><span>{dashData.structure.adresse}</span></div>}
                {dashData.structure.telephone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-pink-400" /><span>{dashData.structure.telephone}</span></div>}
                {dashData.vet_profile?.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dashData.vet_profile.services.map((s: string) => (
                      <span key={s} className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
                {dashData.note != null && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-amber-700">{Number(dashData.note).toFixed(1)}</span>
                    <span className="text-gray-400">/ 5</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallet */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 px-5 py-4">
              <p className="text-white/80 text-xs font-medium">Solde disponible</p>
              <p className="text-white text-2xl font-bold mt-0.5">{loading ? '…' : `${solde.toLocaleString('fr-FR')} F`}</p>
            </div>
            <div className="p-4">
              <Link href="/portefeuille" className="block text-center bg-pink-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-pink-700 transition-colors">
                Voir le portefeuille
              </Link>
            </div>
          </div>
        </div>

        {/* Séquestre info */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-pink-900 text-sm">Paiements sécurisés</p>
            <p className="text-xs text-pink-700 mt-1 leading-relaxed">
              Les paiements sont bloqués en séquestre et libérés après confirmation du propriétaire. Vous recevez <strong>90%</strong> du montant — 10% de commission MedMap+.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Tab: Réception ───────────────────────────────────────────────────────────

  function TabReception() {
    return (
      <div className="space-y-4">
        {/* Urgences en tête */}
        {pending.filter(r => r.type_rdv === 'urgence').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" /> 🚨 Urgences à traiter en priorité
            </p>
            <div className="space-y-2">
              {pending.filter(r => r.type_rdv === 'urgence').map(rdv => renderApptCard(rdv, 'reception'))}
            </div>
          </div>
        )}

        {/* RDV normaux à valider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              À valider
              {pending.filter(r => r.type_rdv !== 'urgence').length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending.filter(r => r.type_rdv !== 'urgence').length}
                </span>
              )}
            </h3>
            <button onClick={loadData} className="p-1.5 rounded-full hover:bg-gray-100">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-pink-500 animate-spin" /></div>
          ) : pending.filter(r => r.type_rdv !== 'urgence').length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-500 text-sm">Aucun RDV en attente</p>
              <p className="text-xs text-gray-400 mt-1">Tous les rendez-vous ont été traités</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.filter(r => r.type_rdv !== 'urgence').map(rdv => renderApptCard(rdv, 'reception'))}
            </div>
          )}
        </div>

        {/* RDV confirmés en attente de salle */}
        {confirmed.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Confirmés
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{confirmed.length}</span>
            </h3>
            <div className="space-y-2">
              {confirmed.map(rdv => (
                <div key={rdv.id} className="bg-white border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-sm">
                    {rdv.animal_espece === 'Chien' ? '🐕' : rdv.animal_espece === 'Chat' ? '🐈' : '🐾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{[rdv.patient_prenom, rdv.patient_nom].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-gray-400">{rdv.animal_nom} · {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {rdv.heure_rdv?.slice(0,5)}</p>
                  </div>
                  <button onClick={() => setAssignRoom({ apptId: rdv.id, rooms: dashData?.rooms ?? [] })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                    <DoorOpen className="w-3.5 h-3.5" /> Salle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab: Salles & File d'attente ─────────────────────────────────────────────

  const SERVICE_ICONS: Record<string, string> = {
    consultation: '🩺', vaccination: '💉', soins: '🩹',
    chirurgie: '🔪', hospitalisation: '🏥', examens: '🔬', urgence: '🚨',
  }
  const SERVICE_COLORS: Record<string, { header: string; border: string; badge: string }> = {
    urgence:         { header: 'bg-red-50 border-red-200',     border: 'border-red-100',     badge: 'bg-red-100 text-red-700' },
    consultation:    { header: 'bg-pink-50 border-pink-200',   border: 'border-pink-100',    badge: 'bg-pink-100 text-pink-700' },
    vaccination:     { header: 'bg-blue-50 border-blue-200',   border: 'border-blue-100',    badge: 'bg-blue-100 text-blue-700' },
    soins:           { header: 'bg-orange-50 border-orange-200', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700' },
    chirurgie:       { header: 'bg-purple-50 border-purple-200', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
    hospitalisation: { header: 'bg-rose-50 border-rose-200',   border: 'border-rose-100',    badge: 'bg-rose-100 text-rose-700' },
    examens:         { header: 'bg-teal-50 border-teal-200',   border: 'border-teal-100',    badge: 'bg-teal-100 text-teal-700' },
  }
  const STATUT_ROOM: Record<string, { label: string; dot: string; color: string }> = {
    libre:   { label: 'Libre',   dot: 'bg-emerald-400', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    occupee: { label: 'Occupée', dot: 'bg-amber-400',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
    pause:   { label: 'Pause',   dot: 'bg-blue-400',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
    fermee:  { label: 'Fermée',  dot: 'bg-gray-300',    color: 'bg-gray-50 text-gray-500 border-gray-200' },
  }

  function TabSalles() {
    const services: any[] = vetServicesData?.services ?? []
    const totalQueue = (vetServicesData?.queue ?? []).length

    if (loading && !vetServicesData) return (
      <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-pink-500 animate-spin" /></div>
    )

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-pink-500" /> Salles & File d'attente
            </h2>
            {totalQueue > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{totalQueue} patient(s) dans la file globale</p>
            )}
          </div>
          <button onClick={loadData} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 text-sm">Aucune salle configurée</p>
            <p className="text-xs text-gray-400 mt-1">Les salles sont créées automatiquement au démarrage du serveur</p>
          </div>
        ) : (
          <div className="space-y-5">
            {services.map((svc: any) => {
              const colors = SERVICE_COLORS[svc.type] ?? { header: 'bg-gray-50 border-gray-200', border: 'border-gray-100', badge: 'bg-gray-100 text-gray-700' }
              const svcQueueCount = svc.rooms.reduce((acc: number, r: any) => acc + (r.queue_count || 0), 0)

              return (
                <div key={svc.type} className={`rounded-2xl border overflow-hidden shadow-sm ${colors.border}`}>
                  {/* Service header */}
                  <div className={`px-5 py-3 border-b flex items-center justify-between ${colors.header}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{SERVICE_ICONS[svc.type] ?? '🏥'}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{svc.label}</h3>
                        <p className="text-xs text-gray-500">Tarif : {Number(svc.tarif).toLocaleString('fr-FR')} FCFA · {svc.rooms.length} salle{svc.rooms.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {svcQueueCount > 0 && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>
                        {svcQueueCount} en attente
                      </span>
                    )}
                  </div>

                  {/* Rooms */}
                  <div className="bg-white divide-y divide-gray-50">
                    {svc.rooms.map((room: any) => {
                      const s = STATUT_ROOM[room.statut] ?? STATUT_ROOM.libre
                      const called = room.called_patient
                      const inConsultation = room.current_patient
                      const panel = openRoomPanel[room.id] ?? null

                      return (
                        <div key={room.id} className="px-5 py-4">
                          {/* Room header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${s.color}`}>
                                <DoorOpen className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-gray-800 text-sm">{room.nom}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${s.color}`}>{s.label}</span>
                                  {inConsultation && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">En consultation</span>
                                  )}
                                  {called && !inConsultation && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold animate-pulse">Appelé</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {room.en_attente_count > 0
                                    ? `${room.en_attente_count} patient(s) en attente`
                                    : 'File vide'}
                                </p>
                              </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              <select
                                className="text-xs border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-pink-400 bg-white"
                                value={room.statut}
                                onChange={e => handleRoomStatus(room.id, e.target.value)}
                                disabled={actionLoading === `room-${room.id}`}
                              >
                                <option value="libre">Libre</option>
                                <option value="occupee">Occupée</option>
                                <option value="pause">Pause</option>
                                <option value="fermee">Fermée</option>
                              </select>

                              {!called && !inConsultation && (
                                <button
                                  onClick={() => handleNextPatient(room.id)}
                                  disabled={actionLoading === `next-${room.id}` || room.statut === 'fermee' || room.en_attente_count === 0}
                                  className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                  {actionLoading === `next-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
                                  Patient suivant
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Called patient banner */}
                          {called && !inConsultation && (
                            <div className="mt-3 bg-pink-50 border border-pink-200 rounded-xl p-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <p className="text-xs font-bold text-pink-700 flex items-center gap-1.5">
                                    <Bell className="w-3.5 h-3.5" /> Patient appelé
                                  </p>
                                  <p className="text-sm font-bold text-pink-900 mt-0.5">
                                    {called.animal_name || called.owner_name || 'Patient'}
                                    {called.animal_species ? ` (${called.animal_species})` : ''}
                                  </p>
                                  <p className="text-xs text-pink-600">{called.owner_name}</p>
                                  {called.ticket_numero && (
                                    <p className="text-xs text-pink-500 font-mono">#{called.ticket_numero}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-pink-400 mb-1">Temps restant</p>
                                  {called.deadline ? (
                                    <Countdown deadline={called.deadline} />
                                  ) : (
                                    <span className="font-mono font-bold text-sm text-pink-700">5:00</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleStartConsultation(room.id)}
                                  disabled={actionLoading === `start-${room.id}`}
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                  {actionLoading === `start-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  Patient présent
                                </button>
                                <button
                                  onClick={() => handlePatientAbsent(room.id)}
                                  disabled={actionLoading === `absent-${room.id}`}
                                  className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                  {actionLoading === `absent-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                  Absent
                                </button>
                              </div>
                            </div>
                          )}

                          {/* In-consultation panel */}
                          {inConsultation && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                                    <Stethoscope className="w-3.5 h-3.5" /> Consultation en cours
                                  </p>
                                  <p className="text-sm font-bold text-amber-900 mt-0.5">
                                    {inConsultation.animal_name || inConsultation.owner_name || 'Patient'}
                                    {inConsultation.animal_species ? ` (${inConsultation.animal_species})` : ''}
                                  </p>
                                  <p className="text-xs text-amber-600">{inConsultation.owner_name}</p>
                                  {inConsultation.ticket_numero && (
                                    <p className="text-xs text-amber-500 font-mono">#{inConsultation.ticket_numero}</p>
                                  )}
                                </div>
                                {roomActionDone[room.id] && (
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> {roomActionDone[room.id]}
                                  </span>
                                )}
                              </div>

                              {/* Action buttons */}
                              {inConsultation.appointment_id && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {([
                                    { key: 'presc',   label: 'Ordonnance',    icon: FileText,    color: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
                                    { key: 'vaccine', label: 'Vaccin',         icon: Syringe,     color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                                    { key: 'exam',    label: 'Examen',         icon: FlaskConical, color: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' },
                                    { key: 'hosp',    label: 'Hospitalisation',icon: BedDouble,   color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
                                    { key: 'surg',    label: 'Chirurgie',      icon: Scissors,    color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
                                  ] as { key: string; label: string; icon: any; color: string }[]).map(({ key, label, icon: Icon, color }) => (
                                    <button
                                      key={key}
                                      onClick={() => toggleRoomPanel(room.id, key)}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                        panel === key ? color.replace('hover:', '') : color
                                      }`}
                                    >
                                      <Icon className="w-3.5 h-3.5" /> {label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Inline panels */}
                              <div className="mt-3 space-y-2">
                                {panel === 'presc' && inConsultation.appointment_id && (
                                  <PrescriptionPanel
                                    apptId={inConsultation.appointment_id}
                                    onClose={() => toggleRoomPanel(room.id, 'presc')}
                                    onDone={() => { toggleRoomPanel(room.id, 'presc'); setRoomActionDone(p => ({ ...p, [room.id]: 'Ordonnance envoyée' })); loadData() }}
                                  />
                                )}
                                {panel === 'vaccine' && inConsultation.appointment_id && (
                                  <VaccinePanel
                                    apptId={inConsultation.appointment_id}
                                    animalNom={inConsultation.animal_name ?? 'Animal'}
                                    onClose={() => toggleRoomPanel(room.id, 'vaccine')}
                                    onDone={() => { toggleRoomPanel(room.id, 'vaccine'); setRoomActionDone(p => ({ ...p, [room.id]: 'Vaccin enregistré' })); loadData() }}
                                  />
                                )}
                                {panel === 'exam' && inConsultation.appointment_id && (
                                  <ExamPanel
                                    apptId={inConsultation.appointment_id}
                                    onClose={() => toggleRoomPanel(room.id, 'exam')}
                                    onDone={() => { toggleRoomPanel(room.id, 'exam'); setRoomActionDone(p => ({ ...p, [room.id]: 'Examen demandé' })); loadData() }}
                                  />
                                )}
                                {panel === 'hosp' && inConsultation.appointment_id && (
                                  <HospitalizationPanel
                                    apptId={inConsultation.appointment_id}
                                    rooms={dashData?.rooms ?? []}
                                    onClose={() => toggleRoomPanel(room.id, 'hosp')}
                                    onDone={() => { toggleRoomPanel(room.id, 'hosp'); setRoomActionDone(p => ({ ...p, [room.id]: 'Hospitalisation enregistrée' })); loadData() }}
                                  />
                                )}
                                {panel === 'surg' && inConsultation.appointment_id && (
                                  <SurgeryPanel
                                    apptId={inConsultation.appointment_id}
                                    onClose={() => toggleRoomPanel(room.id, 'surg')}
                                    onDone={() => { toggleRoomPanel(room.id, 'surg'); setRoomActionDone(p => ({ ...p, [room.id]: 'Chirurgie recommandée' })); loadData() }}
                                  />
                                )}
                              </div>

                              {/* Fin consultation */}
                              <div className="mt-3 pt-3 border-t border-amber-100">
                                <button
                                  onClick={() => handleFinishConsultation(room.id)}
                                  disabled={actionLoading === `finish-${room.id}`}
                                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                  {actionLoading === `finish-${room.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                  Soins terminés — libérer la salle
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Tab: Consultations ───────────────────────────────────────────────────────

  function TabConsultations() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-pink-500" />
            Consultations en cours
            {confirmed.length > 0 && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{confirmed.length}</span>}
          </h3>
          <button onClick={loadData} className="p-1.5 rounded-full hover:bg-gray-100">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-pink-500 animate-spin" /></div>
        ) : confirmed.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Stethoscope className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 text-sm">Aucune consultation en cours</p>
            <p className="text-xs text-gray-400 mt-1">Les consultations confirmées apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {confirmed.map(rdv => renderApptCard(rdv, 'consultation'))}
          </div>
        )}

        {/* RDV terminés du jour */}
        {done.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
              <CheckCheck className="w-4 h-4 text-teal-500" />
              Terminés aujourd'hui
              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{done.length}</span>
            </h3>
            <div className="space-y-2">
              {done.slice(0, 5).map(rdv => {
                const patientName = [rdv.patient_prenom, rdv.patient_nom].filter(Boolean).join(' ') || 'Propriétaire'
                return (
                  <div key={rdv.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-sm">{rdv.animal_espece === 'Chien' ? '🐕' : '🐾'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-700 text-sm truncate">{patientName}</p>
                      <p className="text-xs text-gray-400">{rdv.animal_nom} · {rdv.service}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{rdv.prix ? `${Number(rdv.prix).toLocaleString('fr-FR')} F` : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab: Caisse ──────────────────────────────────────────────────────────────

  function TabCaisse() {
    const cd = caisseData
    const sw = cd?.solde_wallet ?? walletData?.solde ?? 0

    if (loading && !cd) return (
      <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-pink-500 animate-spin" /></div>
    )

    const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR')

    return (
      <div className="space-y-6">

        {/* Portefeuille principal */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-400 text-white p-6 shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-pink-300/20 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Solde disponible</p>
                <p className="text-4xl font-bold mt-1">{fmt(sw)} <span className="text-xl font-semibold opacity-80">FCFA</span></p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex-1 min-w-[120px]">
                <p className="text-white/70 text-[10px] font-semibold uppercase">Ce mois</p>
                <p className="text-white font-bold text-base mt-0.5">{fmt(cd?.revenus_ce_mois ?? 0)} F</p>
                <p className="text-white/60 text-[10px]">{cd?.rdv_mois_count ?? 0} consultation{(cd?.rdv_mois_count ?? 0) > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex-1 min-w-[120px]">
                <p className="text-white/70 text-[10px] font-semibold uppercase">En séquestre</p>
                <p className="text-white font-bold text-base mt-0.5">{fmt(cd?.en_sequestre ?? 0)} F</p>
                <p className="text-white/60 text-[10px]">{cd?.en_sequestre_count ?? 0} en attente</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex-1 min-w-[120px]">
                <p className="text-white/70 text-[10px] font-semibold uppercase">Aujourd'hui</p>
                <p className="text-white font-bold text-base mt-0.5">{fmt(cd?.aujourd_hui?.total ?? 0)} F</p>
                <p className="text-white/60 text-[10px]">{cd?.aujourd_hui?.count ?? 0} terminée{(cd?.aujourd_hui?.count ?? 0) > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs financiers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Revenus totaux',     sub: 'paiements libérés',      value: `${fmt(cd?.revenus_total ?? 0)} F`,   icon: TrendingUp,   grad: 'from-emerald-500 to-teal-500',    count: cd?.rdv_liberes_count },
            { label: 'Revenu net',         sub: 'après commission 10%',   value: `${fmt(cd?.revenu_net ?? 0)} F`,      icon: ArrowUpRight, grad: 'from-blue-500 to-cyan-500' },
            { label: 'Commission MedMap+', sub: '10% sur libérés',        value: `${fmt(cd?.commission ?? 0)} F`,      icon: Banknote,     grad: 'from-purple-500 to-violet-500' },
            { label: 'À valider',          sub: 'paiements en attente',   value: `${fmt(cd?.paiements_en_attente?.total ?? 0)} F`, icon: Clock, grad: 'from-amber-500 to-orange-500', count: cd?.paiements_en_attente?.count },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {s.sub}{s.count !== undefined && s.count > 0 ? ` · ${s.count} RDV` : ''}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Commission info */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-900 text-sm">Fonctionnement des paiements</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-purple-700">
              <div className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span><span>Le client paie → argent <strong>bloqué en séquestre</strong></span></div>
              <div className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span><span>Consultation terminée → paiement <strong>libéré</strong></span></div>
              <div className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span><span>Vous recevez <strong>90%</strong> — MedMap+ prend 10%</span></div>
            </div>
          </div>
        </div>

        {/* Répartition par type de soin */}
        {cd?.par_service && cd.par_service.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-500" /> Répartition par type de soin
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {cd.par_service.map((s: any, i: number) => {
                  const totalBrut = parseFloat(s.total_brut)
                  const totalLibere = parseFloat(s.total_libere)
                  const pct = totalBrut > 0 ? Math.round((totalLibere / totalBrut) * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-sm flex-shrink-0">
                        {s.service?.toLowerCase().includes('vaccin') ? '💉' :
                         s.service?.toLowerCase().includes('chirurgie') ? '🔪' :
                         s.service?.toLowerCase().includes('urgence') ? '🚨' :
                         s.service?.toLowerCase().includes('examen') ? '🔬' :
                         s.service?.toLowerCase().includes('hospital') ? '🏥' : '🩺'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-800 text-sm capitalize truncate">{s.service}</p>
                          <p className="font-bold text-gray-900 text-sm ml-2 flex-shrink-0">{fmt(totalBrut)} F</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{s.count} RDV · {pct}% libéré</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Historique des paiements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Historique des paiements
            </h3>
            <button onClick={loadData} className="p-1.5 rounded-full hover:bg-gray-100">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!cd?.historique || cd.historique.length === 0 ? (
              <div className="text-center py-10">
                <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cd.historique.map((t: any) => {
                  const statut = t.paiement_statut
                  const dotColor = statut === 'libere' ? 'bg-emerald-400' : statut === 'bloque' ? 'bg-amber-400' : statut === 'rembourse' ? 'bg-red-400' : 'bg-gray-300'
                  const labelColor = statut === 'libere' ? 'text-emerald-700 bg-emerald-50' : statut === 'bloque' ? 'text-amber-700 bg-amber-50' : statut === 'rembourse' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
                  const labelText = statut === 'libere' ? 'Libéré' : statut === 'bloque' ? 'Séquestre' : statut === 'rembourse' ? 'Remboursé' : statut ?? '—'
                  const netAmount = statut === 'libere' ? Math.round(parseFloat(t.prix) * 0.9) : null
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                      <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-sm flex-shrink-0">
                        {t.type_rdv === 'urgence' ? '🚨' :
                         t.service?.toLowerCase().includes('vaccin') ? '💉' :
                         t.service?.toLowerCase().includes('examen') ? '🔬' : '🩺'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {t.patient_prenom} {t.patient_nom}
                          </p>
                          {t.animal_nom && <span className="text-xs text-pink-600">— {t.animal_nom}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(t.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {t.service ? ` · ${t.service}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className="font-bold text-gray-900 text-sm">{fmt(parseFloat(t.prix))} F</p>
                        {netAmount !== null && (
                          <p className="text-[10px] text-gray-400">Net : {fmt(netAmount)} F</p>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${labelColor}`}>{labelText}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    )
  }

  // ── Render principal ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 py-8 px-4 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-300/20 rounded-full blur-3xl" />
          <div className="max-w-5xl mx-auto relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🐾</span>
              <p className="text-white/70 text-xs font-medium">Espace Vétérinaire</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{vetName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {dashData?.structure?.ville && (
                <span className="flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 font-semibold">
                  <MapPin className="w-3 h-3" /> {dashData.structure.ville}
                </span>
              )}
              {pending.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-amber-400/80 rounded-full px-3 py-1 font-bold animate-pulse">
                  🔔 {pending.length} RDV à valider
                </span>
              )}
              {(dashData?.queue?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-white/20 rounded-full px-3 py-1 font-semibold">
                  <Users className="w-3 h-3" /> {dashData.queue.length} en attente
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-0 overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon
                const isActive = dashTab === t.key
                return (
                  <button key={t.key} onClick={() => setDashTab(t.key)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all relative flex-shrink-0 ${
                      isActive
                        ? 'border-pink-600 text-pink-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {t.label}
                    {t.badge !== undefined && t.badge > 0 && (
                      <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                        isActive ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>{t.badge}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={dashTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {dashTab === 'apercu'        && <TabApercu />}
              {dashTab === 'reception'     && <TabReception />}
              {dashTab === 'salles'        && <TabSalles />}
              {dashTab === 'consultations' && <TabConsultations />}
              {dashTab === 'caisse'        && <TabCaisse />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Messaging */}
      {chat && user && (
        <ConversationPanel
          isOpen={!!chat}
          onClose={() => setChat(null)}
          currentUserId={user.id}
          otherUserId={chat.patientUserId}
          otherUserName={chat.patientName}
          contextType="appointment"
          contextId={chat.apptId}
          contextLabel={`RDV animal #${chat.apptId}`}
        />
      )}

      {/* Assign room modal */}
      {assignRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setAssignRoom(null) }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-amber-500" /> Attribuer une salle
              </h3>
              <button onClick={() => setAssignRoom(null)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {assignRoom.rooms.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucune salle configurée</p>
              ) : (
                assignRoom.rooms.map((room: any) => (
                  <button key={room.id} disabled={assigningSaving || room.statut === 'fermee'}
                    onClick={async () => {
                      setAssigningSaving(true)
                      try {
                        await vetApi.assignRoom(assignRoom.apptId, room.id)
                        await loadData()
                        setAssignRoom(null)
                        setDashTab('salles')
                      } catch {} finally { setAssigningSaving(false) }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                      room.statut === 'libre' ? 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                      : room.statut === 'occupee' ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      room.statut === 'libre' ? 'bg-emerald-400' : room.statut === 'occupee' ? 'bg-amber-400' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-800">{room.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROOM_TYPE_COLORS[room.type] || 'bg-gray-100 text-gray-600'}`}>
                          {ROOM_TYPE_LABELS[room.type] || room.type}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {room.statut === 'libre' ? 'Disponible' : room.statut === 'occupee' ? 'En cours' : 'Fermée'}
                          {room.queue_count > 0 && ` · ${room.queue_count} en attente`}
                        </span>
                      </div>
                    </div>
                    {room.type === 'urgence' && <Zap className="w-4 h-4 text-red-500" />}
                    {assigningSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
