interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'
  size?: 'sm' | 'md'
}

const variants = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-600 border-red-200',
  info: 'bg-sky/10 text-sky border-sky/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  neutral: 'bg-bone text-slate border-bone',
}

export default function Badge({ children, variant = 'neutral', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-semibold ${variants[variant]} ${
      size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
    }`}>
      {children}
    </span>
  )
}
