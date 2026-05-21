'use client'
import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, MapPin, Users, Flame } from 'lucide-react'

export interface EmergencyAlert {
  id: number
  type: string
  description?: string
  nb_victimes?: number
  feu?: boolean | number
  gravite?: string
  lat?: number
  lng?: number
  adresse?: string
  created_at?: string
}

interface AlarmOverlayProps {
  alert: EmergencyAlert | null
  onAccept: (id: number) => void
  onDismiss: () => void
  loading?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  incendie: 'INCENDIE',
  accident_grave: 'ACCIDENT GRAVE',
  explosion: 'EXPLOSION',
  malaise_collectif: 'MALAISE COLLECTIF',
  catastrophe: 'CATASTROPHE',
  animal_dangereux: 'ANIMAL DANGEREUX',
  effondrement: 'BÂTIMENT EFFONDRÉ',
  urgence_medicale: 'URGENCE MÉDICALE',
  autre: 'URGENCE MAJEURE',
}

const TYPE_ICONS: Record<string, string> = {
  incendie: '🔥',
  accident_grave: '🚗',
  explosion: '💥',
  malaise_collectif: '😷',
  catastrophe: '🌊',
  animal_dangereux: '🐯',
  effondrement: '🏚',
  urgence_medicale: '🏥',
  autre: '🆘',
}

// ── Web Audio Siren ───────────────────────────────────────────────────────────
function useSiren(active: boolean) {
  const ctxRef  = useRef<AudioContext | null>(null)
  const oscRef  = useRef<OscillatorNode | null>(null)
  const lfoRef  = useRef<OscillatorNode | null>(null)
  const stopRef = useRef(false)

  useEffect(() => {
    if (!active) {
      stopSiren()
      return
    }
    stopRef.current = false
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = ctx

      const gain = ctx.createGain()
      gain.gain.value = 0.18
      gain.connect(ctx.destination)

      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 700
      osc.connect(gain)
      oscRef.current = osc

      // LFO sweeps the frequency up and down like a real siren
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 1.2
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 250
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfoRef.current = lfo

      lfo.start()
      osc.start()
    } catch {}

    return () => stopSiren()
  }, [active])

  function stopSiren() {
    try { oscRef.current?.stop() } catch {}
    try { lfoRef.current?.stop() } catch {}
    try { ctxRef.current?.close() } catch {}
    ctxRef.current = null
    oscRef.current = null
    lfoRef.current = null
  }
}

export default function AlarmOverlay({ alert, onAccept, onDismiss, loading }: AlarmOverlayProps) {
  const [elapsed, setElapsed] = useState(0)
  useSiren(!!alert)

  useEffect(() => {
    if (!alert) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [alert])

  if (!alert) return null

  const typeLabel = TYPE_LABELS[alert.type] || 'URGENCE MAJEURE'
  const typeIcon  = TYPE_ICONS[alert.type] || '🆘'
  const fmtElapsed = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Pulsing red background */}
      <div
        className="absolute inset-0 bg-red-900"
        style={{ animation: 'alarm-pulse 0.6s ease-in-out infinite alternate' }}
      />
      <style>{`
        @keyframes alarm-pulse {
          from { background-color: #7f1d1d; }
          to   { background-color: #991b1b; }
        }
        @keyframes alarm-flash {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes alarm-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      `}</style>

      {/* Diagonal red stripes overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, #fff 0, #fff 10px, transparent 10px, transparent 30px)',
        }}
      />

      {/* Content card */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 bg-red-950 border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'alarm-shake 0.5s ease-in-out infinite' }}
      >
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl"
              style={{ animation: 'alarm-flash 0.6s step-start infinite' }}
            >
              {typeIcon}
            </div>
            <div>
              <p
                className="text-white font-black text-xl tracking-widest"
                style={{ animation: 'alarm-flash 0.6s step-start infinite' }}
              >
                🚨 ALERTE URGENCE
              </p>
              <p className="text-red-200 text-sm font-bold">{typeLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-red-200 text-xs font-mono">EN ATTENTE</p>
            <p className="text-white font-black text-2xl font-mono">{fmtElapsed}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-900/60 rounded-xl p-3 text-center border border-red-700/50">
              <Users className="w-5 h-5 text-red-300 mx-auto mb-1" />
              <p className="text-white font-black text-xl">{alert.nb_victimes || '?'}</p>
              <p className="text-red-300 text-xs">Victimes</p>
            </div>
            <div className="bg-red-900/60 rounded-xl p-3 text-center border border-red-700/50">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className={`font-black text-xl ${alert.feu ? 'text-orange-400' : 'text-red-400'}`}>
                {alert.feu ? 'OUI' : 'NON'}
              </p>
              <p className="text-red-300 text-xs">Incendie</p>
            </div>
            <div className="bg-red-900/60 rounded-xl p-3 text-center border border-red-700/50">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-yellow-300 font-black text-lg uppercase">{alert.gravite || 'CRITIQUE'}</p>
              <p className="text-red-300 text-xs">Gravité</p>
            </div>
          </div>

          {/* Location */}
          {alert.adresse && (
            <div className="flex items-start gap-2 bg-red-900/40 rounded-xl px-4 py-3 border border-red-700/40">
              <MapPin className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
              <p className="text-red-100 text-sm">{alert.adresse}</p>
            </div>
          )}
          {alert.lat && (
            <div className="flex items-center gap-2 bg-red-900/40 rounded-xl px-4 py-2 border border-red-700/40">
              <span className="text-xs text-red-300 font-mono">GPS</span>
              <span className="text-red-100 text-xs font-mono">{Number(alert.lat).toFixed(5)}, {Number(alert.lng).toFixed(5)}</span>
            </div>
          )}
          {alert.description && (
            <p className="text-red-100 text-sm bg-red-900/40 rounded-xl px-4 py-3 border border-red-700/40">
              {alert.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => onAccept(alert.id)}
            disabled={loading}
            className="flex-1 py-4 rounded-xl bg-white text-red-700 font-black text-lg hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle className="w-6 h-6" />
            ACCEPTER LA MISSION
          </button>
          <button
            onClick={onDismiss}
            className="w-14 py-4 rounded-xl bg-red-800/60 text-red-200 hover:bg-red-800 transition-all flex items-center justify-center border border-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
