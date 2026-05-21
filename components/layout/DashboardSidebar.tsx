'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home, Calendar, ShoppingBag, MessageSquare, MapPin,
  Wallet, Bell, PawPrint, ChevronRight,
  Users, Building2, Pill, AlertTriangle, BarChart3, Settings,
  Stethoscope, ClipboardList, Package, Star, LogOut, Activity
} from 'lucide-react'
import BrandLogo from '@/components/shared/BrandLogo'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'

type Role = 'patient' | 'medecin' | 'pharmacie' | 'clinique' | 'veterinaire' | 'admin'

interface SidebarProps {
  role: Role
}

const navByRole: Record<Role, { label: string; href: string; icon: React.ReactNode }[]> = {
  patient: [
    { label: 'Tableau de bord', href: '/dashboard/patient', icon: <Home className="w-5 h-5" /> },
    { label: 'Rendez-vous', href: '/appointments', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Médicaments', href: '/medicaments', icon: <Pill className="w-5 h-5" /> },
    { label: 'Commandes', href: '/commande', icon: <ShoppingBag className="w-5 h-5" /> },
    { label: 'Carte santé', href: '/carte', icon: <MapPin className="w-5 h-5" /> },
    { label: 'Pharmacies garde', href: '/pharmacies-garde', icon: <Building2 className="w-5 h-5" /> },
    { label: 'MediA', href: '/chatbot', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Urgence', href: '/urgence', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Mon animal', href: '/animal', icon: <PawPrint className="w-5 h-5" /> },
    { label: 'Portefeuille', href: '/portefeuille', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
  ],
  medecin: [
    { label: 'Tableau de bord', href: '/dashboard/medecin', icon: <Home className="w-5 h-5" /> },
    { label: 'Mes rendez-vous', href: '/dashboard/medecin', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Mes patients', href: '/dashboard/medecin', icon: <Users className="w-5 h-5" /> },
    { label: 'Téléconsultation', href: '/chatbot', icon: <Stethoscope className="w-5 h-5" /> },
    { label: 'Mes revenus', href: '/portefeuille', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Mon profil', href: '/dashboard/medecin', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
  ],
  pharmacie: [
    { label: 'Tableau de bord', href: '/dashboard/pharmacie', icon: <Home className="w-5 h-5" /> },
    { label: 'Commandes reçues', href: '/dashboard/pharmacie', icon: <ShoppingBag className="w-5 h-5" /> },
    { label: 'Stock', href: '/dashboard/pharmacie', icon: <Package className="w-5 h-5" /> },
    { label: 'Paiements', href: '/portefeuille', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Statut de garde', href: '/dashboard/pharmacie', icon: <Activity className="w-5 h-5" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
  ],
  clinique: [
    { label: 'Tableau de bord', href: '/dashboard/clinique', icon: <Home className="w-5 h-5" /> },
    { label: 'Rendez-vous', href: '/dashboard/clinique', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Médecins', href: '/dashboard/clinique', icon: <Users className="w-5 h-5" /> },
    { label: 'Services', href: '/dashboard/clinique', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Paiements', href: '/portefeuille', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Statistiques', href: '/dashboard/clinique', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
  ],
  veterinaire: [
    { label: 'Tableau de bord', href: '/dashboard/veterinaire', icon: <Home className="w-5 h-5" /> },
    { label: 'Rendez-vous', href: '/dashboard/veterinaire', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Mes patients', href: '/dashboard/veterinaire', icon: <PawPrint className="w-5 h-5" /> },
    { label: 'Urgences', href: '/urgence', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Vaccinations', href: '/animal', icon: <Activity className="w-5 h-5" /> },
    { label: 'Mon profil', href: '/dashboard/veterinaire', icon: <ClipboardList className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Tableau de bord', href: '/dashboard/admin', icon: <Home className="w-5 h-5" /> },
    { label: 'Utilisateurs', href: '/dashboard/admin', icon: <Users className="w-5 h-5" /> },
    { label: 'Structures', href: '/dashboard/admin', icon: <Building2 className="w-5 h-5" /> },
    { label: 'Médecins', href: '/dashboard/admin', icon: <Stethoscope className="w-5 h-5" /> },
    { label: 'Pharmacies', href: '/dashboard/admin', icon: <Pill className="w-5 h-5" /> },
    { label: 'Litiges', href: '/dashboard/admin', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Paiements', href: '/dashboard/admin', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Statistiques', href: '/dashboard/admin', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Paramètres', href: '/dashboard/admin', icon: <Settings className="w-5 h-5" /> },
  ],
}

const roleLabels: Record<Role, { label: string; color: string; bg: string }> = {
  patient:    { label: 'Patient',             color: 'text-sky-400',    bg: 'bg-sky/20' },
  medecin:    { label: 'Médecin',             color: 'text-primary-light', bg: 'bg-primary/20' },
  pharmacie:  { label: 'Pharmacie',           color: 'text-mint',       bg: 'bg-mint/20' },
  clinique:   { label: 'Clinique / Hôpital', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  veterinaire:{ label: 'Vétérinaire',         color: 'text-orange-400', bg: 'bg-orange-900/30' },
  admin:      { label: 'Administrateur',      color: 'text-coral',      bg: 'bg-coral/20' },
}

export default function DashboardSidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const links = navByRole[role]
  const roleInfo = roleLabels[role]
  const fullName = user ? `${user.prenom} ${user.nom}` : 'Utilisateur'
  const initial = fullName.charAt(0).toUpperCase()
  const dashboardHref = getDashboardRoute(role)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-ink flex flex-col z-40">
      <div className="p-5 border-b border-white/10">
        <BrandLogo href={dashboardHref} white />
        <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {roleInfo.label}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map((link, i) => {
          const active = pathname === link.href
          return (
            <motion.div
              key={link.href + i}
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Link
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className={active ? 'text-white' : 'text-white/40 group-hover:text-white'}>
                  {link.icon}
                </span>
                <span className="flex-1">{link.label}</span>
                {active && <ChevronRight className="w-4 h-4 opacity-60" />}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-sky flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{fullName}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        {role === 'patient' && (
          <Link href="/media-premium" className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 mb-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <div>
              <p className="text-xs font-semibold text-yellow-400">MediA Premium</p>
              <p className="text-xs text-white/40">Débloquer tout</p>
            </div>
          </Link>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
