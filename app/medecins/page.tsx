'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import { users, appointments as appointmentsApi, personalCare, subscriptions, messaging, wallet } from '@/lib/api'
import {
  Search, Star, MapPin, ChevronLeft, Stethoscope, X, Calendar,
  Loader2, Phone, Home, Video, CheckCircle, Crown, Sparkles,
  UserCheck, MessageSquare, Shield, Target, Users, Send,
  MessageCircle,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────

const SPECIALITES = [
  'Toutes', 'Médecine générale', 'Cardiologie', 'Pédiatrie', 'Gynécologie-Obstétrique',
  'Dermatologie', 'Neurologie', 'Ophtalmologie', 'Psychiatrie', 'Psychologie Clinique',
  'Endocrinologie', 'Kinésithérapie', 'ORL', 'Chirurgie Dentaire', 'Médecine interne',
  'Nutrition & Diététique', 'Pneumologie', 'Rhumatologie', 'Urologie', 'Chirurgie',
]

const HORAIRES = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30']
const SERVICES = ['Consultation générale', 'Suivi de traitement', 'Renouvellement ordonnance', 'Téléconsultation', 'Soins à domicile']
const DUREES = [
  { mois: 1, label: '1 mois', desc: 'Essai sans engagement' },
  { mois: 3, label: '3 mois', desc: 'Résultats tangibles' },
  { mois: 6, label: '6 mois', desc: 'Transformation durable', popular: true },
  { mois: 12, label: '1 an', desc: 'Suivi complet annuel' },
]

type Tab = 'medecins' | 'coachs'

// ── Helpers ────────────────────────────────────────────────────────────────────

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('225') ? digits : `225${digits}`
}

function getInitials(name: string): string {
  return name.replace(/^Dr\.\s*/, '').trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase()
}

const GRADIENTS = [
  'from-sky-500 to-blue-600', 'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500', 'from-indigo-500 to-blue-700',
  'from-teal-500 to-cyan-600', 'from-fuchsia-500 to-purple-600',
]
function gradient(id: number) { return GRADIENTS[id % GRADIENTS.length] }

