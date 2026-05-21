'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DashboardNav from '@/components/layout/DashboardNav'
import { useAuth } from '@/lib/auth-context'
import {
  Users,
  Building2,
  AlertTriangle,
  Wallet,
  Stethoscope,
  Pill,
  BarChart3,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ValidationStatus = 'pending' | 'validated' | 'rejected'

interface Validation {
  id: string
  nom: string
  type: 'Clinique' | 'Médecin' | 'Pharmacie'
  ville: string
  soumis: string
  status: ValidationStatus
}

interface Litige {
  id: string
  plaignant: string
  contre: string
  motif: string
  priorite: 'haute' | 'moyenne' | 'basse'
  date: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const initialValidations: Validation[] = [
  {
    id: 'V-001',
    nom: 'Clinique Bonheur',
    type: 'Clinique',
    ville: 'Abidjan, Cocody',
    soumis: 'il y a 2h',
    status: 'pending',
  },
  {
    id: 'V-002',
    nom: 'Dr. Traoré Moussa',
    type: 'Médecin',
    ville: 'Abidjan, Plateau',
    soumis: 'il y a 4h',
    status: 'pending',
  },
  {
    id: 'V-003',
    nom: 'Pharmacie Centrale',
    type: 'Pharmacie',
    ville: 'Bouaké',
    soumis: 'hier',
    status: 'pending',
  },
]

const litiges: Litige[] = [
  {
    id: 'L-042',
    plaignant: 'Konan J.',
    contre: 'Pharmacie du Plateau',
    motif: 'Médicament erroné',
    priorite: 'haute',
    date: '01 mai 2026',
  },
  {
    id: 'L-041',
    plaignant: 'Ahoua M.',
    contre: 'Dr. Kouassi A.',
    motif: 'Rendez-vous annulé sans préavis',
    priorite: 'moyenne',
    date: '28 avr. 2026',
  },
  {
    id: 'L-040',
    plaignant: 'Bamba I.',
    contre: 'CHU Cocody',
    motif: 'Facturation incorrecte',
    priorite: 'basse',
    date: '25 avr. 2026',
  },
]

const stats = [
  {
    icon: Users,
    gradient: 'from-primary to-sky',
    value: '12 847',
    label: 'Utilisateurs actifs',
    sub: '+124 ce mois',
  },
  {
    icon: Building2,
    gradient: 'from-purple-500 to-sky',
    value: '342',
    label: 'Structures partenaires',
    sub: undefined,
  },
  {
    icon: AlertTriangle,
    gradient: 'from-coral to-red-500',
    value: '7',
    label: 'Litiges en cours',
    sub: undefined,
  },
  {
    icon: Wallet,
    gradient: 'from-orange-400 to-amber-500',
    value: '28.4M F',
    label: 'Volume transactions',
    sub: 'Ce mois',
  },
]

const actions = [
  {
    label: 'Utilisateurs',
    icon: Users,
    href: '/notifications',
    gradient: 'from-primary to-sky',
    desc: 'Gérer tous les comptes',
  },
  {
    label: 'Structures',
    icon: Building2,
    href: '/notifications',
    gradient: 'from-purple-500 to-sky',
    desc: 'Hôpitaux, pharmacies, vétérinaires',
  },
  {
    label: 'Médecins',
    icon: Stethoscope,
    href: '/notifications',
    gradient: 'from-mint to-primary',
    desc: 'Validation et profils',
  },
  {
    label: 'Pharmacies',
    icon: Pill,
    href: '/pharmacies-garde',
    gradient: 'from-primary-light to-sky',
    desc: 'Partenaires pharmacies',
  },
  {
    label: 'Litiges',
    icon: AlertTriangle,
    href: '/notifications',
    gradient: 'from-coral to-red-500',
    desc: 'Résoudre les conflits',
  },
  {
    label: 'Paiements',
    icon: Wallet,
    href: '/portefeuille',
    gradient: 'from-orange-400 to-amber-500',
    desc: 'Transactions plateforme',
  },
  {
    label: 'Statistiques',
    icon: BarChart3,
    href: '/notifications',
    gradient: 'from-sky to-blue-600',
    desc: 'Analytics globaux',
  },
  {
    label: 'Paramètres',
    icon: Settings,
    href: '/notifications',
    gradient: 'from-slate to-ink',
    desc: 'Configuration système',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFrenchDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function validationIcon(type: Validation['type']) {
  if (type === 'Clinique') return Building2
  if (type === 'Médecin') return Stethoscope
  return Pill
}

const prioriteBadge: Record<Litige['priorite'], { bg: string; text: string; label: string }> = {
  haute:   { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Haute' },
  moyenne: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moyenne' },
  basse:   { bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'Basse' },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [validations, setValidations] = useState<Validation[]>(initialValidations)
  const [apiStats, setApiStats] = useState<any>(null)
  const [apiLitiges, setApiLitiges] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any>(null)
  const dateStr = getFrenchDate()

  useEffect(() => {
    async function fetchData() {
      try {
        const { admin: adminApi } = await import('@/lib/api')
        const [s, d, c] = await Promise.allSettled([adminApi.stats(), adminApi.disputes('ouvert'), adminApi.commissions()])
        if (s.status === 'fulfilled') setApiStats(s.value)
        if (d.status === 'fulfilled') setApiLitiges(d.value)
        if (c.status === 'fulfilled') setCommissions(c.value)
      } catch {}
    }
    fetchData()
  }, [])

  function handleValidate(id: string) {
    setValidations(prev =>
      prev.map(v => (v.id === id ? { ...v, status: 'validated' } : v))
    )
  }

  function handleReject(id: string) {
    setValidations(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardNav showPremium={false} />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* -------------------------------------------------------------- */}
        {/* Greeting card                                                   */}
        {/* -------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: 'easeOut' }}
          className="bg-gradient-to-r from-ink to-slate rounded-3xl p-8 mb-8 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              A
            </div>
            <div>
              <p className="text-white/70 text-sm">{dateStr}</p>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora' }}>
                Bienvenue, {user ? `${user.prenom} ${user.nom}` : 'Administrateur'} 🛡️
              </h1>
              <div className="flex gap-2 mt-2">
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Administrateur 🛡️
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------- */}
        {/* Stats grid                                                      */}
        {/* -------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, gradient: 'from-primary to-sky', value: apiStats?.utilisateurs ?? stats[0].value, label: 'Utilisateurs actifs', sub: undefined },
            { icon: Building2, gradient: 'from-purple-500 to-sky', value: apiStats?.structures ?? stats[1].value, label: 'Structures partenaires', sub: undefined },
            { icon: AlertTriangle, gradient: 'from-coral to-red-500', value: apiLitiges.length > 0 ? apiLitiges.length : (apiStats?.litiges_ouverts ?? stats[2].value), label: 'Litiges en cours', sub: undefined },
            { icon: Wallet, gradient: 'from-orange-400 to-amber-500', value: apiStats ? `${Number(apiStats.volume_wallet ?? 0).toLocaleString('fr-FR')} F` : stats[3].value, label: 'Volume portefeuilles', sub: 'Total plateforme' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, ease: 'easeOut' }}
              className="bg-white rounded-2xl p-5 border border-bone shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm`}
              >
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{String(s.value)}</p>
                <p className="text-sm text-slate">{s.label}</p>
                {s.sub && <p className="text-xs text-primary mt-0.5">{s.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Commission breakdown                                           */}
        {/* -------------------------------------------------------------- */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-ink" style={{ fontFamily: 'Sora' }}>
              Revenus MedMap+
            </h2>
            {commissions && (
              <span className="text-sm font-bold text-emerald-600">
                {(commissions.total_platform ?? 0).toLocaleString('fr-FR')} FCFA total encaissé
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'rdv',         label: 'Consultations',   icon: Stethoscope, color: 'from-sky-500 to-blue-600' },
              { key: 'pharmacie',   label: 'Pharmacies',      icon: Pill,        color: 'from-emerald-500 to-teal-600' },
              { key: 'hopital',     label: 'Hôpitaux',        icon: Building2,   color: 'from-indigo-500 to-violet-600' },
              { key: 'suivi_perso', label: 'Suivi personnel', icon: Users,       color: 'from-violet-500 to-purple-600' },
              { key: 'urgence',     label: 'Urgences',        icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
              { key: '_admin',      label: 'Solde plateforme', icon: Wallet,     color: 'from-amber-500 to-orange-500' },
            ].map((cat) => {
              const data = cat.key === '_admin'
                ? { total: commissions?.solde_admin ?? 0, nb: null }
                : commissions?.[cat.key] ?? { total: 0, nb: 0 }
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 border border-bone shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2`}>
                    <cat.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-base font-extrabold text-ink leading-tight">
                    {(data.total ?? 0).toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate">F</span>
                  </p>
                  <p className="text-xs font-semibold text-slate mt-0.5">{cat.label}</p>
                  {data.nb != null && (
                    <p className="text-[10px] text-slate/60 mt-0.5">{data.nb} opération{data.nb !== 1 ? 's' : ''}</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Actions section                                                 */}
        {/* -------------------------------------------------------------- */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-ink" style={{ fontFamily: 'Sora' }}>
              Administration
            </h2>
            <Link
              href="/notifications"
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Link
                  href={a.href}
                  className="group flex flex-col items-start bg-white rounded-2xl p-5 border border-bone shadow-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all h-full"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}
                  >
                    <a.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-ink text-base mb-1">{a.label}</h3>
                  <p className="text-xs text-slate leading-relaxed">{a.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Bottom two-column section                                       */}
        {/* -------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ---- Section 1: Validations en attente ---- */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink" style={{ fontFamily: 'Sora' }}>
                Validations en attente
              </h2>
              <span className="text-xs font-bold bg-coral text-white px-2 py-0.5 rounded-full">
                {validations.filter(v => v.status === 'pending').length}
              </span>
            </div>

            <div className="space-y-3">
              {validations.map((v, i) => {
                const Icon = validationIcon(v.type)

                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08, ease: 'easeOut' }}
                    className="bg-white rounded-2xl border border-bone p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-ink text-sm">{v.nom}</p>
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {v.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-0.5">{v.ville}</p>
                        <p className="text-xs text-slate">Soumis {v.soumis}</p>
                      </div>
                    </div>

                    {/* Actions / Status */}
                    <div className="mt-3 flex items-center gap-2">
                      {v.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleValidate(v.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(v.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 px-3 py-1.5 rounded-xl transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                        </>
                      )}

                      {v.status === 'validated' && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Validé
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {validations.length === 0 && (
                <div className="bg-white rounded-2xl border border-bone p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-ink">Toutes les demandes ont été traitées</p>
                  <p className="text-xs text-slate mt-1">Aucune validation en attente</p>
                </div>
              )}
            </div>
          </div>

          {/* ---- Section 2: Litiges récents ---- */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink" style={{ fontFamily: 'Sora' }}>
                Litiges récents
              </h2>
              <Link
                href="/notifications"
                className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline"
              >
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {litiges.map((l, i) => {
                const badge = prioriteBadge[l.priorite]

                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08, ease: 'easeOut' }}
                    className="bg-white rounded-2xl border border-bone p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* Alert icon */}
                      <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-coral" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* ID + priority */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-bold text-slate bg-bone px-2 py-0.5 rounded-lg">
                            {l.id}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Parties */}
                        <p className="text-sm font-semibold text-ink">
                          {l.plaignant}{' '}
                          <span className="text-slate font-normal">vs</span>{' '}
                          {l.contre}
                        </p>

                        {/* Motif */}
                        <p className="text-xs text-slate mt-0.5">{l.motif}</p>

                        {/* Date */}
                        <p className="text-xs text-slate mt-1">{l.date}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
