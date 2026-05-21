'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, ChevronDown, User, LogOut, Star, Home, Calendar,
  MapPin, Pill, ShoppingBag, MessageCircle, ArrowLeft,
  Stethoscope, PawPrint, Zap, Building2,
} from 'lucide-react'
import BrandLogo from '@/components/shared/BrandLogo'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import NotificationBell from '@/components/notifications/NotificationBell'
import { connectSocket } from '@/lib/socket'

type NavLink = { label: string; href: string; icon?: any }

// ── Détection d'espace contextuel ──────────────────────────────────────────
type NavSpace = 'vet' | 'pharma' | 'hopital' | 'general'

function getNavSpace(pathname: string): NavSpace {
  if (
    pathname.startsWith('/veterinaire') ||
    pathname.startsWith('/animal') ||
    pathname.startsWith('/mes-animaux') ||
    pathname.startsWith('/dashboard/veterinaire')
  ) return 'vet'

  if (
    pathname.startsWith('/pharmacies') ||
    pathname.startsWith('/medicaments') ||
    pathname.startsWith('/commande') ||
    pathname.startsWith('/panier') ||
    pathname.startsWith('/tracking')
  ) return 'pharma'

  if (
    pathname.startsWith('/hospitals') ||
    pathname.startsWith('/carte') ||
    pathname.startsWith('/medecins')
  ) return 'hopital'

  return 'general'
}

