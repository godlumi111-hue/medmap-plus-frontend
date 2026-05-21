'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, MessageCircle, AlertCircle } from 'lucide-react'
import { messaging } from '@/lib/api'
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: number
  otherUserId: number
  otherUserName: string
  contextType?: 'order' | 'appointment' | 'general'
  contextId?: number
  contextLabel?: string
}

export default function ConversationPanel({
  isOpen, onClose, currentUserId, otherUserId, otherUserName,
  contextType = 'general', contextId, contextLabel,
}: Props) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load or create conversation when panel opens
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    messaging.createConversation(otherUserId, contextType, contextId)
      .then(conv => {
        setConversationId(conv.id)
        return messaging.messages(conv.id)
      })
      .then(msgs => {
        setMessages(msgs)
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      })
      .catch(() => {
        setError('Impossible de charger la conversation')
        setLoading(false)
      })
  }, [isOpen, otherUserId, contextType, contextId])

  // Socket.io — real-time incoming messages
  useEffect(() => {
    if (!isOpen || !conversationId) return
    joinConversation(conversationId)
    const socket = getSocket()

    function handleNew(data: any) {
      if (data.conversation_id === conversationId && data.message.sender_id !== currentUserId) {
        setMessages(prev => [...prev, data.message])
      }
    }
    socket.on('message:new', handleNew)

    return () => {
      socket.off('message:new', handleNew)
      leaveConversation(conversationId)
    }
  }, [isOpen, conversationId, currentUserId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !conversationId || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update
    const optimistic = {
      id: Date.now(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      nom: '', prenom: '', role: '',
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const sent = await messaging.send(conversationId, content)
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 flex flex-col bg-white shadow-2xl border-l border-gray-100"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-sky-500">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{otherUserName}</p>
              {contextLabel && (
                <p className="text-white/70 text-xs truncate">{contextLabel}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <MessageCircle className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-semibold text-gray-400">Démarrez la conversation</p>
                <p className="text-xs text-gray-300">Envoyez un message à {otherUserName}</p>
              </div>
            ) : (
              <>
                {messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        isMine
                          ? 'bg-teal-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <form
              onSubmit={e => { e.preventDefault(); handleSend() }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Écrire un message..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
