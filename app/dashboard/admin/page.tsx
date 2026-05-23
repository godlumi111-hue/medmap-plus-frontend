'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { admin as adminApi, users as usersApi } from '@/lib/api'
import {
  Users, Building2, AlertTriangle, Wallet, Stethoscope, Pill,
  BarChart3, Settings, CheckCircle, XCircle, ArrowLeft, Home,
  RefreshCw, Loader2, Shield, MapPin, Phone, Mail, Star,
  TrendingUp, Package, ShoppingBag, Activity, ChevronRight,
  UserCheck, UserX, BadgeCheck, AlertCircle, Clock, Eye,
} from 'lucide-react'

type Tab = 'stats' | 'utilisateurs' | 'structures' | 'medecins' | 'litiges' | 'paiements'

const TABS: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'stats',        label: 'Tableau de bord',  icon: BarChart3,      color: 'text-sky-600'     },
  { key: 'utilisateurs', label: 'Utilisateurs',      icon: Users,          color: 'text-blue-600'    },
  { key: 'structures',   label: 'Structures',        icon: Building2,      color: 'text-violet-600'  },
  { key: 'medecins',     label: 'Médecins',          icon: Stethoscope,    color: 'text-teal-600'    },
  { key: 'litiges',      label: 'Litiges',           icon: AlertTriangle,  color: 'text-red-600'     },
  { key: 'paiements',    label: 'Finances',          icon: Wallet,         color: 'text-amber-600'   },
]

