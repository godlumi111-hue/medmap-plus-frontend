'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { notifs } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import {
  Bell, CheckCheck, Package, Calendar, MessageCircle,
  AlertCircle, Loader2, Trash2, ChevronLeft,
} from 'lucide-react'

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  order_new:            { icon: <Package className="w-5 h-5" />, bg: 'bg-teal-100 text-teal-600',     label: 'Commande' },
  order_confirme:       { icon: <Package className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600', label: 'Commande' },
  order_en_preparation: { icon: <Package className="w-5 h-5" />, bg: 'bg-amber-100 text-amber-600',   label: 'Commande' },
  order_en_route:       { icon: <Package className="w-5 h-5" />, bg: 'bg-blue-100 text-blue-600',     label: 'Livraison' },
  order_livre:          { icon: <Package className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600', label: 'Livraison' },
  order_annule:         { icon: <Package className="w-5 h-5" />, bg: 'bg-red-100 text-red-500',        label: 'Commande' },
  appointment_new:      { icon: <Calendar className="w-5 h-5" />, bg: 'bg-sky-100 text-sky-600',      label: 'Rendez-vous' },
  appointment_confirme: { icon: <Calendar className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600', label: 'Rendez-vous' },
  appointment_refuse:   { icon: <Calendar className="w-5 h-5" />, bg: 'bg-red-100 text-red-500',      label: 'Rendez-vous' },
  appointment_annule:   { icon: <Calendar className="w-5 h-5" />, bg: 'bg-gray-100 text-gray-500',    label: 'Rendez-vous' },
  appointment_termine:  { icon: <Calendar className="w-5 h-5" />, bg: 'bg-teal-100 text-teal-600',    label: 'Rendez-vous' },
  message:              { icon: <MessageCircle className="w-5 h-5" />, bg: 'bg-violet-100 text-violet-600', label: 'Message' },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'À l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

function groupByDate(items: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  for (const n of items) {
    const date = new Date(n.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let key: string
    if (date.toDateString() === today.toDateString()) key = 'Aujourd\'hui'
    else if (date.toDateString() === yesterday.toDateString()) key = 'Hier'
    else key = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }
  return groups
}

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notifs.list().then(setItems).catch(() => {}).finally(() => setLoading(false))

    const socket = getSocket()
    socket.on('notification:new', (n: any) => {
      setItems(prev => [{ ...n, id: Date.now(), created_at: new Date().toISOString(), read: false }, ...prev])
    })
    return () => { socket.off('notification:new') }
  }, [])

  function markRead(id: number) {
    notifs.markRead(id).then(() => {
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }).catch(() => {})
  }

  function markAllRead() {
    notifs.markAllRead().then(() => {
      setItems(prev => prev.map(n => ({ ...n, read: true })))
    }).catch(() => {})
  }

  const unreadCount = items.filter(n => !n.read).length
  const groups = groupByDate(items)

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                <CheckCheck className="w-4 h-4" /> Tout marquer lu
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-semibold text-gray-500 mb-2">Aucune notification</p>
              <p className="text-sm text-gray-400">Vos notifications apparaîtront ici</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([dateLabel, groupItems]) => (
                <div key={dateLabel}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{dateLabel}</p>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {groupItems.map((n, i) => {
                        const cfg = TYPE_CONFIG[n.type] ?? { icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-gray-100 text-gray-500', label: 'Notification' }
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => !n.read && markRead(n.id)}
                            className={`flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                              n.read
                                ? 'bg-white border-gray-100 hover:border-gray-200'
                                : 'bg-blue-50/60 border-blue-100 hover:border-blue-200'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                              {cfg.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                                  <p className={`text-sm leading-snug mt-0.5 ${n.read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                                    {n.title}
                                  </p>
                                  {n.body && (
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                                  )}
                                </div>
                                {!n.read && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
