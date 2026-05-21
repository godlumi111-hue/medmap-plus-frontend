import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function connectSocket(userId: number) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    s.once('connect', () => {
      s.emit('join', userId)
    })
    if (s.connected) {
      s.emit('join', userId)
    }
  } else {
    s.emit('join', userId)
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function joinConversation(conversationId: number) {
  getSocket().emit('join:conversation', conversationId)
}

export function leaveConversation(conversationId: number) {
  getSocket().emit('leave:conversation', conversationId)
}
