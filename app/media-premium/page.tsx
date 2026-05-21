'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { Star, CheckCircle, Zap, MessageSquare, Calendar, ShoppingBag, AlertTriangle, Shield, ArrowRight, ChevronRight } from 'lucide-react'

const plans = [
  {
    id: 'mensuel',
    label: 'Mensuel',
    price: 4990,
    period: '/mois',
    popular: false,
  },
  {
    id: 'trimestriel',
    label: 'Trimestriel',
    price: 12490,
    period: '/3 mois',
    popular: true,
    economy: 'Économisez 30%',
  },
  {
    id: 'annuel',
    label: 'Annuel',
    price: 39990,
    period: '/an',
    popular: false,
    economy: 'Économisez 50%',
  },
]

const features = [
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Messages illimités',
    desc: 'Conversez avec MediA sans aucune limite. Posez toutes vos questions santé.',
    basic: 'Limité à 5 messages/jour',
    premium: 'Illimité',
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Prise de RDV automatique',
    desc: 'MediA prend vos rendez-vous médicaux automatiquement selon vos préférences.',
    basic: 'Non disponible',
    premium: 'Inclus',
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: 'Commande médicaments',
    desc: 'MediA commande vos médicaments récurrents automatiquement et vous notifie.',
    basic: 'Non disponible',
    premium: 'Inclus',
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Assistance urgences 24h/24',
    desc: 'En cas d\'urgence, MediA guide en temps réel et alerte les secours.',
    basic: 'Limité',
    premium: 'Prioritaire',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Analyse de santé avancée',
    desc: 'Analyse de vos symptômes avec l\'IA de santé la plus avancée de CI.',
    basic: 'Non disponible',
    premium: 'Inclus',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Dossier médical IA',
    desc: 'MediA mémorise votre historique et personnalise ses réponses selon votre profil.',
    basic: 'Non disponible',
    premium: 'Inclus',
  },
]

export default function MediaPremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState('trimestriel')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md mx-auto px-4">
            <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-14 h-14 text-yellow-500 fill-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-ink mb-3" style={{ fontFamily: 'Sora' }}>Bienvenue Premium !</h2>
            <p className="text-slate mb-8">Votre abonnement MediA Premium est activé. Profitez de toutes les fonctionnalités sans limite.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/chatbot" className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg">
                Ouvrir MediA
              </Link>
              <Link href="/dashboard/patient" className="px-6 py-3 border-2 border-bone text-ink rounded-xl font-semibold hover:border-primary/30 transition-all">
                Mon espace
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="pt-16">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-ink via-slate/95 to-ink py-20 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-full text-sm font-bold mb-6"
            >
              <Star className="w-4 h-4 fill-yellow-400" />
              MediA Premium — L'IA Santé Sans Limites
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: 'Sora' }}
            >
              Votre assistant santé{' '}
              <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(135deg, #EAB308, #F97316)' }}>
                intelligent
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/60 max-w-2xl mx-auto mb-10"
            >
              Consultations illimitées, actions automatiques, dossier médical IA, assistance urgences. MediA Premium s'occupe de tout.
            </motion.p>
          </div>
        </section>

        {/* Plans */}
        <section className="max-w-4xl mx-auto px-4 -mt-8 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {plans.map(plan => (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? plan.popular
                      ? 'border-yellow-500 shadow-2xl shadow-yellow-500/20'
                      : 'border-primary shadow-lg shadow-primary/10'
                    : 'border-bone hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    ⭐ Plus populaire
                  </div>
                )}
                {plan.economy && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.economy}
                  </div>
                )}
                <h3 className="font-bold text-ink mb-4" style={{ fontFamily: 'Sora' }}>{plan.label}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-black text-ink">{plan.price.toLocaleString()}</span>
                  <span className="text-slate text-sm ml-1">F CFA{plan.period}</span>
                </div>
                {selectedPlan === plan.id && (
                  <div className="flex items-center gap-1.5 text-primary text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" /> Sélectionné
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Features comparison */}
          <div className="bg-white rounded-2xl border border-bone overflow-hidden mb-8">
            <div className="grid grid-cols-3 bg-ink text-white text-sm font-semibold">
              <div className="col-span-1 p-4">Fonctionnalité</div>
              <div className="p-4 text-center">Basic</div>
              <div className="p-4 text-center text-yellow-400">Premium</div>
            </div>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="grid grid-cols-3 border-t border-bone hover:bg-paper transition-colors"
              >
                <div className="col-span-1 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{f.title}</p>
                      <p className="text-xs text-slate mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center">
                  <span className="text-xs text-slate font-medium text-center">{f.basic}</span>
                </div>
                <div className="p-4 flex items-center justify-center">
                  <span className="text-xs text-yellow-600 font-bold text-center flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    {f.premium}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-ink to-slate/90 rounded-3xl p-8 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Star className="w-4 h-4" />
                Plan {plans.find(p => p.id === selectedPlan)?.label} sélectionné
              </div>
              <p className="text-4xl font-bold mb-2" style={{ fontFamily: 'Sora' }}>
                {plans.find(p => p.id === selectedPlan)?.price.toLocaleString()} F CFA
                <span className="text-white/50 text-lg font-normal">{plans.find(p => p.id === selectedPlan)?.period}</span>
              </p>
              <p className="text-white/60 mb-6">Paiement sécurisé • Annulation à tout moment</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg disabled:opacity-60 shadow-xl shadow-yellow-500/30"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Star className="w-5 h-5 fill-white" /> Souscrire à MediA Premium</>
                  )}
                </motion.button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-white/40">
                <Shield className="w-3 h-3" />
                Paiement sécurisé • Données protégées • Sans engagement
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
