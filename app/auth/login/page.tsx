'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, Eye, EyeOff, Phone, Mail, ArrowRight, ArrowLeft, Shield } from 'lucide-react'
import { useAuth, getDashboardRoute } from '@/lib/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      router.push(getDashboardRoute(user.role))
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aqua/30 via-white to-sky/10 flex items-center justify-center p-4">
      {/* Back to home */}
      <Link href="/" className="fixed top-4 left-4 z-50 flex items-center gap-2 text-sm font-medium text-slate hover:text-primary bg-white/80 backdrop-blur-sm border border-bone px-3 py-2 rounded-xl shadow-sm transition-all hover:border-primary/30">
        <ArrowLeft className="w-4 h-4" />
        Accueil
      </Link>

      {/* Background blobs */}
      <div className="fixed top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-sky/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-bone overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-sky p-8 text-white text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 fill-white text-white" />
              </div>
              <span className="text-2xl font-bold" style={{ fontFamily: 'Sora' }}>MedMap+</span>
            </Link>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora' }}>Bon retour !</h1>
            <p className="text-white/70 text-sm">Connectez-vous à votre espace santé</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {/* Login type toggle */}
            <div className="flex bg-bone rounded-xl p-1 mb-6">
              <button
                onClick={() => setLoginType('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  loginType === 'email' ? 'bg-white shadow text-primary' : 'text-slate'
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => setLoginType('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  loginType === 'phone' ? 'bg-white shadow text-primary' : 'text-slate'
                }`}
              >
                <Phone className="w-4 h-4" /> Téléphone
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email or Phone */}
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  {loginType === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate">
                    {loginType === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </span>
                  <input
                    type={loginType === 'email' ? 'email' : 'tel'}
                    value={loginType === 'email' ? email : email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder={loginType === 'email' ? 'votre@email.com' : '+225 07 XX XX XX XX'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-bone focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/auth/register" className="text-xs text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-primary to-sky text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Se connecter <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-bone" />
              <span className="text-xs text-slate">ou continuer avec</span>
              <div className="flex-1 h-px bg-bone" />
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-2.5 border border-bone rounded-xl text-sm font-medium hover:bg-bone transition-all">
                <span className="text-lg">🟠</span> Orange Money
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border border-bone rounded-xl text-sm font-medium hover:bg-bone transition-all">
                <span className="text-lg">🌐</span> Google
              </button>
            </div>

            <p className="text-center text-sm text-slate mt-6">
              Pas encore inscrit ?{' '}
              <Link href="/auth/register" className="text-primary font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate/60">
              <Shield className="w-3 h-3" />
              Connexion sécurisée SSL 256-bit
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
