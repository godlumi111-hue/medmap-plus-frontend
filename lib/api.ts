const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('medmap_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = `Erreur ${res.status}`
    try {
      const err = await res.json()
      detail = err.detail || detail
    } catch {}
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface UserOut {
  id: number
  email: string
  nom: string
  prenom: string
  telephone?: string
  role: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: UserOut
}

export const auth = {
  register: (data: {
    email: string
    password: string
    nom: string
    prenom: string
    telephone?: string
    role: string
  }) => request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => request<UserOut>('/auth/me'),
}

// ── Users ──────────────────────────────────────────────────────────────────────

export const users = {
  myProfile: () => request<any>('/users/me'),
  updateProfile: (data: { nom?: string; prenom?: string; telephone?: string; avatar_url?: string }) =>
    request<UserOut>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  doctors: (params?: { ville?: string; specialite?: string; disponible?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/users/doctors${qs}`)
  },
  doctor: (id: number) => request<any>(`/users/doctors/${id}`),
  structures: (params?: { type?: string; ville?: string; partenaire?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/users/structures${qs}`)
  },
  structure: (id: number) => request<any>(`/users/structures/${id}`),
}

// ── Appointments ───────────────────────────────────────────────────────────────

export const appointments = {
  book: (data: {
    provider_type: string
    doctor_id?: number
    structure_id?: number
    service?: string
    date_rdv: string
    heure_rdv: string
    type_rdv?: string
    motif?: string
    prix?: number
    symptomes?: string
    age_patient?: number
    sexe_patient?: string
    premiere_consult?: boolean
    antecedents?: string
    animal_id?: number
    animal_nom?: string
    animal_espece?: string
  }) => request<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),

  mine: () => request<any[]>('/appointments'),

  get: (id: number) => request<any>(`/appointments/${id}`),

  updateStatus: (id: number, statut: string) =>
    request<any>(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ statut }) }),

  ticket: (id: number) => request<any>(`/appointments/${id}/ticket`),

  markDone: (id: number) =>
    request<any>(`/appointments/${id}/mark-done`, { method: 'POST' }),

  patientConfirm: (id: number) =>
    request<any>(`/appointments/${id}/patient-confirm`, { method: 'POST' }),

  addPrescription: (id: number, data: { medicaments: any[]; notes?: string }) =>
    request<any>(`/appointments/${id}/prescription`, { method: 'POST', body: JSON.stringify(data) }),

  myPrescriptions: () => request<any[]>('/appointments/prescriptions/mine'),
}

// ── Pharmacies ─────────────────────────────────────────────────────────────────

export const pharmacies = {
  list: (params?: { ville?: string; garde?: boolean; partenaire?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/pharmacies${qs}`)
  },
  garde: (ville?: string) => request<any[]>(`/pharmacies/garde${ville ? `?ville=${ville}` : ''}`),
  medicines: (pharmacyId: number) => request<any[]>(`/pharmacies/${pharmacyId}/medicines`),
  placeOrder: (data: { pharmacy_id: number; items: { medicine_id: number; quantite: number }[]; notes?: string; adresse_livraison?: string }) =>
    request<any>('/pharmacies/orders', { method: 'POST', body: JSON.stringify(data) }),
  myOrders: () => request<any[]>('/pharmacies/orders/mine'),
  pharmacyOrders: () => request<any[]>('/pharmacies/orders/pharmacy'),
  updateOrderStatus: (orderId: number, statut: string) =>
    request<any>(`/pharmacies/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ statut }) }),
  confirmReceipt: (orderId: number) =>
    request<any>(`/pharmacies/orders/${orderId}/confirm-receipt`, { method: 'POST' }),
  pharmacyHandoff: (orderId: number) =>
    request<any>(`/pharmacies/orders/${orderId}/pharmacy-handoff`, { method: 'POST' }),
  tracking: (orderId: number) =>
    request<any>(`/pharmacies/orders/${orderId}/tracking`),
  availableDeliveries: () => request<any[]>('/pharmacies/orders/available-deliveries'),
  myDeliveries: () => request<any[]>('/pharmacies/orders/my-deliveries'),
  acceptDelivery: (orderId: number) =>
    request<any>(`/pharmacies/orders/${orderId}/accept-delivery`, { method: 'POST' }),
  updateLivreurStatus: (orderId: number, livreur_statut: string) =>
    request<any>(`/pharmacies/orders/${orderId}/livreur-status`, { method: 'PUT', body: JSON.stringify({ livreur_statut }) }),
}

