'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  PawPrint, Plus, Trash2, X, Loader2, AlertCircle,
  Syringe, CalendarDays, ClipboardList, Bell, ChevronRight,
  Pencil, Heart, Scale, VenetianMask, ArrowRight,
} from 'lucide-react'

// ── API helpers ──────────────────────────────────────────────────────────────
const ANIMALS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace('/v1', '')

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('medmap_token')
}

async function apiGet(path: string) {
  const res = await fetch(`${ANIMALS_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`)
  return data
}

async function apiPost(path: string, body: object) {
  const res = await fetch(`${ANIMALS_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`)
  return data
}

async function apiPut(path: string, body: object) {
  const res = await fetch(`${ANIMALS_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`)
  return data
}

async function apiDelete(path: string) {
  const res = await fetch(`${ANIMALS_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Erreur ${res.status}`)
  }
}

// ── Species config ───────────────────────────────────────────────────────────
const SPECIES = [
  { value: 'Chien',  emoji: '🐕', color: 'from-orange-400 to-amber-500' },
  { value: 'Chat',   emoji: '🐈', color: 'from-purple-400 to-violet-500' },
  { value: 'Oiseau', emoji: '🐦', color: 'from-sky-400 to-blue-500' },
  { value: 'Lapin',  emoji: '🐇', color: 'from-pink-400 to-rose-500' },
  { value: 'Autre',  emoji: '🐾', color: 'from-teal-400 to-emerald-500' },
]

function speciesInfo(s: string) {
  return SPECIES.find(x => x.value === s) ?? SPECIES[4]
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function statusBadge(statut: string) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    confirme: 'Confirmé',
    termine: 'Terminé',
    annule: 'Annulé',
  }
  const colors: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    confirme: 'bg-blue-100 text-blue-700',
    termine: 'bg-green-100 text-green-700',
    annule: 'bg-gray-100 text-gray-500',
  }
  return { label: map[statut] ?? statut, color: colors[statut] ?? 'bg-gray-100 text-gray-500' }
}

// ── Dossier Panel ────────────────────────────────────────────────────────────
type Tab = 'info' | 'vaccins' | 'consultations' | 'rappels'

