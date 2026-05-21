'use client'
import EmergencyDashboard, { ROLE_CONFIGS } from '@/components/emergency/EmergencyDashboard'

export default function AmbulancePage() {
  return <EmergencyDashboard config={ROLE_CONFIGS.ambulance} />
}
