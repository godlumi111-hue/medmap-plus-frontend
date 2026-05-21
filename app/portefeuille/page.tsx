'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { wallet } from '@/lib/api'
import {
  ArrowUp, ArrowDown, Clock, CheckCircle, AlertTriangle, Lock,
  Loader2, Wallet, Shield, TrendingUp, X, ChevronRight, Smartphone,
} from 'lucide-react'

const FEE_RATE = 0.015

// ── Mobile Money Icons ─────────────────────────────────────────────────────────

function WaveIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#1B72E8"/>
      <path d="M8 22 Q13 14 18 22 Q23 30 28 22" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M8 16 Q13 8 18 16 Q23 24 28 16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function OrangeIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#FF6B00"/>
      <circle cx="18" cy="18" r="8" fill="white" opacity="0.15"/>
      <text x="18" y="23" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">OM</text>
    </svg>
  )
}

function MTNIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#FFCC00"/>
      <text x="18" y="15" textAnchor="middle" fill="#1A1A1A" fontSize="7" fontWeight="bold" fontFamily="Arial">MTN</text>
      <text x="18" y="26" textAnchor="middle" fill="#1A1A1A" fontSize="7" fontWeight="bold" fontFamily="Arial">MoMo</text>
    </svg>
  )
}

function MoovIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#003087"/>
      <path d="M8 18 L14 12 L18 20 L22 12 L28 18" stroke="#00A3E0" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const METHODS = [
  { id: 'wave',   label: 'Wave',       sub: 'Paiement mobile sécurisé',    icon: WaveIcon },
  { id: 'orange', label: 'Orange Money', sub: 'Orange CI',                 icon: OrangeIcon },
  { id: 'mtn',    label: 'MTN MoMo',   sub: 'Mobile Money',                icon: MTNIcon },
  { id: 'moov',   label: 'Moov Money', sub: 'Moov Africa CI',              icon: MoovIcon },
]

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000]

type DepositStep = 'form' | 'step1' | 'step2' | 'step3_wait' | 'step4' | 'step5_done'

const STEPS = [
  { key: 'step1',      label: 'Vérification du montant',         desc: 'Validation de votre demande de dépôt…' },
  { key: 'step2',      label: 'Envoi vers l\'opérateur',          desc: 'Transmission sécurisée vers votre opérateur…' },
  { key: 'step3_wait', label: 'En attente de confirmation',       desc: 'Ouvrez votre application et confirmez la transaction.' },
  { key: 'step4',      label: 'Vérification de la transaction',   desc: 'Contrôle de la transaction en cours…' },
  { key: 'step5_done', label: 'Dépôt validé',                     desc: 'Votre solde a été mis à jour avec succès !' },
]

const statutConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirme:    { label: 'Confirmé',   color: 'text-green-600 bg-green-50',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  en_attente:  { label: 'En attente', color: 'text-amber-600 bg-amber-50',   icon: <Clock className="w-3.5 h-3.5" /> },
  'en-attente':{ label: 'En attente', color: 'text-amber-600 bg-amber-50',   icon: <Clock className="w-3.5 h-3.5" /> },
  bloque:      { label: 'Bloqué',     color: 'text-red-500 bg-red-50',       icon: <Lock className="w-3.5 h-3.5" /> },
  litige:      { label: 'Litige',     color: 'text-purple-600 bg-purple-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  dispute:     { label: 'Litige',     color: 'text-purple-600 bg-purple-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

const methodLabel: Record<string, string> = {
  wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money',
}

export default function PortefeuillePage() {
  const [walletData, setWalletData]       = useState<any>(null)
  const [transactions, setTransactions]   = useState<any[]>([])
  const [deposits, setDeposits]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [showDeposit, setShowDeposit]     = useState(false)
  const [activeTab, setActiveTab]         = useState<'all' | 'depot' | 'pending'>('all')

  // Deposit form state
  const [amount, setAmount]               = useState(0)
  const [customAmount, setCustomAmount]   = useState('')
  const [method, setMethod]               = useState('wave')
  const [depositStep, setDepositStep]     = useState<DepositStep>('form')
  const [pendingDeposit, setPendingDeposit] = useState<any>(null)
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError]   = useState('')

  // Action
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [w, tx, deps] = await Promise.allSettled([wallet.me(), wallet.transactions(), wallet.deposits()])
      if (w.status   === 'fulfilled') setWalletData(w.value)
      if (tx.status  === 'fulfilled') setTransactions(tx.value)
      if (deps.status === 'fulfilled') setDeposits(deps.value)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const balance = Number(walletData?.solde ?? 0)
  const pending = transactions.filter(t =>
    ['en_attente', 'en-attente'].includes(t.statut) &&
    !/(commande|livraison|médicament|medicament)/i.test(t.description ?? '')
  )

  const totalAmount = amount || Number(customAmount) || 0
  const frais       = Math.round(totalAmount * FEE_RATE)
  const netAmount   = totalAmount - frais

  function openDeposit() {
    setShowDeposit(true); setDepositStep('form')
    setAmount(0); setCustomAmount(''); setMethod('wave')
    setDepositError(''); setPendingDeposit(null)
  }

  function closeDeposit() {
    setShowDeposit(false)
    setDepositStep('form')
    setPendingDeposit(null)
  }

  async function initiateDeposit() {
    if (!totalAmount || totalAmount < 500) { setDepositError('Montant minimum : 500 F CFA'); return }
    setDepositLoading(true); setDepositError('')
    try {
      const dep = await wallet.deposit(method, totalAmount)
      setPendingDeposit(dep)
      setDepositStep('step1')
      // Auto-progress through steps 1 and 2
      setTimeout(() => setDepositStep('step2'), 1800)
      setTimeout(() => setDepositStep('step3_wait'), 3600)
    } catch (e: any) {
      setDepositError(e.message || 'Erreur lors de l\'initiation du dépôt')
    } finally {
      setDepositLoading(false)
    }
  }

  async function simulateConfirmation() {
    if (!pendingDeposit) return
    setDepositStep('step4')
    setTimeout(async () => {
      try {
        await wallet.confirmDeposit(pendingDeposit.id)
        setDepositStep('step5_done')
        await fetchData()
      } catch (e: any) {
        setDepositError(e.message || 'Erreur de confirmation')
        setDepositStep('step3_wait')
      }
    }, 2000)
  }

  async function handleConfirm(id: number) {
    setActionLoading(id)
    try { await wallet.confirmService(id); await fetchData() } catch {}
    finally { setActionLoading(null) }
  }

  async function handleDispute(id: number) {
    setActionLoading(id)
    try { await wallet.dispute(id, 'Service non reçu ou insatisfaisant'); await fetchData() } catch {}
    finally { setActionLoading(null) }
  }

  const currentStepIdx = STEPS.findIndex(s => s.key === depositStep)
  const methodMeta = METHODS.find(m => m.id === method)

  const filtered =
    activeTab === 'all'     ? transactions :
    activeTab === 'depot'   ? transactions.filter(t => t.type === 'credit') :
    transactions.filter(t => ['en_attente', 'en-attente'].includes(t.statut))

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Balance card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white mb-6 overflow-hidden shadow-2xl"
              >
                <div className="absolute -right-12 -top-12 w-52 h-52 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-blue-300" />
                    <p className="text-blue-200 text-sm font-medium">Solde disponible</p>
                  </div>
                  <p className="text-5xl font-extrabold mb-1" style={{ fontFamily: 'Sora' }}>
                    {balance.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-blue-300 text-sm mb-6">F CFA</p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={openDeposit}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
                    >
                      <ArrowDown className="w-4 h-4" /> Déposer
                    </button>
                  </div>
                </div>
                <div className="absolute right-8 top-8 opacity-10">
                  <Shield className="w-28 h-28" />
                </div>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'En attente',   value: `${pending.reduce((s, t) => s + Number(t.montant ?? 0), 0).toLocaleString('fr-FR')} F`, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Total crédité', value: `+${transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.montant ?? 0), 0).toLocaleString('fr-FR')} F`, icon: <ArrowDown className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
                  { label: 'Total dépensé', value: `-${transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.montant ?? 0), 0).toLocaleString('fr-FR')} F`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                      {item.icon}
                    </div>
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Pending */}
              {pending.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                  <h2 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Paiements en attente de confirmation
                  </h2>
                  <div className="space-y-2">
                    {pending.map(t => (
                      <div key={t.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{Number(t.montant).toLocaleString('fr-FR')} F</span>
                          <button onClick={() => handleConfirm(t.payment_id || t.id)} disabled={actionLoading === t.id}
                            className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-60">
                            {actionLoading === t.id ? '...' : 'Confirmer'}
                          </button>
                          <button onClick={() => handleDispute(t.payment_id || t.id)} disabled={actionLoading === t.id}
                            className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-500 hover:text-white disabled:opacity-60">
                            Litige
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Sora' }}>Historique</h2>
                  <div className="flex gap-2">
                    {[{ id: 'all', label: 'Tout' }, { id: 'depot', label: 'Dépôts' }, { id: 'pending', label: 'En attente' }].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">Aucune transaction</p>
                    <p className="text-sm text-gray-400 mt-1">Vos transactions apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map(t => {
                      const st = statutConfig[t.statut] ?? { label: t.statut || '—', color: 'text-gray-500 bg-gray-50', icon: null }
                      const date = t.created_at ?? t.date
                      const isDebit = t.type === 'debit'
                      return (
                        <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDebit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {isDebit ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                            <p className="text-xs text-gray-400">{date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                            <span className={`font-bold text-sm ${isDebit ? 'text-gray-800' : 'text-green-600'}`}>
                              {isDebit ? '-' : '+'}{Number(t.montant).toLocaleString('fr-FR')} F
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Deposits history */}
              {deposits.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
                  <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora' }}>Dépôts Mobile Money</h2>
                  <div className="space-y-2">
                    {deposits.map(d => {
                      const m = METHODS.find(x => x.id === d.methode)
                      const Icon = m?.icon
                      return (
                        <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
                          {Icon && <Icon size={32} />}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{m?.label} — {Number(d.montant_demande).toLocaleString('fr-FR')} F demandé</p>
                            <p className="text-xs text-gray-400">
                              Frais : {Number(d.frais).toLocaleString('fr-FR')} F · Crédité : {Number(d.montant_credit).toLocaleString('fr-FR')} F · Réf : {d.reference}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.statut === 'confirme' ? 'bg-green-50 text-green-600' : d.statut === 'en_attente' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                            {d.statut === 'confirme' ? 'Confirmé' : d.statut === 'en_attente' ? 'En attente' : d.statut}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDeposit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50"
            onClick={depositStep === 'form' ? closeDeposit : undefined}
          >
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora' }}>
                  {depositStep === 'form' ? 'Déposer des fonds' : depositStep === 'step5_done' ? 'Dépôt confirmé !' : 'Traitement en cours…'}
                </h2>
                {(depositStep === 'form' || depositStep === 'step5_done') && (
                  <button onClick={closeDeposit} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>

              <div className="px-6 py-5">
                {/* FORM STEP */}
                {depositStep === 'form' && (
                  <>
                    {/* Operator selection */}
                    <p className="text-sm font-semibold text-gray-700 mb-3">Opérateur</p>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {METHODS.map(m => {
                        const Icon = m.icon
                        return (
                          <button key={m.id} onClick={() => setMethod(m.id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${method === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                            <Icon size={36} />
                            <div className="text-left">
                              <p className="text-sm font-bold text-gray-900">{m.label}</p>
                              <p className="text-xs text-gray-400">{m.sub}</p>
                            </div>
                            {method === m.id && <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-semibold text-gray-700 mb-3">Montant</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {QUICK_AMOUNTS.map(a => (
                        <button key={a} onClick={() => { setAmount(a); setCustomAmount('') }}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${amount === a && !customAmount ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                          {(a / 1000).toFixed(0)}k F
                        </button>
                      ))}
                    </div>
                    <input type="number" placeholder="Autre montant (F CFA)" value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setAmount(0) }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm mb-4"
                    />

                    {/* Breakdown */}
                    {totalAmount > 0 && (
                      <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Montant demandé</span>
                          <span className="font-semibold text-gray-900">{totalAmount.toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Frais plateforme (1,5%)</span>
                          <span className="font-semibold text-red-500">−{frais.toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="h-px bg-gray-200" />
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900">Crédité sur votre compte</span>
                          <span className="font-extrabold text-green-600">{netAmount.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    )}

                    {depositError && <p className="text-sm text-red-500 mb-3">{depositError}</p>}

                    <button onClick={initiateDeposit} disabled={!totalAmount || totalAmount < 500 || depositLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-3.5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2">
                      {depositLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Smartphone className="w-5 h-5" /> Initier le dépôt</>}
                    </button>
                  </>
                )}

                {/* PROGRESS STEPS */}
                {depositStep !== 'form' && (
                  <div className="py-2">
                    {/* Method + amount summary */}
                    {pendingDeposit && (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-6">
                        {methodMeta && <methodMeta.icon size={40} />}
                        <div>
                          <p className="font-bold text-gray-900">{methodMeta?.label}</p>
                          <p className="text-sm text-gray-500">
                            {Number(pendingDeposit.montant_credit).toLocaleString('fr-FR')} F crédités · réf. {pendingDeposit.reference}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Steps */}
                    <div className="space-y-4 mb-6">
                      {STEPS.map((step, idx) => {
                        const isActive = step.key === depositStep
                        const isDone = currentStepIdx > idx
                        const isWaiting = idx > currentStepIdx

                        return (
                          <div key={step.key} className={`flex items-start gap-4 transition-all ${isWaiting ? 'opacity-30' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                              isDone ? 'bg-green-500' :
                              isActive ? (step.key === 'step5_done' ? 'bg-green-500' : 'bg-blue-500 animate-pulse') :
                              'bg-gray-200'
                            }`}>
                              {isDone || step.key === 'step5_done' && isActive
                                ? <CheckCircle className="w-4 h-4 text-white" />
                                : isActive
                                ? <div className="w-3 h-3 bg-white rounded-full" />
                                : <span className="text-xs text-gray-500 font-bold">{idx + 1}</span>
                              }
                            </div>
                            <div className="flex-1 pt-0.5">
                              <p className={`text-sm font-bold ${isActive || isDone ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                              {isActive && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
                            </div>
                            {isActive && step.key !== 'step5_done' && step.key !== 'step3_wait' && step.key !== 'step4' && (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin mt-1" />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Waiting for user confirmation */}
                    {depositStep === 'step3_wait' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                          <p className="font-bold text-blue-800 text-sm">Confirmation requise</p>
                        </div>
                        <p className="text-sm text-blue-700 mb-4">
                          Une demande de confirmation a été envoyée sur votre application <strong>{methodMeta?.label}</strong>. Ouvrez l'application et confirmez la transaction.
                        </p>
                        <button onClick={simulateConfirmation}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                          <CheckCircle className="w-4 h-4" /> Simuler la confirmation {methodMeta?.label}
                        </button>
                      </div>
                    )}

                    {depositStep === 'step4' && (
                      <div className="flex items-center justify-center gap-3 py-4">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <p className="text-sm font-medium text-gray-600">Vérification de la transaction…</p>
                      </div>
                    )}

                    {depositStep === 'step5_done' && (
                      <>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center py-4">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-9 h-9 text-green-500" />
                          </div>
                          <p className="text-xl font-extrabold text-gray-900 mb-1" style={{ fontFamily: 'Sora' }}>
                            +{pendingDeposit ? Number(pendingDeposit.montant_credit).toLocaleString('fr-FR') : 0} F CFA
                          </p>
                          <p className="text-sm text-gray-500 mb-1">Nouveau solde : <span className="font-bold text-gray-900">{balance.toLocaleString('fr-FR')} F CFA</span></p>
                          <p className="text-xs text-gray-400">Réf : {pendingDeposit?.reference}</p>
                        </motion.div>
                        <button onClick={closeDeposit}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-bold mt-4 transition-all">
                          Fermer
                        </button>
                      </>
                    )}

                    {depositError && <p className="text-sm text-red-500 mt-3">{depositError}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
