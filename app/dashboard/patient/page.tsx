'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/components/layout/DashboardNav'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import { appointments, wallet } from '@/lib/api'
import {
  Calendar, Pill, MapPin, Bot, Siren, Building2,
  Wallet as WalletIcon, PawPrint, Package, Star,
  ArrowRight, CheckCircle, Clock, Loader2, Stethoscope,
  ChevronRight, Heart, AlertTriangle, ShoppingBag,
  Activity, Users, Hospital, Navigation,
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'sante',
    title: 'Soins & Médecins',
    icon: Stethoscope,
    gradient: 'from-teal-600 to-sky-500',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    actions: [
      { label: 'Mes rendez-vous', icon: Calendar, href: '/appointments', desc: 'Historique & suivi', color: 'from-teal-500 to-sky-400' },
      { label: 'Médecins', icon: Users, href: '/medecins', desc: 'Spécialistes proches', color: 'from-sky-500 to-blue-500' },
      { label: 'Hôpitaux & Cliniques', icon: Building2, href: '/hospitals', desc: 'Trouver & réserver', color: 'from-blue-500 to-indigo-500' },
    ],
  },
  {
    id: 'pharmacie',
    title: 'Pharmacies & Médicaments',
    icon: Pill,
    gradient: 'from-emerald-600 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    actions: [
      { label: 'Pharmacies de garde', icon: Building2, href: '/pharmacies-garde', desc: 'Commander en ligne · 24h/24', color: 'from-emerald-500 to-green-500' },
      { label: 'Mes commandes', icon: Package, href: '/commande', desc: 'Suivre vos livraisons', color: 'from-teal-500 to-cyan-500' },
      { label: 'Carte des pharmacies', icon: MapPin, href: '/carte?type=pharmacie', desc: 'Trouver la plus proche', color: 'from-sky-500 to-blue-500' },
    ],
  },
  {
    id: 'urgence',
    title: 'Urgences',
    icon: Siren,
    gradient: 'from-red-600 to-orange-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
    large: true,
    actions: [
      { label: 'Urgence 24h/24', icon: Siren, href: '/urgence', desc: 'Déclencher une alerte médicale immédiate', color: 'from-red-500 to-rose-600', large: true },
      { label: 'Carte santé', icon: MapPin, href: '/carte', desc: 'Trouver un soin ou structure de santé', color: 'from-orange-500 to-amber-500', large: true },
    ],
  },
  {
    id: 'espace',
    title: 'Mon Espace',
    icon: Heart,
    gradient: 'from-violet-600 to-purple-500',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    actions: [
      { label: 'Portefeuille', icon: WalletIcon, href: '/portefeuille', desc: 'Paiements & solde', color: 'from-orange-500 to-amber-500' },
      { label: 'MediA IA', icon: Bot, href: '/chatbot', desc: 'Assistant santé intelligent', color: 'from-violet-500 to-purple-500' },
      { label: 'Mon animal', icon: PawPrint, href: '/animal', desc: 'Suivi vétérinaire', color: 'from-pink-500 to-rose-500' },
    ],
  },
]

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rdvList, setRdvList] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Single redirect guard — router.replace avoids full page reloads (no repeated server GETs)
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth/login'); return }
    if (user.role !== 'patient') {
      const dest = getDashboardRoute(user.role)
      if (dest !== '/dashboard/patient') router.replace(dest)
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user || user.role !== 'patient') return
    async function fetchData() {
      try {
        const [rdv, w] = await Promise.allSettled([appointments.mine(), wallet.me()])
        if (rdv.status === 'fulfilled') {
          setRdvList(rdv.value.filter((a: any) => ['confirme', 'en_attente'].includes(a.statut)).slice(0, 3))
        }
        if (w.status === 'fulfilled') setWalletData(w.value)
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
  }, [authLoading, user])

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const initial = user ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}` : 'U'
  const upcomingCount = rdvList.length
  const balance = walletData?.solde ?? 0

  // Spinner while auth resolves or redirect is pending — never call window.location during render
  if (authLoading || !user || user.role !== 'patient') {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <DashboardNav showPremium />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* ── Greeting Banner ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-sky-500 rounded-3xl p-6 sm:p-8 mb-8 text-white overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-sky-300/20 rounded-full blur-2xl" />
          <div className="absolute top-4 right-4 opacity-10">
            <Activity className="w-32 h-32" />
          </div>
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm mb-1 capitalize">{todayLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                Bonjour, {user?.prenom} 👋
              </h1>
              <p className="text-white/70 text-sm">Comment vous sentez-vous aujourd'hui ?</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Patient · MedMap+
              </div>
            </div>
            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-lg">
              {initial}
            </div>
          </div>
        </motion.div>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[
            { icon: Calendar, gradient: 'from-teal-500 to-sky-400', value: loading ? '—' : String(upcomingCount), label: 'RDV à venir', sub: upcomingCount > 0 ? 'Voir planning' : 'Aucun planifié', href: '/appointments' },
            { icon: WalletIcon, gradient: 'from-orange-400 to-amber-500', value: loading ? '—' : `${Number(balance).toLocaleString('fr-FR')} F`, label: 'Portefeuille', sub: 'F CFA disponible', href: '/portefeuille' },
            { icon: Bot, gradient: 'from-violet-500 to-purple-500', value: 'MediA', label: 'Assistant IA', sub: 'Poser une question', href: '/chatbot' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={s.href} className="group flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-900 leading-none truncate">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.label}</p>
                  <p className="text-xs text-teal-600 font-semibold mt-0.5 truncate">{s.sub}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ── Sections d'actions ────────────────────────────────────────── */}
        <div className="space-y-6">
          {SECTIONS.map((section, si) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + si * 0.1 }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 bg-gradient-to-r ${section.gradient} text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm`}>
                  <section.icon className="w-4 h-4" />
                  {section.title}
                </div>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Cards */}
              {section.large ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.actions.map((action, ai) => (
                    <motion.div
                      key={action.label}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    >
                      <Link
                        href={action.href}
                        className={`group flex items-center gap-4 bg-white rounded-2xl p-5 border-2 ${section.border} hover:border-red-300 hover:shadow-lg hover:shadow-red-500/10 transition-all`}
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}>
                          <action.icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base">{action.label}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{action.desc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {section.actions.map((action, ai) => (
                    <motion.div
                      key={action.label}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                      <Link
                        href={action.href}
                        className={`group flex flex-col items-start bg-white rounded-2xl p-4 border ${section.border} hover:border-teal-200 hover:shadow-lg hover:shadow-teal-500/10 transition-all h-full`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{action.label}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed flex-1">{action.desc}</p>
                        <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-teal-400 mt-2 transition-colors" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── MediA Premium Banner ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6"
        >
          <Link href="/media-premium" className="group flex items-center gap-4 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl p-5 text-white hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 fill-yellow-300 text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="font-bold">MediA Premium</p>
              <p className="text-white/80 text-sm">Messages illimités + actions automatiques + conseils personnalisés</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </motion.div>

        {/* ── Prochains RDV ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Mes prochains rendez-vous</h2>
            <Link href="/appointments" className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
            </div>
          ) : rdvList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700 mb-1">Aucun rendez-vous à venir</p>
              <p className="text-sm text-gray-400 mb-4">Prenez un rendez-vous avec un médecin ou une clinique.</p>
              <Link href="/appointments" className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                <Calendar className="w-4 h-4" /> Prendre un rendez-vous
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rdvList.map((appt: any, i: number) => {
                const isConfirmed = appt.statut === 'confirme'
                const doctorName = appt.doctor
                  ? `Dr. ${appt.doctor.user?.prenom ?? ''} ${appt.doctor.user?.nom ?? ''}`
                  : appt.structure?.nom ?? 'Prestataire'
                return (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.85 + i * 0.05 }}
                  >
                    <div className={`flex items-center gap-4 bg-white rounded-2xl border-l-4 p-4 shadow-sm transition-all ${
                      isConfirmed ? 'border-l-teal-500' : 'border-l-amber-400'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isConfirmed ? 'bg-teal-50' : 'bg-amber-50'
                      }`}>
                        {isConfirmed
                          ? <CheckCircle className="w-5 h-5 text-teal-600" />
                          : <Clock className="w-5 h-5 text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{doctorName}</p>
                        <p className="text-xs text-gray-500">{appt.service ?? 'Consultation'}</p>
                        {isConfirmed && (
                          <Link href={`/ticket/${appt.id}`} className="text-xs font-bold text-indigo-600 hover:underline mt-0.5 inline-block">
                            Voir mon ticket →
                          </Link>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">
                          {new Date(appt.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400">{appt.heure_rdv?.slice(0, 5)}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