// ── Medicines ──────────────────────────────────────────────────────────────────

export const medicines = {
  search: (params?: { search?: string; categorie?: string; sur_ordonnance?: boolean; limit?: number; offset?: number }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/medicines${qs}`)
  },
  get: (id: number) => request<any>(`/medicines/${id}`),
}

// ── Wallet ─────────────────────────────────────────────────────────────────────

export const wallet = {
  me: () => request<any>('/wallet/me'),
  transactions: () => request<any[]>('/wallet/transactions'),
  recharge: (montant: number, methode = 'simulation') =>
    request<any>('/wallet/recharge', { method: 'POST', body: JSON.stringify({ montant, methode }) }),
  pay: (data: { montant: number; appointment_id?: number; receiver_id?: number; structure_id?: number; description?: string }) =>
    request<any>('/wallet/pay', { method: 'POST', body: JSON.stringify(data) }),
  confirmService: (payment_id: number) =>
    request<any>('/wallet/confirm-service', { method: 'POST', body: JSON.stringify({ payment_id }) }),
  dispute: (payment_id: number, motif: string) =>
    request<any>('/wallet/dispute', { method: 'POST', body: JSON.stringify({ payment_id, motif }) }),
  deposit: (methode: string, montant_demande: number) =>
    request<any>('/wallet/deposit', { method: 'POST', body: JSON.stringify({ methode, montant_demande }) }),
  confirmDeposit: (id: number) =>
    request<any>(`/wallet/deposit/${id}/confirm`, { method: 'POST' }),
  deposits: () => request<any[]>('/wallet/deposits'),
}

// ── Emergency ──────────────────────────────────────────────────────────────────

export const emergency = {
  triage: (data: { type: string; gravite: string; lat?: number; lng?: number; adresse?: string }) =>
    request<any>('/emergency/triage', { method: 'POST', body: JSON.stringify(data) }),
  report: (data: { type: string; gravite: string; description?: string; lat?: number; lng?: number; adresse?: string }) =>
    request<any>('/emergency', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: number) => request<any>(`/emergency/${id}`),
}

// ── AI Chat ────────────────────────────────────────────────────────────────────

export const chat = {
  send: (message: string) =>
    request<any>('/chat/message', { method: 'POST', body: JSON.stringify({ message }) }),
  history: () => request<any[]>('/chat/history'),
  analyzePrescription: (image: string, mimeType?: string) =>
    request<{ analysis: string }>('/chat/analyze-prescription', {
      method: 'POST',
      body: JSON.stringify({ image, mimeType }),
    }),
  transcribe: (audio: string, mimeType?: string) =>
    request<{ transcript: string | null; error?: string }>('/chat/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio, mimeType }),
    }),
}

// ── Subscriptions ──────────────────────────────────────────────────────────────

export const subscriptions = {
  status: () => request<any>('/subscriptions/status'),
  upgrade: (data: { plan?: string; methode?: string; duree_mois?: number }) =>
    request<any>('/subscriptions/upgrade', { method: 'POST', body: JSON.stringify(data) }),
  downgrade: () => request<any>('/subscriptions/downgrade', { method: 'POST' }),
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export const admin = {
  stats: () => request<any>('/admin/stats'),
  users: (params?: { role?: string; is_active?: boolean; limit?: number; offset?: number }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/admin/users${qs}`)
  },
  activateUser: (id: number, is_active: boolean) =>
    request<any>(`/admin/users/${id}/activate?is_active=${is_active}`, { method: 'PUT' }),
  verifyUser: (id: number) =>
    request<any>(`/admin/users/${id}/verify`, { method: 'PUT' }),
  disputes: (statut?: string) =>
    request<any[]>(`/admin/disputes${statut ? `?statut=${statut}` : ''}`),
  resolveDispute: (id: number, resolution: string, refund = false) =>
    request<any>(`/admin/disputes/${id}/resolve?resolution=${encodeURIComponent(resolution)}&refund=${refund}`, { method: 'PUT' }),
  structures: (params?: { type?: string; partenaire?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/admin/structures${qs}`)
  },
  setPartner: (id: number, partenaire: boolean) =>
    request<any>(`/admin/structures/${id}/partner?partenaire=${partenaire}`, { method: 'PUT' }),
  commissions: () => request<any>('/admin/commissions'),
}

// ── Messaging ──────────────────────────────────────────────────────────────────

export const messaging = {
  conversations: () => request<any[]>('/messages/conversations'),
  createConversation: (other_user_id: number, context_type = 'general', context_id?: number) =>
    request<any>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ other_user_id, context_type, context_id: context_id ?? null }),
    }),
  messages: (conversationId: number) => request<any[]>(`/messages/conversations/${conversationId}`),
  send: (conversationId: number, content: string) =>
    request<any>(`/messages/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}

// ── Notifications ──────────────────────────────────────────────────────────────

export const notifs = {
  list: () => request<any[]>('/notifications'),
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),
}

