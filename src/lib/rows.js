// Mappers between Postgres rows (snake_case) and the shapes the components
// already expect (camelCase). Kept free of React so `npm run check` can assert
// the mapping without a browser.

import { dayKey } from './schedule.js'

const pad = (n) => String(n).padStart(2, '0')

export const initialsFor = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => [...word][0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** `2026-08-14T09:20` — the key `schedule.js` uses to mark a slot as taken. */
export const slotKey = (value) => {
  const at = new Date(value)
  return `${dayKey(at)}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export const DEFAULT_PREFS = {
  theme: 'light',
  textScale: 'base',
  reminderSms: true,
  reminderEmail: true,
  reminderPush: false,
  aiSuggestions: true,
}

/** camelCase pref → its column. Also the allow-list for writes. */
export const PREF_COLUMNS = {
  theme: 'theme',
  textScale: 'text_scale',
  reminderSms: 'reminder_sms',
  reminderEmail: 'reminder_email',
  reminderPush: 'reminder_push',
  aiSuggestions: 'ai_suggestions',
}

export const toProfile = (row) => ({
  id: row.id,
  name: row.name,
  initials: initialsFor(row.name),
  relation: row.relation,
  isSelf: row.is_self,
  dob: row.dob,
  insurance: row.insurance,
  memberId: row.member_id,
  medications: row.medications ?? [],
  allergies: row.allergies ?? [],
  conditions: row.conditions ?? [],
})

export const toAppointment = (row) => ({
  id: row.id,
  profileId: row.profile_id,
  doctorSlug: row.doctor_slug,
  at: row.at,
  mode: row.mode,
  reason: row.reason,
  insurance: row.insurance,
  status: row.status,
  summary: row.summary,
  createdAt: row.created_at,
})

export const toWaitlistEntry = (row) => ({
  id: row.id,
  profileId: row.profile_id,
  doctorSlug: row.doctor_slug,
  at: row.created_at,
})

export const toMessage = (row) => ({
  id: row.id,
  doctorSlug: row.doctor_slug,
  from: row.sender,
  at: row.created_at,
  text: row.body,
})

export const toLogEntry = (row) => ({ id: row.id, who: row.who, what: row.what, at: row.at })

/** One thread per clinician, oldest message first — what CareHome renders. */
export function toThreads(messages) {
  const threads = new Map()
  for (const message of messages) {
    if (!threads.has(message.doctorSlug)) threads.set(message.doctorSlug, { doctorSlug: message.doctorSlug, messages: [] })
    threads.get(message.doctorSlug).messages.push(message)
  }
  return [...threads.values()]
}

export const toPrefs = (row) =>
  row
    ? {
        theme: row.theme,
        textScale: row.text_scale,
        reminderSms: row.reminder_sms,
        reminderEmail: row.reminder_email,
        reminderPush: row.reminder_push,
        aiSuggestions: row.ai_suggestions,
      }
    : { ...DEFAULT_PREFS }

/** Only known preferences reach the database. */
export function prefsToRow(patch) {
  const row = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PREF_COLUMNS[key]
    if (column) row[column] = value
  }
  return row
}
