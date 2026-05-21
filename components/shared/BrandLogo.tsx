'use client'
import Link from 'next/link'
import { Heart } from 'lucide-react'

interface BrandLogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  white?: boolean
}

export default function BrandLogo({ href = '/', size = 'md', white = false }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9'
  const heartSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl'

  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-primary to-sky flex items-center justify-center shadow-sm`}>
        <Heart className={`${heartSize} text-white fill-white`} />
      </div>
      <span className={`${textSize} font-bold`} style={{ fontFamily: 'Sora, sans-serif' }}>
        <span className={white ? 'text-white' : 'text-gradient'}>MedMap</span>
        <span className={white ? 'text-sky-300' : 'text-primary'}>+</span>
      </span>
    </Link>
  )
}