// ── Medical (referrals, hospitalizations, exams, reminders) ───────────────────

export const medical = {
  // Referrals
  refer: (appointmentId: number, data: {
    specialite: string; motif?: string; urgence?: string; resume_medical?: string;
    symptomes_observes?: string; medecin_recommande?: string; service_recommande?: string;
    date_proposee?: string; heure_proposee?: string; tarif?: number;
    examens_necessaires?: string; commentaire?: string;
  }) => request<any>(`/medical/appointments/${appointmentId}/refer`, { method: 'POST', body: JSON.stringify(data) }),

  myReferrals: () => request<any[]>('/medical/referrals'),
  getReferral: (id: number) => request<any>(`/medical/referrals/${id}`),
  acceptReferral: (id: number) => request<any>(`/medical/referrals/${id}/accept`, { method: 'POST' }),
  refuseReferral: (id: number) => request<any>(`/medical/referrals/${id}/refuse`, { method: 'POST' }),

  // Hospitalizations
  hospitalize: (appointmentId: number, data: {
    motif: string; duree_estimee?: string; service?: string; chambre?: string;
    urgence?: string; frais?: number; examens?: string; commentaire?: string;
  }) => request<any>(`/medical/appointments/${appointmentId}/hospitalize`, { method: 'POST', body: JSON.stringify(data) }),

  myHospitalizations: () => request<any[]>('/medical/hospitalizations'),
  acceptHospitalization: (id: number) => request<any>(`/medical/hospitalizations/${id}/accept`, { method: 'POST' }),
  refuseHospitalization: (id: number) => request<any>(`/medical/hospitalizations/${id}/refuse`, { method: 'POST' }),
  markHospitalizationDone: (id: number) => request<any>(`/medical/hospitalizations/${id}/mark-done`, { method: 'POST' }),

  // Exams
  requestExams: (appointmentId: number, data: {
    examens: string[]; motif?: string; urgence?: string;
    laboratoire?: string; date_proposee?: string; frais?: number;
  }) => request<any>(`/medical/appointments/${appointmentId}/exams`, { method: 'POST', body: JSON.stringify(data) }),

  myExams: () => request<any[]>('/medical/exams'),
  acceptExam: (id: number) => request<any>(`/medical/exams/${id}/accept`, { method: 'POST' }),
  refuseExam: (id: number) => request<any>(`/medical/exams/${id}/refuse`, { method: 'POST' }),
  markExamDone: (id: number, resultats?: string) => request<any>(`/medical/exams/${id}/mark-done`, { method: 'POST', body: JSON.stringify({ resultats }) }),
  confirmExam: (id: number) => request<any>(`/medical/exams/${id}/patient-confirm`, { method: 'POST' }),
  confirmHospitalization: (id: number) => request<any>(`/medical/hospitalizations/${id}/patient-confirm`, { method: 'POST' }),

  // Reminders (MediA)
  myReminders: () => request<any[]>('/medical/reminders'),
  toggleReminder: (id: number) => request<any>(`/medical/reminders/${id}/toggle`, { method: 'PUT' }),

  // Full patient dossier
  patientFile: () => request<any>('/medical/patient-file'),
}

