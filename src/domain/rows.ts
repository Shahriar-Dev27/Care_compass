// Mappers between Postgres rows (snake_case) and the shapes the components
// expect (camelCase). No React and no Supabase client, so rows.test.ts can
// assert the mapping without a browser or a network.

import { dayKey } from './schedule'
import type {
  Appointment,
  AppointmentStatus,
  LogEntry,
  Message,
  MessageSender,
  PatientProfile,
  Prefs,
  Relation,
  TextScale,
  Theme,
  Thread,
  VisitMode,
  WaitlistEntry,
} from './types'
import type { Tables } from '../types/database.types'

/** Array columns are NOT NULL in the schema, but a narrowed PostgREST select or
 *  a future nullable column would crash a `.map()` in the UI. The guards stay. */
type ProfileRow = Omit<Tables<'patient_profiles'>, 'medications' | 'allergies' | 'conditions'> & {
  medications: string[] | null
  allergies: string[] | null
  conditions: string[] | null
}

const pad = (n: number): string => String(n).padStart(2, '0')

export const initialsFor = (name = ''): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => [...word][0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** `2026-08-14T09:20` — the key schedule.ts uses to mark a slot as taken. */
export const slotKey = (value: string | number | Date): string => {
  const at = new Date(value)
  return `${dayKey(at)}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'light',
  textScale: 'base',
  reminderSms: true,
  reminderEmail: true,
  reminderPush: false,
  aiSuggestions: true,
}

/** camelCase pref → its column. Also the allow-list for writes. */
export const PREF_COLUMNS: Record<keyof Prefs, string> = {
  theme: 'theme',
  textScale: 'text_scale',
  reminderSms: 'reminder_sms',
  reminderEmail: 'reminder_email',
  reminderPush: 'reminder_push',
  aiSuggestions: 'ai_suggestions',
}

// The columns below are TEXT with CHECK constraints rather than Postgres enums,
// so the generated types widen them to `string`. Narrowing here keeps the union
// at one boundary instead of casting at every call site.
export const toProfile = (row: ProfileRow): PatientProfile => ({
  id: row.id,
  name: row.name,
  initials: initialsFor(row.name),
  relation: row.relation as Relation,
  isSelf: row.is_self,
  dob: row.dob,
  insurance: row.insurance,
  memberId: row.member_id,
  medications: row.medications ?? [],
  allergies: row.allergies ?? [],
  conditions: row.conditions ?? [],
})

export const toAppointment = (row: Tables<'appointments'>): Appointment => ({
  id: row.id,
  profileId: row.profile_id,
  doctorSlug: row.doctor_slug,
  at: row.at,
  mode: row.mode as VisitMode,
  reason: row.reason ?? '',
  insurance: row.insurance ?? '',
  status: row.status as AppointmentStatus,
  summary: row.summary,
  createdAt: row.created_at,
})

export const toWaitlistEntry = (row: Tables<'waitlist'>): WaitlistEntry => ({
  id: row.id,
  profileId: row.profile_id,
  doctorSlug: row.doctor_slug,
  at: row.created_at,
})

export const toMessage = (row: Tables<'messages'>): Message => ({
  id: row.id,
  doctorSlug: row.doctor_slug,
  from: row.sender as MessageSender,
  at: row.created_at,
  text: row.body,
})

export const toLogEntry = (row: Tables<'access_log'>): LogEntry => ({ id: row.id, who: row.who, what: row.what, at: row.at })

/** One thread per clinician, oldest message first — what CareHome renders. */
export function toThreads(messages: Message[]): Thread[] {
  const threads = new Map<string, Thread>()
  for (const message of messages) {
    let thread = threads.get(message.doctorSlug)
    if (!thread) {
      thread = { doctorSlug: message.doctorSlug, messages: [] }
      threads.set(message.doctorSlug, thread)
    }
    thread.messages.push(message)
  }
  return [...threads.values()]
}

export const toPrefs = (row: Tables<'user_prefs'> | null): Prefs =>
  row
    ? {
        theme: row.theme as Theme,
        textScale: row.text_scale as TextScale,
        reminderSms: row.reminder_sms,
        reminderEmail: row.reminder_email,
        reminderPush: row.reminder_push,
        aiSuggestions: row.ai_suggestions,
      }
    : { ...DEFAULT_PREFS }

/** Only known preferences reach the database. */
export function prefsToRow(patch: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(PREF_COLUMNS, key)) continue
    row[PREF_COLUMNS[key as keyof Prefs]] = value
  }
  return row
}
