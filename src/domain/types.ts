// Shapes the whole app agrees on. No React, no Supabase, no I/O.

export type SpecialtyName =
  | 'Primary care'
  | 'Urgent care'
  | 'Dermatology'
  | 'Neurology'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Cardiology'
  | 'Mental health'
  | 'OB-GYN'
  | 'Gastroenterology'
  | 'ENT'
  | 'Endocrinology'

export type Specialty = { name: SpecialtyName; blurb: string }

export type Review = { by: string; when: string; stars: number; text: string }

export type Doctor = {
  id: number
  slug: string
  name: string
  credential: string
  specialty: SpecialtyName
  focus: string[]
  gender: 'Female' | 'Male' | 'Non-binary'
  years: number
  boardCertified: string
  education: string
  philosophy: string
  languages: string[]
  insurance: string[]
  rating: number
  reviewCount: number
  fee: number
  practice: string
  address: string
  distance: number
  accessibility: string[]
  /** 0 = Sunday, matching Date#getDay. */
  clinicDays: number[]
  /** 'HH:MM' in clinic-local time. */
  hours: string[]
  tint: string
  aiFit: string
  reviews: Review[]
  telehealth: boolean
  inPerson: boolean
}

export type Slot = { key: string; time: string; at: Date }
export type OpenDay = { date: Date; key: string; slots: Slot[] }

export type Relation = 'You' | 'Child' | 'Partner' | 'Parent' | 'Other'
export type VisitMode = 'video' | 'in-person'
export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'no-show'
export type MessageSender = 'you' | 'care-team' | 'system'
export type Theme = 'light' | 'dark' | 'system'
export type TextScale = 'sm' | 'base' | 'lg' | 'xl'

export type PatientProfile = {
  id: string
  name: string
  initials: string
  relation: Relation
  isSelf: boolean
  dob: string | null
  insurance: string | null
  memberId: string | null
  medications: string[]
  allergies: string[]
  conditions: string[]
}

export type Appointment = {
  id: string
  profileId: string
  doctorSlug: string
  at: string
  mode: VisitMode
  reason: string
  insurance: string
  status: AppointmentStatus
  summary: string | null
  createdAt: string
}

/** An appointment joined with its clinician and a parsed date, for rendering. */
export type AppointmentView = Appointment & { doctor: Doctor; date: Date }

export type WaitlistEntry = { id: string; profileId: string; doctorSlug: string; at: string }

export type Message = { id: string; doctorSlug: string; from: MessageSender; at: string; text: string }

export type Thread = { doctorSlug: string; messages: Message[] }

export type LogEntry = { id: string; who: string; what: string; at: string }

export type Prefs = {
  theme: Theme
  textScale: TextScale
  reminderSms: boolean
  reminderEmail: boolean
  reminderPush: boolean
  aiSuggestions: boolean
}

export type FollowUp = { slug: string; name: string; specialty: string; reason: string; at: string }

/** A slot already taken, keyed the way schedule.ts marks availability. */
export type BookedSlot = { doctorSlug: string; key: string }

export type TakenFor = (doctorSlug: string) => Set<string>
