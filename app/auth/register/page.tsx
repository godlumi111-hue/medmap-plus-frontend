'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ArrowRight, ArrowLeft, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'

type Role = 'patient' | 'medecin' | 'coach' | 'pharmacie' | 'clinique' | 'veterinaire' | 'samu' | 'pompiers' | 'ambulance' | 'livreur'

const roles: { id: Role; label: string; icon: string; desc: string; color: string; group?: string }[] = [
  { id: 'patient',     label: 'Patient / Client',    icon: '👤', desc: 'Accédez aux soins, commandez des médicaments',  color: 'from-sky to-blue-500' },
  { id: 'medecin',     label: 'Médecin',             icon: '🩺', desc: 'Gérez vos consultations et patients',           color: 'from-primary to-primary-light' },
  { id: 'coach',       label: 'Coach de santé',      icon: '🏋️', desc: 'Accompagnez vos patients au quotidien',        color: 'from-violet-500 to-purple-600' },
  { id: 'pharmacie',   label: 'Pharmacie',           icon: '💊', desc: 'Gérez votre stock et commandes',                color: 'from-mint to-primary' },
  { id: 'clinique',    label: 'Clinique / Hôpital',  icon: '🏥', desc: 'Gérez votre établissement médical',             color: 'from-purple-500 to-sky' },
  { id: 'veterinaire', label: 'Vétérinaire',         icon: '🐾', desc: 'Soins pour animaux de compagnie',               color: 'from-orange-400 to-amber-500' },
  { id: 'livreur',     label: 'Livreur',             icon: '🛵', desc: 'Livraison de médicaments à domicile',           color: 'from-amber-500 to-yellow-500', group: 'urgences' },
  { id: 'samu',        label: 'SAMU',                icon: '🚑', desc: 'Centre de commandement médical d\'urgence',     color: 'from-red-600 to-rose-500',     group: 'urgences' },
  { id: 'pompiers',    label: 'Pompiers',            icon: '🚒', desc: 'Centre opérationnel incendie & secours',        color: 'from-orange-600 to-red-500',   group: 'urgences' },
  { id: 'ambulance',   label: 'Ambulance',           icon: '🚑', desc: 'Service de transport sanitaire urgent',         color: 'from-blue-600 to-sky-500',     group: 'urgences' },
]

