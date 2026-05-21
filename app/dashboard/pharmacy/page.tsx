'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PharmacyRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/pharmacie') }, [router])
  return null
}
