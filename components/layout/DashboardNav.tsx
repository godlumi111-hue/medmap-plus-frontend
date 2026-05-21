'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LogOut, Star, User, Calendar } from 'lucide-react'
import BrandLogo from '@/components/shared/BrandLogo'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'
import NotificationBell from '@/components/notifications/NotificationBell'

export type DashboardRole = 'patient' | 'medecin' | 'pharmacie' | 'clinique' | 'veterinaire' | 'admin'

const roleConfig: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  patient:    { label: 'Patient',             color: 'text-sky-600',    bg: 'bg-sky/10',      emoji: '👤' },
  medecin:    { label: 'Médecin',             color: 'text-primary',    bg: 'bg-primary/10',  emoji: '🩺' },
  pharmacie:  { label: 'Pharmacie',           color: 'text-mint',       bg: 'bg-mint/20',     emoji: '💊' },
  clinique:   { label: 'Clinique / Hôpital', color: 'text-purple-600', bg: 'bg-purple-50',   emoji: '🏥' },
  veterinaire:{ label: 'Vétérinaire',         color: 'text-orange-600', bg: 'bg-orange-50',   emoji: '🐾' },
  admin:      { label: 'Administrateur',      color: 'text-coral',      bg: 'bg-coral/10',    emoji: '🛡️' },
}

interface DashboardNavProps {
  showPremium?: boolean
}

export default function DashboardNav({ showPremium = false }: DashboardNavProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth()

  const role = user?.role || 'patient'
  const config = roleConfig[role] || roleConfig.patient
  const fullName = user ? `${user.prenom} ${user.nom}` : 'Utilisateur'
  const initial = fullName.charAt(0).toUpperCase()
  const dashboardHref = getDashboardRoute(role)
  const notifCount = 0

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-bone shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <BrandLogo href={dashboardHref} />

          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${config.bg} ${config.color}`}>
            <span>{config.emoji}</span>
            <span>{config.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* "Mon espace" — prominent button for patients */}
            {role === 'patient' && (
              <Link
                href="/mon-espace"
                className="hidden md:flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                Mon espace
              </Link>
            )}

            {showPremium && (
              <Link href="/media-premium" className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 text-yellow-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:from-yellow-400/30 hover:to-orange-400/30 transition-all">
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                Premium
              </Link>
            )}

            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-bone transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-sky flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {initial}
                </div>
                <span className="hidden md:block text-sm font-medium text-ink max-w-[110px] truncate">{fullName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate hidden md:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-ink/10 border border-bone overflow-hidden"
                  >
                    <div className="p-3.5 bg-gradient-to-r from-primary/5 to-sky/5 border-b border-bone">
                      <p className="font-semibold text-sm text-ink truncate">{fullName}</p>
                      <p className="text-xs text-slate truncate">{user?.email}</p>
                      <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold ${config.bg} ${config.color}`}>
                        <span>{config.emoji}</span>{config.label}
                      </div>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <Link href={dashboardHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink">
                        <span className="text-base">{config.emoji}</span> Mon tableau de bord
                      </Link>
                      {role === 'patient' && (
                        <>
                          <Link href="/mon-espace" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink font-semibold text-primary">
                            <User className="w-4 h-4 text-primary" /> Mon espace santé
                          </Link>
                          <Link href="/appointments" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink">
                            <Calendar className="w-4 h-4 text-indigo-500" /> Mes rendez-vous
                          </Link>
                          <Link href="/portefeuille" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bone transition-colors text-sm text-ink">
                            <span className="text-base">💳</span> Portefeuille
                          </Link>
                        </>
                      )}
                      <hr className="border-bone" />
                      <button
                        onClick={() => { setProfileOpen(false); logout() }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-sm text-red-500"
                      >
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}