const roleHints: Record<Role, { prenomLabel: string; nomLabel: string; prenomPlaceholder: string; nomPlaceholder: string }> = {
  patient:     { prenomLabel: 'Prénom',                 nomLabel: 'Nom',                   prenomPlaceholder: 'Jean-Baptiste', nomPlaceholder: 'Konan' },
  medecin:     { prenomLabel: 'Prénom',                 nomLabel: 'Nom',                   prenomPlaceholder: 'Aimé',          nomPlaceholder: 'Kouassi' },
  coach:       { prenomLabel: 'Prénom',                 nomLabel: 'Nom',                   prenomPlaceholder: 'Fatou',         nomPlaceholder: 'Diallo' },
  pharmacie:   { prenomLabel: 'Prénom du responsable',  nomLabel: 'Nom de la pharmacie',   prenomPlaceholder: 'Marie',         nomPlaceholder: 'Pharmacie du Plateau' },
  clinique:    { prenomLabel: 'Prénom du responsable',  nomLabel: "Nom de l'établissement", prenomPlaceholder: 'Pierre',       nomPlaceholder: 'Clinique Sainte Marie' },
  veterinaire: { prenomLabel: 'Prénom',                 nomLabel: 'Nom',                   prenomPlaceholder: 'Seydou',        nomPlaceholder: 'Coulibaly' },
  livreur:     { prenomLabel: 'Prénom',                 nomLabel: 'Nom',                   prenomPlaceholder: 'Kofi',          nomPlaceholder: 'Assi' },
  samu:        { prenomLabel: 'Prénom du responsable',  nomLabel: 'Unité SAMU',            prenomPlaceholder: 'Marc',          nomPlaceholder: 'SAMU Centre 15' },
  pompiers:    { prenomLabel: 'Prénom du responsable',  nomLabel: 'Caserne / Unité',       prenomPlaceholder: 'Didier',        nomPlaceholder: 'Caserne Plateau' },
  ambulance:   { prenomLabel: 'Prénom du conducteur',   nomLabel: 'Nom du service',        prenomPlaceholder: 'Yves',          nomPlaceholder: 'Ambulance Cocody' },
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const { register } = useAuth()

  const hints = selectedRole ? roleHints[selectedRole] : roleHints.patient

  const passwordOk = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole) return
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (!passwordOk) { setError('Le mot de passe ne respecte pas les critères.'); return }
    if (!termsAccepted) { setError("Veuillez accepter les conditions d'utilisation."); return }

    setError('')
    setLoading(true)
    try {
      const user = await register({
        email,
        password,
        nom,
        prenom,
        telephone: telephone || undefined,
        role: selectedRole,
      })
      setSuccess(true)
      setTimeout(() => router.push(getDashboardRoute(user.role)), 1200)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du compte.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-aqua/30 via-white to-sky/10 flex items-center justify-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2" style={{ fontFamily: 'Sora' }}>Compte créé !</h2>
          <p className="text-slate">Redirection vers votre espace...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aqua/30 via-white to-sky/10 flex items-center justify-center p-4">
      <Link href="/" className="fixed top-4 left-4 z-50 flex items-center gap-2 text-sm font-medium text-slate hover:text-primary bg-white/80 backdrop-blur-sm border border-bone px-3 py-2 rounded-xl shadow-sm transition-all hover:border-primary/30">
        <ArrowLeft className="w-4 h-4" /> Accueil
      </Link>

      <div className="fixed top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
      <div className="fixed bottom-10 left-10 w-80 h-80 bg-sky/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />

      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-bone overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-sky p-6 text-white">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: 'Sora' }}>MedMap+</span>
            </Link>
            <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'Sora' }}>Créer votre compte</h1>
            <div className="flex items-center gap-3 mt-3">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    step > s ? 'bg-white text-primary' : step === s ? 'bg-white text-primary' : 'bg-white/20 text-white'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  <span className="text-xs text-white/70">{s === 1 ? 'Rôle' : s === 2 ? 'Infos' : 'Sécurité'}</span>
                  {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Choose role */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: 'Sora' }}>Quel est votre rôle ?</h2>
                  <div className="space-y-3">
                    {/* Rôles standards */}
                    {roles.filter(r => !r.group).map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRole(r.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                          selectedRole === r.id ? 'border-primary bg-primary/5' : 'border-bone hover:border-primary/30'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {r.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-sm">{r.label}</p>
                          <p className="text-xs text-slate">{r.desc}</p>
                        </div>
                        {selectedRole === r.id && <CheckCircle className="w-5 h-5 text-primary ml-auto flex-shrink-0" />}
                      </button>
                    ))}

                    {/* Services d'urgence */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-red-100" />
                        <span className="text-[11px] font-bold text-red-500 uppercase tracking-wide">🚨 Services d'urgence</span>
                        <div className="h-px flex-1 bg-red-100" />
                      </div>
                      {roles.filter(r => r.group === 'urgences').map(r => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRole(r.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all mb-2 ${
                            selectedRole === r.id ? 'border-red-500 bg-red-50' : 'border-red-100 hover:border-red-300'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                            {r.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-sm">{r.label}</p>
                            <p className="text-xs text-slate">{r.desc}</p>
                          </div>
                          {selectedRole === r.id && <CheckCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => selectedRole && setStep(2)}
                    disabled={!selectedRole}
                    className="mt-6 w-full bg-gradient-to-r from-primary to-sky text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-all"
                  >
                    Continuer <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Personal info */}
              {step === 2 && selectedRole && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: 'Sora' }}>Vos informations</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-ink mb-1.5 block">{hints.prenomLabel}</label>
                        <input
                          type="text"
                          value={prenom}
                          onChange={e => setPrenom(e.target.value)}
                          placeholder={hints.prenomPlaceholder}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-ink mb-1.5 block">{hints.nomLabel}</label>
                        <input
                          type="text"
                          value={nom}
                          onChange={e => setNom(e.target.value)}
                          placeholder={hints.nomPlaceholder}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ink mb-1.5 block">Téléphone</label>
                      <input
                        type="tel"
                        value={telephone}
                        onChange={e => setTelephone(e.target.value)}
                        placeholder="+225 07 XX XX XX XX"
                        className="w-full px-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ink mb-1.5 block">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-bone rounded-xl font-semibold text-ink hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <button
                      onClick={() => prenom && nom && email && setStep(3)}
                      disabled={!prenom || !nom || !email}
                      className="flex-1 bg-gradient-to-r from-primary to-sky text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      Continuer <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Password & Submit */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: 'Sora' }}>Sécurité du compte</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-ink mb-1.5 block">Mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Min. 8 caractères"
                          required
                          className="w-full px-4 pr-10 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ink mb-1.5 block">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      />
                    </div>
                    <div className="p-4 bg-aqua/30 rounded-xl space-y-2">
                      {[
                        { label: '8 caractères minimum', ok: password.length >= 8 },
                        { label: 'Une lettre majuscule',  ok: /[A-Z]/.test(password) },
                        { label: 'Un chiffre',            ok: /[0-9]/.test(password) },
                      ].map(({ label, ok }) => (
                        <div key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-primary/60'}`}>
                          <CheckCircle className={`w-3.5 h-3.5 ${ok ? 'text-green-500' : 'text-bone'}`} /> {label}
                        </div>
                      ))}
                    </div>
                    <label className="flex items-start gap-3 p-3 bg-bone rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="accent-primary mt-0.5"
                      />
                      <span className="text-xs text-slate">
                        J'accepte les <span className="text-primary font-semibold">conditions d'utilisation</span> et la{' '}
                        <span className="text-primary font-semibold">politique de confidentialité</span> de MedMap+
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border-2 border-bone rounded-xl font-semibold text-ink hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Retour
                      </button>
                      <motion.button
                        type="submit"
                        disabled={loading || !passwordOk || !termsAccepted}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 bg-gradient-to-r from-primary to-sky text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading
                          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : 'Créer mon compte'}
                      </motion.button>
                    </div>
                  </form>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate/60">
                    <Shield className="w-3 h-3" /> Compte sécurisé SSL 256-bit
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-sm text-slate mt-6">
              Déjà inscrit ?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
