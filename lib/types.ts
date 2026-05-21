export type UserRole = 'patient' | 'medecin' | 'pharmacie' | 'clinique' | 'veterinaire' | 'admin'

export interface User {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  role: UserRole
  avatar?: string
  premium?: boolean
}

export interface Medecin {
  id: string
  nom: string
  prenom: string
  specialite: string
  avatar?: string
  note: number
  avis: number
  disponible: boolean
  prix: number
  structure?: string
  ville: string
  telephone: string
  email: string
  numeroProfessionnel: string
  langues: string[]
  experience: number
  partenaire: boolean
  services: string[]
}

export interface Pharmacie {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  email: string
  horaires: string
  garde: boolean
  partenaire: boolean
  note: number
  distance?: string
  lat: number
  lng: number
  medicamentsDisponibles: number
  photo?: string
}

export interface Clinique {
  id: string
  nom: string
  type: 'clinique' | 'hopital' | 'centre-sante'
  adresse: string
  ville: string
  telephone: string
  email: string
  services: string[]
  partenaire: boolean
  note: number
  urgence24h: boolean
  nombreLits?: number
  photo?: string
  lat: number
  lng: number
  medecinAssocies?: string[]
}

export interface Veterinaire {
  id: string
  nom: string
  prenom: string
  specialite: string
  clinique: string
  ville: string
  telephone: string
  note: number
  disponible: boolean
  partenaire: boolean
  urgence24h: boolean
  photo?: string
}

export interface Medicament {
  id: string
  nom: string
  composition: string
  usage: string
  posologie: string
  prixBase: number
  prixMedMap: number
  categorie: string
  surOrdonnance: boolean
  stock: boolean
  pharmacies: string[]
  image?: string
  description: string
}

export interface RendezVous {
  id: string
  patient: string
  medecin?: string
  structure?: string
  date: string
  heure: string
  motif: string
  statut: 'confirme' | 'en-attente' | 'annule' | 'termine'
  type: 'presentiel' | 'teleconsultation' | 'domicile'
  prix: number
  paye: boolean
  notes?: string
}

export interface Commande {
  id: string
  patient: string
  medicaments: { nom: string; quantite: number; prix: number }[]
  pharmacie: string
  total: number
  fraisMedMap: number
  statut: 'en-attente' | 'confirme' | 'prepare' | 'livre' | 'annule'
  date: string
  paye: boolean
}

export interface Animal {
  id: string
  nom: string
  espece: string
  race: string
  age: number
  poids: number
  proprietaire: string
  dateNaissance: string
  vaccins: { nom: string; date: string; prochaine: string }[]
  consultations: { date: string; motif: string; veterinaire: string }[]
  photo?: string
}

export interface Transaction {
  id: string
  type: 'credit' | 'debit'
  montant: number
  description: string
  date: string
  statut: 'confirme' | 'en-attente' | 'bloque' | 'litige'
  reference: string
}

export interface Notification {
  id: string
  titre: string
  message: string
  type: 'rappel' | 'rendez-vous' | 'commande' | 'alerte' | 'systeme'
  date: string
  lu: boolean
  urgent?: boolean
}
