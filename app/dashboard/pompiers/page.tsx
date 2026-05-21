'use client'
import EmergencyDashboard, { ROLE_CONFIGS } from '@/components/emergency/EmergencyDashboard'

export default function PompiersPage() {
  return <EmergencyDashboard config={ROLE_CONFIGS.pompiers} />
}
