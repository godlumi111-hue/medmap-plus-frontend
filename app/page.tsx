'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import {
  ArrowRight, MapPin, Pill, Calendar, Activity, Bot, Search,
  Building2, Users, Star, AlertTriangle, PawPrint,
  Sparkles, Send, Check, Plus, HeartPulse, Video,
  FolderHeart, BellRing, Siren, LayoutDashboard, Package, ShieldCheck,
  Stethoscope, MapPinOff, AlarmClockOff, CheckCircle2, Navigation,
  PackageCheck, Phone, Mail, Share2, AtSign, Camera, Briefcase, Play,
  ArrowDown, Code2, Server, LayoutGrid,
  CalendarCheck, Bell, User, Handshake, Menu, X, MessageSquare,
  Clock, Heart, ChevronDown, ChevronRight, Quote,
} from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

const SERVICES = [
  {
    title: 'Hôpitaux & Cliniques',
    desc: 'Consultations immédiates, urgences, orientations médicales. Accédez aux meilleurs établissements d\'Abidjan.',
    href: '/hospitals',
    img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=700&auto=format&fit=crop&q=80',
    tag: '13 hôpitaux partenaires',
    color: 'from-teal-600/90 to-teal-800/90',
  },
  {
    title: 'Médecins & Coachs',
    desc: 'Prenez rendez-vous avec des spécialistes qualifiés. Téléconsultation disponible 24h/24.',
    href: '/medecins',
    img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=700&auto=format&fit=crop&q=80',
    tag: '14 spécialités médicales',
    color: 'from-sky-600/90 to-sky-900/90',
  },
  {
    title: 'Pharmacies',
    desc: 'Trouvez vos médicaments dans les pharmacies de garde. Commandez, on vous livre.',
    href: '/medicaments',
    img: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=700&auto=format&fit=crop&q=80',
    tag: 'Garde 24h/7j',
    color: 'from-emerald-600/90 to-emerald-900/90',
  },
  {
    title: 'Vétérinaires',
    desc: 'La santé de vos animaux compte aussi. Consultations, vaccins, urgences vétérinaires.',
    href: '/animal',
    img: 'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=700&auto=format&fit=crop&q=80',
    tag: '10 cliniques vétérinaires',
    color: 'from-amber-600/90 to-amber-900/90',
  },
]