// ── Hospital (système hospitalier) ────────────────────────────────────────────

export const hospital = {
  // Public: services + salles + files pour un hôpital
  services: (structureId: number) => request<any>(`/hospital/${structureId}/services`),

  // Patient: demande consultation immédiate
  bookImmediate: (data: {
    structure_id: number
    service_id: number
    motif?: string
    symptomes?: string
    age_patient?: number
    sexe_patient?: string
    prix?: number
  }) => request<any>('/hospital/appointment/immediate', { method: 'POST', body: JSON.stringify(data) }),

  // Hôpital: dashboard complet
  dashboard: () => request<any>('/hospital/dashboard'),

  // Réception: confirmer + attribuer salle
  receptionConfirm: (appointmentId: number, roomId?: number) =>
    request<any>(`/hospital/reception/confirm/${appointmentId}`, {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId ?? null }),
    }),

  // Réception: refuser
  receptionReject: (appointmentId: number, motifRefus?: string) =>
    request<any>(`/hospital/reception/reject/${appointmentId}`, {
      method: 'POST',
      body: JSON.stringify({ motif_refus: motifRefus }),
    }),

  // Salles: changer statut
  roomStatus: (roomId: number, statut: string, medecinNom?: string) =>
    request<any>(`/hospital/rooms/${roomId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statut, medecin_nom: medecinNom }),
    }),

  // Salles: appeler patient suivant
  nextPatient: (roomId: number) =>
    request<any>(`/hospital/rooms/${roomId}/next-patient`, { method: 'POST' }),

  // Salles: terminer consultation en cours
  finishConsultation: (roomId: number) =>
    request<any>(`/hospital/rooms/${roomId}/finish-consultation`, { method: 'POST' }),

  // Patient: info ticket + position dans la file
  myTicket: (appointmentId: number) => request<any>(`/hospital/ticket/${appointmentId}`),

  // Setup: créer un service
  createService: (data: { nom: string; specialite?: string }) =>
    request<any>('/hospital/setup/services', { method: 'POST', body: JSON.stringify(data) }),

  // Setup: ajouter une salle à un service
  createRoom: (serviceId: number, data: { nom: string; medecin_nom?: string }) =>
    request<any>(`/hospital/setup/services/${serviceId}/rooms`, { method: 'POST', body: JSON.stringify(data) }),

  // Patient: confirmer consultation terminée (libère séquestre)
  patientConfirm: (appointmentId: number) =>
    request<any>(`/hospital/appointment/${appointmentId}/patient-confirm`, { method: 'POST' }),

  // Médecin: patient présent → démarrer consultation
  startConsultation: (roomId: number) =>
    request<any>(`/hospital/rooms/${roomId}/start-consultation`, { method: 'POST' }),

  // Médecin: patient absent
  patientAbsent: (roomId: number) =>
    request<any>(`/hospital/rooms/${roomId}/patient-absent`, { method: 'POST' }),

  // Médecin: ajouter ordonnance
  addPrescription: (appointmentId: number, data: {
    medicaments: Array<{ nom: string; dosage?: string; frequence?: string; duree?: string; instructions?: string }>
    notes?: string
  }) => request<any>(`/hospital/appointment/${appointmentId}/prescription`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Réception: liste des orientations en attente d'attribution
  pendingReferrals: () => request<any[]>('/hospital/referrals/pending'),

  // Réception: attribuer salle + date + tarif à une orientation
  assignReferral: (referralId: number, data: {
    room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number
  }) => request<any>(`/hospital/referrals/${referralId}/assign`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Réception: examens en attente d'attribution
  pendingExams: () => request<any[]>('/hospital/exams/pending'),
  assignExam: (examId: number, data: {
    room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number
  }) => request<any>(`/hospital/exams/${examId}/assign`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Réception: hospitalisations en attente d'attribution
  pendingHospitalizations: () => request<any[]>('/hospital/hospitalizations/pending'),
  assignHospitalization: (hospId: number, data: {
    room_id?: number; date_rdv?: string; heure_rdv?: string; tarif?: number
  }) => request<any>(`/hospital/hospitalizations/${hospId}/assign`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Salles: marquer examen / hospitalisation terminé(e)
  finishExam: (roomId: number, resultats?: string) =>
    request<any>(`/hospital/rooms/${roomId}/finish-consultation`, { method: 'POST', body: JSON.stringify({ resultats }) }),
  finishHospitalization: (roomId: number) =>
    request<any>(`/hospital/rooms/${roomId}/finish-consultation`, { method: 'POST', body: JSON.stringify({}) }),

  // Hôpital: décharger patient hospitalisé + ordonnance de sortie
  dischargeHospitalization: (hospId: number, data: {
    medicaments?: Array<{ nom: string; dosage?: string; frequence?: string; duree?: string; instructions?: string }>
    consignes?: string
    rdv_controle?: string
    recommandations?: string
    repos_jours?: number
    notes?: string
  }) => request<any>(`/hospital/hospitalizations/${hospId}/discharge`, {
    method: 'POST', body: JSON.stringify(data),
  }),
}

// ── Animals (pet_animals table via /api/animals) ──────────────────────────────

const API_ANIMALS_BASE = API_BASE.replace('/v1', '')

async function requestAnimal<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_ANIMALS_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = `Erreur ${res.status}`
    try { const err = await res.json(); detail = err.detail || detail } catch {}
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const animals = {
  list: () => requestAnimal<any[]>('/animals/my'),
  get: (id: number) => requestAnimal<any>(`/animals/${id}`),
  create: (data: {
    name: string; species?: string; breed?: string;
    age?: number; weight?: number; gender?: string; notes?: string;
  }) => requestAnimal<any>('/animals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{
    name: string; species: string; breed: string;
    age: number; weight: number; gender: string; notes: string;
  }>) => requestAnimal<any>(`/animals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => requestAnimal<any>(`/animals/${id}`, { method: 'DELETE' }),
}

