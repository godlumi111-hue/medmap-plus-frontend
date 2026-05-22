'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { auth, saveToken, saveUser, clearToken, getStoredUser, UserOut } from './api'

interface AuthContextType {
  user: UserOut | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserOut>
  register: (data: {
    email: string
    password: string
    nom: string
    prenom: string
    telephone?: string
    role: string
  }) => Promise<UserOut>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const ROLE_REDIRECTS: Record<string, string> = {
  patient: '/dashboard/patient',
  medecin: '/dashboard/medecin',
  coach: '/dashboard/coach',
  pharmacie: '/dashboard/pharmacie',
  clinique: '/dashboard/clinique',
  veterinaire: '/dashboard/veterinaire',
  admin: '/dashboard/admin',
  livreur: '/dashboard/livreur',
  samu: '/dashboard/samu',
  pompiers: '/dashboard/pompiers',
  ambulance: '/dashboard/ambulance',
}

// Keep a cookie in sync with the stored role so middleware can redirect server-side
function setRoleCookie(role: string) {
  document.cookie = `medmap_role=${role}; path=/; max-age=604800; SameSite=Strict`
}
function clearRoleCookie() {
  document.cookie = 'medmap_role=; path=/; max-age=0; SameSite=Strict'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) {
      setUser(stored)
      setRoleCookie(stored.role)
    }
    setLoading(false)

    // Sync auth state when another tab logs in/out
    function onStorage(e: StorageEvent) {
      if (e.key === 'medmap_user') {
        if (e.newValue) {
          try {
            const u = JSON.parse(e.newValue)
            setUser(u)
            setRoleCookie(u.role)
          } catch {}
        } else {
          setUser(null)
          clearRoleCookie()
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<UserOut> => {
    const response = await auth.login(email, password)
    saveToken(response.access_token)
    saveUser(response.user)
    setRoleCookie(response.user.role)
    setUser(response.user)
    return response.user
  }, [])

  const register = useCallback(async (data: {
    email: string
    password: string
    nom: string
    prenom: string
    telephone?: string
    role: string
  }): Promise<UserOut> => {
    const response = await auth.register(data)
    saveToken(response.access_token)
    saveUser(response.user)
    setRoleCookie(response.user.role)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(() => {
    clearToken()
    clearRoleCookie()
    setUser(null)
    window.location.href = '/'
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function getDashboardRoute(role: string): string {
  return ROLE_REDIRECTS[role] || '/dashboard/patient'
}
