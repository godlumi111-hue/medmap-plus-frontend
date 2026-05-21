'use client'
import EmergencyDashboard, { ROLE_CONFIGS } from '@/components/emergency/EmergencyDashboard'

export default function SamuPage() {
  return <EmergencyDashboard config={ROLE_CONFIGS.samu} />
}