const FEATURES = [
  { icon: <MapPin className="w-6 h-6" />, title: 'Géolocalisation temps réel', desc: 'Visualisez toutes les structures autour de vous sur une carte interactive.' },
  { icon: <CalendarCheck className="w-6 h-6" />, title: 'Rendez-vous instantané', desc: 'Réservez une consultation en 30 secondes, sans appel téléphonique.' },
  { icon: <Video className="w-6 h-6" />, title: 'Téléconsultation HD', desc: 'Consultez un médecin à distance par vidéo sécurisée.' },
  { icon: <Pill className="w-6 h-6" />, title: 'Pharmacies de garde', desc: 'Localisez les pharmacies ouvertes 24h/24 et vérifiez les stocks en temps réel.' },
  { icon: <Sparkles className="w-6 h-6" />, title: 'Assistant IA MediA', desc: 'Décrivez vos symptômes. L\'IA vous oriente vers le bon professionnel.' },
  { icon: <FolderHeart className="w-6 h-6" />, title: 'Dossier médical centralisé', desc: 'Ordonnances, examens, antécédents — tout en un endroit sécurisé.' },
  { icon: <Siren className="w-6 h-6" />, title: 'Urgences & SAMU', desc: 'Bouton SOS direct. Coordination pompiers, ambulance, SAMU en temps réel.' },
  { icon: <BellRing className="w-6 h-6" />, title: 'Rappels intelligents', desc: 'Médicaments, rendez-vous, vaccins — jamais un oubli.' },
  { icon: <PawPrint className="w-6 h-6" />, title: 'Santé vétérinaire', desc: 'Carnets de santé animaux, vaccins et suivi intégrés.' },
]

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const countersAnimated = useRef(false)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !countersAnimated.current) {
        countersAnimated.current = true
        el.querySelectorAll<HTMLElement>('[data-target]').forEach(span => {
          const target = parseInt(span.dataset.target || '0', 10)
          const start = performance.now()
          const dur = 1800
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            span.textContent = Math.floor(eased * target).toLocaleString('fr-FR')
            if (p < 1) requestAnimationFrame(tick)
            else span.textContent = target.toLocaleString('fr-FR')
          }
          requestAnimationFrame(tick)
        })
      }
    }, { threshold: 0.4 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        navScrolled ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_0_0_rgba(15,23,42,0.08)]' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-18 flex items-center justify-between py-4">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C6.5 2 3.5 4.9 3.5 8.5 3.5 13 10 18 10 18S16.5 13 16.5 8.5C16.5 4.9 13.5 2 10 2Z" fill="white" opacity="0.3"/>
                <path d="M10 2C6.5 2 3.5 4.9 3.5 8.5 3.5 13 10 18 10 18S16.5 13 16.5 8.5C16.5 4.9 13.5 2 10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M10 5.5V11.5M7 8.5H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight" style={{ fontFamily: 'Sora' }}>
              Med<span className="text-gradient">Map+</span>
            </span>
          </a>

          <ul className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            {[
              { label: 'Services', href: '#services' },
              { label: 'Fonctionnalités', href: '#features' },
              { label: 'Comment ça marche', href: '#how' },
              { label: 'Professionnels', href: '#pros' },
              { label: 'Contact', href: '#contact' },
            ].map(l => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-teal-600 transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href={getDashboardRoute(user!.role)}
                className="gradient-cta text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-1.5">
                Mon espace <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="hidden md:inline text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors px-3 py-2">
                  Se connecter
                </Link>
                <Link href="/auth/register"
                  className="gradient-cta text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all">
                  Commencer
                </Link>
              </>
            )}
            <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="lg:hidden bg-white border-t border-slate-100 shadow-xl">
              <div className="px-6 py-5 flex flex-col gap-1">
                {[
                  { label: 'Services', href: '#services' },
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Comment ça marche', href: '#how' },
                  { label: 'Professionnels', href: '#pros' },
                  { label: 'Contact', href: '#contact' },
                ].map(l => (
                  <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                    className="py-3 text-slate-700 font-medium border-b border-slate-50 hover:text-teal-600 transition-colors">
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-3 pt-3">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center border border-slate-200 text-sm font-semibold px-4 py-3 rounded-xl hover:border-teal-400 transition-colors">
                    Se connecter
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center gradient-cta text-white text-sm font-semibold px-4 py-3 rounded-xl">
                    Commencer
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <header className="relative min-h-screen bg-slate-50 flex items-center overflow-hidden">
        {/* Right side: full-bleed photo */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[55%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1400&auto=format&fit=crop&q=85"
            alt="Médecin africain souriant avec un patient"
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Fade to left for desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/60 to-transparent lg:via-slate-50/20" />
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>

        {/* Left side: content */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-20 w-full">
          <motion.div className="max-w-lg lg:max-w-xl" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>

            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-7">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              Santé numérique · Côte d&apos;Ivoire
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.04] tracking-tight mb-7">
              Votre santé,<br />
              <span className="text-gradient">à portée</span><br />
              de main.
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-md">
              MedMap+ connecte patients, médecins, hôpitaux et pharmacies sur une seule
              plateforme intelligente. Consultez, réservez et gérez votre santé
              — <strong className="text-slate-800">en quelques secondes.</strong>
            </p>

            <div className="flex flex-wrap gap-4 mb-14">
              <Link href="/auth/register"
                className="group gradient-cta text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-1 transition-all flex items-center gap-2 text-[15px]">
                Créer mon compte gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#services"
                className="bg-white text-slate-800 font-semibold px-8 py-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:text-teal-700 hover:-translate-y-1 transition-all flex items-center gap-2 text-[15px] shadow-sm">
                Découvrir les services
                <ChevronDown className="w-5 h-5" />
              </a>
            </div>

            {/* Mini stats row */}
            <div className="flex items-center gap-8">
              {[
                { value: '850+', label: 'Structures' },
                { value: '24/7', label: 'Disponible' },
                { value: '4.9★', label: 'Note moyenne' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="font-extrabold text-2xl text-gradient leading-none">{s.value}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating cards on photo */}
        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute bottom-32 right-8 lg:right-[8%] hidden sm:block">
          <div className="glass rounded-2xl p-4 shadow-2xl flex items-center gap-3 w-60">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-teal-700 uppercase">Rendez-vous confirmé</div>
              <div className="text-sm font-bold text-slate-800">Dr. Konan · Cardiologue</div>
              <div className="text-xs text-slate-500 mt-0.5">Demain à 14h30</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
          className="absolute top-40 right-8 lg:right-[10%] hidden lg:block">
          <div className="glass rounded-2xl p-4 shadow-2xl flex items-center gap-3 w-52">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Pharmacie de garde</div>
              <div className="text-sm font-bold text-slate-800">À 350 m de vous</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-600 font-medium">Ouverte maintenant</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-slate-400">
          <span className="text-xs font-medium uppercase tracking-widest">Défiler</span>
          <div className="w-5 h-8 border-2 border-slate-300 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-teal-500 rounded-full" style={{ animation: 'scrolldot 1.6s ease-in-out infinite' }} />
          </div>
        </div>
      </header>

      {/* ══════════════════════ STATS STRIP ══════════════════════ */}
      <section className="relative z-10 -mt-1 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
            {[
              { value: '850', suffix: '+', label: 'Structures médicales', icon: <Building2 className="w-5 h-5" /> },
              { value: '42', suffix: '', label: 'Spécialités médicales', icon: <Stethoscope className="w-5 h-5" /> },
              { value: '50', suffix: 'K+', label: 'Patients accompagnés', icon: <Users className="w-5 h-5" /> },
              { value: '98', suffix: '%', label: 'Taux de satisfaction', icon: <Star className="w-5 h-5" /> },
            ].map((s, i) => (
              <motion.div key={s.label} {...fade(i * 0.08)} className="flex items-center gap-4 px-8 py-7">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-slate-900 leading-none">
                    {s.value}{s.suffix}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ SERVICES GRID ══════════════════════ */}
      <section id="services" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="max-w-2xl mb-14">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Nos services</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-5 leading-tight">
              Tout ce dont vous avez besoin,<br />au même endroit.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Une plateforme unique pour humains et animaux. De la consultation d&apos;urgence
              à la livraison de médicaments.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((s, i) => (
              <motion.div key={s.title} {...fade(i * 0.08)}>
                <Link href={s.href}
                  className="group block relative rounded-2xl overflow-hidden aspect-[4/5] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${s.color}`} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 w-fit">
                      {s.tag}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{s.desc}</p>
                    <div className="flex items-center gap-1 mt-4 text-white/90 text-sm font-semibold">
                      Accéder <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ LE PROBLÈME (EDITORIAL) ══════════════════════ */}
      <section className="py-24 lg:py-32 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fade()}>
              <span className="text-teal-400 text-sm font-bold uppercase tracking-widest">Le contexte</span>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-7 leading-tight">
                L&apos;accès aux soins reste un défi quotidien.
              </h2>
              <div className="space-y-5">
                {[
                  { icon: <MapPinOff className="w-5 h-5" />, title: 'Information dispersée', desc: 'Aucune source unique pour trouver une structure adaptée à votre besoin au bon moment.' },
                  { icon: <AlarmClockOff className="w-5 h-5" />, title: 'Horaires & disponibilités opaques', desc: 'Déplacements inutiles parce qu\'on ne sait pas si la pharmacie est ouverte ou si le médicament est disponible.' },
                  { icon: <AlertTriangle className="w-5 h-5" />, title: 'Urgences mal orientées', desc: 'En cas de situation critique, chaque minute compte. Un mauvais aiguillage peut tout changer.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{item.title}</div>
                      <div className="text-sm text-slate-400 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fade(0.15)} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80" alt="Médecin" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="space-y-4 pt-10">
                  <div className="rounded-2xl overflow-hidden aspect-square shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&auto=format&fit=crop&q=80" alt="Pharmacie" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&auto=format&fit=crop&q=80" alt="Vétérinaire" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 uppercase">Résolu en</span>
                </div>
                <div className="font-extrabold text-3xl text-slate-900" style={{ fontFamily: 'Sora' }}>42 sec</div>
                <div className="text-xs text-slate-500 mt-0.5">Pharmacie trouvée, route lancée</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FONCTIONNALITÉS ══════════════════════ */}
      <section id="features" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-5 leading-tight">
              Une application.<br />Toutes les réponses.
            </h2>
            <p className="text-slate-500 text-lg">
              MedMap+ couvre tout le parcours de santé — de la prévention à l&apos;urgence.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100 rounded-3xl overflow-hidden shadow-sm">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fade(i * 0.04)}
                className="group bg-white p-8 hover:bg-teal-50 transition-colors duration-300">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center mb-5 transition-colors duration-300">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-[17px]">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ COMMENT ÇA MARCHE ══════════════════════ */}
      <section id="how" className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Comment ça marche</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-5 leading-tight">
              Opérationnel en 3 étapes.
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 relative">
            {/* connecting line desktop */}
            <div className="hidden lg:block absolute top-16 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-0.5 bg-gradient-to-r from-teal-500 to-sky-500 opacity-30" />

            {[
              {
                num: '01',
                icon: <HeartPulse className="w-7 h-7 text-white" />,
                title: 'Créez votre compte',
                desc: 'En moins d\'une minute. Renseignez votre profil santé et choisissez votre rôle : patient, médecin, hôpital ou pharmacie.',
                img: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=500&auto=format&fit=crop&q=80',
                grad: 'from-teal-500 to-emerald-500',
              },
              {
                num: '02',
                icon: <Search className="w-7 h-7 text-white" />,
                title: 'Trouvez ce qu\'il vous faut',
                desc: 'Géolocalisation activée, filtrez par spécialité, horaires, disponibilité. Tous les professionnels de santé autour de vous.',
                img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
                grad: 'from-sky-500 to-blue-600',
              },
              {
                num: '03',
                icon: <CheckCircle2 className="w-7 h-7 text-white" />,
                title: 'Consultez en toute sérénité',
                desc: 'Prenez RDV, téléconsultez ou rendez-vous directement. Toutes vos infos médicales sont centralisées et sécurisées.',
                img: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500&auto=format&fit=crop&q=80',
                grad: 'from-violet-500 to-purple-600',
              },
            ].map((step, i) => (
              <motion.div key={step.num} {...fade(i * 0.12)} className="relative">
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 border border-slate-100">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.img} alt={step.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className={`absolute top-4 left-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${step.grad} flex items-center justify-center shadow-lg`}>
                      {step.icon}
                    </div>
                    <div className="absolute bottom-4 right-4 font-extrabold text-4xl text-white/20" style={{ fontFamily: 'Sora' }}>
                      {step.num}
                    </div>
                  </div>
                  <div className="p-7">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ ASSISTANT IA ══════════════════════ */}
      <section id="ai" className="py-24 lg:py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fade()}>
            <span className="text-teal-400 text-sm font-bold uppercase tracking-widest">Assistant IA · MediA</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-6 leading-tight">
              Une intelligence artificielle<br />
              <span className="text-gradient">au service de votre santé.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Décrivez vos symptômes en langage naturel. MediA analyse votre situation
              et vous oriente vers la bonne structure —{' '}
              <strong className="text-white">sans jamais remplacer un médecin.</strong>
            </p>
            <ul className="space-y-3 mb-10">
              {[
                'Analyse contextuelle de vos symptômes',
                'Recommandations adaptées à votre profil',
                'Orientation vers la structure la plus pertinente',
                'Disponible 24h/24, en français',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/chatbot"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-7 py-4 rounded-xl hover:bg-teal-50 hover:-translate-y-0.5 transition-all shadow-xl">
              Essayer MediA
              <Bot className="w-5 h-5 text-teal-600" />
            </Link>
          </motion.div>

          {/* Chat mockup */}
          <motion.div {...fade(0.15)} className="relative">
            <div className="glass-dark rounded-3xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 pb-5 border-b border-white/10 mb-5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">MediA · Assistant santé</div>
                  <div className="text-xs text-emerald-400">En ligne</div>
                </div>
              </div>

              <div className="space-y-4 mb-5 max-h-72 overflow-y-auto scrollbar-hide">
                <div className="flex justify-end">
                  <div className="bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                    J&apos;ai mal à la tête depuis ce matin et un peu de fièvre. Que faire ?
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm leading-relaxed">
                    Bonjour ! Je ne remplace pas un médecin, mais voici mes recommandations :
                    <ul className="mt-2 space-y-1 text-slate-300 text-[13px]">
                      <li>• Paracétamol selon la posologie habituelle</li>
                      <li>• Bien vous hydrater</li>
                      <li>• Si fièvre &gt; 39°C ou persistance 48h, consultez</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 flex-shrink-0" />
                  <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl px-4 py-3 flex-1">
                    <div className="text-[10px] font-bold text-teal-300 uppercase mb-2">Médecin recommandé · À 1.4 km</div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center text-white font-bold text-xs">DK</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">Dr. Diabaté Konan</div>
                        <div className="text-xs text-slate-400">Généraliste · Disponible maintenant</div>
                      </div>
                      <Link href="/rendez-vous" className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">RDV</Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <input type="text" placeholder="Posez votre question…" className="bg-transparent flex-1 text-sm text-white placeholder-slate-500 outline-none" readOnly />
                <Link href="/chatbot" className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center hover:scale-105 transition">
                  <Send className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ POUR LES PROFESSIONNELS ══════════════════════ */}
      <section id="pros" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fade()} className="relative order-2 lg:order-1">
              <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=900&auto=format&fit=crop&q=80" alt="Professionnels de santé" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/30 to-transparent" />
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-5 shadow-2xl border border-slate-100">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Trafic patient</div>
                <div className="font-extrabold text-3xl text-gradient">+42%</div>
                <div className="text-xs text-slate-500">en moyenne pour nos partenaires</div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-slate-900 rounded-2xl p-5 shadow-2xl">
                <div className="text-xs font-bold text-teal-400 uppercase mb-1">Partenaires actifs</div>
                <div className="font-extrabold text-3xl text-white">850+</div>
                <div className="text-xs text-slate-400">structures référencées</div>
              </div>
            </motion.div>

            <motion.div {...fade(0.15)} className="order-1 lg:order-2">
              <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Pour les professionnels</span>
              <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-6 leading-tight">
                Développez votre patientèle avec MedMap+.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                Médecin, pharmacien, hôpital ou vétérinaire ? Rejoignez la plateforme et
                offrez à vos patients un accès simplifié à vos services.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {[
                  { icon: <Users className="w-5 h-5" />, title: 'Plus de patients', desc: 'Visibilité auprès de nouveaux patients proches de vous.' },
                  { icon: <LayoutDashboard className="w-5 h-5" />, title: 'Dashboard pro', desc: 'Gérez RDV, stocks et statistiques en temps réel.' },
                  { icon: <Package className="w-5 h-5" />, title: 'Gestion de stock', desc: 'Pharmacies : indiquez vos disponibilités instantanément.' },
                  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Données sécurisées', desc: 'Chiffrement bout en bout, conforme réglementations santé.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm mb-0.5">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth/register"
                className="gradient-cta inline-flex items-center gap-2 text-white font-bold px-7 py-4 rounded-xl shadow-lg shadow-teal-500/30 hover:-translate-y-0.5 transition-all">
                Devenir partenaire
                <Handshake className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ TÉMOIGNAGES ══════════════════════ */}
      <section className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 leading-tight">
              Ils font confiance à MedMap+.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'Avec un bébé de 8 mois, je cherchais une pharmacie de garde en pleine nuit. En 30 secondes, MedMap+ m\'a trouvé la plus proche avec le médicament prescrit.',
                name: 'Aïcha Coulibaly',
                role: 'Maman, Cocody',
                img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&auto=format&fit=crop&q=80',
              },
              {
                quote: 'En tant que pharmacien, la plateforme m\'a apporté une nouvelle clientèle de proximité. Le tableau de bord me permet de gérer mon stock sans effort.',
                name: 'Dr. Yao N\'Guessan',
                role: 'Pharmacien, Treichville',
                img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
              },
              {
                quote: 'L\'assistant IA m\'a orienté vers le bon spécialiste quand je ne savais pas qui consulter. Le diagnostic a été confirmé chez le médecin. Bluffant.',
                name: 'Ibrahim Touré',
                role: 'Étudiant, Yopougon',
                img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
              },
            ].map((t, i) => (
              <motion.div key={t.name} {...fade(i * 0.1)}>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <Quote className="w-8 h-8 text-teal-200 mb-5 flex-shrink-0" />
                  <p className="text-slate-700 leading-relaxed flex-1 mb-6">&quot;{t.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS ANIMÉES ══════════════════════ */}
      <section className="py-20 bg-teal-600" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { target: 850, suffix: '+', label: 'Structures référencées' },
              { target: 42, suffix: '', label: 'Spécialités médicales' },
              { target: 50, suffix: 'K+', label: 'Patients accompagnés' },
              { target: 98, suffix: '%', label: 'Taux de satisfaction' },
            ].map((s, i) => (
              <motion.div key={s.label} {...fade(i * 0.1)} className="text-center">
                <div className="font-extrabold text-5xl lg:text-6xl text-white mb-2" style={{ fontFamily: 'Sora' }}>
                  <span data-target={s.target}>0</span>{s.suffix}
                </div>
                <div className="text-teal-100 text-sm font-medium uppercase tracking-wider">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">FAQ</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 leading-tight">
              Questions fréquentes.
            </h2>
          </motion.div>

          <div className="divide-y divide-slate-100">
            {[
              { q: 'L\'application est-elle gratuite ?', a: 'Oui. Le téléchargement et l\'utilisation principale sont entièrement gratuits. Certaines fonctionnalités premium peuvent avoir une tarification spécifique.' },
              { q: 'Mes données médicales sont-elles sécurisées ?', a: 'Absolument. Toutes les données sont chiffrées de bout en bout. Vous gardez le contrôle total sur le partage de vos informations.' },
              { q: 'L\'assistant IA remplace-t-il un médecin ?', a: 'Non. MediA est un outil d\'orientation et d\'accompagnement. Il vous aide à mieux comprendre votre situation, mais ne pose jamais de diagnostic médical.' },
              { q: 'Comment devenir partenaire ?', a: 'Créez un compte professionnel sur MedMap+. Votre structure sera vérifiée et activée sous 48h par notre équipe.' },
              { q: 'Quels appareils sont compatibles ?', a: 'MedMap+ fonctionne sur iOS 13+, Android 8.0+ et sur n\'importe quel navigateur web moderne.' },
              { q: 'Fonctionne-t-elle avec une connexion limitée ?', a: 'Oui. L\'app est optimisée pour les connexions mobiles africaines et met en cache les données essentielles.' },
            ].map((item, i) => (
              <motion.div key={i} {...fade(i * 0.04)}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full py-6 flex items-center justify-between gap-4 text-left hover:text-teal-600 transition-colors">
                  <span className="font-semibold text-[17px] text-slate-900">{item.q}</span>
                  <div className={`w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${faqOpen === i ? 'border-teal-500 bg-teal-50 rotate-45' : ''}`}>
                    <Plus className={`w-4 h-4 ${faqOpen === i ? 'text-teal-600' : 'text-slate-500'}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="pb-6 text-slate-500 leading-relaxed pr-12">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA PRINCIPAL ══════════════════════ */}
      <section className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="relative rounded-3xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1600&auto=format&fit=crop&q=85"
              alt="Soins de santé"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent" />

            <div className="relative p-12 lg:p-20 max-w-2xl">
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
                Prêt à transformer<br />votre expérience santé ?
              </h2>
              <p className="text-slate-300 text-lg mb-10">
                Rejoignez des milliers d&apos;utilisateurs qui ont simplifié leur santé grâce à MedMap+.
                Gratuit, simple, efficace.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/register"
                  className="gradient-cta text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-teal-500/30 hover:-translate-y-1 transition-all flex items-center gap-2">
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/auth/login"
                  className="bg-white/10 backdrop-blur-sm text-white border border-white/20 font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors">
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ ÉQUIPE ══════════════════════ */}
      <section id="contact" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">L&apos;équipe LUMINEX</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-5 leading-tight">
              Conçu avec passion<br />à Abidjan.
            </h2>
            <p className="text-slate-500 text-lg">
              Étudiants à l&apos;Université Félix Houphouët-Boigny, animés par l&apos;envie d&apos;améliorer l&apos;accès aux soins.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { initials: 'MA', grad: 'from-teal-500 to-sky-500', icon: <Code2 className="w-5 h-5" />, name: 'MONKIE Chris-Orhé Aduko', role: 'Lead Developer', delay: 0 },
              { initials: 'KI', grad: 'from-sky-500 to-violet-500', icon: <LayoutGrid className="w-5 h-5" />, name: 'KOUAKOU Djezou Isaac', role: 'UX/UI & Product', delay: 0.1 },
              { initials: 'KJ', grad: 'from-emerald-500 to-teal-500', icon: <Server className="w-5 h-5" />, name: 'KOFFI Johann Christ', role: 'Backend & Data', delay: 0.2 },
            ].map(member => (
              <motion.div key={member.name} {...fade(member.delay)} className="group text-center">
                <div className="relative inline-block mb-5">
                  <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${member.grad} p-0.5 group-hover:scale-105 transition-transform duration-300`}>
                    <div className="w-full h-full rounded-2xl bg-slate-50 flex items-center justify-center font-extrabold text-3xl text-gradient">
                      {member.initials}
                    </div>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-gradient-to-br ${member.grad} text-white flex items-center justify-center shadow-lg`}>
                    {member.icon}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{member.name}</h3>
                <p className="text-teal-600 font-semibold text-sm">{member.role}</p>
              </motion.div>
            ))}
          </div>

          {/* Contact */}
          <motion.div {...fade(0.1)} className="grid lg:grid-cols-2 gap-10 items-start bg-slate-50 rounded-3xl p-8 lg:p-12 border border-slate-100">
            <div>
              <h3 className="text-3xl font-extrabold mb-3">Une question, un partenariat ?</h3>
              <p className="text-slate-500 mb-8">Notre équipe vous répond sous 48h.</p>
              <ul className="space-y-4">
                {[
                  { icon: <Mail className="w-5 h-5" />, text: 'contact@medmap.app', color: 'text-teal-600 bg-teal-100' },
                  { icon: <Phone className="w-5 h-5" />, text: '+225 07 XX XX XX XX', color: 'text-sky-600 bg-sky-100' },
                  { icon: <MapPin className="w-5 h-5" />, text: 'Université FHB, Cocody, Abidjan', color: 'text-emerald-600 bg-emerald-100' },
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>{item.icon}</div>
                    <span className="text-slate-700">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); alert('Message envoyé ! Nous vous répondrons rapidement.') }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nom</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition bg-white" placeholder="Votre nom" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition bg-white" placeholder="vous@email.com" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Message</label>
                <textarea rows={4} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition resize-none bg-white" placeholder="Comment pouvons-nous vous aider ?" />
              </div>
              <button type="submit" className="gradient-cta w-full text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                Envoyer le message <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C6.5 2 3.5 4.9 3.5 8.5 3.5 13 10 18 10 18S16.5 13 16.5 8.5C16.5 4.9 13.5 2 10 2Z" stroke="white" strokeWidth="1.5" fill="white" opacity="0.3"/>
                    <path d="M10 5.5V11.5M7 8.5H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-xl text-white" style={{ fontFamily: 'Sora' }}>Med<span className="text-gradient">Map+</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6 max-w-sm text-sm">
                La plateforme de santé numérique qui centralise hôpitaux, pharmacies et vétérinaires.
                Conçue à Abidjan, pour l&apos;Afrique.
              </p>
              <div className="flex gap-2.5">
                {[Share2, AtSign, Camera].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-teal-500 transition-colors flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Produit</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'Services', href: '#services' },
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Assistant IA', href: '/chatbot' },
                  { label: 'Urgences', href: '/urgence' },
                ].map(l => <li key={l.label}><a href={l.href} className="hover:text-teal-400 transition-colors">{l.label}</a></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Espaces</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'Patients', href: '/auth/register' },
                  { label: 'Médecins', href: '/auth/register' },
                  { label: 'Hôpitaux', href: '/auth/register' },
                  { label: 'Pharmacies', href: '/auth/register' },
                ].map(l => <li key={l.label}><a href={l.href} className="hover:text-teal-400 transition-colors">{l.label}</a></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Newsletter</h4>
              <p className="text-sm text-slate-500 mb-4">Recevez nos actualités santé.</p>
              <form onSubmit={e => { e.preventDefault(); alert('Merci !') }} className="flex">
                <input type="email" placeholder="votre@email.com" className="flex-1 px-3 py-2.5 rounded-l-xl bg-slate-800 border border-slate-700 focus:border-teal-500 outline-none text-white text-sm min-w-0" />
                <button className="gradient-cta text-white px-4 rounded-r-xl hover:scale-105 transition">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-sm">
            <div className="text-slate-500">
              © 2026 LUMINEX · MedMap+ · Université Félix Houphouët-Boigny
            </div>
            <div className="flex gap-5 text-slate-500">
              <a href="#" className="hover:text-teal-400 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-teal-400 transition-colors">CGU</a>
              <a href="#" className="hover:text-teal-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
