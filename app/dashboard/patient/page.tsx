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
  ChevronRight, Heart, Users, Plus, Activity,
} from 'lucide-react'

const SERVICE_CARDS = [
  {
    label: 'Médecins & Spécialistes',
    desc: 'Prenez rendez-vous en 30 secondes',
    href: '/medecins',
    img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-teal-800/80 to-teal-600/60',
    tag: '14 spécialités',
    icon: Stethoscope,
  },
  {
    label: 'Hôpitaux & Cliniques',
    desc: 'Trouvez et réservez un établissement',
    href: '/hospitals',
    img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-sky-800/80 to-sky-600/60',
    tag: '13 partenaires',
    icon: Building2,
  },
  {
    label: 'Pharmacies de garde',
    desc: 'Commander · livraison rapide 24h/24',
    href: '/pharmacies-garde',
    img: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-emerald-800/80 to-emerald-600/60',
    tag: 'Ouverte maintenant',
    icon: Pill,
  },
  {
    label: 'Urgences',
    desc: 'SAMU · Pompiers · Ambulance',
    href: '/urgence',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80',
    gradient: 'from-red-800/85 to-red-600/70',
    tag: 'SOS 24h/24',
    icon: Siren,
  },
]

const MORE_LINKS = [
  { label: 'Mes rendez-vous', icon: Calendar, href: '/appointments', color: 'text-teal-600 bg-teal-50' },
  { label: 'Portefeuille', icon: WalletIcon, href: '/portefeuille', color: 'text-amber-600 bg-amber-50' },
  { label: 'Assistant MediA', icon: Bot, href: '/chatbot', color: 'text-violet-600 bg-violet-50' },
  { label: 'Mon animal', icon: PawPrint, href: '/animal', color: 'text-pink-600 bg-pink-50' },
  { label: 'Mes commandes', icon: Package, href: '/commande', color: 'text-sky-600 bg-sky-50' },
  { label: 'Carte santé', icon: MapPin, href: '/carte', color: 'text-emerald-600 bg-emerald-50' },
]

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rdvList, setRdvList] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
  const balance = walletData?.solde ?? 0
  const nextAppt = rdvList[0]

  if (authLoading || !user || user.role !== 'patient') {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardNav showPremium />

      <main className="pt-20 pb-20 max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden mb-6 shadow-xl"
          style={{ minHeight: 180 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=900&auto=format&fit=crop&q=80"
            alt="médecin"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-800/70 to-transparent" />
          <div className="relative p-6 sm:p-8 flex items-center justify-between">
            <div>
              <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest mb-1 capitalize">{todayLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Bonjour, {user.prenom} 👋
              </h1>
              <p className="text-white/70 text-sm mb-4">Comment vous sentez-vous aujourd&apos;hui ?</p>
              <Link
                href="/appointments"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau rendez-vous
              </Link>
            </div>
            <div className="flex-shrink-0 hidden sm:flex w-16 h-16 rounded-2xl bg-white/20 backdrop-blur items-center justify-center text-xl font-extrabold text-white shadow-lg border border-white/30">
              {initial}
            </div>
          </div>
        </motion.div>

        {/* ── Next appointment ──────────────────────────────────────────── */}
        {!loading && nextAppt && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prochain rendez-vous</p>
              <Link href="/appointments" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className={`flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border-l-4 ${nextAppt.statut === 'confirme' ? 'border-l-teal-500' : 'border-l-amber-400'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${nextAppt.statut === 'confirme' ? 'bg-teal-50' : 'bg-amber-50'}`}>
                {nextAppt.statut === 'confirme'
                  ? <CheckCircle className="w-6 h-6 text-teal-600" />
                  : <Clock className="w-6 h-6 text-amber-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">
                  {nextAppt.doctor
                    ? `Dr. ${nextAppt.doctor.user?.prenom ?? ''} ${nextAppt.doctor.user?.nom ?? ''}`
                    : nextAppt.structure?.nom ?? 'Prestataire'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{nextAppt.service ?? 'Consultation'}</p>
                {nextAppt.statut === 'confirme' && (
                  <Link href={`/ticket/${nextAppt.id}`} className="text-xs font-bold text-teal-600 hover:underline mt-0.5 inline-block">
                    Voir mon ticket →
                  </Link>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">
                  {new Date(nextAppt.date_rdv).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-xs text-gray-400">{nextAppt.heure_rdv?.slice(0, 5)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Quick stats ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <Link href="/appointments" className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900 leading-none">{loading ? '—' : rdvList.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">RDV à venir</p>
            </div>
          </Link>
          <Link href="/portefeuille" className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
              <WalletIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-900 leading-none truncate">{loading ? '—' : `${Number(balance).toLocaleString('fr-FR')} F`}</p>
              <p className="text-xs text-gray-500 mt-0.5">Portefeuille</p>
            </div>
          </Link>
        </motion.div>

        {/* ── Section title ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3"
        >
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nos services</p>
        </motion.div>

        {/* ── Service photo cards ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          {SERVICE_CARDS.map((svc, i) => (
            <motion.div
              key={svc.href}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={svc.href}
                className="group relative block rounded-2xl overflow-hidden shadow-sm"
                style={{ aspectRatio: '4/3' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={svc.img}
                  alt={svc.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${svc.gradient}`} />
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30 px-2 py-0.5 rounded-full">
                    {svc.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm leading-tight">{svc.label}</p>
                  <p className="text-white/75 text-[10px] mt-0.5 leading-tight">{svc.desc}</p>
                </div>
                <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* ── MediA AI Banner ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <Link
            href="/chatbot"
            className="group flex items-center gap-4 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl p-4 sm:p-5 shadow-lg shadow-violet-500/20 hover:opacity-95 transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">MediA — Assistant IA</p>
              <p className="text-white/75 text-sm mt-0.5">Décrivez vos symptômes, je vous oriente vers le bon professionnel.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>
        </motion.div>

        {/* ── More links ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Mon espace</p>
          <div className="grid grid-cols-3 gap-2">
            {MORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col items-center gap-2 bg-white rounded-2xl p-3 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-center"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.color} group-hover:scale-110 transition-transform`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <p className="text-[11px] font-semibold text-gray-700 leading-tight">{link.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── All appointments (if no next one shown) ──────────────────── */}
        {!loading && rdvList.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 text-center"
          >
            <Calendar className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">Aucun rendez-vous à venir</p>
            <p className="text-sm text-gray-400 mb-4">Prenez rendez-vous avec un médecin ou une clinique.</p>
            <Link href="/medecins" className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
              <Plus className="w-4 h-4" /> Prendre un rendez-vous
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  )
}