function DossierPanel({
  animal,
  onClose,
  onUpdated,
  onOpenRdv,
}: {
  animal: any
  onClose: () => void
  onUpdated: (a: any) => void
  onOpenRdv: (a: any) => void
}) {
  const [tab, setTab] = useState<Tab>('info')
  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showAddVaccine, setShowAddVaccine] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const sp = speciesInfo(animal.species)

  const loadDossier = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await apiGet(`/animals/${animal.id}`)
      setDossier(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [animal.id])

  useEffect(() => { loadDossier() }, [loadDossier])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info',          label: 'Infos',         icon: <PawPrint className="w-4 h-4" /> },
    { key: 'vaccins',       label: 'Vaccins',        icon: <Syringe className="w-4 h-4" /> },
    { key: 'consultations', label: 'Consultations',  icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'rappels',       label: 'Rappels',        icon: <Bell className="w-4 h-4" /> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`bg-gradient-to-br ${sp.color} p-6 text-white flex-shrink-0`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{sp.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {animal.name}
                </h2>
                <p className="text-white/80 text-sm">
                  {animal.species}{animal.breed ? ` · ${animal.breed}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { icon: <Heart className="w-3.5 h-3.5" />, label: 'Âge', value: animal.age ? `${animal.age} an${animal.age > 1 ? 's' : ''}` : '—' },
              { icon: <Scale className="w-3.5 h-3.5" />, label: 'Poids', value: animal.weight ? `${animal.weight} kg` : '—' },
              { icon: <VenetianMask className="w-3.5 h-3.5" />, label: 'Genre', value: animal.gender || '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-white/20 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-white/70 mb-1">
                  {icon}
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onOpenRdv(animal)}
              className="flex-1 bg-white text-gray-800 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-white/90"
            >
              <CalendarDays className="w-4 h-4 text-orange-500" />
              Prendre RDV
            </button>
            <button
              onClick={() => { setShowEdit(true) }}
              className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                tab === t.key
                  ? 'border-orange-400 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
            </div>
          ) : err ? (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{err}</p>
            </div>
          ) : (
            <>
              {/* ── INFO ── */}
              {tab === 'info' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">Fiche d'identité</h3>
                  <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
                    {[
                      { label: 'Nom', value: dossier?.name },
                      { label: 'Espèce', value: dossier?.species },
                      { label: 'Race', value: dossier?.breed || '—' },
                      { label: 'Âge', value: dossier?.age ? `${dossier.age} an${dossier.age > 1 ? 's' : ''}` : '—' },
                      { label: 'Poids', value: dossier?.weight ? `${dossier.weight} kg` : '—' },
                      { label: 'Genre', value: dossier?.gender || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className="text-sm font-semibold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                  {dossier?.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <p className="text-xs font-bold text-amber-600 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{dossier.notes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Enregistré le {formatDate(dossier?.created_at)}
                  </p>
                </div>
              )}

              {/* ── VACCINS ── */}
              {tab === 'vaccins' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Vaccinations</h3>
                    <button
                      onClick={() => setShowAddVaccine(true)}
                      className="flex items-center gap-1.5 bg-orange-50 text-orange-600 font-semibold text-sm px-3 py-1.5 rounded-xl hover:bg-orange-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>

                  {!dossier?.vaccines?.length ? (
                    <div className="text-center py-10 text-gray-400">
                      <Syringe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Aucun vaccin enregistré</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dossier.vaccines.map((v: any) => (
                        <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{v.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Administré le {formatDate(v.date_admin)}</p>
                              {v.vet_name && <p className="text-xs text-gray-400">Dr {v.vet_name}</p>}
                            </div>
                            {v.next_date && (
                              <div className="text-right">
                                <p className="text-xs text-orange-500 font-semibold">Rappel</p>
                                <p className="text-xs text-gray-600">{formatDate(v.next_date)}</p>
                              </div>
                            )}
                          </div>
                          {v.lot && <p className="text-xs text-gray-400 mt-2">Lot: {v.lot}</p>}
                          {v.notes && <p className="text-xs text-gray-500 mt-1 italic">{v.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CONSULTATIONS ── */}
              {tab === 'consultations' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">Consultations vétérinaires</h3>

                  {!dossier?.appointments?.length ? (
                    <div className="text-center py-10 text-gray-400">
                      <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Aucune consultation enregistrée</p>
                      <button
                        onClick={() => onOpenRdv(animal)}
                        className="mt-4 flex items-center gap-2 mx-auto bg-orange-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-orange-600"
                      >
                        Prendre un rendez-vous <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dossier.appointments.map((a: any) => {
                        const { label, color } = statusBadge(a.statut)
                        return (
                          <div key={a.appointment_id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-bold text-gray-800 text-sm">{a.service || 'Consultation'}</p>
                                {a.structure_nom && (
                                  <p className="text-xs text-gray-400">{a.structure_nom}</p>
                                )}
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${color}`}>{label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{formatDate(a.date_rdv)}</span>
                              {a.heure_rdv && <span>à {a.heure_rdv}</span>}
                              {a.prix && <span className="font-semibold text-gray-700">{a.prix} FCFA</span>}
                            </div>
                            {a.motif && <p className="text-xs text-gray-500 mt-1 italic">{a.motif}</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── RAPPELS ── */}
              {tab === 'rappels' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">Rappels & prochaines échéances</h3>

                  {/* Vaccine reminders */}
                  {dossier?.vaccines?.filter((v: any) => v.next_date).length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rappels vaccins</p>
                      {dossier.vaccines
                        .filter((v: any) => v.next_date)
                        .sort((a: any, b: any) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime())
                        .map((v: any) => {
                          const days = Math.ceil((new Date(v.next_date).getTime() - Date.now()) / 86400000)
                          const urgent = days <= 30
                          return (
                            <div
                              key={v.id}
                              className={`flex items-center gap-4 p-4 rounded-2xl border ${
                                urgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'
                              }`}
                            >
                              <Syringe className={`w-5 h-5 flex-shrink-0 ${urgent ? 'text-red-500' : 'text-blue-500'}`} />
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-800">{v.name}</p>
                                <p className="text-xs text-gray-500">{formatDate(v.next_date)}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                urgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {days > 0 ? `J−${days}` : days === 0 ? "Auj." : "Dépassé"}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Aucun rappel programmé</p>
                      <p className="text-xs mt-1">
                        Ajoutez une date de rappel lors de l'enregistrement d'un vaccin.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Vaccine Modal */}
      {showAddVaccine && (
        <AddVaccineModal
          animalId={animal.id}
          onClose={() => setShowAddVaccine(false)}
          onAdded={() => { setShowAddVaccine(false); loadDossier() }}
        />
      )}

      {/* Edit Animal Modal */}
      {showEdit && (
        <EditAnimalModal
          animal={animal}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => { setShowEdit(false); onUpdated(updated); loadDossier() }}
        />
      )}
    </div>
  )
}

// ── AddVaccineModal ──────────────────────────────────────────────────────────
function AddVaccineModal({
  animalId,
  onClose,
  onAdded,
}: {
  animalId: number
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [dateAdmin, setDateAdmin] = useState(new Date().toISOString().slice(0, 10))
  const [nextDate, setNextDate] = useState('')
  const [vetName, setVetName] = useState('')
  const [lot, setLot] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Nom du vaccin requis.'); return }
    setSaving(true)
    setErr('')
    try {
      await apiPost(`/animals/${animalId}/vaccines`, {
        name: name.trim(),
        date_admin: dateAdmin,
        next_date: nextDate || undefined,
        vet_name: vetName.trim() || undefined,
        lot: lot.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onAdded()
    } catch (e: any) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Ajouter un vaccin
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Nom du vaccin <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Rage, Carré, Parvo…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Date d'admin.</label>
              <input
                type="date"
                value={dateAdmin}
                onChange={e => setDateAdmin(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Prochain rappel</label>
              <input
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Vétérinaire</label>
            <input
              value={vetName}
              onChange={e => setVetName(e.target.value)}
              placeholder="Nom du vétérinaire"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">N° de lot</label>
              <input
                value={lot}
                onChange={e => setLot(e.target.value)}
                placeholder="Ex: A12345"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Remarques…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── EditAnimalModal ──────────────────────────────────────────────────────────
function EditAnimalModal({
  animal,
  onClose,
  onUpdated,
}: {
  animal: any
  onClose: () => void
  onUpdated: (a: any) => void
}) {
  const [name, setName] = useState(animal.name || '')
  const [species, setSpecies] = useState(animal.species || 'Chien')
  const [breed, setBreed] = useState(animal.breed || '')
  const [age, setAge] = useState(animal.age ? String(animal.age) : '')
  const [weight, setWeight] = useState(animal.weight ? String(animal.weight) : '')
  const [gender, setGender] = useState(animal.gender || 'Inconnu')
  const [notes, setNotes] = useState(animal.notes || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Le nom est requis.'); return }
    setSaving(true)
    setErr('')
    try {
      const updated = await apiPut(`/animals/${animal.id}`, {
        name: name.trim(), species, breed: breed.trim() || undefined,
        age: age ? Number(age) : undefined,
        weight: weight ? Number(weight) : undefined,
        gender, notes: notes.trim() || undefined,
      })
      onUpdated(updated)
    } catch (e: any) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Modifier {animal.name}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Espèce</label>
            <div className="flex gap-2 flex-wrap">
              {SPECIES.map(s => (
                <button key={s.value} type="button" onClick={() => setSpecies(s.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    species === s.value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}>
                  <span>{s.emoji}</span> {s.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Race</label>
            <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Ex: Berger Malinois, Persan…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Âge (ans)</label>
              <input type="number" min="0" max="50" value={age} onChange={e => setAge(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Poids (kg)</label>
              <input type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Genre</label>
            <div className="flex gap-2">
              {['Mâle', 'Femelle', 'Inconnu'].map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    gender === g ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Informations particulières, allergies, traitements en cours…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── AnimalCard ───────────────────────────────────────────────────────────────
function AnimalCard({
  animal,
  onDelete,
  onOpenDossier,
  onOpenRdv,
}: {
  animal: any
  onDelete: (id: number) => void
  onOpenDossier: (a: any) => void
  onOpenRdv: (a: any) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const sp = speciesInfo(animal.species)

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiDelete(`/animals/${animal.id}`)
      onDelete(animal.id)
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className={`bg-gradient-to-br ${sp.color} p-5 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-3xl">{sp.emoji}</span>
            <h3 className="text-xl font-bold mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              {animal.name}
            </h3>
            <p className="text-white/80 text-sm">{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</p>
          </div>
          {!confirming ? (
            <button onClick={() => setConfirming(true)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => setConfirming(false)} className="text-xs bg-white/20 px-2 py-1 rounded-lg">Non</button>
              <button onClick={handleDelete} disabled={deleting} className="text-xs bg-red-500 px-2 py-1 rounded-lg font-bold">
                {deleting ? '...' : 'Oui'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-50">
        {[
          { label: 'Âge', value: animal.age ? `${animal.age} an${animal.age > 1 ? 's' : ''}` : '—' },
          { label: 'Poids', value: animal.weight ? `${animal.weight} kg` : '—' },
          { label: 'Genre', value: animal.gender || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center bg-gray-50 rounded-xl p-2">
            <p className="text-xs text-gray-400 font-semibold">{label}</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-3 flex flex-col gap-2">
        <button
          onClick={() => onOpenDossier(animal)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-500" />
            Voir le dossier
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => onOpenRdv(animal)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-orange-50 hover:bg-orange-100 rounded-xl text-sm font-semibold text-orange-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Prendre RDV vétérinaire
          </div>
          <ChevronRight className="w-4 h-4 text-orange-400" />
        </button>
      </div>
    </div>
  )
}

// ── AddAnimalModal ───────────────────────────────────────────────────────────
function AddAnimalModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: any) => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('Chien')
  const [breed, setBreed] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [gender, setGender] = useState('Inconnu')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Le nom est requis.'); return }
    setSaving(true)
    setError('')
    try {
      const created = await apiPost('/animals', {
        name: name.trim(), species,
        breed: breed.trim() || undefined,
        age: age ? Number(age) : undefined,
        weight: weight ? Number(weight) : undefined,
        gender,
        notes: notes.trim() || undefined,
      })
      onAdded(created)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Impossible d\'enregistrer l\'animal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Ajouter un animal
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Espèce</label>
            <div className="flex gap-2 flex-wrap">
              {SPECIES.map(s => (
                <button key={s.value} type="button" onClick={() => setSpecies(s.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    species === s.value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}>
                  <span>{s.emoji}</span> {s.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Rex, Mimi, Tweety…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Race</label>
            <input type="text" value={breed} onChange={e => setBreed(e.target.value)}
              placeholder="Ex: Berger Malinois, Persan…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Âge (ans)</label>
              <input type="number" min="0" max="50" value={age} onChange={e => setAge(e.target.value)} placeholder="Ex: 3"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Poids (kg)</label>
              <input type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ex: 28.5"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Genre</label>
            <div className="flex gap-2">
              {['Mâle', 'Femelle', 'Inconnu'].map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    gender === g ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Allergies, traitements en cours, informations particulières…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AnimalPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [animals, setAnimals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [activeDossier, setActiveDossier] = useState<any>(null)

  useEffect(() => {
    if (!user || user.role !== 'patient') { setLoading(false); return }
    apiGet('/animals/my')
      .then(data => setAnimals(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  function handleAdded(animal: any) { setAnimals(prev => [animal, ...prev]) }
  function handleDeleted(id: number) { setAnimals(prev => prev.filter(a => a.id !== id)) }
  function handleUpdated(updated: any) {
    setAnimals(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
    setActiveDossier((prev: any) => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  function handleOpenRdv(animal: any) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vet_preselect_animal', JSON.stringify({
        id: animal.id,
        name: animal.name,
        species: animal.species,
        breed: animal.breed,
      }))
    }
    router.push('/veterinaire')
  }

  if (!user || user.role !== 'patient') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 text-center text-gray-500">
          Connectez-vous en tant que patient pour accéder à cette page.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Mes animaux
              </h1>
              <p className="text-gray-500 mt-1">
                {animals.length > 0
                  ? `${animals.length} animal${animals.length > 1 ? 'x' : ''} enregistré${animals.length > 1 ? 's' : ''}`
                  : 'Suivez la santé de vos compagnons'}
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" /> Ajouter un animal
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
          ) : animals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <PawPrint className="w-10 h-10 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Aucun animal enregistré
              </h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Ajoutez vos animaux pour suivre leurs vaccinations, consultations et prendre des rendez-vous vétérinaires.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" /> Ajouter mon premier animal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {animals.map(animal => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  onDelete={handleDeleted}
                  onOpenDossier={setActiveDossier}
                  onOpenRdv={handleOpenRdv}
                />
              ))}
              <button
                onClick={() => setShowAdd(true)}
                className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border-2 border-dashed border-orange-200 p-8 text-orange-400 hover:border-orange-400 hover:bg-orange-50 transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm">Ajouter un animal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddAnimalModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}

      {activeDossier && (
        <DossierPanel
          animal={activeDossier}
          onClose={() => setActiveDossier(null)}
          onUpdated={handleUpdated}
          onOpenRdv={(a) => { setActiveDossier(null); handleOpenRdv(a) }}
        />
      )}
    </div>
  )
}
