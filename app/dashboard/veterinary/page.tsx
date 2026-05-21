'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VeterinaryRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/veterinaire') }, [router])
  return null
}
