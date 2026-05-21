'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  Send, Star, Calendar, ShoppingBag, AlertTriangle, Heart, Lock, Zap, Mic, MicOff,
  Paperclip, User, Plus, MessageSquare, ChevronRight, X, Pill, Menu,
  Search, CheckCircle, Package, Phone, Dog, Stethoscope, FileText,
  Truck, Wallet, ExternalLink,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  isTyping?: boolean
  imagePreview?: string
  widget?: 'med-search' | 'med-confirm' | 'order-success'
  widgetData?: any
  actions?: { label: string; icon: React.ReactNode; href?: string; onClick?: () => void }[]
  suggestions?: string[]
}

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

const ts = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// ─── Waveform ─────────────────────────────────────────────────────────────────
const WAVE = [20, 42, 68, 45, 78, 55, 88, 62, 40, 72, 88, 52, 66, 82, 56, 45, 72, 88, 62, 40, 68, 52, 35, 20]

function WaveformBars({ state }: { state: OrbState }) {
  const on = state === 'listening' || state === 'speaking'
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {WAVE.map((h, i) => (
        <motion.div key={i} className="w-[3px] rounded-full"
          style={{ originY: 'center', backgroundColor: on ? `rgba(45,212,191,${0.25 + (h / 100) * 0.75})` : 'rgba(45,212,191,0.12)' }}
          animate={on ? { scaleY: [0.12, h / 100, 0.12] } : { scaleY: 0.12 }}
          transition={on ? { repeat: Infinity, duration: state === 'speaking' ? 0.5 : 1.0, delay: i * 0.038, ease: 'easeInOut' } : {}}
          initial={{ scaleY: 0.12 }} />
      ))}
    </div>
  )
}

// ─── AI Orb ───────────────────────────────────────────────────────────────────
function AIOrb({ state, size = 'lg' }: { state: OrbState; size?: 'sm' | 'lg' }) {
  const d = size === 'lg' ? 156 : 34
  const rings = state === 'idle' ? 0 : state === 'thinking' ? 1 : 3
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: d, height: d }}>
      {Array.from({ length: rings }).map((_, i) => (
        <motion.div key={i} className="absolute inset-0 rounded-full border border-teal-400/20"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.85 + i * 0.45, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.7, ease: 'easeOut' }} />
      ))}
      {state === 'thinking' && (
        <motion.div className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 55%, rgba(45,212,191,0.65), transparent)' }}
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }} />
      )}
      <motion.div
        className="rounded-full bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-500 flex items-center justify-center"
        style={{ width: d * 0.77, height: d * 0.77, boxShadow: `0 0 ${state !== 'idle' ? 36 : 14}px rgba(45,212,191,${state !== 'idle' ? 0.45 : 0.16})` }}
        animate={state === 'idle' ? { scale: [1, 1.03, 1] } : state === 'listening' ? { scale: [1, 1.09, 1, 1.05, 1] } : state === 'thinking' ? { scale: [1, 0.96, 1] } : { scale: [1, 1.13, 0.94, 1.09, 1] }}
        transition={{ repeat: Infinity, duration: state === 'idle' ? 3 : state === 'speaking' ? 0.62 : 1.1, ease: 'easeInOut' }}
      >
        <Heart className={`${size === 'lg' ? 'w-12 h-12' : 'w-4 h-4'} text-white fill-white`} />
      </motion.div>
    </div>
  )
}

