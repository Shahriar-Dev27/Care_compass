// Deterministic availability so the same doctor shows the same open slots on
// every render, without a backend. Slots in the past are never offered.
//
// ponytail: seeded from doctor.id, not real clinic calendars. Replaced by a
// doctor_availability table when the directory moves to Postgres.

import type { Doctor, OpenDay, Slot } from './types'

const DAY_MS = 86_400_000
const LEAD_MS = 60 * 60 * 1000 // no bookings within the next hour

export const dayKey = (date: Date | string | number): string => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const slotDate = (key: string, time: string): Date => {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  const [hh = 0, mm = 0] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

const isOpen = (doctor: Doctor, key: string, index: number): boolean => {
  const seed = doctor.id * 13 + key.split('-').reduce((a, p) => a + Number(p), 0) * 7 + index * 5
  return seed % 5 !== 0
}

/** Open slots for one calendar day, already filtered for lead time and bookings. */
export function daySlots(doctor: Doctor, date: Date, taken: Set<string> = new Set()): Slot[] {
  if (!doctor.clinicDays.includes(date.getDay())) return []
  const key = dayKey(date)
  const cutoff = Date.now() + LEAD_MS
  return doctor.hours
    .map((time, index) => ({ key, time, index, at: slotDate(key, time) }))
    .filter(({ index, at, time }) => isOpen(doctor, key, index) && at.getTime() > cutoff && !taken.has(`${key}T${time}`))
    .map(({ key: k, time, at }) => ({ key: k, time, at }))
}

/** The next `count` days that have at least one open slot. */
export function openDays(doctor: Doctor, taken: Set<string> = new Set(), count = 6, horizon = 30): OpenDay[] {
  const out: OpenDay[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < horizon && out.length < count; i++) {
    const date = new Date(start.getTime() + i * DAY_MS)
    const slots = daySlots(doctor, date, taken)
    if (slots.length) out.push({ date, key: dayKey(date), slots })
  }
  return out
}

export function nextAvailable(doctor: Doctor, taken: Set<string> = new Set()): Slot | null {
  const [first] = openDays(doctor, taken, 1)
  return first?.slots[0] ?? null
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export const formatTime = (at: Date): string => timeFmt.format(at)

export function formatDay(at: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(at).setHours(0, 0, 0, 0) - today.getTime()) / DAY_MS)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return dayFmt.format(at)
}

export const formatSlot = (at: Date): string => `${formatDay(at)}, ${formatTime(at)}`

/** Short human countdown, e.g. "in 3 days" or "in 2 hr 10 min". */
export function countdown(at: Date | string | number): string {
  const ms = new Date(at).getTime() - Date.now()
  if (ms <= 0) return 'happening now'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `in ${hrs} hr${hrs > 1 ? 's' : ''} ${mins % 60} min`
  const days = Math.round(hrs / 24)
  return `in ${days} day${days > 1 ? 's' : ''}`
}