function formatDate(raw: string) {
  if (!raw) return ''
  return new Date(raw + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ── ChatDrawer ─────────────────────────────────────────────────────────────────

function ChatDrawer({
  provider,
  providerLabel,
  currentUserId,
  onClose,
}: {
  provider: any
  providerLabel: string
  currentUserId: number
  onClose: () => void
}) {
  const [convId, setConvId] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const name = providerLabel
  const phone = provider.telephone

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const msgs = await messaging.messages(convId)
      setMessages(msgs)
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    messaging.createConversation(provider.id, 'general')
      .then(async (conv) => {
        setConvId(conv.id)
        const msgs = await messaging.messages(conv.id)
        setMessages(msgs)
        setLoading(false)
        pollRef.current = setInterval(() => loadMessages(conv.id), 3000)
      })
      .catch(() => { setLoading(false); setError('Impossible d\'ouvrir la messagerie.') })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [provider.id, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!convId || !newMsg.trim() || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')
    try {
      const msg = await messaging.send(convId, content)
      setMessages(prev => [...prev, msg])
    } catch (e: any) {
      setError(e.message || 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const suggestions = [
    'Êtes-vous disponible cette semaine ?',
    'Quel est votre tarif de consultation ?',
    'Acceptez-vous les nouvelles patientèles ?',
  ]

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient(provider.id)} flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/30`}>
          <span className="text-white font-extrabold text-sm">{getInitials(name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{name}</p>
          <p className="text-sky-200 text-xs">Message direct — réponse sous 24h</p>
        </div>
        {phone && (
          <a href={`tel:${phone}`} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0" title="Appeler">
            <Phone className="w-4 h-4 text-white" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/60">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-7 h-7 text-sky-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Démarrez la conversation</p>
            <p className="text-xs text-gray-400 mt-1">Posez directement vos questions à {name}</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe ? 'bg-sky-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-sky-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 0 && !loading && (
        <div className="px-4 py-2 bg-white border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Suggestions rapides</p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map(s => (
              <button key={s} onClick={() => setNewMsg(s)}
                className="text-xs text-left px-3 py-2 rounded-xl border border-sky-100 text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Écrire à ${name}...`}
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:border-sky-500 outline-none text-sm resize-none leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending || !convId}
            className="mb-0.5 w-11 h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold disabled:opacity-40 transition-colors flex items-center justify-center flex-shrink-0 shadow-md"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">Entrée pour envoyer · Maj+Entrée pour saut de ligne</p>
      </div>
    </motion.div>
  )
}

// ── RequestModal ───────────────────────────────────────────────────────────────
// Patient sends a request to a doctor/coach — no payment at this stage

function RequestModal({
  provider, providerType, isPremium, onClose, onSuccess,
}: {
  provider: any; providerType: 'medecin' | 'coach'; isPremium: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [alreadyPending, setAlreadyPending] = useState(false)

  const isCoach = providerType === 'coach'
  const name = isCoach ? `${provider.prenom} ${provider.nom}` : `Dr. ${provider.prenom} ${provider.nom}`
  const specialite = isCoach ? provider.coach_profile?.specialite : provider.specialite
  const tarifMensuel = isCoach
    ? (provider.coach_profile?.tarif_mensuel || 40000)
    : (parseFloat(provider.tarif || 0) * 4 || 48000)

  async function handleRequest() {
    setSubmitting(true); setError(''); setAlreadyPending(false)
    try {
      await personalCare.sendRequest({ provider_id: provider.id, provider_type: providerType, message: message || undefined })
      setDone(true)
      onSuccess()
    } catch (err: any) {
      if (err.message?.includes('déjà en cours') || err.status === 409) {
        setAlreadyPending(true)
      } else {
        setError(err.message || "Erreur lors de l'envoi")
      }
    }
    finally { setSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Suivi Personnel</span>
            </div>
            <p className="font-bold text-white text-base">{name}</p>
            <p className="text-purple-200 text-xs">{specialite} · {tarifMensuel.toLocaleString('fr-FR')} F/mois</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5">
          {!isPremium ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Crown className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Fonctionnalité Premium</h3>
              <p className="text-sm text-gray-500 mb-5">Le suivi personnel est réservé aux abonnés MedMap+ Premium.</p>
              {[
                { icon: UserCheck, text: 'Médecin ou coach attitré', c: 'text-violet-600 bg-violet-50' },
                { icon: Shield, text: 'Paiement sécurisé en séquestre', c: 'text-emerald-600 bg-emerald-50' },
                { icon: Target, text: 'Suivi mensuel avec planning', c: 'text-amber-600 bg-amber-50' },
              ].map(({ icon: Icon, text, c }) => (
                <div key={text} className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon className="w-4 h-4" /></div>
                  <span className="text-sm font-medium text-gray-700">{text}</span>
                </div>
              ))}
              <Link href="/media-premium" className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg mt-2">
                <Sparkles className="w-4 h-4" /> Passer à Premium
              </Link>
            </div>

          ) : done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
              <p className="text-sm text-gray-500 mb-1">{name} a été notifié(e) de votre demande.</p>
              <p className="text-xs text-gray-400 mb-6">Dès qu'il/elle accepte, vous pourrez confirmer et payer depuis <strong>Mon espace</strong>.</p>
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5 text-left space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-violet-700">1</div>
                  <p className="text-xs text-gray-600">Votre demande est <strong>en attente</strong> de réponse</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-gray-400">2</div>
                  <p className="text-xs text-gray-400">{name} accepte ou refuse</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-gray-400">3</div>
                  <p className="text-xs text-gray-400">Vous confirmez, choisissez la durée & le planning, et payez</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/mon-espace" className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all flex items-center justify-center">Mon espace</Link>
                <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">Fermer</button>
              </div>
            </div>

          ) : (
            <>
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient(provider.id)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-extrabold text-sm">{getInitials(name)}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-violet-600 font-semibold">{specialite}</p>
                  <p className="text-xs text-gray-500">{tarifMensuel.toLocaleString('fr-FR')} F/mois · paiement après acceptation</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-blue-700 mb-1.5">Comment ça marche ?</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>① Vous envoyez une demande (gratuit, pas de paiement maintenant)</p>
                  <p>② {name} accepte ou refuse</p>
                  <p>③ Vous choisissez la durée, le planning et payez en séquestre</p>
                </div>
              </div>

              <label className="text-sm font-semibold text-gray-700 mb-2 block">Message (optionnel)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Ex: Bonjour ${name}, je souhaite un suivi pour…`}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm resize-none mb-4"
              />

              {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4"><p className="text-xs text-red-700">{error}</p></div>}

              {alreadyPending ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-bold text-amber-800 mb-1">Demande déjà envoyée</p>
                  <p className="text-xs text-amber-700 mb-3">
                    Vous avez déjà une demande en cours avec {name}. Rendez-vous dans <strong>Mon espace</strong> pour suivre son statut ou attendre la réponse.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/mon-espace"
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors text-center">
                      Voir dans Mon espace
                    </Link>
                    <button onClick={onClose}
                      className="flex-1 py-2.5 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors">
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={handleRequest} disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                      : <><UserCheck className="w-4 h-4" /> Envoyer la demande</>}
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-2">Aucun paiement maintenant · Le contrat démarre après accord mutuel</p>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Contact Buttons ────────────────────────────────────────────────────────────

function ContactButtons({ provider, onMessage, isCoach = false }: { provider: any; onMessage: () => void; isCoach?: boolean }) {
  const phone = provider.telephone || provider.user?.telephone
  const waNumber = phone ? toWhatsApp(phone) : null
  const color = isCoach ? 'text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-400' : 'text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-400'

  return (
    <div className="flex gap-1.5 mt-2">
      <button onClick={onMessage}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${color}`}>
        <MessageCircle className="w-3.5 h-3.5" /> Message
      </button>
      {phone && (
        <a href={`tel:${phone}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all">
          <Phone className="w-3.5 h-3.5" /> Appeler
        </a>
      )}
      {waNumber && (
        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MedecinsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('medecins')

  // Doctors
  const [doctors, setDoctors] = useState<any[]>([])
  const [docLoading, setDocLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSpec, setFilterSpec] = useState('Toutes')
  const [filterDispo, setFilterDispo] = useState(false)

  // Coaches
  const [coaches, setCoaches] = useState<any[]>([])
  const [coachLoading, setCoachLoading] = useState(true)
  const [coachSearch, setCoachSearch] = useState('')

  // RDV booking (doctors)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [bookStep, setBookStep] = useState<'service' | 'datetime' | 'confirm' | 'done'>('service')
  const [service, setService] = useState('')
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('')
  const [motif, setMotif] = useState('')
  const [booking, setBooking] = useState(false)

  // Request flow
  const [assignTarget, setAssignTarget] = useState<{ provider: any; type: 'medecin' | 'coach' } | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [requestedIds, setRequestedIds] = useState<number[]>([])

  // Chat
  const [chatTarget, setChatTarget] = useState<{ provider: any; label: string } | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    users.doctors({ disponible: filterDispo ? true : undefined })
      .then(setDoctors).catch(() => setDoctors([]))
      .finally(() => setDocLoading(false))
  }, [filterDispo])

  useEffect(() => {
    personalCare.coaches({ disponible: filterDispo ? true : undefined })
      .then(setCoaches).catch(() => setCoaches([]))
      .finally(() => setCoachLoading(false))
  }, [filterDispo])

  useEffect(() => {
    subscriptions.status().then(s => setIsPremium(s?.plan === 'premium')).catch(() => {})
    personalCare.mine().then(list => setRequestedIds(list.map((a: any) => a.provider_id))).catch(() => {})
  }, [])

  const filteredDocs = useMemo(() => {
    let list = doctors
    if (filterSpec !== 'Toutes') list = list.filter(d => d.specialite === filterSpec)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => {
        const name = `${d.prenom ?? ''} ${d.nom ?? ''}`.toLowerCase()
        return name.includes(q) || (d.specialite ?? '').toLowerCase().includes(q) || (d.cabinet ?? '').toLowerCase().includes(q)
      })
    }
    return list
  }, [doctors, filterSpec, search])

  const filteredCoaches = useMemo(() => {
    if (!coachSearch) return coaches
    const q = coachSearch.toLowerCase()
    return coaches.filter(c => {
      const name = `${c.prenom} ${c.nom}`.toLowerCase()
      return name.includes(q) || (c.coach_profile?.specialite ?? '').toLowerCase().includes(q)
    })
  }, [coaches, coachSearch])

  function openBooking(doc: any) {
    setSelectedDoc(doc); setBookStep('service')
    setService(''); setDate(''); setHeure(''); setMotif('')
  }

  async function confirmBooking() {
    if (!selectedDoc || !service || !date || !heure) return
    setBooking(true)
    try {
      await appointmentsApi.book({
        provider_type: 'doctor',
        doctor_id: selectedDoc.id,
        service, date_rdv: date, heure_rdv: heure,
        motif: motif || service,
        prix: selectedDoc.tarif ?? undefined,
      })
      setBookStep('done')
    } catch { setBookStep('done') }
    finally { setBooking(false) }
  }

  function docName(d: any) { return `Dr. ${d.prenom ?? ''} ${d.nom ?? ''}`.trim() }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 py-10 px-4 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-2xl" />
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-center gap-2 mb-3">
              <Link href="/dashboard/patient" className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white" />
              </Link>
              <span className="text-white/70 text-sm">Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
              Médecins & Coachs
            </h1>
            <p className="text-white/80 text-sm mb-5">Consultez, écrivez ou appelez directement un professionnel de santé</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setTab('medecins')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'medecins' ? 'bg-white text-sky-700 shadow-md' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                <Stethoscope className="w-4 h-4" /> Médecins
                <span className="bg-sky-200/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{doctors.length || ''}</span>
              </button>
              <button onClick={() => setTab('coachs')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'coachs' ? 'bg-white text-violet-700 shadow-md' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                <Target className="w-4 h-4" /> Coachs Santé
                <span className="bg-amber-400 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ml-0.5">PREMIUM</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* ── MÉDECINS TAB ── */}
          {tab === 'medecins' && (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher un médecin, spécialité, cabinet..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300 text-sm font-medium shadow-sm" />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                {SPECIALITES.map(s => (
                  <button key={s} onClick={() => setFilterSpec(s)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterSpec === s ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300'}`}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-800">{filteredDocs.length}</span> médecin{filteredDocs.length > 1 ? 's' : ''}
                </p>
                <button onClick={() => setFilterDispo(!filterDispo)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${filterDispo ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${filterDispo ? 'bg-emerald-300' : 'bg-gray-300'}`} /> Disponibles
                </button>
              </div>

              {docLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-sky-500 animate-spin" /></div>
              ) : filteredDocs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <Stethoscope className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-semibold text-gray-500">Aucun médecin trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map((doc, i) => {
                    const name = docName(doc)
                    const dispo = doc.disponible !== false
                    const isRequested = requestedIds.includes(doc.id)
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient(doc.id)} flex items-center justify-center flex-shrink-0 shadow-md`}>
                              <span className="text-white font-extrabold text-lg">{getInitials(name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-gray-900 text-base leading-tight">{name}</h3>
                                  <p className="text-xs text-sky-600 font-semibold mt-0.5">{doc.specialite ?? 'Médecin'}</p>
                                </div>
                                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${dispo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                  {dispo ? '● Disponible' : '● Occupé'}
                                </span>
                              </div>
                              {doc.cabinet && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 flex-shrink-0" /> {doc.cabinet}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {doc.experience_ans && <span className="text-xs text-gray-400">{doc.experience_ans} ans</span>}
                                {doc.note && (
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {parseFloat(doc.note).toFixed(1)}
                                  </span>
                                )}
                                {doc.tarif && <span className="text-xs font-bold text-sky-600">{parseInt(doc.tarif).toLocaleString('fr-FR')} F</span>}
                              </div>
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {doc.teleconsultation && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700"><Video className="w-3 h-3" /> Téléconsult</span>}
                                {doc.domicile && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Home className="w-3 h-3" /> Domicile</span>}
                                {doc.is_verified && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700"><CheckCircle className="w-3 h-3" /> Certifié</span>}
                              </div>
                            </div>
                          </div>

                          {/* Contact buttons row */}
                          <ContactButtons provider={doc} onMessage={() => setChatTarget({ provider: doc, label: name })} />

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => dispo && openBooking(doc)} disabled={!dispo}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${dispo ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                              <Calendar className="w-4 h-4" /> Prendre RDV
                            </button>
                            <button onClick={() => !isRequested && setAssignTarget({ provider: doc, type: 'medecin' })}
                              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${isRequested ? 'border-violet-200 bg-violet-50 text-violet-600 cursor-default' : 'border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400'}`}>
                              <Crown className="w-4 h-4" /> {isRequested ? 'Demandé' : 'Médecin perso'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── COACHS TAB ── */}
          {tab === 'coachs' && (
            <>
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4 mb-5 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">Coachs Santé Personnels</p>
                  <p className="text-purple-200 text-xs">Accompagnement sur-mesure, réservé aux membres Premium</p>
                </div>
                {!isPremium ? (
                  <Link href="/media-premium" className="flex-shrink-0 bg-amber-400 hover:bg-amber-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg transition-colors">Upgrade</Link>
                ) : (
                  <span className="flex-shrink-0 bg-emerald-400 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg">Actif ✓</span>
                )}
              </div>

              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher un coach ou une spécialité..." value={coachSearch}
                  onChange={e => setCoachSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm font-medium shadow-sm" />
              </div>

              {coachLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
              ) : filteredCoaches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <Target className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-semibold text-gray-500">Aucun coach trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCoaches.map((coach, i) => {
                    const cp = coach.coach_profile ?? {}
                    const name = `${coach.prenom} ${coach.nom}`
                    const dispo = cp.disponible !== false
                    const isRequested = requestedIds.includes(coach.id)
                    return (
                      <motion.div key={coach.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient(coach.id + 4)} flex items-center justify-center flex-shrink-0 shadow-md`}>
                              <span className="text-white font-extrabold text-lg">{getInitials(name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-gray-900 text-base leading-tight">{name}</h3>
                                  <p className="text-xs text-violet-600 font-semibold mt-0.5">{cp.specialite ?? 'Coach Santé'}</p>
                                </div>
                                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${dispo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                  {dispo ? '● Dispo' : '● Complet'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {cp.experience_ans && <span className="text-xs text-gray-400">{cp.experience_ans} ans exp.</span>}
                                {cp.note && (
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {parseFloat(cp.note).toFixed(1)}
                                  </span>
                                )}
                                {cp.nb_patients > 0 && <span className="flex items-center gap-1 text-xs text-gray-400"><Users className="w-3 h-3" /> {cp.nb_patients} patients</span>}
                                {cp.tarif_mensuel && <span className="text-xs font-bold text-violet-600">{parseInt(cp.tarif_mensuel).toLocaleString('fr-FR')} F/mois</span>}
                              </div>
                              {cp.description && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{cp.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Contact buttons */}
                          <ContactButtons provider={coach} onMessage={() => setChatTarget({ provider: coach, label: name })} isCoach />

                          {/* Request */}
                          <button onClick={() => !isRequested && setAssignTarget({ provider: coach, type: 'coach' })} disabled={isRequested}
                            className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${isRequested ? 'bg-violet-50 text-violet-600 border-2 border-violet-200 cursor-default' : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:from-violet-700 hover:to-purple-700'}`}>
                            {isRequested ? <><CheckCircle className="w-4 h-4" /> Demande envoyée</> : <><Crown className="w-4 h-4" /> Demander ce coach</>}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Booking Modal (doctors) ── */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-sky-600 to-blue-600 p-5 rounded-t-3xl flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">Prendre rendez-vous</p>
                  <p className="font-bold text-white text-base">{docName(selectedDoc)}</p>
                  <p className="text-sky-200 text-xs">{selectedDoc.specialite ?? 'Médecin'}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="p-5">
                {bookStep === 'done' ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Rendez-vous envoyé !</h3>
                    <p className="text-sm text-gray-500 mb-6">Vous recevrez une confirmation de {docName(selectedDoc)}.</p>
                    <div className="flex gap-3">
                      <Link href="/appointments" className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-gray-50 transition-all">Mes RDV</Link>
                      <button onClick={() => setSelectedDoc(null)} className="flex-1 py-3 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all">Fermer</button>
                    </div>
                  </div>
                ) : bookStep === 'service' ? (
                  <>
                    <h4 className="font-bold text-gray-900 mb-4">Choisir le motif</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {SERVICES.map(s => (
                        <button key={s} onClick={() => { setService(s); setBookStep('datetime') }}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${service === s ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600 hover:border-sky-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : bookStep === 'datetime' ? (
                  <>
                    <button onClick={() => setBookStep('service')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                      <ChevronLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Heure</label>
                        <div className="grid grid-cols-4 gap-2">
                          {HORAIRES.map(h => (
                            <button key={h} onClick={() => setHeure(h)}
                              className={`py-2 rounded-xl text-xs font-semibold transition-all ${heure === h ? 'bg-sky-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-sky-50 hover:text-sky-700'}`}>
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Motif (optionnel)</label>
                        <textarea value={motif} onChange={e => setMotif(e.target.value)} placeholder="Décrivez brièvement votre motif..." rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 outline-none text-sm resize-none" />
                      </div>
                    </div>
                    <button onClick={() => date && heure && setBookStep('confirm')} disabled={!date || !heure}
                      className="w-full mt-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors">
                      Continuer →
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setBookStep('datetime')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                      <ChevronLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 mb-4">
                      <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-2">Récapitulatif</p>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p><span className="text-gray-400">Médecin :</span> {docName(selectedDoc)}</p>
                        <p><span className="text-gray-400">Service :</span> {service}</p>
                        <p><span className="text-gray-400">Date :</span> {formatDate(date)}</p>
                        <p><span className="text-gray-400">Heure :</span> {heure}</p>
                        {selectedDoc.tarif && (
                          <>
                            <div className="border-t border-sky-100 my-2" />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Honoraire médecin</span>
                              <span>{parseInt(selectedDoc.tarif).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Commission MedMap+ (15%)</span>
                              <span className="text-sky-600">+{Math.round(parseInt(selectedDoc.tarif) * 0.15).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-sky-100 mt-1">
                              <span>Total débité</span>
                              <span className="text-sky-700">{Math.round(parseInt(selectedDoc.tarif) * 1.15).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={confirmBooking} disabled={booking}
                      className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {booking ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : <><Calendar className="w-4 h-4" /> Confirmer le rendez-vous</>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Request Modal ── */}
      <AnimatePresence>
        {assignTarget && (
          <RequestModal
            provider={assignTarget.provider}
            providerType={assignTarget.type}
            isPremium={isPremium}
            onClose={() => setAssignTarget(null)}
            onSuccess={() => {
              setRequestedIds(prev => [...prev, assignTarget!.provider.id])
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Chat Drawer ── */}
      <AnimatePresence>
        {chatTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50" onClick={() => setChatTarget(null)} />
            <ChatDrawer
              provider={chatTarget.provider}
              providerLabel={chatTarget.label}
              currentUserId={user?.id ?? 0}
              onClose={() => setChatTarget(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