const ROLE_COLORS: Record<string, string> = {
  patient:     'bg-sky-100 text-sky-700',
  medecin:     'bg-teal-100 text-teal-700',
  pharmacie:   'bg-emerald-100 text-emerald-700',
  clinique:    'bg-violet-100 text-violet-700',
  veterinaire: 'bg-orange-100 text-orange-700',
  livreur:     'bg-amber-100 text-amber-700',
  coach:       'bg-purple-100 text-purple-700',
  samu:        'bg-red-100 text-red-700',
  pompiers:    'bg-red-100 text-red-700',
  ambulance:   'bg-blue-100 text-blue-700',
  admin:       'bg-gray-100 text-gray-700',
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stats')

  // Stats
  const [stats, setStats]           = useState<any>(null)
  const [commissions, setCommissions] = useState<any>(null)

  // Utilisateurs
  const [allUsers, setAllUsers]     = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userRole, setUserRole]     = useState('all')
  const [usersLoading, setUsersLoading] = useState(false)
  const [togglingUser, setTogglingUser] = useState<number | null>(null)
  const [verifyingUser, setVerifyingUser] = useState<number | null>(null)

  // Structures
  const [structures, setStructures] = useState<any[]>([])
  const [structSearch, setStructSearch] = useState('')
  const [structType, setStructType] = useState('all')
  const [structLoading, setStructLoading] = useState(false)
  const [togglingStruct, setTogglingStruct] = useState<number | null>(null)

  // Médecins
  const [doctors, setDoctors]       = useState<any[]>([])
  const [docSearch, setDocSearch]   = useState('')
  const [docLoading, setDocLoading] = useState(false)
  const [verifyingDoc, setVerifyingDoc] = useState<number | null>(null)

  // Litiges
  const [disputes, setDisputes]     = useState<any[]>([])
  const [dispLoading, setDispLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [resolutionText, setResolutionText] = useState<Record<number, string>>({})

  const loadStats = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([adminApi.stats(), adminApi.commissions()])
      setStats(s)
      setCommissions(c)
    } catch {}
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await adminApi.users({ limit: 200 })
      setAllUsers(data)
    } catch {}
    setUsersLoading(false)
  }, [])

  const loadStructures = useCallback(async () => {
    setStructLoading(true)
    try {
      const data = await adminApi.structures({})
      setStructures(data)
    } catch {}
    setStructLoading(false)
  }, [])

  const loadDoctors = useCallback(async () => {
    setDocLoading(true)
    try {
      const data = await usersApi.doctors()
      setDoctors(data)
    } catch {}
    setDocLoading(false)
  }, [])

  const loadDisputes = useCallback(async () => {
    setDispLoading(true)
    try {
      const data = await adminApi.disputes()
      setDisputes(data)
    } catch {}
    setDispLoading(false)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => {
    if (tab === 'utilisateurs') loadUsers()
    if (tab === 'structures')   loadStructures()
    if (tab === 'medecins')     loadDoctors()
    if (tab === 'litiges')      loadDisputes()
    if (tab === 'paiements')    loadStats()
  }, [tab, loadUsers, loadStructures, loadDoctors, loadDisputes, loadStats])

  async function toggleUser(id: number, current: boolean) {
    setTogglingUser(id)
    try {
      await adminApi.activateUser(id, !current)
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !current } : u))
    } catch {}
    setTogglingUser(null)
  }

  async function verifyUser(id: number) {
    setVerifyingUser(id)
    try {
      await adminApi.verifyUser(id)
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: true } : u))
    } catch {}
    setVerifyingUser(null)
  }

  async function verifyDoctor(id: number) {
    setVerifyingDoc(id)
    try {
      await adminApi.verifyUser(id)
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, is_verified: true } : d))
    } catch {}
    setVerifyingDoc(null)
  }

  async function togglePartner(structId: number, current: boolean) {
    setTogglingStruct(structId)
    try {
      await adminApi.setPartner(structId, !current)
      setStructures(prev => prev.map(s => s.id === structId ? { ...s, partenaire: !current } : s))
    } catch {}
    setTogglingStruct(null)
  }

  async function resolveDispute(id: number, refund: boolean) {
    const resolution = resolutionText[id] || 'Litige résolu par l\'administrateur'
    setResolvingId(id)
    try {
      await adminApi.resolveDispute(id, resolution, refund)
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, statut: 'resolu', resolution } : d))
    } catch {}
    setResolvingId(null)
  }

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase()
    const matchQ = !q || u.nom?.toLowerCase().includes(q) || u.prenom?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = userRole === 'all' || u.role === userRole
    return matchQ && matchRole
  })

  const filteredStructures = structures.filter(s => {
    const q = structSearch.toLowerCase()
    const matchQ = !q || s.nom?.toLowerCase().includes(q) || s.ville?.toLowerCase().includes(q)
    const matchType = structType === 'all' || s.type === structType
    return matchQ && matchType
  })

  const filteredDoctors = doctors.filter(d => {
    const q = docSearch.toLowerCase()
    return !q || d.nom?.toLowerCase().includes(q) || d.prenom?.toLowerCase().includes(q) || d.specialite?.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-white border-b border-gray-100 overflow-hidden" style={{ minHeight: 220 }}>
          <div className="absolute inset-y-0 right-0 w-2/5 hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/equipe.jpg" alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white" />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 py-8 lg:py-10">
            {/* Back + Home */}
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </button>
              <Link href="/"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-teal-700 bg-gray-100 hover:bg-teal-50 px-3 py-1.5 rounded-full transition-all">
                <Home className="w-3.5 h-3.5" /> Accueil
              </Link>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-600 rounded-full" />
              <p className="text-red-700 text-xs font-bold uppercase tracking-widest">Administration MedMap+</p>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tableau de bord admin
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5 font-bold">
                <Shield className="w-3.5 h-3.5" /> {user?.prenom} {user?.nom} — Administrateur
              </span>
              {stats && (
                <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 font-semibold">
                  <Activity className="w-3.5 h-3.5" /> {stats.utilisateurs} utilisateurs actifs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats bandeau */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
              {[
                { label: 'Utilisateurs',      value: stats?.utilisateurs ?? '…',     accent: 'text-blue-600' },
                { label: 'Structures',         value: stats?.structures   ?? '…',     accent: 'text-violet-600' },
                { label: 'Rendez-vous',        value: stats?.rendez_vous  ?? '…',     accent: 'text-teal-600' },
                { label: 'Volume portefeuilles', value: stats ? `${Number(stats.volume_wallet ?? 0).toLocaleString('fr-FR')} F` : '…', accent: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="py-4 px-4 sm:px-6 text-center">
                  <p className={`text-2xl font-extrabold ${s.accent}`} style={{ fontFamily: 'Sora, sans-serif' }}>{String(s.value)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  tab === t.key
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.key === 'litiges' && disputes.filter(d => d.statut === 'ouvert').length > 0 && (
                  <span className={`text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${tab === t.key ? 'bg-white/25 text-white' : 'bg-red-100 text-red-700'}`}>
                    {disputes.filter(d => d.statut === 'ouvert').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-10">

          {/* ── STATS TAB ── */}
          {tab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'rdv',         label: 'Consultations',   icon: Stethoscope,    color: 'from-sky-500 to-blue-600'       },
                  { key: 'pharmacie',   label: 'Pharmacies',       icon: Pill,           color: 'from-emerald-500 to-teal-600'   },
                  { key: 'hopital',     label: 'Hôpitaux',         icon: Building2,      color: 'from-indigo-500 to-violet-600'  },
                  { key: 'suivi_perso', label: 'Suivi personnel',  icon: Users,          color: 'from-violet-500 to-purple-600'  },
                  { key: 'urgence',     label: 'Urgences',         icon: AlertTriangle,  color: 'from-red-500 to-rose-600'       },
                  { key: '_admin',      label: 'Solde plateforme', icon: Wallet,         color: 'from-amber-500 to-orange-500'   },
                ].map(cat => {
                  const data = cat.key === '_admin'
                    ? { total: commissions?.solde_admin ?? 0, nb: null }
                    : commissions?.[cat.key] ?? { total: 0, nb: 0 }
                  return (
                    <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2`}>
                        <cat.icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-lg font-extrabold text-gray-900 leading-tight">
                        {Number(data.total ?? 0).toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">F</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{cat.label}</p>
                      {data.nb != null && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{data.nb} opération{data.nb !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {commissions && (
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Total revenus MedMap+</p>
                    <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: 'Sora' }}>
                      {Number(commissions.total_platform ?? 0).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-white/20" />
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Commandes', value: stats?.commandes ?? '…', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Urgences',  value: stats?.urgences  ?? '…', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Médecins',  value: stats?.medecins  ?? '…', icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50' },
                  { label: 'Rendez-vous', value: stats?.rendez_vous ?? '…', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className={`text-xl font-extrabold ${s.color}`}>{String(s.value)}</p>
                      <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── UTILISATEURS TAB ── */}
          {tab === 'utilisateurs' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder="Rechercher par nom, email…"
                    className="w-full pl-4 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white" />
                </div>
                <select value={userRole} onChange={e => setUserRole(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <option value="all">Tous les rôles</option>
                  {['patient','medecin','pharmacie','clinique','veterinaire','livreur','coach','samu','pompiers','ambulance'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={loadUsers} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs text-gray-400 font-medium">{filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-gray-400 animate-spin" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">Aucun utilisateur trouvé</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(u.prenom || u.nom || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{u.prenom} {u.nom}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                            {u.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!u.is_verified && (
                            <button onClick={() => verifyUser(u.id)} disabled={verifyingUser === u.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 disabled:opacity-50">
                              {verifyingUser === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                              Vérifier
                            </button>
                          )}
                          <button onClick={() => toggleUser(u.id, u.is_active)} disabled={togglingUser === u.id}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 transition-all ${
                              u.is_active
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}>
                            {togglingUser === u.id ? <Loader2 className="w-3 h-3 animate-spin" />
                              : u.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {u.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STRUCTURES TAB ── */}
          {tab === 'structures' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={structSearch} onChange={e => setStructSearch(e.target.value)}
                    placeholder="Rechercher par nom, ville…"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white" />
                </div>
                <select value={structType} onChange={e => setStructType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none">
                  <option value="all">Tous types</option>
                  {['pharmacie','clinique','veterinaire','samu','pompiers','ambulance'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button onClick={loadStructures} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${structLoading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs text-gray-400 font-medium">{filteredStructures.length} structure{filteredStructures.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {structLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-gray-400 animate-spin" /></div>
                ) : filteredStructures.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">Aucune structure trouvée</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredStructures.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{s.nom || '(sans nom)'}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[s.type] || 'bg-gray-100 text-gray-600'}`}>{s.type}</span>
                            {s.partenaire && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partenaire</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            {s.ville && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{s.ville}</span>}
                            {s.email && <span>{s.email}</span>}
                          </div>
                        </div>
                        <button onClick={() => togglePartner(s.id, s.partenaire)} disabled={togglingStruct === s.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 transition-all ${
                            s.partenaire
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}>
                          {togglingStruct === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                          {s.partenaire ? 'Retirer partenariat' : 'Partenaire'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MÉDECINS TAB ── */}
          {tab === 'medecins' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={docSearch} onChange={e => setDocSearch(e.target.value)}
                    placeholder="Rechercher par nom, spécialité…"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white" />
                </div>
                <button onClick={loadDoctors} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${docLoading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs text-gray-400 font-medium">{filteredDoctors.length} médecin{filteredDoctors.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {docLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-gray-400 animate-spin" /></div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">Aucun médecin trouvé</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredDoctors.map(d => (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {(d.prenom || 'D').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">Dr. {d.prenom} {d.nom}</p>
                            {d.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                            {d.specialite && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{d.specialite}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            {d.ville && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.ville}</span>}
                            {d.tarif && <span>{d.tarif.toLocaleString('fr-FR')} F</span>}
                            <span className={d.disponible ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                              {d.disponible ? 'Disponible' : 'Indisponible'}
                            </span>
                          </div>
                        </div>
                        {!d.is_verified && (
                          <button onClick={() => verifyDoctor(d.id)} disabled={verifyingDoc === d.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 disabled:opacity-50">
                            {verifyingDoc === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                            Vérifier
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LITIGES TAB ── */}
          {tab === 'litiges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Litiges ouverts</h2>
                <button onClick={loadDisputes} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${dispLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {dispLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-gray-400 animate-spin" /></div>
              ) : disputes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-600 text-sm">Aucun litige en cours</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map(d => {
                    const isOpen = d.statut !== 'resolu'
                    return (
                      <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {isOpen ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">#{d.id}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOpen ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {isOpen ? 'Ouvert' : 'Résolu'}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{d.user_nom} — {d.motif}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Paiement concerné : {Number(d.payment_montant || 0).toLocaleString('fr-FR')} FCFA</p>
                            {d.resolution && <p className="text-xs text-emerald-600 mt-0.5">Résolution : {d.resolution}</p>}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="mt-3 space-y-2">
                            <input type="text"
                              value={resolutionText[d.id] || ''}
                              onChange={e => setResolutionText(prev => ({ ...prev, [d.id]: e.target.value }))}
                              placeholder="Note de résolution (optionnel)"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                            <div className="flex gap-2">
                              <button onClick={() => resolveDispute(d.id, false)} disabled={resolvingId === d.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
                                {resolvingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Résoudre
                              </button>
                              <button onClick={() => resolveDispute(d.id, true)} disabled={resolvingId === d.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50">
                                {resolvingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                                Résoudre + Rembourser
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PAIEMENTS TAB ── */}
          {tab === 'paiements' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
                <p className="text-white/60 text-sm mb-1">Solde plateforme MedMap+</p>
                <p className="text-4xl font-extrabold" style={{ fontFamily: 'Sora' }}>
                  {Number(commissions?.solde_admin ?? 0).toLocaleString('fr-FR')} <span className="text-xl font-normal text-white/60">FCFA</span>
                </p>
                <p className="text-white/50 text-xs mt-2">Total transactions générées : {Number(commissions?.total_platform ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'rdv',         label: 'Commissions consultations', icon: Stethoscope, color: 'bg-sky-50 text-sky-700'      },
                  { key: 'pharmacie',   label: 'Commissions pharmacies',    icon: Pill,        color: 'bg-emerald-50 text-emerald-700'},
                  { key: 'hopital',     label: 'Commissions hôpitaux',      icon: Building2,   color: 'bg-violet-50 text-violet-700' },
                  { key: 'suivi_perso', label: 'Suivi personnel',           icon: Users,       color: 'bg-purple-50 text-purple-700' },
                  { key: 'urgence',     label: 'Frais urgences',            icon: AlertTriangle, color: 'bg-red-50 text-red-700'    },
                ].map(cat => {
                  const data = commissions?.[cat.key] ?? { total: 0, nb: 0 }
                  return (
                    <div key={cat.key} className={`${cat.color} rounded-2xl p-4 flex items-center gap-4`}>
                      <cat.icon className="w-8 h-8 flex-shrink-0 opacity-70" />
                      <div>
                        <p className="font-bold text-lg">{Number(data.total ?? 0).toLocaleString('fr-FR')} F</p>
                        <p className="text-sm font-medium opacity-70">{cat.label}</p>
                        <p className="text-xs opacity-50 mt-0.5">{data.nb} opération{data.nb !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="bg-amber-50 text-amber-700 rounded-2xl p-4 flex items-center gap-4">
                  <Wallet className="w-8 h-8 flex-shrink-0 opacity-70" />
                  <div>
                    <p className="font-bold text-lg">{Number(stats?.volume_wallet ?? 0).toLocaleString('fr-FR')} F</p>
                    <p className="text-sm font-medium opacity-70">Volume total portefeuilles</p>
                    <p className="text-xs opacity-50 mt-0.5">{stats?.utilisateurs ?? 0} utilisateurs</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
