'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DoctorRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/medecin') }, [router])
  return null
}
