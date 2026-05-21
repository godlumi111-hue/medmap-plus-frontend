'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HospitalRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/clinique') }, [router])
  return null
}
