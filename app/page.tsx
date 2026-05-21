'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import {
  MapPin, Pill, Calendar, ArrowRight, Activity, Bot, Search,
  Wifi, BatteryFull, Building2, Users, Star, AlertTriangle, PawPrint,
  Sparkles, Send, Check, Plus, DownloadCloud, HeartPulse, Video,
  FolderHeart, BellRing, Siren, LayoutDashboard, Package, ShieldCheck,
  Stethoscope, MapPinOff, AlarmClockOff, CheckCircle2, Navigation,
  PackageCheck, Phone, Mail, Share2, AtSign, Camera, Briefcase, Play,
  ArrowDown, Code2, Server, LayoutGrid,
  CalendarCheck, Bell, User, Handshake, Menu, X, MessageSquare,
  Signal, Clock, Map, Heart,
} from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: 'easeOut' as const, delay },
})

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const blobRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const countersAnimated = useRef(false)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return
    let mouseX = 0, mouseY = 0, blobX = 0, blobY = 0
    let raf: number
    const onMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY }
    document.addEventListener('mousemove', onMove)
    const animate = () => {
      blobX += (mouseX - blobX) * 0.08
      blobY += (mouseY - blobY) * 0.08
      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${blobX}px, ${blobY}px) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(animate)
    }
    animate()
    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
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
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Cursor blob desktop only */}
      <div
        ref={blobRef}
        className="fixed hidden lg:block pointer-events-none z-[1] mix-blend-multiply"
        style={{
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.18), transparent 70%)',
          top: 0, left: 0, transition: 'opacity 0.4s',
        }}
      />

      {/* ====== NAVBAR ====== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navScrolled ? 'bg-white/85 backdrop-blur-xl shadow-[0_4px_30px_rgba(15,23,42,0.06)]' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="relative">
              <svg width="40" height="40" viewBox="0 0 40 40" className="transition-transform duration-500 group-hover:rotate-12">
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0D9488" />
                    <stop offset="100%" stopColor="#0EA5E9" />
                  </linearGradient>
                </defs>
                <path d="M20 4 C12 4 6 10 6 18 C6 27 20 38 20 38 C20 38 34 27 34 18 C34 10 28 4 20 4 Z" fill="url(#logoGrad)" />
                <circle cx="20" cy="17" r="8" fill="white" />
                <path d="M20 12 L20 22 M15 17 L25 17" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-2xl" style={{ fontFamily: 'Sora' }}>
              Med<span className="text-gradient">Map+</span>
            </span>
          </a>

          <ul className="hidden lg:flex items-center gap-9 text-[15px] font-medium text-slate-700">
            {[
              { label: 'Fonctionnalités', href: '#features' },
              { label: 'Comment ça marche', href: '#how' },
              { label: 'Professionnels', href: '#pros' },
              { label: 'Assistant IA', href: '#ai' },
              { label: 'Contact', href: '#contact' },
            ].map(l => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-teal-600 transition relative group">
                  {l.label}
                  <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-teal-500 group-hover:w-full transition-all" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href={getDashboardRoute(user!.role)}
                className="gradient-cta text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                Mon espace
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="hidden md:inline-flex text-sm font-medium text-slate-700 hover:text-teal-600 transition px-4 py-2">
                  Se connecter
                </Link>
                <Link
                  href="/auth/register"
                  className="gradient-cta text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200">
            <div className="px-6 py-4 flex flex-col gap-3 text-slate-700 font-medium">
              {[
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'Comment ça marche', href: '#how' },
                { label: 'Professionnels', href: '#pros' },
                { label: 'Assistant IA', href: '#ai' },
                { label: 'Contact', href: '#contact' },
              ].map(l => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="py-2 hover:text-teal-600">
                  {l.label}
                </a>
              ))}
              <Link href="/auth/login" className="py-2 text-primary font-semibold" onClick={() => setMobileOpen(false)}>Se connecter</Link>
              <Link href="/auth/register" className="gradient-cta text-white text-sm font-semibold px-5 py-3 rounded-full text-center" onClick={() => setMobileOpen(false)}>
                Commencer
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ====== HERO ====== */}
      <header className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 dots-grid opacity-40" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-teal-300/40 to-sky-300/40 animate-blob blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-200/40 to-teal-300/40 animate-blob blur-3xl" style={{ animationDelay: '-7s' }} />

        {/* Floating decorative icons */}
        <div className="absolute top-32 left-[8%] animate-float-slow opacity-80 hidden md:block">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center rotate-6">
            <Stethoscope className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        <div className="absolute top-48 right-[10%] animate-float-fast opacity-90 hidden md:block">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 shadow-xl flex items-center justify-center animate-heartbeat">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
        </div>
        <div className="absolute bottom-40 left-[15%] animate-float-slow opacity-80 hidden lg:block" style={{ animationDelay: '-3s' }}>
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center -rotate-12">
            <Pill className="w-7 h-7 text-sky-600" />
          </div>
        </div>
        <div className="absolute bottom-32 right-[15%] animate-float-fast opacity-80 hidden lg:block" style={{ animationDelay: '-2s' }}>
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center rotate-12">
            <PawPrint className="w-7 h-7 text-teal-700" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT TEXT */}
          <motion.div className="relative z-10" {...fade()}>
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-teal-200 rounded-full px-4 py-2 mb-7 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
              </span>
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Santé numérique • Côte d'Ivoire</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-7">
              Votre santé,<br />
              <span className="text-gradient">à portée de main.</span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-600 leading-relaxed max-w-xl mb-10">
              MedMap+ centralise hôpitaux, cliniques, pharmacies et cabinets vétérinaires
              sur une seule application intelligente. Géolocalisez, prenez rendez-vous,
              téléconsultez — <strong className="text-slate-800">en quelques secondes.</strong>
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                href="/auth/register"
                className="group gradient-cta text-white font-semibold px-7 py-4 rounded-full shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/50 hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <a
                href="#how"
                className="group bg-white text-slate-800 font-semibold px-7 py-4 rounded-full border border-slate-200 hover:border-teal-400 hover:text-teal-700 hover:-translate-y-1 transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center group-hover:scale-110 transition">
                  <ArrowRight className="w-4 h-4 text-white" />
                </span>
                Voir la démo
              </a>
            </div>

            {/* Hero stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg">
              {[
                { value: '850', label: 'Structures référencées' },
                { value: '24/7', label: 'Disponibilité' },
                { value: '98%', label: 'Satisfaction utilisateurs' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-extrabold text-3xl lg:text-4xl text-gradient">{s.value}</div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mt-1 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — Phone mockup */}
          <motion.div {...fade(0.2)} className="relative flex justify-center lg:justify-end">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[440px] h-[440px] rounded-full bg-gradient-to-br from-teal-400/30 via-sky-400/20 to-emerald-300/30 blur-2xl animate-pulse-soft" />
            </div>

            {/* Floating card - pharmacy */}
            <div className="absolute top-10 -left-4 lg:-left-12 z-20 animate-float-slow">
              <div className="glass rounded-2xl p-4 shadow-xl flex items-center gap-3 w-64">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-teal-700">Pharmacie de garde</div>
                  <div className="text-sm font-semibold text-slate-800">À 350m de vous</div>
                  <div className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ouverte maintenant
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card - appointment */}
            <div className="absolute bottom-20 -right-4 lg:-right-8 z-20 animate-float-fast" style={{ animationDelay: '-2s' }}>
              <div className="glass rounded-2xl p-4 shadow-xl w-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-rose-600">Rendez-vous</div>
                    <div className="text-sm font-semibold text-slate-800">Dr. Konan • Cardiologue</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Confirmé pour demain à 14h30</div>
              </div>
            </div>

            {/* Floating users badge */}
            <div className="absolute top-1/2 -right-12 lg:-right-20 z-20 animate-float-slow hidden md:block" style={{ animationDelay: '-4s' }}>
              <div className="glass rounded-full p-3 shadow-xl flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 pr-2">+12 utilisateurs</span>
              </div>
            </div>

            {/* Phone */}
            <div className="phone-shell relative z-10 animate-float-slow" style={{ animationDuration: '9s' }}>
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="relative w-full h-full bg-gradient-to-br from-teal-50 via-white to-sky-50">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 pt-12 pb-3 text-[10px] font-semibold text-slate-700">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <Signal className="w-3 h-3" />
                      <Wifi className="w-3 h-3" />
                      <BatteryFull className="w-4 h-3" />
                    </div>
                  </div>
                  {/* Search bar */}
                  <div className="px-4 pb-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-3 py-2.5 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Hôpital, pharmacie, vétérinaire…</span>
                    </div>
                  </div>
                  {/* Filter chips */}
                  <div className="px-4 pb-3 flex gap-2 overflow-hidden">
                    <span className="text-[10px] font-semibold bg-teal-600 text-white px-2.5 py-1 rounded-full">Tous</span>
                    <span className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full">Hôpitaux</span>
                    <span className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full">Pharmacies</span>
                    <span className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full">Vétérinaires</span>
                  </div>
                  {/* Map area */}
                  <div className="relative mx-4 rounded-2xl overflow-hidden h-[200px] bg-[#E8F4F1]">
                    <svg width="100%" height="100%" viewBox="0 0 280 200" className="absolute inset-0">
                      <rect width="280" height="200" fill="#E8F4F1" />
                      <path d="M0 60 L280 70" stroke="#fff" strokeWidth="6" />
                      <path d="M0 140 L280 145" stroke="#fff" strokeWidth="5" />
                      <path d="M90 0 L100 200" stroke="#fff" strokeWidth="6" />
                      <path d="M200 0 L195 200" stroke="#fff" strokeWidth="5" />
                      <path d="M0 180 Q80 165 160 185 T280 170" stroke="#BAE6FD" strokeWidth="10" fill="none" opacity="0.7" />
                      <rect x="115" y="80" width="60" height="40" rx="6" fill="#A7F3D0" opacity="0.7" />
                    </svg>
                    <div className="map-dot" style={{ top: '30%', left: '25%' }} />
                    <div className="map-dot" style={{ top: '55%', left: '60%', background: '#0EA5E9', boxShadow: '0 0 0 4px rgba(14,165,233,0.2)' }} />
                    <div className="map-dot" style={{ top: '20%', left: '70%', background: '#FB7185', boxShadow: '0 0 0 4px rgba(251,113,133,0.2)' }} />
                    <div className="map-dot" style={{ top: '75%', left: '35%' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="pulse-ring-el" />
                        <div className="pulse-ring-el" style={{ animationDelay: '0.7s' }} />
                        <div className="w-5 h-5 rounded-full bg-blue-600 ring-4 ring-white shadow-lg" />
                      </div>
                    </div>
                  </div>
                  {/* Result cards */}
                  <div className="px-4 pt-3 space-y-2">
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-teal-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">CHU de Treichville</div>
                        <div className="text-[9px] text-emerald-600 font-medium">Ouvert • 1.2 km</div>
                      </div>
                      <div className="text-[10px] font-bold text-teal-600">★ 4.8</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Pill className="w-4 h-4 text-sky-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">Pharmacie Saint-Jean</div>
                        <div className="text-[9px] text-emerald-600 font-medium">De garde • 350 m</div>
                      </div>
                      <div className="text-[10px] font-bold text-teal-600">★ 4.9</div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="absolute bottom-3 left-3 right-3 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-around py-2">
                    <Map className="w-5 h-5 text-teal-600" />
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center -mt-5 shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <Bell className="w-5 h-5 text-slate-400" />
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Partner marquee */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 mt-20">
          <div className="text-center text-xs uppercase font-bold tracking-widest text-slate-400 mb-6">
            Partenaires & Structures de confiance
          </div>
          <div className="marquee">
            <div className="marquee-track">
              {[
                { icon: <Building2 className="w-5 h-5" />, name: 'CHU de Cocody' },
                { icon: <Plus className="w-5 h-5" />, name: 'Polyclinique Sainte Anne' },
                { icon: <Pill className="w-5 h-5" />, name: 'Pharmacie Plateau' },
                { icon: <Stethoscope className="w-5 h-5" />, name: 'Clinique Pisam' },
                { icon: <PawPrint className="w-5 h-5" />, name: 'Vetcare Abidjan' },
                { icon: <Building2 className="w-5 h-5" />, name: 'CHU de Treichville' },
              ].flatMap((p, i) => [{ ...p, key: i }, { ...p, key: i + 100 }]).map(p => (
                <div key={p.key} className="flex items-center gap-2 text-lg font-bold whitespace-nowrap text-slate-400">
                  {p.icon} {p.name}
                  {p.key < 6 && <span className="ml-12" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ====== PROBLÈME / CONTEXTE ====== */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          {/* Image collage */}
          <motion.div {...fade()} className="relative">
            <div className="relative grid grid-cols-12 gap-4">
              <div className="col-span-8 row-span-2 relative">
                <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&auto=format&fit=crop&q=80"
                    alt="Médecin"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-transparent" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-5 shadow-2xl w-56 animate-float-slow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-teal-700" />
                    </div>
                    <span className="text-xs uppercase font-bold text-teal-700">Gain de temps</span>
                  </div>
                  <div className="font-extrabold text-2xl text-slate-800">-65%</div>
                  <div className="text-xs text-slate-500">de déplacements inutiles</div>
                </div>
              </div>
              <div className="col-span-4 relative rounded-3xl overflow-hidden aspect-square shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&auto=format&fit=crop&q=80" alt="Pharmacie" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="col-span-4 relative rounded-3xl overflow-hidden aspect-square shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&auto=format&fit=crop&q=80" alt="Vétérinaire" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="absolute -top-10 -left-10 w-32 h-32 dots-grid opacity-60" />
          </motion.div>

          {/* Text */}
          <motion.div {...fade(0.2)}>
            <span className="inline-block bg-teal-50 text-teal-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5">Le contexte</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
              Un système de santé <span className="text-gradient">fragmenté</span>,
              des patients qui perdent du temps.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Dans nos villes en croissance rapide, accéder rapidement à un soin adapté reste un défi.
              Les informations sont dispersées, les pharmacies de garde introuvables le soir, les rendez-vous
              compliqués à organiser.
            </p>
            <div className="space-y-4">
              {[
                { icon: <MapPinOff className="w-6 h-6 text-rose-600" />, bg: 'bg-rose-100', hover: 'hover:border-rose-200', title: 'Information dispersée', desc: 'Aucune source unique pour trouver une structure adaptée à votre besoin.' },
                { icon: <AlarmClockOff className="w-6 h-6 text-amber-600" />, bg: 'bg-amber-100', hover: 'hover:border-amber-200', title: 'Horaires & disponibilités opaques', desc: 'On se déplace sans savoir si la pharmacie est ouverte ou si le médicament est disponible.' },
                { icon: <AlertTriangle className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-100', hover: 'hover:border-purple-200', title: 'Urgences mal orientées', desc: 'En cas de besoin urgent, perdre 30 minutes peut tout changer.' },
              ].map(item => (
                <div key={item.title} className={`flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 ${item.hover} hover:shadow-lg transition`}>
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                    <div className="text-sm text-slate-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FONCTIONNALITÉS ====== */}
      <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-100 to-sky-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-100 to-teal-100 rounded-full blur-3xl opacity-60" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block bg-teal-50 text-teal-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5">Fonctionnalités</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Tout ce dont vous avez besoin,<br />
              <span className="text-gradient">dans une seule application.</span>
            </h2>
            <p className="text-slate-600 text-lg">
              MedMap+ n'est pas un simple annuaire. C'est une plateforme d'interconnexion entre patients,
              professionnels de santé et pharmacies — pour humains et animaux.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <MapPin className="w-8 h-8" />, bg: 'bg-teal-100', color: 'text-teal-700', title: 'Géolocalisation intelligente', desc: 'Visualisez en temps réel les hôpitaux, cliniques, pharmacies et cabinets vétérinaires autour de vous, avec distance, niveau d\'affluence et horaires.', cta: 'Carte interactive', ctaColor: 'text-teal-700', href: '/carte' },
              { icon: <CalendarCheck className="w-8 h-8" />, bg: 'bg-sky-100', color: 'text-sky-700', title: 'Rendez-vous en un tap', desc: 'Réservez votre consultation directement depuis l\'app, choisissez votre créneau, et recevez un rappel automatique avant le rendez-vous.', cta: 'Réservation instantanée', ctaColor: 'text-sky-700', href: '/rendez-vous' },
              { icon: <Video className="w-8 h-8" />, bg: 'bg-violet-100', color: 'text-violet-700', title: 'Téléconsultation sécurisée', desc: 'Consultez un médecin à distance via vidéo. Pratique pour les premiers diagnostics ou un suivi sans déplacement.', cta: 'Vidéo HD chiffrée', ctaColor: 'text-violet-700', href: '/rendez-vous' },
              { icon: <Pill className="w-8 h-8" />, bg: 'bg-emerald-100', color: 'text-emerald-700', title: 'Recherche de médicaments', desc: 'Identifiez les pharmacies — y compris celles de garde — qui disposent du produit que vous cherchez. Plus de déplacements inutiles.', cta: 'Pharmacies de garde 24/7', ctaColor: 'text-emerald-700', href: '/medicaments' },
              { icon: <PawPrint className="w-8 h-8" />, bg: 'bg-amber-100', color: 'text-amber-700', title: 'Santé vétérinaire intégrée', desc: 'Trouvez un vétérinaire, suivez les vaccins de vos animaux et gérez leurs visites dans le même espace que votre santé.', cta: 'Pour vos compagnons aussi', ctaColor: 'text-amber-700', href: '/animal' },
              { icon: <Sparkles className="w-8 h-8" />, bg: 'bg-white/20', color: 'text-white', title: 'Assistant IA personnel', desc: 'Décrivez vos symptômes, posez vos questions. Notre IA vous oriente vers la bonne structure — sans remplacer le professionnel de santé.', cta: 'Disponible 24/7', ctaColor: 'text-white', href: '/chatbot', dark: true },
              { icon: <FolderHeart className="w-8 h-8" />, bg: 'bg-rose-100', color: 'text-rose-700', title: 'Espace personnel sécurisé', desc: 'Centralisez vos informations médicales, suivis de traitement et historique. Vos données sont chiffrées de bout en bout.', cta: 'Chiffrement end-to-end', ctaColor: 'text-rose-700', href: '/dashboard/patient' },
              { icon: <BellRing className="w-8 h-8" />, bg: 'bg-indigo-100', color: 'text-indigo-700', title: 'Rappels intelligents', desc: 'Ne ratez plus un rendez-vous, une prise de médicament ou un rappel de vaccin. L\'app s\'occupe de tout.', cta: 'Notifications personnalisées', ctaColor: 'text-indigo-700', href: '/notifications' },
              { icon: <Siren className="w-8 h-8" />, bg: 'bg-red-100', color: 'text-red-700', title: 'Bouton d\'urgence', desc: 'En cas de situation critique, accédez en un clic aux services de secours et orientez-vous vers la structure la plus proche.', cta: 'SOS en un tap', ctaColor: 'text-red-700', href: '/urgence' },
            ].map((f, i) => (
              <motion.div key={f.title} {...fade(i * 0.05)}>
                <Link
                  href={f.href}
                  className={`feature-card shine block rounded-3xl p-7 border ${f.dark ? 'bg-gradient-to-br from-teal-600 to-sky-600 text-white border-transparent' : 'bg-white border-slate-100'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110`}>
                    {f.icon}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${f.dark ? 'text-white' : ''}`}>{f.title}</h3>
                  <p className={`text-[15px] leading-relaxed mb-4 ${f.dark ? 'text-teal-50' : 'text-slate-600'}`}>{f.desc}</p>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${f.ctaColor}`}>
                    <span>{f.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMMENT ÇA MARCHE ====== */}
      <section id="how" className="relative py-24 lg:py-32 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-3xl mx-auto mb-20">
            <span className="inline-block bg-sky-50 text-sky-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5">Comment ça marche</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              En <span className="text-gradient">3 étapes simples</span>, vos soins simplifiés.
            </h2>
            <p className="text-slate-600 text-lg">Du téléchargement à la consultation, tout est pensé pour aller à l'essentiel.</p>
          </motion.div>

          <div className="relative">
            <svg className="absolute top-16 left-0 right-0 hidden lg:block" height="100" viewBox="0 0 1100 100" fill="none" preserveAspectRatio="none" style={{ width: '100%' }}>
              <path className="step-line" d="M 100 50 Q 350 -20 550 50 T 1000 50" stroke="#14B8A6" strokeWidth="2" fill="none" />
            </svg>
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 relative">
              {[
                { num: '01', icon: <DownloadCloud className="w-14 h-14 text-white" />, grad: 'from-teal-500 to-emerald-500', shadow: 'shadow-teal-500/30', title: 'Téléchargez l\'app', desc: 'Disponible gratuitement sur iOS et Android. Créez votre compte en moins d\'une minute, renseignez votre profil santé.' },
                { num: '02', icon: <Search className="w-14 h-14 text-white" />, grad: 'from-sky-500 to-blue-500', shadow: 'shadow-sky-500/30', title: 'Cherchez ce qu\'il vous faut', desc: 'Activez la géolocalisation et explorez les structures autour de vous. Filtrez par spécialité, par horaires, par disponibilité.' },
                { num: '03', icon: <HeartPulse className="w-14 h-14 text-white" />, grad: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/30', title: 'Soignez-vous sereinement', desc: 'Prenez RDV, téléconsultez, réservez votre médicament. Suivez tout depuis votre espace personnel.' },
              ].map((s, i) => (
                <motion.div key={s.num} {...fade(i * 0.15)} className="text-center">
                  <div className="relative inline-flex">
                    <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-xl ${s.shadow} mx-auto mb-8 relative z-10`}>
                      {s.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center font-extrabold text-teal-700 text-lg z-20" style={{ fontFamily: 'Sora' }}>
                      {s.num}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                  <p className="text-slate-600 leading-relaxed max-w-sm mx-auto">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Scenario card */}
          <motion.div {...fade(0.2)} className="mt-24 grid lg:grid-cols-5 gap-10 items-center bg-gradient-to-br from-teal-50 via-white to-sky-50 rounded-3xl p-8 lg:p-12 border border-teal-100">
            <div className="lg:col-span-2 relative">
              <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&auto=format&fit=crop&q=80" alt="Scenario" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-emerald-700">Trouvé en</div>
                    <div className="font-extrabold text-2xl" style={{ fontFamily: 'Sora' }}>42 sec</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <span className="inline-block bg-white text-teal-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-4 border border-teal-100">Scénario réel</span>
              <h3 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-5">
                22h30. Votre enfant a de la fièvre. Que faites-vous ?
              </h3>
              <p className="text-slate-700 text-lg leading-relaxed mb-6">
                Vous ouvrez MedMap+, activez la géolocalisation, tapez le nom du médicament prescrit.
                L'app affiche immédiatement les <strong>3 pharmacies de garde</strong> ouvertes à moins
                d'1 km, leur disponibilité du produit, et l'itinéraire le plus rapide.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: <MapPin className="w-4 h-4" />, label: 'Pharmacie identifiée' },
                  { icon: <PackageCheck className="w-4 h-4" />, label: 'Stock confirmé' },
                  { icon: <Navigation className="w-4 h-4" />, label: 'Itinéraire optimisé' },
                ].map(tag => (
                  <span key={tag.label} className="bg-white border border-teal-200 text-teal-700 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2">
                    {tag.icon} {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== ASSISTANT IA ====== */}
      <section id="ai" className="relative py-24 lg:py-32 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '-7s' }} />
        </div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fade()}>
            <span className="inline-block bg-teal-500/20 text-teal-300 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5 border border-teal-500/30">Assistant IA intégré</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6 text-white">
              Une <span className="text-gradient">intelligence</span><br />
              au service de votre santé.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              Posez vos questions en langage naturel, décrivez vos symptômes, demandez où trouver tel médicament.
              L'assistant MedMap+ analyse votre besoin et vous oriente — <strong className="text-white">sans jamais se substituer à un médecin.</strong>
            </p>
            <ul className="space-y-4 mb-10">
              {[
                'Analyse contextuelle de vos symptômes',
                'Recommandations adaptées à votre profil',
                'Orientation vers la structure la plus pertinente',
                'Disponible 24h/24, en français',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-teal-400" />
                  </div>
                  <span className="text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-7 py-4 rounded-full hover:bg-teal-50 hover:-translate-y-1 transition-all"
            >
              Discuter avec l'assistant
              <MessageSquare className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Chat mockup */}
          <motion.div {...fade(0.2)} className="relative">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-teal-500/30 rounded-full blur-3xl" />
            <div className="glass-dark rounded-3xl p-6 lg:p-8 relative">
              <div className="flex items-center gap-3 pb-5 border-b border-white/10 mb-5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-white">Assistant MedMap+</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En ligne
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-teal-500 to-sky-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                    Bonjour, j'ai mal à la tête depuis ce matin et un peu de fièvre. Que dois-je faire ?
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm">
                    Bonjour ! Avant tout, je tiens à préciser que je ne remplace pas un médecin. Cela dit, voici ce que je vous suggère :
                    <ul className="mt-2 space-y-1.5 text-slate-200">
                      <li className="flex gap-1.5"><span className="text-teal-300">•</span> Surveillez la fièvre (paracétamol selon prescription)</li>
                      <li className="flex gap-1.5"><span className="text-teal-300">•</span> Hydratez-vous régulièrement</li>
                      <li className="flex gap-1.5"><span className="text-teal-300">•</span> Si la fièvre dépasse 39°C ou persiste 48h, consultez</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 flex-shrink-0" />
                  <div className="bg-gradient-to-br from-teal-500/20 to-sky-500/20 border border-teal-500/30 rounded-2xl px-4 py-3 max-w-[80%] flex-1">
                    <div className="text-xs uppercase font-bold text-teal-300 mb-2">Médecin recommandé près de vous</div>
                    <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-sky-400 flex items-center justify-center text-white font-bold text-sm">DK</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">Dr. Diabaté Konan</div>
                        <div className="text-xs text-slate-300">Généraliste • 1.4 km</div>
                      </div>
                      <Link href="/rendez-vous" className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">RDV</Link>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
                <input type="text" placeholder="Posez votre question…" className="bg-transparent flex-1 text-sm text-white placeholder-slate-400 focus:outline-none" readOnly />
                <Link href="/chatbot" className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center hover:scale-105 transition">
                  <Send className="w-4 h-4 text-white" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== POUR LES PROFESSIONNELS ====== */}
      <section id="pros" className="relative py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fade()} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden aspect-[3/4] shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80" alt="Médecin" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="rounded-3xl overflow-hidden aspect-square shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=500&auto=format&fit=crop&q=80" alt="Pharmacie" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
                <div className="space-y-4 pt-12">
                  <div className="rounded-3xl overflow-hidden aspect-square shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=500&auto=format&fit=crop&q=80" alt="Vétérinaire" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="rounded-3xl overflow-hidden aspect-[3/4] shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=500&auto=format&fit=crop&q=80" alt="Hôpital" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
              </div>
              <div className="absolute top-6 -left-6 bg-white rounded-2xl p-5 shadow-2xl animate-float-slow z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-emerald-700">Trafic patient</span>
                </div>
                <div className="font-extrabold text-3xl text-gradient">+42%</div>
                <div className="text-xs text-slate-500">en moyenne pour nos partenaires</div>
              </div>
            </motion.div>

            <motion.div {...fade(0.2)}>
              <span className="inline-block bg-amber-50 text-amber-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5">Pour les professionnels</span>
              <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
                Donnez de la <span className="text-gradient">visibilité</span> à votre structure.
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Médecin, pharmacien, vétérinaire ? Rejoignez la plateforme et offrez à vos patients
                un accès simplifié à vos services.
              </p>
              <div className="grid sm:grid-cols-2 gap-5 mb-10">
                {[
                  { icon: <Users className="w-5 h-5" />, bg: 'bg-teal-100', color: 'text-teal-700', title: 'Plus de patients', desc: 'Atteignez de nouveaux utilisateurs autour de vous.' },
                  { icon: <LayoutDashboard className="w-5 h-5" />, bg: 'bg-sky-100', color: 'text-sky-700', title: 'Tableau de bord pro', desc: 'Vue d\'ensemble RDV, stocks, statistiques.' },
                  { icon: <Package className="w-5 h-5" />, bg: 'bg-emerald-100', color: 'text-emerald-700', title: 'Gestion de stock', desc: 'Pour pharmacies : indiquez vos disponibilités en temps réel.' },
                  { icon: <ShieldCheck className="w-5 h-5" />, bg: 'bg-rose-100', color: 'text-rose-700', title: 'Conformité & sécurité', desc: 'Données chiffrées, conforme aux réglementations santé.' },
                ].map(item => (
                  <div key={item.title} className="lift flex items-start gap-3 p-5 rounded-2xl bg-white border border-slate-100">
                    <div className={`w-11 h-11 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                    <div>
                      <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                      <div className="text-sm text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/auth/register"
                className="gradient-cta inline-flex items-center gap-2 text-white font-semibold px-7 py-4 rounded-full shadow-lg shadow-teal-500/30 hover:-translate-y-1 transition-all"
              >
                Devenir partenaire
                <Handshake className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== TÉMOIGNAGES ====== */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-teal-50 via-white to-sky-50 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl animate-blob" style={{ animationDelay: '-5s' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block bg-white text-teal-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5 border border-teal-100">Ils en parlent</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Une expérience qui change <span className="text-gradient">vraiment la donne.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { quote: '« Avec un bébé de 8 mois, je passais des heures à chercher des pharmacies de garde. Avec MedMap+, c\'est devenu instantané. Un soulagement énorme. »', name: 'Aïcha Coulibaly', role: 'Maman, Cocody', img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&auto=format&fit=crop&q=80', dark: false },
              { quote: '« En tant que pharmacien, l\'app m\'a apporté une nouvelle clientèle de proximité. Le tableau de bord me permet de gérer mon stock sans effort. »', name: 'Dr. Yao N\'Guessan', role: 'Pharmacien, Treichville', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80', dark: false },
              { quote: '« L\'assistant IA m\'a orienté vers le bon spécialiste alors que je ne savais pas qui consulter. Diagnostic confirmé chez le médecin. Bluffant. »', name: 'Ibrahim Touré', role: 'Étudiant, Yopougon', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', dark: false },
              { quote: '« Mon chien était mal en point, j\'ai trouvé un vétérinaire à 600m en 30 secondes. Cette app sauve réellement des situations. »', name: 'Fatou Koné', role: 'Propriétaire, Marcory', initials: 'FK', dark: true },
              { quote: '« L\'interface est claire, même pour ma mère qui n\'aime pas la techno. La téléconsultation a évité un long trajet à mon père âgé. »', name: 'Marcelle Diabaté', role: 'Enseignante, Plateau', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', dark: false },
              { quote: '« Le rappel des vaccins de mes enfants est juste parfait. Plus jamais d\'oubli. Et l\'historique médical centralisé est précieux. »', name: 'Sandra Bamba', role: 'Maman de 3, Riviera', img: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&auto=format&fit=crop&q=80', dark: false },
            ].map((t, i) => (
              <motion.div key={t.name} {...fade(i * 0.08)}>
                <div className={`testimonial rounded-3xl p-7 shadow-sm ${t.dark ? 'bg-gradient-to-br from-teal-600 to-sky-600 text-white' : 'bg-white border border-slate-100'}`}>
                  <div className={`flex gap-1 mb-4 ${t.dark ? 'text-amber-300' : 'text-amber-400'}`}>
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className={`leading-relaxed mb-6 ${t.dark ? '' : 'text-slate-700'}`}>{t.quote}</p>
                  <div className="flex items-center gap-3">
                    {t.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">{t.initials}</div>
                    )}
                    <div>
                      <div className={`font-bold ${t.dark ? 'text-white' : 'text-slate-800'}`}>{t.name}</div>
                      <div className={`text-sm ${t.dark ? 'text-teal-100' : 'text-slate-500'}`}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== STATISTIQUES ANIMÉES ====== */}
      <section className="relative py-20 lg:py-28 bg-slate-900 overflow-hidden" ref={statsRef}>
        <div className="absolute inset-0">
          <svg className="absolute w-full h-full opacity-10" preserveAspectRatio="none" viewBox="0 0 1200 200">
            <path
              className="ecg-line"
              d="M 0 100 L 100 100 L 130 70 L 160 130 L 190 50 L 220 150 L 250 100 L 400 100 L 430 70 L 460 130 L 490 50 L 520 150 L 550 100 L 800 100 L 830 70 L 860 130 L 890 50 L 920 150 L 950 100 L 1200 100"
            />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {[
              { target: 850, suffix: '', label: 'Structures référencées' },
              { target: 42, suffix: '', label: 'Spécialités couvertes' },
              { target: 50, suffix: 'K+', label: 'Téléchargements' },
              { target: 98, suffix: '%', label: 'Satisfaction' },
            ].map((s, i) => (
              <motion.div key={s.label} {...fade(i * 0.1)} className="text-center text-white">
                <div className="font-extrabold text-5xl lg:text-6xl text-gradient mb-2" style={{ fontFamily: 'Sora' }}>
                  <span data-target={s.target}>0</span>{s.suffix}
                </div>
                <div className="text-sm uppercase tracking-wider text-slate-400 font-semibold">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center mb-16">
            <span className="inline-block bg-purple-50 text-purple-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5">Questions fréquentes</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Tout ce que vous devez <span className="text-gradient">savoir.</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              { q: 'L\'application est-elle gratuite ?', a: 'Oui. Le téléchargement et l\'utilisation principale de MedMap+ sont entièrement gratuits. Certaines fonctionnalités premium peuvent faire l\'objet d\'une tarification spécifique.' },
              { q: 'Mes données médicales sont-elles sécurisées ?', a: 'Absolument. Toutes les données sont chiffrées de bout en bout, conformes aux réglementations en vigueur. Vous gardez le contrôle total sur le partage de vos informations.' },
              { q: 'Fonctionne-t-elle avec une connexion limitée ?', a: 'MedMap+ est conçue pour fonctionner même dans des conditions réseau limitées. Les données essentielles sont mises en cache et l\'app reste utilisable hors ligne pour la consultation.' },
              { q: 'L\'assistant IA remplace-t-il un médecin ?', a: 'Non. L\'assistant IA est un outil d\'orientation et d\'accompagnement. Il vous aide à mieux comprendre votre situation et à trouver le bon professionnel, mais ne pose jamais de diagnostic.' },
              { q: 'Comment devenir partenaire (médecin, pharmacien, vétérinaire) ?', a: 'Rendez-vous dans la section Contact ou écrivez-nous à partenaires@medmap.app. Notre équipe revient vers vous sous 48h.' },
              { q: 'Quels appareils sont compatibles ?', a: 'MedMap+ est disponible sur iOS 13+ et Android 8.0+. Une version web responsive est également accessible depuis n\'importe quel navigateur moderne.' },
            ].map((item, i) => (
              <motion.div key={i} {...fade(i * 0.05)}>
                <div
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition overflow-hidden"
                >
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full p-6 flex items-center justify-between gap-4 text-left"
                  >
                    <span className="font-bold text-lg text-slate-800">{item.q}</span>
                    <span className={`w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${faqOpen === i ? 'rotate-45' : ''}`}>
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                  {faqOpen === i && (
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed">{item.a}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA DOWNLOAD ====== */}
      <section id="download" className="relative py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="relative rounded-[2.5rem] overflow-hidden">
            <div className="absolute inset-0 gradient-cta" />
            <div className="absolute inset-0 opacity-30">
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 800 400">
                <defs>
                  <pattern id="dotsCta" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="white" opacity="0.3" />
                  </pattern>
                </defs>
                <rect width="800" height="400" fill="url(#dotsCta)" />
              </svg>
            </div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float-slow" />
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-float-fast" />

            <div className="relative grid lg:grid-cols-2 gap-12 p-10 lg:p-16 items-center">
              <motion.div {...fade()}>
                <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight text-white mb-5">
                  Prêt à simplifier<br />votre santé ?
                </h2>
                <p className="text-teal-50 text-lg leading-relaxed mb-8 max-w-md">
                  Rejoignez les milliers d'utilisateurs qui ont déjà repris le contrôle de leur santé grâce à MedMap+.
                </p>

                <div className="flex flex-wrap gap-4">
                  <a href="#" className="group bg-slate-900 hover:bg-black text-white px-5 py-3.5 rounded-2xl flex items-center gap-3 hover:-translate-y-1 transition-all shadow-xl">
                    <svg className="w-8 h-8" viewBox="0 0 384 512" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] uppercase opacity-70">Télécharger sur</div>
                      <div className="font-bold text-base leading-none mt-0.5">App Store</div>
                    </div>
                  </a>
                  <a href="#" className="group bg-slate-900 hover:bg-black text-white px-5 py-3.5 rounded-2xl flex items-center gap-3 hover:-translate-y-1 transition-all shadow-xl">
                    <svg className="w-8 h-8" viewBox="0 0 512 512" fill="currentColor">
                      <path d="M325.3 234.3 104.3 13l280.8 161-59.8 60.3zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60-34.1c18-14.3 18-46.5-1.1-60.8zM104.3 499l280.8-161-59.8-60.3L104.3 499z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] uppercase opacity-70">Disponible sur</div>
                      <div className="font-bold text-base leading-none mt-0.5">Google Play</div>
                    </div>
                  </a>
                </div>

                <div className="flex items-center gap-6 mt-8">
                  <div className="flex -space-x-2">
                    {['from-amber-300 to-orange-400', 'from-rose-300 to-pink-400', 'from-violet-300 to-purple-400'].map(g => (
                      <div key={g} className={`w-9 h-9 rounded-full bg-gradient-to-br ${g} ring-2 ring-white`} />
                    ))}
                    <div className="w-9 h-9 rounded-full bg-white text-teal-700 text-xs font-bold flex items-center justify-center ring-2 ring-white">+50K</div>
                  </div>
                  <div className="text-white/90 text-sm">
                    <div className="flex gap-0.5 text-amber-300 mb-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <div className="text-xs">4.9/5 — 12 400 avis</div>
                  </div>
                </div>
              </motion.div>

              <motion.div {...fade(0.2)} className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="block">
                      <rect width="200" height="200" fill="white" />
                      <g fill="#0F172A">
                        <rect x="10" y="10" width="50" height="50" /><rect x="20" y="20" width="30" height="30" fill="white" /><rect x="28" y="28" width="14" height="14" />
                        <rect x="140" y="10" width="50" height="50" /><rect x="150" y="20" width="30" height="30" fill="white" /><rect x="158" y="28" width="14" height="14" />
                        <rect x="10" y="140" width="50" height="50" /><rect x="20" y="150" width="30" height="30" fill="white" /><rect x="28" y="158" width="14" height="14" />
                        <rect x="70" y="10" width="8" height="8" /><rect x="86" y="10" width="8" height="8" /><rect x="110" y="10" width="8" height="8" /><rect x="126" y="10" width="8" height="8" />
                        <rect x="70" y="26" width="8" height="8" /><rect x="94" y="26" width="8" height="8" /><rect x="118" y="26" width="8" height="8" />
                        <rect x="78" y="42" width="8" height="8" /><rect x="102" y="42" width="8" height="8" /><rect x="126" y="42" width="8" height="8" />
                        <rect x="10" y="70" width="8" height="8" /><rect x="42" y="70" width="8" height="8" /><rect x="70" y="70" width="8" height="8" /><rect x="94" y="70" width="8" height="8" /><rect x="118" y="70" width="8" height="8" /><rect x="142" y="70" width="8" height="8" /><rect x="174" y="70" width="8" height="8" />
                        <rect x="22" y="86" width="8" height="8" /><rect x="54" y="86" width="8" height="8" /><rect x="78" y="86" width="8" height="8" /><rect x="110" y="86" width="8" height="8" /><rect x="134" y="86" width="8" height="8" /><rect x="166" y="86" width="8" height="8" />
                        <rect x="10" y="102" width="8" height="8" /><rect x="38" y="102" width="8" height="8" /><rect x="62" y="102" width="8" height="8" /><rect x="86" y="102" width="8" height="8" /><rect x="118" y="102" width="8" height="8" /><rect x="150" y="102" width="8" height="8" /><rect x="178" y="102" width="8" height="8" />
                        <rect x="70" y="150" width="8" height="8" /><rect x="94" y="150" width="8" height="8" /><rect x="126" y="150" width="8" height="8" /><rect x="158" y="150" width="8" height="8" />
                        <rect x="78" y="166" width="8" height="8" /><rect x="110" y="166" width="8" height="8" /><rect x="134" y="166" width="8" height="8" /><rect x="166" y="166" width="8" height="8" />
                        <rect x="70" y="182" width="8" height="8" /><rect x="86" y="182" width="8" height="8" /><rect x="118" y="182" width="8" height="8" /><rect x="142" y="182" width="8" height="8" /><rect x="178" y="182" width="8" height="8" />
                      </g>
                      <rect x="80" y="80" width="40" height="40" rx="8" fill="white" />
                      <circle cx="100" cy="100" r="15" fill="#0D9488" />
                      <text x="100" y="106" textAnchor="middle" fill="white" fontFamily="Sora" fontWeight="800" fontSize="14">M+</text>
                    </svg>
                    <div className="text-center mt-3 text-slate-500 text-xs uppercase font-bold tracking-wider">Scannez pour télécharger</div>
                  </div>
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center animate-spin-slow">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                      <defs>
                        <path id="circle-text" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
                      </defs>
                      <text fontFamily="Sora" fontSize="11" fontWeight="700" fill="#0D9488" letterSpacing="1.5">
                        <textPath href="#circle-text">MEDMAP+ • SCAN ME • DOWNLOAD •</textPath>
                      </text>
                    </svg>
                    <ArrowDown className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== CONTACT / TEAM ====== */}
      <section id="contact" className="relative py-24 lg:py-32 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fade()} className="text-center mb-16">
            <span className="inline-block bg-white text-teal-700 text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-full mb-5 border border-teal-100">L'équipe LUMINEX</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Une <span className="text-gradient">équipe passionnée</span><br />au service de votre santé.
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Étudiants à l'Université Félix Houphouët-Boigny, animés par l'envie d'améliorer
              l'accès aux soins en Côte d'Ivoire et au-delà.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { initials: 'MA', grad: 'from-teal-500 to-sky-500', rotate: 'group-hover:rotate-3', badgeBg: 'bg-teal-500', icon: <Code2 className="w-6 h-6" />, name: 'MONKIE Chris-Orhé Aduko', role: 'Lead Developer', roleColor: 'text-teal-600', delay: 0 },
              { initials: 'KI', grad: 'from-sky-500 to-purple-500', rotate: 'group-hover:-rotate-3', badgeBg: 'bg-sky-500', icon: <LayoutGrid className="w-6 h-6" />, name: 'KOUAKOU Djezou Isaac', role: 'UX/UI & Product', roleColor: 'text-sky-600', delay: 0.1 },
              { initials: 'KJ', grad: 'from-emerald-500 to-teal-500', rotate: 'group-hover:rotate-3', badgeBg: 'bg-emerald-500', icon: <Server className="w-6 h-6" />, name: 'KOFFI Johann Christ', role: 'Backend & Data', roleColor: 'text-emerald-600', delay: 0.2 },
            ].map(member => (
              <motion.div key={member.name} {...fade(member.delay)} className="text-center group">
                <div className="relative inline-block mb-5">
                  <div className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${member.grad} p-1 ${member.rotate} transition-transform duration-500`}>
                    <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center font-extrabold text-4xl overflow-hidden">
                      <span className="text-gradient">{member.initials}</span>
                    </div>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl ${member.badgeBg} text-white flex items-center justify-center shadow-lg`}>
                    {member.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                <p className={`${member.roleColor} font-semibold text-sm mb-3`}>{member.role}</p>
                <div className="flex justify-center gap-2">
                  {[Share2, Code2, Mail].map((Icon, j) => (
                    <a key={j} href="#" className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-teal-500 hover:text-white hover:border-teal-500 transition flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact form */}
          <motion.div {...fade(0.1)} className="grid lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-slate-100">
            <div>
              <h3 className="text-3xl font-extrabold mb-4">Une question, un partenariat ?</h3>
              <p className="text-slate-600 mb-6">
                Notre équipe vous répond sous 48h. Que vous soyez un patient, un professionnel de santé
                ou une institution, nous sommes à votre écoute.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: <Mail className="w-5 h-5" />, text: 'contact@medmap.app', bg: 'bg-teal-100', color: 'text-teal-700' },
                  { icon: <Phone className="w-5 h-5" />, text: '+225 07 XX XX XX XX', bg: 'bg-sky-100', color: 'text-sky-700' },
                  { icon: <MapPin className="w-5 h-5" />, text: 'Université FHB, Cocody, Abidjan', bg: 'bg-emerald-100', color: 'text-emerald-700' },
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-3 text-slate-700">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>{item.icon}</div>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form className="space-y-4" onSubmit={e => { e.preventDefault(); alert('Message envoyé ! Nous vous répondrons rapidement.') }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Nom</label>
                  <input type="text" required className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition" placeholder="Votre nom" />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Email</label>
                  <input type="email" required className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition" placeholder="vous@email.com" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Sujet</label>
                <select className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none transition bg-white">
                  <option>Question générale</option>
                  <option>Devenir partenaire</option>
                  <option>Problème technique</option>
                  <option>Presse / Média</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Message</label>
                <textarea rows={4} required className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition" placeholder="Comment pouvons-nous vous aider ?" />
              </div>
              <button type="submit" className="gradient-cta w-full text-white font-semibold py-4 rounded-xl shadow-lg shadow-teal-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                Envoyer le message
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <defs>
                    <linearGradient id="logoGradF" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0D9488" />
                      <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>
                  </defs>
                  <path d="M20 4 C12 4 6 10 6 18 C6 27 20 38 20 38 C20 38 34 27 34 18 C34 10 28 4 20 4 Z" fill="url(#logoGradF)" />
                  <circle cx="20" cy="17" r="8" fill="white" />
                  <path d="M20 12 L20 22 M15 17 L25 17" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="font-bold text-2xl text-white" style={{ fontFamily: 'Sora' }}>Med<span className="text-gradient">Map+</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-5 max-w-sm">
                La plateforme de santé numérique qui centralise hôpitaux, pharmacies, vétérinaires et téléconsultations.
                Conçue avec amour à Abidjan.
              </p>
              <div className="flex gap-3">
                {[Share2, AtSign, Camera, Briefcase, Play].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-teal-500 transition flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-5" style={{ fontFamily: 'Sora' }}>Produit</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Comment ça marche', href: '#how' },
                  { label: 'Assistant IA', href: '#ai' },
                  { label: 'Télécharger', href: '#download' },
                  { label: 'Nouveautés', href: '#' },
                ].map(l => <li key={l.label}><a href={l.href} className="hover:text-teal-400 transition">{l.label}</a></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-5" style={{ fontFamily: 'Sora' }}>Entreprise</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'À propos', href: '#contact' },
                  { label: 'Partenaires', href: '#pros' },
                  { label: 'Blog', href: '#' },
                  { label: 'Carrières', href: '#' },
                  { label: 'Presse', href: '#' },
                ].map(l => <li key={l.label}><a href={l.href} className="hover:text-teal-400 transition">{l.label}</a></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-5" style={{ fontFamily: 'Sora' }}>Restez informé</h4>
              <p className="text-sm text-slate-400 mb-3">Recevez les actualités santé et nos nouveautés.</p>
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); alert('Inscription confirmée !') }}>
                <div className="flex">
                  <input type="email" placeholder="Votre email" className="flex-1 px-4 py-3 rounded-l-xl bg-slate-800 border border-slate-700 focus:border-teal-500 outline-none text-white text-sm" />
                  <button className="gradient-cta text-white px-4 rounded-r-xl hover:scale-105 transition">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">En vous inscrivant, vous acceptez notre politique de confidentialité.</p>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-sm">
            <div className="text-slate-500">
              © 2026 LUMINEX • MedMap+ • Université Félix Houphouët-Boigny • Tous droits réservés.
            </div>
            <div className="flex gap-6 text-slate-500">
              <a href="#" className="hover:text-teal-400 transition">Politique de confidentialité</a>
              <a href="#" className="hover:text-teal-400 transition">CGU</a>
              <a href="#" className="hover:text-teal-400 transition">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
