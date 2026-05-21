'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  color?: 'primary' | 'sky' | 'coral' | 'mint' | 'purple' | 'orange'
  trend?: { value: number; label: string }
  delay?: number
}

const colorMap = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  sky: { bg: 'bg-sky/10', text: 'text-sky', gradient: 'from-sky/20 to-sky/5' },
  coral: { bg: 'bg-coral/10', text: 'text-coral', gradient: 'from-coral/20 to-coral/5' },
  mint: { bg: 'bg-mint/10', text: 'text-mint', gradient: 'from-mint/20 to-mint/5' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-100 to-purple-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-100 to-orange-50' },
}

export default function StatCard({ title, value, subtitle, icon, color = 'primary', trend, delay = 0 }: StatCardProps) {
  const c = colorMap[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-2xl p-5 border border-bone shadow-sm hover:shadow-md transition-all card-hover"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
          <span className={c.text}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend.value >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          }`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-ink" style={{ fontFamily: 'Sora' }}>{value}</p>
        <p className="text-sm font-medium text-ink mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  )
}