function getPatientLinks(pathname: string, dashHref: string): NavLink[] {
  const space = getNavSpace(pathname)

  // ── Espace vétérinaire ──────────────────────────────────────────────────
  if (space === 'vet') {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
      { label: 'Mes animaux', href: '/mes-animaux', icon: PawPrint },
      { label: 'Vétérinaires', href: '/veterinaire', icon: Stethoscope },
      { label: 'MediA', href: '/chatbot', icon: MessageCircle },
    ]
  }

  // ── Espace pharmacie / commandes ────────────────────────────────────────
  if (space === 'pharma') {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
      { label: 'Pharmacies', href: '/pharmacies-garde', icon: Pill },
      { label: 'Médicaments', href: '/medicaments', icon: Pill },
      { label: 'Mes commandes', href: '/commande', icon: ShoppingBag },
    ]
  }

  // ── Espace hôpital / carte / médecins ────────────────────────────────────
  if (space === 'hopital') {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
      { label: 'Carte', href: '/carte', icon: MapPin },
      { label: 'Médecins', href: '/medecins', icon: Stethoscope },
      { label: 'Rendez-vous', href: '/appointments', icon: Calendar },
    ]
  }

  // ── Rendez-vous & ticket ────────────────────────────────────────────────
  if (pathname.startsWith('/appointments') || pathname.startsWith('/ticket')) {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
      { label: 'MediA', href: '/chatbot', icon: MessageCircle },
    ]
  }

  // ── MediA ────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/chatbot')) {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
    ]
  }

  // ── Mon espace / portefeuille ─────────────────────────────────────────
  if (pathname.startsWith('/mon-espace') || pathname.startsWith('/portefeuille')) {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
      { label: 'Rendez-vous', href: '/appointments', icon: Calendar },
      { label: 'Mes animaux', href: '/mes-animaux', icon: PawPrint },
      { label: 'MediA', href: '/chatbot', icon: MessageCircle },
    ]
  }

  // ── Urgence ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/urgence')) {
    return [
      { label: 'Accueil', href: dashHref, icon: Home },
    ]
  }

  // ── Default (accueil / dashboard) ────────────────────────────────────
  return [
    { label: 'Carte', href: '/carte', icon: MapPin },
    { label: 'Rendez-vous', href: '/appointments', icon: Calendar },
    { label: 'Mes animaux', href: '/mes-animaux', icon: PawPrint },
    { label: 'Pharmacies', href: '/pharmacies-garde', icon: Pill },
    { label: 'MediA', href: '/chatbot', icon: MessageCircle },
  ]
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()

  useEffect(() => {
    if (user?.id) connectSocket(user.id)
  }, [user?.id])

  const dashboardHref = user ? getDashboardRoute(user.role) : '/'
  const fullName = user ? `${user.prenom} ${user.nom}` : ''
  const initial = fullName.charAt(0).toUpperCase()
  const isPatient = user?.role === 'patient'
  const isEmergencyRole = ['samu', 'pompiers', 'ambulance'].includes(user?.role || '')

  // Context-aware nav links (patients only)
  const navLinks: NavLink[] = isPatient
    ? getPatientLinks(pathname, dashboardHref)
    : []

  const navSpace = isPatient ? getNavSpace(pathname) : 'general'

  // Space context labels & styles
  const spaceConfig: Record<NavSpace, { label: string; icon: React.ReactNode; urgenceLabel: string; urgenceHref: string; accentClass: string } | null> = {
    vet: {
      label: 'Santé animale',
      icon: <PawPrint className="w-3.5 h-3.5" />,
      urgenceLabel: '🐾 Urgence animale',
      urgenceHref: '/urgence',
      accentClass: 'bg-pink-600',
    },
    pharma: {
      label: 'Pharmacie & Médicaments',
      icon: <Pill className="w-3.5 h-3.5" />,
      urgenceLabel: '🚨 Urgence',
      urgenceHref: '/urgence',
      accentClass: 'bg-emerald-600',
    },
    hopital: {
      label: 'Hôpitaux & Médecins',
      icon: <Building2 className="w-3.5 h-3.5" />,
      urgenceLabel: '🚨 Urgence',
      urgenceHref: '/urgence',
      accentClass: 'bg-sky-600',
    },
    general: null,
  }

  const currentSpace = spaceConfig[navSpace]
  const monEspaceActive = pathname.startsWith('/mon-espace')
  const showMonEspaceButton = isPatient && !monEspaceActive

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      {/* Space context banner */}
      {currentSpace && (
        <div className={`${currentSpace.accentClass} text-white px-4 py-1 flex items-center justify-between text-[11px] font-semibold`}>
          <div className="flex items-center gap-1.5">
            {currentSpace.icon}
            <span>{currentSpace.label}</span>
          </div>
          <button
            onClick={() => router.push(dashboardHref)}
            className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
          >
            ← Accueil général
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <BrandLogo href={isAuthenticated ? dashboardHref : '/'} />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const Icon = link.icon
              const isActive = link.href !== dashboardHref
                ? pathname.startsWith(link.href)
                : pathname === link.href || pathname === '/'
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate hover:bg-aqua hover:text-primary'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">

            {/* Urgence button — adapté selon l'espace */}
            {(!isAuthenticated || isPatient) && !isEmergencyRole && (
              <Link
                href={currentSpace?.urgenceHref ?? '/urgence'}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  navSpace === 'vet'
                    ? 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-600 hover:text-white hover:border-pink-600'
                    : 'bg-coral/10 text-coral border border-coral/20 hover:bg-coral hover:text-white'
                }`}
              >
                {currentSpace?.urgenceLabel ?? '🚨 Urgence'}
              </Link>
            )}

            {isAuthenticated ? (
              <>
                {/* Prominent "Mon espace" button for patients */}
                {showMonEspaceButton && (
                  <Link
                    href="/mon-espace"
                    className="hidden md:flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <User className="w-3.5 h-3.5" />
                    Mon espace
                  </Link>
                )}

                {/* Notification bell */}
                <NotificationBell />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-bone transition-colors"
                  >
                    {/* Premium badge */}
                    {isPatient && (
                      <span className="hidden md:flex items-center gap-1 bg-yellow-50 text-yellow-600 border border-yellow-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5" /> Premium
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-sky flex items-center justify-center text-white text-sm font-bold">
                      {initial}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-ink max-w-[120px] truncate">
                      {user?.prenom} {user?.nom}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate hidden md:block" />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-bone overflow-hidden z-50"
                      >
                        <div className="p-4 bg-gradient-to-r from-primary to-sky text-white">
                          <p className="font-semibold text-sm">{fullName}</p>
                          <p className="text-xs opacity-80">{user?.email}</p>
                          <span className="mt-1 inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                            {user?.role}
                          </span>
                        </div>
                        <div className="p-2">
                          <Link
                            href={isPatient ? '/mon-espace' : dashboardHref}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink"
                          >
                            <User className="w-4 h-4 text-primary" />
                            {isPatient ? 'Mon espace santé' : isEmergencyRole ? 'Centre de commandement' : 'Tableau de bord'}
                          </Link>
                          {isEmergencyRole && (
                            <Link
                              href={dashboardHref}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-sm font-semibold text-red-600"
                            >
                              <span>🚨</span>
                              Urgences actives
                            </Link>
                          )}
                          {isPatient && (
                            <>
                              <Link
                                href="/appointments"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink"
                              >
                                <Calendar className="w-4 h-4 text-primary" />
                                Mes rendez-vous
                              </Link>
                              <Link
                                href="/portefeuille"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink"
                              >
                                <span className="text-base">💳</span>
                                Portefeuille
                              </Link>
                              <Link
                                href="/chatbot"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink"
                              >
                                <MessageCircle className="w-4 h-4 text-violet-500" />
                                MediA — Assistant IA
                              </Link>
                              <Link
                                href="/media-premium"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-sky/10 transition-colors text-sm text-primary font-semibold"
                              >
                                <Star className="w-4 h-4 text-yellow-500" />
                                Passer à Premium
                              </Link>
                            </>
                          )}
                          <hr className="my-1 border-bone" />
                          <button
                            onClick={() => { setProfileOpen(false); logout() }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-sm text-red-500"
                          >
                            <LogOut className="w-4 h-4" />
                            Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-xl transition-colors">
                  Se connecter
                </Link>
                <Link href="/auth/register" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
                  Commencer
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-bone transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-bone bg-white"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
                      pathname.startsWith(link.href) ? 'bg-primary text-white' : 'text-ink hover:bg-bone'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                )
              })}
              {isPatient && (
                <Link
                  href="/mon-espace"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white"
                >
                  <User className="w-4 h-4" />
                  Mon espace
                </Link>
              )}
              {(!isAuthenticated || isPatient) && (
                <Link
                  href="/urgence"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-coral/10 text-coral"
                >
                  🚨 Urgence
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white text-center"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
