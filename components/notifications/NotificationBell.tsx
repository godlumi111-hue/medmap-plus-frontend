'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Package, Calendar, MessageCircle, AlertCircle, X } from 'lucide-react'
import { notifs } from '@/lib/api'
import { getSocket } from '@/lib/socket'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order_new:            <Package className="w-4 h-4 text-teal-600" />,
  order_confirme:       <Package className="w-4 h-4 text-emerald-600" />,
  order_en_preparation: <Package className="w-4 h-4 text-amber-600" />,
  order_en_route:       <Package className="w-4 h-4 text-blue-600" />,
  order_livre:          <Package className="w-4 h-4 text-emerald-600" />,
  order_annule:         <Package className="w-4 h-4 text-red-500" />,
  appointment_new:      <Calendar className="w-4 h-4 text-sky-600" />,
  appointment_confirme: <Calendar className="w-4 h-4 text-emerald-600" />,
  appointment_refuse:   <Calendar className="w-4 h-4 text-red-500" />,
  appointment_annule:   <Calendar className="w-4 h-4 text-red-500" />,
  appointment_termine:  <Calendar className="w-4 h-4 text-gray-500" />,
  message:              <MessageCircle className="w-4 h-4 text-violet-600" />,
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'À l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  function load() {
    notifs.list().then(setItems).catch(() => {})
    notifs.unreadCount().then(r => setUnread(r.count)).catch(() => {})
  }

  useEffect(() => {
    load()
    const socket = getSocket()
    socket.on('notification:new', (n: any) => {
      setItems(prev => [{ ...n, id: Date.now(), created_at: new Date().toISOString(), read: false }, ...prev])
      setUnread(c => c + 1)
    })
    return () => { socket.off('notification:new') }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    setOpen(v => !v)
  }

  function markAllRead() {
    notifs.markAllRead().then(() => {
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    }).catch(() => {})
  }

  function markOne(id: number) {
    notifs.markRead(id).then(() => {
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnread(c => Math.max(0, c - 1))
    }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="font-bold text-gray-900 text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Tout lire
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400 font-medium">Aucune notification</p>
                </div>
              ) : (
                items.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markOne(n.id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[n.type] ?? <AlertCircle className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
