'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { animals as animalsApi, appointments as appointmentsApi } from '@/lib/api'
import {
  PawPrint, Plus, ChevronLeft, RefreshCw, Loader2, AlertCircle,
  Calendar, Syringe, FileText, FlaskConical, BedDouble, Scissors,
  Bell, Info, Stethoscope, X, Edit2, Trash2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Animal {
  id: number
  name: string
  species: string
  breed: string | null
  age: number | null
  weight: string | null
  gender: string
  notes: string | null
  created_at: string
}

interface Dossier extends Animal {
  consultations: any[]
  prescriptions: any[]
  vaccins: any[]
  examens: any[]
  hospitalisations: any[]
  chirurgies: any[]
  rappels: any[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SPECIES = ['Chien', 'Chat', 'Oiseau', 'Lapin', 'Reptile', 'Autre']

const SPECIES_EMOJI: Record<string, string> = {
  Chien: '🐕', Chat: '🐈', Oiseau: '🐦', Lapin: '🐇', Reptile: '🦎', Autre: '🐾',
}

const SPECIES_GRADIENT: Record<string, string> = {
  Chien: 'from-amber-400 to-orange-500',
  Chat: 'from-purple-400 to-pink-500',
  Oiseau: 'from-sky-400 to-blue-500',
  Lapin: 'from-rose-400 to-pink-500',
  Reptile: 'from-green-400 to-emerald-500',
  Autre: 'from-gray-400 to-slate-500',
}

const TABS = [
  { key: 'consultations', label: 'Consultations', icon: Stethoscope },
  { key: 'prescriptions', label: 'Ordonnances', icon: FileText },
  { key: 'vaccins', label: 'Vaccins', icon: Syringe },
  { key: 'examens', label: 'Examens', icon: FlaskConical },
  { key: 'hospitalisations', label: 'Hospitalisations', icon: BedDouble },
  { key: 'chirurgies', label: 'Chirurgies', icon: Scissors },
  { key: 'rappels', label: 'Rappels', icon: Bell },
  { key: 'infos', label: 'Infos', icon: Info },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{text}</span>
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">Aucun(e) {label} enregistré(e)</p>
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '—'}</span>
    </div>
  )
}

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; color: string }> = {
    termine: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
    confirme: { label: 'Confirmé', color: 'bg-blue-100 text-blue-700' },
    en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    annule: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
    en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-700' },
  }
  const s = map[statut] ?? { label: statut ?? '—', color: 'bg-gray-100 text-gray-600' }
  return <Badge text={s.label} color={s.color} />
}

// ── Modal: Ajouter / Modifier un animal ────────────────────────────────────────

function AnimalModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Animal
  onSave: (data: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          species: initial.species,
          breed: initial.breed ?? '',
          age: initial.age != null ? String(initial.age) : '',
          weight: initial.weight != null ? String(parseFloat(initial.weight)) : '',
          gender: initial.gender,
          notes: initial.notes ?? '',
        }
      : { name: '', species: 'Chien', breed: '', age: '', weight: '', gender: 'Mâle', notes: '' }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Le nom est requis'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        gender: form.gender,
        notes: form.notes.trim() || undefined,
      })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-800">{initial ? "Modifier l'animal" : 'Ajouter un animal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Polo" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Espèce</label>
            <select className={inp + ' bg-white'} value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))}>
              {SPECIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Race</label>
            <input className={inp} value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="Ex: Berger Malinois" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge (ans)</label>
              <input type="number" min={0} max={50} className={inp} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Ex: 3" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Poids (kg)</label>
              <input type="number" min={0} step="0.1" className={inp} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="Ex: 27" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sexe</label>
            <select className={inp + ' bg-white'} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              {['Mâle', 'Femelle', 'Inconnu'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea className={inp + ' resize-none'} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informations complémentaires..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Animal Card ────────────────────────────────────────────────────────────────

function AnimalCard({
  animal,
  onOpen,
  onEdit,
  onDelete,
  onVet,
}: {
  animal: Animal
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onVet: () => void
}) {
  const grad = SPECIES_GRADIENT[animal.species] ?? 'from-gray-400 to-slate-500'
  const emoji = SPECIES_EMOJI[animal.species] ?? '🐾'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className={`bg-gradient-to-br ${grad} px-5 py-6 text-white`}>
        <div className="text-4xl mb-2">{emoji}</div>
        <h3 className="text-xl font-bold capitalize">{animal.name}</h3>
        <p className="text-white/80 text-sm">{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</p>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {animal.age != null && <Badge text={`${animal.age} ans`} color="bg-orange-50 text-orange-700" />}
          {animal.weight && <Badge text={`${parseFloat(animal.weight)} kg`} color="bg-blue-50 text-blue-700" />}
          {animal.gender && animal.gender !== 'Inconnu' && (
            <Badge text={animal.gender} color="bg-purple-50 text-purple-700" />
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onOpen} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">
            Voir le dossier
          </button>
          <button onClick={onVet} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100">
            RDV vétérinaire
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={onEdit} className="flex-1 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1">
            <Edit2 className="w-3 h-3" /> Modifier
          </button>
          <button onClick={onDelete} className="flex-1 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-50 flex items-center justify-center gap-1">
            <Trash2 className="w-3 h-3" /> Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dossier View ───────────────────────────────────────────────────────────────

function DossierView({
  dossier,
  onBack,
  onEdit,
  onVet,
  onRefresh,
}: {
  dossier: Dossier
  onBack: () => void
  onEdit: () => void
  onVet: () => void
  onRefresh: () => void
}) {
  const [tab, setTab] = useState('consultations')
  const [confirming, setConfirming] = useState<number | null>(null)

  async function confirmConsultation(apptId: number) {
    setConfirming(apptId)
    try {
      await appointmentsApi.patientConfirm(apptId)
      onRefresh()
    } catch {}
    setConfirming(null)
  }
  const grad = SPECIES_GRADIENT[dossier.species] ?? 'from-gray-400 to-slate-500'
  const emoji = SPECIES_EMOJI[dossier.species] ?? '🐾'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${grad} text-white px-6 pt-6 pb-8`}>
        <button onClick={onBack} className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4">
          <ChevronLeft className="w-4 h-4" /> Mes animaux
        </button>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl mb-2">{emoji}</div>
            <h1 className="text-2xl font-bold capitalize">{dossier.name}</h1>
            <p className="text-white/80 text-sm mt-0.5">
              {dossier.species}{dossier.breed ? ` · ${dossier.breed}` : ''}{dossier.age != null ? ` · ${dossier.age} ans` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 rounded-xl bg-white/20 hover:bg-white/30">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onVet} className="py-2 px-4 rounded-xl bg-white text-gray-800 text-sm font-semibold hover:bg-white/90">
              RDV vétérinaire
            </button>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-white/90 text-xs">
          <span>{dossier.consultations.length} consultation(s)</span>
          <span>{dossier.vaccins.length} vaccin(s)</span>
          <span>{dossier.prescriptions.length} ordonnance(s)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex px-4 min-w-max">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">

        {tab === 'consultations' && (
          dossier.consultations.length === 0 ? <Empty label="consultation vétérinaire" /> :
          dossier.consultations.map((c, i) => {
            const needsConfirm = c.statut === 'termine' && c.consultation_statut === 'effectuee'
            const isConfirmed = c.consultation_statut === 'confirmee' || c.paiement_statut === 'libere'
            return (
              <div key={i} className={`bg-white rounded-xl p-4 border shadow-sm ${needsConfirm ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.service || c.type_rdv || 'Consultation vétérinaire'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(c.date_rdv)}{c.heure_rdv ? ` à ${c.heure_rdv}` : ''}</p>
                    {(c.vet_nom || c.vet_prenom) && <p className="text-xs text-gray-500">Dr {c.vet_prenom} {c.vet_nom}</p>}
                    {c.structure_nom && <p className="text-xs text-gray-400">{c.structure_nom}</p>}
                    {c.type_rdv === 'urgence' && <Badge text="Urgence" color="bg-red-100 text-red-700" />}
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge statut={c.statut} />
                    {c.paiement_statut === 'bloque' && <Badge text="Séquestre" color="bg-yellow-100 text-yellow-700" />}
                    {c.paiement_statut === 'libere' && <Badge text="Payé ✓" color="bg-green-100 text-green-700" />}
                    {c.prix != null && <p className="text-xs text-gray-500">{Number(c.prix).toLocaleString()} FCFA</p>}
                  </div>
                </div>
                {c.motif && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">{c.motif}</p>}
                {needsConfirm && (
                  <div className="mt-3 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <div className="flex-1 text-xs text-orange-700">
                      La consultation est terminée. Confirmez pour libérer le paiement.
                    </div>
                    <button
                      onClick={() => confirmConsultation(c.id)}
                      disabled={confirming === c.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-60"
                    >
                      {confirming === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Confirmer
                    </button>
                  </div>
                )}
                {isConfirmed && c.statut === 'termine' && (
                  <p className="text-xs text-green-600 mt-2 font-medium">✓ Consultation confirmée — paiement libéré</p>
                )}
              </div>
            )
          })
        )}

        {tab === 'prescriptions' && (
          dossier.prescriptions.length === 0 ? <Empty label="ordonnance" /> :
          dossier.prescriptions.map((p, i) => {
            let meds: any[] = []
            try { meds = typeof p.medicaments === 'string' ? JSON.parse(p.medicaments) : (p.medicaments ?? []) } catch {}
            return (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Ordonnance vétérinaire</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(p.created_at)}</p>
                    {(p.vet_nom || p.vet_prenom) && <p className="text-xs text-gray-500">Dr {p.vet_prenom} {p.vet_nom}</p>}
                  </div>
                </div>
                {meds.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {meds.map((m: any, j: number) => (
                      <div key={j} className="bg-orange-50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="font-semibold text-orange-800">{m.nom}</span>
                        {m.dosage && <span className="text-orange-600"> · {m.dosage}</span>}
                        {m.frequence && <span className="text-gray-600"> · {m.frequence}</span>}
                        {m.duree && <span className="text-gray-500"> · {m.duree}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {p.consignes && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">Consignes : {p.consignes}</p>}
                {p.recommandations && <p className="text-xs text-gray-500 mt-1">Recommandations : {p.recommandations}</p>}
              </div>
            )
          })
        )}

        {tab === 'vaccins' && (
          dossier.vaccins.length === 0 ? <Empty label="vaccin" /> :
          dossier.vaccins.map((v, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{v.nom || v.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Administré le {fmt(v.date_admin)}</p>
                  {v.prochaine_date && <p className="text-xs text-orange-600 mt-0.5">Prochain rappel : {fmt(v.prochaine_date)}</p>}
                  {v.veterinaire_nom && <p className="text-xs text-gray-400">Dr {v.veterinaire_nom}</p>}
                </div>
                {v.lot && <Badge text={`Lot: ${v.lot}`} color="bg-gray-100 text-gray-600" />}
              </div>
              {v.notes && <p className="text-xs text-gray-500 mt-2">{v.notes}</p>}
            </div>
          ))
        )}

        {tab === 'examens' && (
          dossier.examens.length === 0 ? <Empty label="examen" /> :
          dossier.examens.map((e, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{e.type_examen}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt(e.created_at)}</p>
                  {(e.vet_nom || e.vet_prenom) && <p className="text-xs text-gray-500">Dr {e.vet_prenom} {e.vet_nom}</p>}
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge statut={e.statut} />
                  {e.prix != null && <p className="text-xs text-gray-500">{Number(e.prix).toLocaleString()} FCFA</p>}
                </div>
              </div>
              {e.description && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">{e.description}</p>}
            </div>
          ))
        )}

        {tab === 'hospitalisations' && (
          dossier.hospitalisations.length === 0 ? <Empty label="hospitalisation" /> :
          dossier.hospitalisations.map((h, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Hospitalisation animale</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt(h.created_at)}</p>
                  {(h.vet_nom || h.vet_prenom) && <p className="text-xs text-gray-500">Dr {h.vet_prenom} {h.vet_nom}</p>}
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge statut={h.statut} />
                  {h.prix != null && <p className="text-xs text-gray-500">{Number(h.prix).toLocaleString()} FCFA</p>}
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                {h.motif && <p className="text-xs text-gray-600">Motif : {h.motif}</p>}
                {h.duree_estimee && <p className="text-xs text-gray-500">Durée estimée : {h.duree_estimee}</p>}
                {h.salle && <p className="text-xs text-gray-500">Salle : {h.salle}</p>}
              </div>
            </div>
          ))
        )}

        {tab === 'chirurgies' && (
          dossier.chirurgies.length === 0 ? <Empty label="chirurgie" /> :
          dossier.chirurgies.map((c, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.type_chirurgie}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt(c.created_at)}</p>
                  {(c.vet_nom || c.vet_prenom) && <p className="text-xs text-gray-500">Dr {c.vet_prenom} {c.vet_nom}</p>}
                </div>
                <div className="text-right space-y-1">
                  {c.urgence && c.urgence !== 'normal' && (
                    <Badge
                      text={c.urgence === 'tres_urgent' ? 'Très urgent' : 'Urgent'}
                      color={c.urgence === 'tres_urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                    />
                  )}
                  {c.prix != null && <p className="text-xs text-gray-500">{Number(c.prix).toLocaleString()} FCFA</p>}
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                {c.motif && <p className="text-xs text-gray-600">Motif : {c.motif}</p>}
                {c.observations && <p className="text-xs text-gray-500">Observations : {c.observations}</p>}
                {c.recommandations && <p className="text-xs text-gray-500">Recommandations : {c.recommandations}</p>}
              </div>
            </div>
          ))
        )}

        {tab === 'rappels' && (
          dossier.rappels.length === 0 ? <Empty label="rappel MediA" /> :
          dossier.rappels.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{r.medicament_nom}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.horaire}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(r.date_debut)} → {r.date_fin ? fmt(r.date_fin) : 'en cours'}</p>
                </div>
                <Badge
                  text={r.actif ? 'Actif' : 'Terminé'}
                  color={r.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                />
              </div>
              {r.description && <p className="text-xs text-gray-500 mt-2">{r.description}</p>}
            </div>
          ))
        )}

        {tab === 'infos' && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <Row label="Nom" value={dossier.name} />
            <Row label="Espèce" value={dossier.species} />
            <Row label="Race" value={dossier.breed} />
            <Row label="Âge" value={dossier.age != null ? `${dossier.age} ans` : null} />
            <Row label="Poids" value={dossier.weight ? `${parseFloat(dossier.weight)} kg` : null} />
            <Row label="Sexe" value={dossier.gender} />
            <Row label="Enregistré le" value={fmt(dossier.created_at)} />
            {dossier.notes && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{dossier.notes}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MesAnimaux() {
  const router = useRouter()
  const [animalList, setAnimalList] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [dossierLoading, setDossierLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Animal | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Animal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await animalsApi.list()
      setAnimalList(data)
    } catch (e: any) {
      setError(e.message || 'Impossible de charger vos animaux')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function openDossier(animal: Animal) {
    setDossierLoading(true)
    setError('')
    try {
      const data = await animalsApi.get(animal.id)
      setDossier(data)
    } catch (e: any) {
      setError(e.message || 'Impossible de charger le dossier')
    } finally {
      setDossierLoading(false)
    }
  }

  async function handleSave(data: any) {
    if (editing) {
      const updated = await animalsApi.update(editing.id, data)
      setAnimalList(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a))
      if (dossier?.id === editing.id) setDossier(prev => prev ? { ...prev, ...updated } : prev)
    } else {
      const created = await animalsApi.create(data)
      setAnimalList(prev => [created, ...prev])
    }
    setShowModal(false)
    setEditing(null)
  }

  async function handleDelete(animal: Animal) {
    setDeleting(true)
    try {
      await animalsApi.delete(animal.id)
      setAnimalList(prev => prev.filter(a => a.id !== animal.id))
      if (dossier?.id === animal.id) setDossier(null)
      setConfirmDelete(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  function goToVet(animal: Animal) {
    sessionStorage.setItem('vet_preselect_animal', JSON.stringify({
      id: animal.id,
      name: animal.name,
      species: animal.species,
      breed: animal.breed,
    }))
    router.push('/veterinaire')
  }

  // ── Dossier view ──
  if (dossier) {
    return (
      <>
        <Navbar />
        {dossierLoading
          ? (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          )
          : (
            <>
              <DossierView
                dossier={dossier}
                onBack={() => setDossier(null)}
                onEdit={() => { setEditing(dossier); setShowModal(true) }}
                onVet={() => goToVet(dossier)}
                onRefresh={() => openDossier(dossier)}
              />
              {showModal && (
                <AnimalModal
                  initial={editing ?? undefined}
                  onSave={handleSave}
                  onClose={() => { setShowModal(false); setEditing(null) }}
                />
              )}
            </>
          )}
      </>
    )
  }

  // ── List view ──
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">

        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-10 text-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <PawPrint className="w-7 h-7" />
              <h1 className="text-2xl font-bold">Mes animaux</h1>
            </div>
            <p className="text-white/80 text-sm">Suivi de la santé vétérinaire de vos compagnons</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 flex items-start gap-2 text-xs text-blue-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
            <span>
              Espace réservé à la santé animale.{' '}
              <button onClick={() => router.push('/mon-espace')} className="underline font-semibold">
                Mon espace santé
              </button>{' '}
              contient vos consultations médicales personnelles.
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-gray-700">
              {animalList.length} animal{animalList.length !== 1 ? 'x' : ''} enregistré{animalList.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button onClick={load} className="p-2 rounded-xl text-gray-400 hover:bg-white hover:text-gray-600">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditing(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" /> Ajouter un animal
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
            </div>
          )}

          {/* Dossier loading overlay */}
          {dossierLoading && (
            <div className="fixed inset-0 z-40 bg-white/70 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && animalList.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <PawPrint className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun animal enregistré</h3>
              <p className="text-sm text-gray-500 mb-6">
                Ajoutez vos animaux pour suivre leurs vaccinations, ordonnances et consultations vétérinaires.
              </p>
              <button
                onClick={() => { setEditing(null); setShowModal(true) }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600"
              >
                <Plus className="w-5 h-5" /> Ajouter mon premier animal
              </button>
            </div>
          )}

          {/* Animal grid */}
          {!loading && animalList.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {animalList.map(animal => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  onOpen={() => openDossier(animal)}
                  onEdit={() => { setEditing(animal); setShowModal(true) }}
                  onDelete={() => setConfirmDelete(animal)}
                  onVet={() => goToVet(animal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <AnimalModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">Supprimer {confirmDelete.name} ?</h3>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