// ── Vétérinaire ────────────────────────────────────────────────────────────────

export const vet = {
  // Public: liste des vétérinaires
  list: (params?: { ville?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/users/vets${qs}`)
  },

  // Dashboard vétérinaire
  dashboard: () => request<any>('/vet/dashboard'),

  // Gestion des RDV
  confirmAppointment: (id: number) =>
    request<any>(`/vet/appointments/${id}/confirm`, { method: 'POST' }),
  rejectAppointment: (id: number, motifRefus?: string) =>
    request<any>(`/vet/appointments/${id}/reject`, { method: 'POST', body: JSON.stringify({ motif_refus: motifRefus }) }),
  finishAppointment: (id: number) =>
    request<any>(`/vet/appointments/${id}/finish`, { method: 'POST' }),

  // Ordonnance vétérinaire
  addPrescription: (appointmentId: number, data: {
    medicaments: Array<{ nom: string; dosage?: string; frequence?: string; duree?: string; instructions?: string }>
    consignes?: string; recommandations?: string; notes?: string;
  }) => request<any>(`/vet/appointments/${appointmentId}/prescription`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Vaccin administré
  addVaccine: (appointmentId: number, data: {
    nom: string; date_admin?: string; prochaine_date?: string; lot?: string; notes?: string;
  }) => request<any>(`/vet/appointments/${appointmentId}/vaccine`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Dossier animal (vue vétérinaire)
  getAnimal: (animalId: number) => request<any>(`/vet/animals/${animalId}`),

  // Salles
  rooms: () => request<any[]>('/vet/rooms'),

  // File d'attente
  queue: () => request<any[]>('/vet/queue'),

  // Attribuer une salle à un RDV
  assignRoom: (appointmentId: number, roomId: number) =>
    request<any>(`/vet/appointments/${appointmentId}/assign-room`, {
      method: 'POST', body: JSON.stringify({ room_id: roomId }),
    }),

  // Appeler l'animal (simple notification)
  callQueue: (queueId: number) =>
    request<any>(`/vet/queue/${queueId}/call`, { method: 'POST' }),

  // "Patient suivant" — notification 5 min
  nextPatient: (queueId: number) =>
    request<any>(`/vet/queue/${queueId}/next-patient`, { method: 'POST' }),

  // Marquer absent
  markAbsent: (queueId: number) =>
    request<any>(`/vet/queue/${queueId}/absent`, { method: 'POST' }),

  // Changer statut d'une salle
  toggleRoom: (roomId: number, statut: 'libre' | 'occupee' | 'fermee') =>
    request<any>(`/vet/rooms/${roomId}/toggle`, { method: 'POST', body: JSON.stringify({ statut }) }),

  // Tableau de bord caisse
  caisse: () => request<any>('/vet/caisse'),

  // Demande d'examen
  requestExam: (appointmentId: number, data: { type_examen: string; description?: string; prix?: number }) =>
    request<any>(`/vet/appointments/${appointmentId}/exam`, { method: 'POST', body: JSON.stringify(data) }),

  // Hospitalisation animale
  requestHospitalization: (appointmentId: number, data: { motif: string; duree_estimee?: string; salle?: string; prix?: number }) =>
    request<any>(`/vet/appointments/${appointmentId}/hospitalize`, { method: 'POST', body: JSON.stringify(data) }),

  // Chirurgie animale
  requestSurgery: (appointmentId: number, data: { type_chirurgie: string; motif?: string; urgence?: string; observations?: string; recommandations?: string }) =>
    request<any>(`/vet/appointments/${appointmentId}/surgery`, { method: 'POST', body: JSON.stringify(data) }),

  // Salles groupées par type avec file d'attente
  vetServices: () => request<any>('/vet/services'),

  // Patient suivant (room-based)
  nextPatientByRoom: (roomId: number) =>
    request<any>(`/vet/rooms/${roomId}/next-patient`, { method: 'POST' }),

  // Patient présent — démarrer consultation
  startConsultation: (roomId: number) =>
    request<any>(`/vet/rooms/${roomId}/start`, { method: 'POST' }),

  // Patient absent
  patientAbsent: (roomId: number) =>
    request<any>(`/vet/rooms/${roomId}/absent`, { method: 'POST' }),

  // Fin de consultation (room-based)
  finishConsultation: (roomId: number) =>
    request<any>(`/vet/rooms/${roomId}/finish`, { method: 'POST' }),

  // Changer statut d'une salle
  roomStatus: (roomId: number, statut: 'libre' | 'occupee' | 'pause' | 'fermee') =>
    request<any>(`/vet/rooms/${roomId}/status`, { method: 'POST', body: JSON.stringify({ statut }) }),
}

// ── Major Emergency ───────────────────────────────────────────────────────────

export const majorEmergency = {
  report: (data: {
    type: string
    description?: string
    nb_victimes?: number
    feu?: boolean
    gravite?: string
    lat?: number
    lng?: number
    adresse?: string
  }) => request<any>('/major-emergency', { method: 'POST', body: JSON.stringify(data) }),

  list: () => request<any[]>('/major-emergency'),

  my: () => request<any[]>('/major-emergency/my'),

  get: (id: number) => request<any>(`/major-emergency/${id}`),

  accept: (id: number) => request<any>(`/major-emergency/${id}/accept`, { method: 'POST' }),

  updatePosition: (id: number, data: { lat: number; lng: number; eta_minutes?: number }) =>
    request<any>(`/major-emergency/${id}/position`, { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (id: number, statut: string) =>
    request<any>(`/major-emergency/${id}/status`, { method: 'POST', body: JSON.stringify({ statut }) }),

  confirmArrival: (id: number, role: string) =>
    request<any>(`/major-emergency/${id}/patient-confirm`, { method: 'POST', body: JSON.stringify({ role }) }),
}

// ── Personal Care (Médecins & Coachs personnels) ──────────────────────────────

export const personalCare = {
  coaches: (params?: { specialite?: string; disponible?: boolean; ville?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : ''
    return request<any[]>(`/personal-care/coaches${qs}`)
  },
  // ── Request flow (patient → provider → patient) ───────────────────────────
  sendRequest: (data: { provider_id: number; provider_type: 'medecin' | 'coach'; message?: string }) =>
    request<any>('/personal-care/request', { method: 'POST', body: JSON.stringify(data) }),
  mine: () => request<any[]>('/personal-care/mine'),
  providerRequests: () => request<any[]>('/personal-care/provider/requests'),
  acceptRequest: (id: number) =>
    request<any>(`/personal-care/${id}/accept`, { method: 'POST' }),
  rejectRequest: (id: number, motif?: string) =>
    request<any>(`/personal-care/${id}/reject`, { method: 'POST', body: JSON.stringify({ motif }) }),
  payRequest: (id: number, data: { duree_mois: number; jours?: number[]; heure?: string }) =>
    request<any>(`/personal-care/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  // ── Active assignment actions ─────────────────────────────────────────────
  cancel: (id: number) => request<any>(`/personal-care/${id}`, { method: 'DELETE' }),
  confirmRenewal: (id: number, confirm: boolean) =>
    request<any>(`/personal-care/${id}/confirm-renewal`, { method: 'POST', body: JSON.stringify({ confirm }) }),
  providerPatients: () => request<any[]>('/personal-care/provider/patients'),
  setSchedule: (id: number, data: { jours: number[]; heure: string }) =>
    request<any>(`/personal-care/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) }),
  sessions: (id: number) => request<any[]>(`/personal-care/${id}/sessions`),
  providerValidate: (sessionId: number, note?: string) =>
    request<any>(`/personal-care/sessions/${sessionId}/provider-validate`, { method: 'POST', body: JSON.stringify({ note }) }),
  patientConfirm: (sessionId: number) =>
    request<any>(`/personal-care/sessions/${sessionId}/patient-confirm`, { method: 'POST' }),
  reportSession: (sessionId: number, motif: string) =>
    request<any>(`/personal-care/sessions/${sessionId}/report`, { method: 'POST', body: JSON.stringify({ motif }) }),
  settle: (id: number) =>
    request<any>(`/personal-care/${id}/settle`, { method: 'POST' }),
  providerDashboard: () => request<any>('/personal-care/provider/dashboard'),
  // ── Meeting flow ─────────────────────────────────────────────────────────
  scheduleMeeting: (id: number, data: { meeting_date: string; meeting_heure: string }) =>
    request<any>(`/personal-care/${id}/schedule-meeting`, { method: 'POST', body: JSON.stringify(data) }),
  patientArrives: (id: number) =>
    request<any>(`/personal-care/${id}/patient-arrives`, { method: 'POST' }),
  providerArrives: (id: number) =>
    request<any>(`/personal-care/${id}/provider-arrives`, { method: 'POST' }),
  // ── Session validation (patient-only) ────────────────────────────────────
  validateTodaySession: (assignmentId: number) =>
    request<any>(`/personal-care/${assignmentId}/validate-today-session`, { method: 'POST' }),
  patientValidateSession: (sessionId: number) =>
    request<any>(`/personal-care/sessions/${sessionId}/patient-validate`, { method: 'POST' }),
  patientComplaint: (sessionId: number, motif?: string) =>
    request<any>(`/personal-care/sessions/${sessionId}/patient-complaint`, { method: 'POST', body: JSON.stringify({ motif }) }),
}

// ── Wallet alias ──────────────────────────────────────────────────────────────

export const walletAlias = {
  myWallet: () => request<any>('/wallet/me'),
}

// ── Token helpers ──────────────────────────────────────────────────────────────

export function saveToken(token: string) {
  sessionStorage.setItem('medmap_token', token)
}

export function clearToken() {
  sessionStorage.removeItem('medmap_token')
  sessionStorage.removeItem('medmap_user')
}

export function saveUser(user: UserOut) {
  sessionStorage.setItem('medmap_user', JSON.stringify(user))
}

export function getStoredUser(): UserOut | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('medmap_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