// ─── Voice Overlay (MediaRecorder + Gemini transcription) ────────────────────
function VoiceOverlay({ onClose, isPremium, onResult }: { onClose: () => void; isPremium: boolean; onResult: (text: string) => void }) {
  const [orb, setOrb] = useState<OrbState>('idle')
  const [transcript, setTranscript] = useState('')
  const [replyText, setReplyText] = useState('')
  const [status, setStatus] = useState('Appuyer sur le micro pour parler')
  const [hint, setHint] = useState('')
  const [textInput, setTextInput] = useState('')
  const [showText, setShowText] = useState(false)
  const [isRec, setIsRec] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!isPremium) { onDone?.(); return }
    const clean = text.replace(/\*\*/g, '').replace(/[•⚠️🚨📎💙🎉]/g, '').replace(/\n/g, '. ')
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'fr-FR'; u.rate = 1.0
    u.onend = () => { setOrb('idle'); setStatus('Appuyer sur le micro pour parler'); onDone?.() }
    u.onerror = () => { setOrb('idle'); setStatus('Appuyer sur le micro pour parler'); onDone?.() }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }, [isPremium])

  const ask = useCallback(async (text: string) => {
    if (!text.trim()) return
    setOrb('thinking'); setStatus('MediA réfléchit…'); setHint('')
    try {
      const { chat } = await import('@/lib/api')
      const d = await chat.send(text)
      const r = d.reply || 'Désolé, une erreur s\'est produite.'
      setReplyText(r)
      setOrb('speaking'); setStatus('MediA répond…')
      speak(r, () => onResult(text))
    } catch {
      setOrb('idle')
      setStatus('Erreur de connexion')
      setHint('Vérifiez que le serveur MedMap+ est lancé')
    }
  }, [speak, onResult])

  const startRec = async () => {
    setHint(''); setShowText(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (!chunksRef.current.length) { setOrb('idle'); setStatus('Rien capturé — réessayez'); return }
        setOrb('thinking'); setStatus('Transcription en cours…')
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const reader = new FileReader()
        reader.onload = async ev => {
          const b64 = (ev.target?.result as string).split(',')[1]
          try {
            const { chat } = await import('@/lib/api')
            const res = await chat.transcribe(b64, mimeType)
            if (res.transcript?.trim()) { setTranscript(res.transcript); await ask(res.transcript) }
            else { setOrb('idle'); setStatus('Parole non reconnue — réessayez ou tapez ci-dessous'); setShowText(true) }
          } catch {
            // Gemini transcription not available — show text input
            setOrb('idle'); setStatus('Transcription IA non disponible'); setHint('Configurez GEMINI_API_KEY ou utilisez le clavier'); setShowText(true)
          }
        }
        reader.readAsDataURL(blob)
      }
      rec.start(100)
      mediaRef.current = rec
      setIsRec(true); setOrb('listening'); setStatus('MediA vous écoute… appuyez pour envoyer')
    } catch (e: any) {
      const denied = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
      setStatus(denied ? 'Microphone refusé' : 'Microphone non disponible')
      setHint(denied ? 'Autorisez le micro dans le cadenas de la barre d\'adresse Chrome' : 'Vérifiez que votre micro est branché')
      setShowText(true)
    }
  }

  const stopRec = () => {
    mediaRef.current?.stop()
    setIsRec(false)
  }

  const sendText = async () => {
    if (!textInput.trim()) return
    const t = textInput; setTextInput('')
    setTranscript(t); await ask(t)
  }

  useEffect(() => () => { mediaRef.current?.stop(); window.speechSynthesis?.cancel() }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 38%, #072020 0%, #030303 68%)' }}>

      <button onClick={() => { mediaRef.current?.stop(); window.speechSynthesis?.cancel(); onClose() }}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all">
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 mb-10">
        <span className="text-white/30 text-[11px] font-bold tracking-[0.25em] uppercase">MediA</span>
        {isPremium && <span className="text-[9px] bg-yellow-400/8 text-yellow-300/70 px-2 py-0.5 rounded-full border border-yellow-400/15">Premium</span>}
      </div>

      <AIOrb state={orb} size="lg" />

      <motion.p key={status} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        className={`mt-8 text-sm font-medium text-center max-w-xs px-6 ${hint ? 'text-amber-300/70' : 'text-white/40'}`}>
        {status}
      </motion.p>
      {hint && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-[11px] text-white/22 text-center max-w-xs px-8 leading-relaxed">{hint}</motion.p>}

      {transcript && (
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-white/75 text-sm max-w-sm text-center px-8 italic">"{transcript}"</motion.p>
      )}

      <div className="mt-6"><WaveformBars state={orb} /></div>

      {replyText && orb === 'speaking' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 max-w-sm px-6 bg-white/4 rounded-2xl p-4 border border-white/8">
          <p className="text-white/50 text-[11px] leading-relaxed line-clamp-3">{replyText.replace(/\*\*/g, '')}</p>
        </motion.div>
      )}

      <div className="mt-8">
        <button
          onClick={() => { if (isRec) stopRec(); else if (orb === 'idle') startRec() }}
          disabled={orb === 'thinking' || orb === 'speaking'}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl disabled:opacity-30 disabled:cursor-default ${isRec ? 'bg-red-500 shadow-red-500/35' : 'bg-teal-500 hover:bg-teal-400 shadow-teal-500/35 active:scale-95'}`}
        >
          {isRec ? <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 0.75 }}><MicOff className="w-7 h-7 text-white" /></motion.div> : <Mic className="w-7 h-7 text-white" />}
        </button>
      </div>

      <AnimatePresence>
        {showText && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-7 w-full max-w-sm px-6 flex gap-2">
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              placeholder="Tapez votre message…" autoFocus
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-teal-500 transition-colors" />
            <button onClick={sendText} disabled={!textInput.trim() || orb !== 'idle'}
              className="px-4 rounded-xl bg-teal-600 disabled:opacity-40 hover:bg-teal-500 text-white transition-all">
              <Send className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="absolute bottom-5 text-white/12 text-[10px]">MediA ne remplace pas un médecin · SAMU 185</p>
    </motion.div>
  )
}

// ─── Medication Search Widget ─────────────────────────────────────────────────
function MedicationSearchWidget({ initialQuery, onOrder }: { initialQuery?: string; onOrder: (med: any) => void }) {
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async (q: string) => {
    if (!q.trim()) return
    setLoading(true); setSearched(true)
    try {
      const { medicines } = await import('@/lib/api')
      const data = await medicines.search({ search: q, limit: 6 })
      setResults(Array.isArray(data) ? data : [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (initialQuery) search(initialQuery) }, [])

  return (
    <div className="mt-2 bg-zinc-800/60 rounded-2xl border border-zinc-700/60 p-4 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(query)}
            placeholder="Rechercher un médicament…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-700 border border-zinc-600 text-white text-xs placeholder-zinc-500 outline-none focus:border-teal-500 transition-colors" />
        </div>
        <button onClick={() => search(query)} disabled={loading}
          className="px-3 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50">
          {loading ? '…' : 'Chercher'}
        </button>
      </div>
      {searched && !loading && results.length === 0 && (
        <p className="text-zinc-500 text-xs text-center py-2">Aucun médicament trouvé. Essayez un autre nom.</p>
      )}
      {results.map(med => (
        <button key={med.id} onClick={() => onOrder(med)}
          className="w-full flex items-center justify-between p-3 bg-zinc-700/50 hover:bg-zinc-700 rounded-xl transition-all group">
          <div className="text-left min-w-0">
            <p className="text-white text-xs font-semibold truncate group-hover:text-teal-400 transition-colors">{med.nom}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{med.categorie || 'Médicament'}{med.pharmacie_nom ? ` · ${med.pharmacie_nom}` : ''}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-teal-400 text-xs font-bold">{med.prix ? `${med.prix.toLocaleString()} F` : 'Prix NC'}</p>
            <p className="text-zinc-600 text-[9px] mt-0.5">{med.sur_ordonnance ? 'Ordonnance' : 'Sans ordonnance'}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Address storage key ──────────────────────────────────────────────────────
const ADDR_KEY = 'medmap_delivery_addr'
function getSavedAddress(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(ADDR_KEY) || ''
}
function saveAddress(addr: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADDR_KEY, addr)
}

// ─── Order Confirm Widget ─────────────────────────────────────────────────────
function OrderConfirmWidget({
  med, onConfirm, onCancel,
}: {
  med: any
  onConfirm: (pharmacyId: number, pharmacyName: string, address: string) => void
  onCancel: () => void
}) {
  const [pharmList, setPharmList] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pharmLoading, setPharmLoading] = useState(true)
  const [address, setAddress] = useState(getSavedAddress)
  const [addrError, setAddrError] = useState(false)

  useEffect(() => {
    import('@/lib/api').then(({ pharmacies: pharmApi }) => {
      pharmApi.list({ partenaire: true })
        .then(data => {
          const list = Array.isArray(data) ? data : []
          // 24h pharmacies first
          list.sort((a, b) => (b.garde ? 1 : 0) - (a.garde ? 1 : 0))
          setPharmList(list)
          if (list.length) setSelectedId(list[0].id)
        })
        .catch(() => {})
        .finally(() => setPharmLoading(false))
    })
  }, [])

  const selected = pharmList.find(p => p.id === selectedId)

  const handleConfirm = () => {
    if (!address.trim()) { setAddrError(true); return }
    if (!selectedId || !selected) return
    saveAddress(address.trim())
    onConfirm(selectedId, selected.nom, address.trim())
  }

  return (
    <div className="mt-2 bg-zinc-800/60 rounded-2xl border border-zinc-700/60 p-4 space-y-4">
      {/* Medicine summary */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-600/30 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{med.nom}</p>
          <p className="text-zinc-400 text-xs mt-0.5">{med.categorie || 'Médicament'}</p>
          {med.prix && <p className="text-teal-400 font-bold text-sm mt-1">{med.prix.toLocaleString()} FCFA</p>}
        </div>
      </div>

      {/* Delivery address */}
      <div>
        <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
          Adresse de livraison {!getSavedAddress() && <span className="text-amber-400 normal-case font-normal">(mémorisée pour la prochaine commande)</span>}
        </p>
        <input
          value={address}
          onChange={e => { setAddress(e.target.value); setAddrError(false) }}
          placeholder="Ex : Riviera Palmeraie, Rue des Jardins, Apt 12"
          className={`w-full px-3 py-2.5 rounded-xl bg-zinc-700 border text-white text-xs placeholder-zinc-500 outline-none transition-colors ${addrError ? 'border-red-500 focus:border-red-500' : 'border-zinc-600 focus:border-teal-500'}`}
        />
        {addrError && <p className="text-red-400 text-[10px] mt-1">Adresse requise pour la livraison</p>}
        {getSavedAddress() && getSavedAddress() === address && (
          <p className="text-zinc-600 text-[10px] mt-1">Adresse mémorisée · <button onClick={() => { setAddress(''); saveAddress('') }} className="text-zinc-500 hover:text-zinc-300 underline">Modifier</button></p>
        )}
      </div>

      {/* Pharmacy selector */}
      <div>
        <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Pharmacie partenaire</p>
        {pharmLoading ? (
          <p className="text-zinc-500 text-xs py-2">Chargement des pharmacies…</p>
        ) : pharmList.length === 0 ? (
          <p className="text-red-400 text-xs py-2">Aucune pharmacie partenaire disponible.</p>
        ) : (
          <div className="space-y-1.5">
            {pharmList.map(p => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs border transition-all text-left ${
                  selectedId === p.id
                    ? 'bg-teal-600/15 border-teal-500/40 text-white'
                    : 'bg-zinc-700/40 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}>
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${
                  selectedId === p.id ? 'border-teal-400 bg-teal-400' : 'border-zinc-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.nom}</p>
                  {(p.adresse || p.ville) && (
                    <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                      {[p.adresse, p.ville].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {p.garde && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    24h
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-zinc-500 text-[11px]">
        La commande sera visible dans le dashboard de la pharmacie et dans vos <strong className="text-zinc-300">Mes commandes</strong>. Le livreur sera déclenché après confirmation par la pharmacie.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedId || pharmLoading || pharmList.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-bold transition-all">
          <CheckCircle className="w-3.5 h-3.5" /> Commander
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl text-xs transition-all">
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Text renderer ────────────────────────────────────────────────────────────
function renderMd(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <span key={i} className="block h-1.5" />
    const isBullet = /^[•\-\*]\s/.test(line.trim())
    const raw = isBullet ? line.trim().replace(/^[•\-\*]\s/, '') : line
    const parts = raw.split(/(\*\*.*?\*\*)/)
    const rendered = parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j} className="font-semibold text-white/95">{p.slice(2, -2)}</strong>
        : p
    )
    if (isBullet) return (
      <p key={i} className="leading-relaxed text-sm flex gap-2 items-baseline">
        <span className="text-teal-400 flex-shrink-0 text-xs">·</span>
        <span>{rendered}</span>
      </p>
    )
    return <p key={i} className="leading-relaxed text-sm">{rendered}</p>
  })
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypewriterText({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState('')
  const idx = useRef(0)
  useEffect(() => {
    idx.current = 0; setShown('')
    const t = setInterval(() => {
      idx.current = Math.min(idx.current + 7, text.length)
      setShown(text.slice(0, idx.current))
      if (idx.current >= text.length) { clearInterval(t); onDone() }
    }, 14)
    return () => clearInterval(t)
  }, [text])
  return <>{renderMd(shown || '…')}</>
}

// ─── Intent detection ─────────────────────────────────────────────────────────
function detectOrderIntent(msg: string) {
  return /commander|commande|acheter|avoir.*(médicament|comprimé|sirop|antibiotique|doliprane|paracétamol|ibuprofène)|livrer/i.test(msg)
}

function extractMedName(msg: string): string {
  const m = msg.toLowerCase()
  const patterns = [
    /commander (?:du |de la |les? )?([\w\s]+)/i,
    /acheter (?:du |de la |les? )?([\w\s]+)/i,
    /commander ([\w\s]+)/i,
  ]
  for (const p of patterns) {
    const match = m.match(p)
    if (match?.[1]?.trim() && match[1].trim().length > 2) return match[1].trim()
  }
  return ''
}

function detectActions(content: string, userMsg: string) {
  const t = (content + ' ' + userMsg).toLowerCase()
  const a: { label: string; icon: React.ReactNode; href: string }[] = []
  if (t.includes('pharmacie') || t.includes('médicament')) a.push({ label: 'Trouver pharmacie', icon: <Pill className="w-3.5 h-3.5" />, href: '/pharmacies-garde' })
  if (t.includes('rendez') || t.includes('rdv') || t.includes('médecin') || t.includes('consultation')) a.push({ label: 'Prendre un RDV', icon: <Calendar className="w-3.5 h-3.5" />, href: '/appointments' })
  if (t.includes('urgence') || t.includes('samu') || t.includes('danger')) a.push({ label: 'Urgence', icon: <AlertTriangle className="w-3.5 h-3.5" />, href: '/urgence' })
  return a.slice(0, 2)
}

// ─── Sidebar action items ─────────────────────────────────────────────────────
const SIDEBAR_ACTIONS = [
  { id: 'med', label: 'Commander médicament', icon: <Pill className="w-4 h-4" />, color: 'text-teal-400' },
  { id: 'ordonnance', label: 'Importer ordonnance', icon: <FileText className="w-4 h-4" />, color: 'text-sky-400' },
  { id: 'rdv', label: 'Prendre rendez-vous', icon: <Calendar className="w-4 h-4" />, color: 'text-violet-400' },
  { id: 'pharmacie', label: 'Trouver pharmacie', icon: <Search className="w-4 h-4" />, color: 'text-emerald-400' },
  { id: 'urgence', label: 'Urgence médicale', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400' },
  { id: 'suivi', label: 'Suivi traitement', icon: <Stethoscope className="w-4 h-4" />, color: 'text-amber-400' },
  { id: 'animal', label: 'Santé animale', icon: <Dog className="w-4 h-4" />, color: 'text-orange-400' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChatbotPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [voiceMode, setVoiceMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [msgsLeft, setMsgsLeft] = useState<number | null>(null)
  const [limited, setLimited] = useState(false)
  const [subLoading, setSubLoading] = useState(true)
  const [typingId, setTypingId] = useState<string | null>(null)
  const [histGroups, setHistGroups] = useState<{ date: string; items: { id: number; msg: string }[] }[]>([])

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Load history + subscription
  useEffect(() => {
    import('@/lib/api').then(({ chat: chatApi, subscriptions: subApi }) => {
      Promise.all([chatApi.history().catch(() => []), subApi?.status().catch(() => null)])
        .then(([hist, sub]) => {
          if (sub) { setIsPremium(sub.is_premium); setMsgsLeft(sub.messages_left); if (sub.messages_left === 0 && !sub.is_premium) setLimited(true) }
          if (hist?.length) {
            const groups: Record<string, { id: number; msg: string }[]> = {}
            hist.forEach((h: any) => { const d = new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); (groups[d] ??= []).push({ id: h.id, msg: h.message }) })
            setHistGroups(Object.entries(groups).map(([date, items]) => ({ date, items })).reverse())
            const loaded: Message[] = []
            hist.slice(-30).forEach((h: any) => {
              const t = new Date(h.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              loaded.push({ id: `u${h.id}`, role: 'user', content: h.message, time: t })
              loaded.push({ id: `a${h.id}`, role: 'assistant', content: h.response, time: t })
            })
            setMessages(loaded)
          } else {
            setMessages([{ id: 'w0', role: 'assistant', time: ts(), content: `Bonjour${user?.prenom ? ' ' + user.prenom : ''} ! Je suis **MediA**, votre assistante santé intelligente.\n\nJe peux vous aider à :\n- Répondre à vos questions de santé\n- Commander vos médicaments\n- Prendre un rendez-vous\n- Analyser votre ordonnance\n- Gérer une urgence médicale\n\nComment puis-je vous aider aujourd'hui ?` }])
          }
        }).finally(() => setSubLoading(false))
    }).catch(() => setSubLoading(false))
  }, [user])

  const getSugg = (msg: string) => {
    const l = msg.toLowerCase()
    if (l.includes('pharmacie') || l.includes('médicament')) return ['Commander médicament', 'Pharmacie la plus proche']
    if (l.includes('rdv') || l.includes('médecin') || l.includes('rendez')) return ['Médecin généraliste', 'Gynécologie']
    if (l.includes('urgence') || l.includes('samu')) return ['Activer urgence', 'Hôpital proche']
    return ['Prendre RDV', 'Commander médicament']
  }

  const finishTyping = useCallback((msgId: string) => {
    setTypingId(null)
    setMessages(p => p.map(m => m.id === msgId ? { ...m, isTyping: false } : m))
  }, [])

  // Core send function
  const sendMessage = useCallback(async (text: string, skipHistory = false) => {
    if (!text.trim() || loading || limited || typingId) return
    const isOrderIntent = detectOrderIntent(text)
    setMessages(p => [...p, { id: `u${Date.now()}`, role: 'user', content: text, time: ts() }])
    setInput('')
    setLoading(true)

    try {
      const { chat } = await import('@/lib/api')
      const d = await chat.send(text)
      if (d.limit_reached) { setLimited(true); return }
      setIsPremium(d.is_premium)
      if (d.messages_left !== undefined) { setMsgsLeft(d.messages_left); if (d.messages_left === 0 && !d.is_premium) setLimited(true) }
      const reply = d.reply || 'Désolé, une erreur s\'est produite.'
      const mid = `a${Date.now()}`
      const actions = detectActions(reply, text)

      if (isOrderIntent) {
        // Show AI response + inline medication search widget
        const medName = extractMedName(text)
        setMessages(p => [...p,
          { id: mid, role: 'assistant', content: reply, time: ts(), isTyping: true, actions },
          { id: `w${Date.now()}`, role: 'assistant', content: '', time: ts(), widget: 'med-search', widgetData: { query: medName } },
        ])
        setTypingId(mid)
      } else {
        setMessages(p => [...p, { id: mid, role: 'assistant', content: reply, time: ts(), isTyping: true, actions, suggestions: getSugg(text) }])
        setTypingId(mid)
      }
    } catch {
      setMessages(p => [...p, { id: `a${Date.now()}`, role: 'assistant', content: 'Erreur de connexion. Vérifiez que le serveur est lancé.', time: ts() }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [loading, limited, typingId])

  // Medication order confirmation
  const handleOrderMed = useCallback(async (med: any) => {
    // Replace the search widget with a confirm widget
    setMessages(p => p.map(m =>
      m.widget === 'med-search' ? { ...m, widget: 'med-confirm', widgetData: med } : m
    ))
  }, [])

  const handleConfirmOrder = useCallback(async (med: any, pharmacyId: number, pharmacyName: string, address: string) => {
    // Replace confirm widget with a loading state
    setMessages(p => p.map(m =>
      m.widget === 'med-confirm' ? { ...m, widgetData: { ...m.widgetData, _loading: true } } : m
    ))
    try {
      const { pharmacies: pharmApi, wallet: walletApi } = await import('@/lib/api')

      // ── Étape 1 : créer la commande (identique à /pharmacies/:id) ─────────────
      const order = await pharmApi.placeOrder({
        pharmacy_id: pharmacyId,
        items: [{ medicine_id: med.id, quantite: 1 }],
        notes: `Commande MediA — ${med.nom}`,
        adresse_livraison: address,
      })
      const orderId: number = order?.id

      // ── Étape 2 : payer via le portefeuille (séquestre) ───────────────────────
      const montant = order?.montant_total ?? 0
      let paid = false
      if (montant > 0) {
        try {
          await walletApi.pay({
            montant,
            structure_id: pharmacyId,
            description: `Commande médicaments #${orderId} — ${pharmacyName} (MediA)`,
          })
          paid = true
        } catch (payErr: any) {
          // Commande créée mais paiement échoué → avertir, pas bloquer
          setMessages(p => p.map(m =>
            m.widget === 'med-confirm' ? { ...m, widget: 'order-success', widgetData: { med, orderId, pharmacyName, payError: true } } : m
          ))
          setMessages(p => [...p, {
            id: `a${Date.now()}`,
            role: 'assistant' as const,
            content: `**Commande créée** (#${orderId}) mais le paiement a échoué.\n\n**Raison :** ${payErr?.message || 'Solde insuffisant'}\n\nRechargez votre portefeuille pour que la pharmacie puisse traiter votre commande.`,
            time: ts(),
            actions: [
              { label: 'Recharger le portefeuille', icon: <Wallet className="w-3.5 h-3.5" />, href: '/portefeuille' },
              { label: 'Voir la commande', icon: <Package className="w-3.5 h-3.5" />, href: `/commande?new=${orderId}` },
            ],
          }])
          return
        }
      }

      // ── Succès complet ─────────────────────────────────────────────────────────
      setMessages(p => p.map(m =>
        m.widget === 'med-confirm'
          ? { ...m, widget: 'order-success', widgetData: { med, orderId, pharmacyName, paid } }
          : m
      ))
      setMessages(p => [...p, {
        id: `a${Date.now()}`,
        role: 'assistant' as const,
        content: `**Commande confirmée !** 🎉\n\n- Médicament : ${med.nom}\n- Pharmacie : **${pharmacyName}**\n- Adresse : ${address}\n- Commande : **#${orderId}**\n- Paiement : ${paid ? '✓ En séquestre (libéré à la livraison)' : 'NC'}\n\nLa pharmacie a reçu la notification. Vous pouvez suivre votre livraison **en temps réel** ci-dessous.`,
        time: ts(),
        actions: [
          { label: 'Suivre la livraison en direct', icon: <Truck className="w-3.5 h-3.5" />, href: `/commande?new=${orderId}` },
        ],
      }])

      // Redirection automatique vers le suivi après 2 secondes
      setTimeout(() => router.push(`/commande?new=${orderId}`), 2500)

    } catch (err: any) {
      setMessages(p => p.map(m =>
        m.widget === 'med-confirm' ? { ...m, widgetData: { ...m.widgetData, _loading: false } } : m
      ))
      const msg = err?.message?.includes('Pharmacie introuvable')
        ? 'Pharmacie introuvable. Sélectionnez une autre pharmacie.'
        : `Erreur lors de la commande : ${err?.message || 'Réessayez.'}`
      setMessages(p => [...p, { id: `a${Date.now()}`, role: 'assistant' as const, content: msg, time: ts() }])
    }
  }, [router])

  // File upload (prescription)
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string
      setMessages(p => [...p, { id: `u${Date.now()}`, role: 'user', content: `Ordonnance importée : ${f.name}`, time: ts(), imagePreview: dataUrl }])
      setLoading(true)
      try {
        const { chat } = await import('@/lib/api')
        const data = await chat.analyzePrescription(dataUrl.split(',')[1], f.type)
        const analysis = data.analysis || 'Impossible d\'analyser.'
        const mid = `a${Date.now()}`
        setMessages(p => [...p,
          { id: mid, role: 'assistant', content: analysis, time: ts(), isTyping: true },
          { id: `w${Date.now()}`, role: 'assistant', content: '', time: ts(), widget: 'med-search', widgetData: { query: '' } },
        ])
        setTypingId(mid)
      } catch {
        setMessages(p => [...p, { id: `a${Date.now()}`, role: 'assistant', content: 'Analyse impossible. Configurez la clé Gemini ou consultez un pharmacien.', time: ts() }])
      } finally { setLoading(false); setUploading(false) }
    }
    reader.readAsDataURL(f)
  }

  // Sidebar action handler
  const handleSidebarAction = (id: string) => {
    setSidebarOpen(false)
    if (id === 'med') { setMessages(p => [...p, { id: `u${Date.now()}`, role: 'user', content: 'Commander un médicament', time: ts() }, { id: `a${Date.now()}`, role: 'assistant', content: 'Quel médicament souhaitez-vous commander ?', time: ts() }, { id: `w${Date.now()}`, role: 'assistant', content: '', time: ts(), widget: 'med-search', widgetData: { query: '' } }]); return }
    if (id === 'ordonnance') { fileRef.current?.click(); return }
    const msgs: Record<string, string> = {
      rdv: 'Je voudrais prendre un rendez-vous médical',
      pharmacie: 'Trouver une pharmacie de garde proche de moi',
      urgence: 'J\'ai une urgence médicale',
      suivi: 'Voir mon suivi de traitement et mes rappels',
      animal: 'Santé animale — j\'ai une question pour mon animal',
    }
    if (msgs[id]) sendMessage(msgs[id])
  }

  const upgradePremium = async () => {
    try {
      const { subscriptions: s } = await import('@/lib/api')
      await s.upgrade({ plan: 'premium', duree_mois: 1 })
      setIsPremium(true); setLimited(false); setMsgsLeft(null)
      setMessages(p => [...p, { id: `a${Date.now()}`, role: 'assistant', content: '**Bienvenue dans MediA Premium !**\n\n- Messages illimités\n- Mode vocal IA (micro + réponse vocale)\n- Analyse d\'ordonnances\n- Réponses personnalisées', time: ts() }])
    } catch { alert('Erreur activation Premium. Vérifiez votre solde.') }
  }

  const busy = loading || uploading
  const canSend = !busy && !limited && !typingId

  const QUICK_CARDS = [
    { emoji: '🏪', label: 'Pharmacie de garde', sub: 'Trouver une pharmacie ouverte' },
    { emoji: '💊', label: 'Commander médicament', sub: 'Livraison à domicile' },
    { emoji: '📅', label: 'Prendre un RDV', sub: 'Consulter un médecin' },
    { emoji: '🚨', label: 'Urgence médicale', sub: 'Assistance immédiate' },
  ]

  return (
    <>
      <Navbar />

      <AnimatePresence>
        {voiceMode && <VoiceOverlay onClose={() => setVoiceMode(false)} isPremium={isPremium} onResult={text => { sendMessage(text); setVoiceMode(false) }} />}
      </AnimatePresence>

      <div className="flex h-screen pt-16 bg-zinc-950 overflow-hidden">

        {sidebarOpen && <div className="fixed inset-0 bg-black/55 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 pt-16 lg:pt-0 bg-zinc-900 border-r border-zinc-800/70 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">MediA</p>
                <p className="text-zinc-500 text-[11px] mt-0.5">Assistante santé IA</p>
              </div>
              {isPremium && <span className="ml-auto text-[9px] bg-yellow-400/8 text-yellow-400 border border-yellow-400/18 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-yellow-400" /> Pro</span>}
            </div>
            <button onClick={() => { setMessages([]); setSidebarOpen(false) }}
              className="w-full flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all">
              <Plus className="w-3.5 h-3.5" /> Nouvelle conversation
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-3 py-3 border-b border-zinc-800/70">
            <p className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider px-1 mb-2">Actions rapides</p>
            {SIDEBAR_ACTIONS.map(a => (
              <button key={a.id} onClick={() => handleSidebarAction(a.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-all">
                <span className={a.color}>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            {histGroups.length ? histGroups.map(g => (
              <div key={g.date} className="mb-3">
                <p className="text-zinc-700 text-[9px] font-bold uppercase tracking-wider px-1 mb-1.5">{g.date}</p>
                {g.items.slice(0, 4).map(item => (
                  <button key={item.id} className="w-full text-left px-3 py-2 rounded-xl text-zinc-600 hover:text-white hover:bg-zinc-800 text-[11px] transition-all flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.msg}</span>
                  </button>
                ))}
              </div>
            )) : (
              <div className="text-center py-8"><p className="text-zinc-700 text-xs">Aucune conversation</p></div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm flex-shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
              <Menu className="w-4 h-4" />
            </button>
            <AIOrb state={busy ? 'thinking' : 'idle'} size="sm" />
            <div>
              <p className="text-white text-sm font-bold leading-none">MediA</p>
              <p className="text-zinc-500 text-[10px] mt-0.5">{busy ? 'Réfléchit…' : 'En ligne'}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isPremium && (
                <button onClick={() => setVoiceMode(true)}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all">
                  <Mic className="w-3.5 h-3.5 text-teal-400" /> Mode vocal
                </button>
              )}
              {!isPremium && !subLoading && (
                <button onClick={upgradePremium}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 shadow-lg shadow-amber-500/18 transition-all">
                  <Zap className="w-3.5 h-3.5" /> Premium
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 min-h-0">
            {messages.length <= 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="grid grid-cols-2 gap-2 max-w-lg mx-auto mb-4">
                {QUICK_CARDS.map(c => (
                  <button key={c.label} onClick={() => sendMessage(c.label)} disabled={!canSend}
                    className="text-left p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all group disabled:opacity-40">
                    <div className="text-xl mb-2">{c.emoji}</div>
                    <p className="text-white text-xs font-semibold group-hover:text-teal-400 transition-colors">{c.label}</p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">{c.sub}</p>
                  </button>
                ))}
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map(msg => {
                // Widget-only messages (no text content)
                if (msg.widget) {
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
                      {msg.widget === 'med-search' && (
                        <MedicationSearchWidget initialQuery={msg.widgetData?.query} onOrder={handleOrderMed} />
                      )}
                      {msg.widget === 'med-confirm' && msg.widgetData && (
                        <OrderConfirmWidget med={msg.widgetData}
                          onConfirm={(pharmacyId, pharmacyName, address) => handleConfirmOrder(msg.widgetData, pharmacyId, pharmacyName, address)}
                          onCancel={() => setMessages(p => p.map(m => m.id === msg.id ? { ...m, widget: 'med-search', widgetData: { query: '' } } : m))} />
                      )}
                      {msg.widget === 'order-success' && (
                        <div className={`rounded-2xl p-4 border ${msg.widgetData?.payError ? 'bg-amber-900/20 border-amber-700/30' : 'bg-teal-900/30 border-teal-700/40'}`}>
                          <div className="flex items-start gap-3">
                            <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${msg.widgetData?.payError ? 'text-amber-400' : 'text-teal-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm ${msg.widgetData?.payError ? 'text-amber-300' : 'text-teal-300'}`}>
                                {msg.widgetData?.payError ? 'Commande créée (paiement à régler)' : `Commande envoyée à ${msg.widgetData?.pharmacyName || 'la pharmacie'}`}
                              </p>
                              <p className="text-zinc-400 text-xs mt-1">
                                {msg.widgetData?.orderId ? <><strong className="text-zinc-300">#{msg.widgetData.orderId}</strong> · </> : ''}
                                {msg.widgetData?.med?.nom}
                              </p>
                              {msg.widgetData?.orderId && (
                                <a href={`/commande?new=${msg.widgetData.orderId}`}
                                  className="inline-flex items-center gap-1.5 mt-2 text-[11px] bg-teal-600/20 hover:bg-teal-600 text-teal-400 hover:text-white border border-teal-600/30 px-3 py-1.5 rounded-xl transition-all font-medium">
                                  <Truck className="w-3.5 h-3.5" /> Suivre la livraison en direct <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                }

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse max-w-2xl ml-auto' : 'max-w-2xl'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-teal-400 to-cyan-500 shadow-md shadow-teal-500/18' : 'bg-zinc-700'}`}>
                      {msg.role === 'assistant' ? <Heart className="w-4 h-4 text-white fill-white" /> : <User className="w-4 h-4 text-zinc-300" />}
                    </div>
                    <div className={`flex flex-col gap-1.5 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.imagePreview && <div className="rounded-2xl overflow-hidden border border-zinc-700 max-w-[160px]"><img src={msg.imagePreview} alt="Ordonnance" className="w-full object-cover" /></div>}
                      <div className={`px-4 py-3 rounded-2xl max-w-md ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                        {msg.isTyping && msg.id === typingId
                          ? <TypewriterText text={msg.content} onDone={() => finishTyping(msg.id)} />
                          : renderMd(msg.content)
                        }
                      </div>
                      <span className="text-[10px] text-zinc-700 px-1">{msg.time}</span>
                      {!msg.isTyping && msg.suggestions && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map(s => (
                            <button key={s} onClick={() => sendMessage(s)} disabled={!canSend}
                              className="text-[11px] bg-zinc-800 hover:bg-teal-600 text-zinc-400 hover:text-white border border-zinc-700 hover:border-teal-600 px-3 py-1.5 rounded-full transition-all disabled:opacity-40 font-medium">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {!msg.isTyping && msg.actions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {msg.actions.map((a, i) => (
                            <a key={i} href={a.href}
                              className="flex items-center gap-1.5 text-[11px] bg-teal-500/8 hover:bg-teal-600 text-teal-400 hover:text-white border border-teal-500/22 hover:border-teal-600 px-3 py-2 rounded-xl transition-all font-medium">
                              {a.icon} {a.label} <ChevronRight className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )
              })}

              {busy && (
                <motion.div key="thinking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-2xl">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/18 mt-0.5 flex-shrink-0">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-5 py-4">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-1.5 h-1.5 bg-teal-500 rounded-full"
                          animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.18 }} />
                      ))}
                      <span className="text-[11px] text-zinc-600 ml-2">{uploading ? 'Analyse ordonnance…' : 'MediA réfléchit…'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {/* Limit banner */}
          {limited && !isPremium && (
            <div className="mx-4 mb-3 p-4 bg-violet-900/25 border border-violet-700/30 rounded-2xl flex items-center gap-3 flex-shrink-0">
              <Lock className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-violet-200">Limite MediA Basic atteinte</p>
                <p className="text-xs text-violet-400 mt-0.5">20 messages/jour. Premium = illimité + vocal + ordonnances.</p>
              </div>
              <button onClick={upgradePremium} className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 whitespace-nowrap">
                <Zap className="w-3.5 h-3.5" /> 2 900 F
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-zinc-800/50 bg-zinc-950 flex-shrink-0">
            {!isPremium && msgsLeft !== null && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.max(4, ((msgsLeft ?? 0) / 20) * 100)}%` }} />
                </div>
                <span className="text-zinc-700 text-[10px]">{msgsLeft}/20</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <button onClick={() => fileRef.current?.click()} disabled={!canSend} title="Importer ordonnance"
                className="w-11 h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-teal-400 transition-all disabled:opacity-40 flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && canSend && sendMessage(input)}
                placeholder={limited ? 'Passez à Premium pour continuer…' : 'Posez votre question de santé…'}
                disabled={limited}
                className="flex-1 px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/22 outline-none text-white text-sm placeholder-zinc-600 disabled:opacity-40 transition-all" />
              {isPremium && (
                <button onClick={() => setVoiceMode(true)} title="Mode vocal"
                  className="w-11 h-11 rounded-2xl bg-zinc-800 hover:bg-teal-600/18 border border-zinc-700 hover:border-teal-600/40 flex items-center justify-center text-zinc-500 hover:text-teal-400 transition-all flex-shrink-0">
                  <Mic className="w-4 h-4" />
                </button>
              )}
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || !canSend}
                className="w-11 h-11 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/14 disabled:shadow-none transition-all flex-shrink-0">
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
            <p className="text-center text-[10px] text-zinc-700 mt-2.5">
              MediA ne remplace pas un médecin · Urgence : <a href="tel:185" className="text-red-500 font-bold">SAMU 185</a>
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
