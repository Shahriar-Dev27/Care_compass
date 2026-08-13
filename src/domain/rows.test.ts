// The database speaks snake_case and the components speak camelCase, so a
// dropped or misspelled field is silently empty in the UI. This catches that.

import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, PREF_COLUMNS, initialsFor, prefsToRow, slotKey, toAppointment, toMessage, toPrefs, toProfile, toThreads } from './rows'
import type { Tables } from '../types/database.types'

describe('toProfile', () => {
  const profile = toProfile({
    id: 'p1',
    user_id: 'u1',
    created_at: '2026-08-01T00:00:00.000Z',
    name: 'Jordan Lee',
    relation: 'You',
    is_self: true,
    dob: '1989-04-17',
    insurance: 'Blue Cross Blue Shield',
    member_id: 'BCB-4821',
    medications: ['Sumatriptan 50mg'],
    allergies: null,
    conditions: ['Episodic migraine'],
  })

  it('maps snake_case columns onto camelCase fields', () => {
    expect(profile.memberId).toBe('BCB-4821')
    expect(profile.isSelf).toBe(true)
    expect(profile.initials).toBe('JL')
  })

  it('renders a null array column as empty rather than crashing a .map()', () => {
    expect(profile.allergies).toEqual([])
  })

  it('leaves no field unmapped', () => {
    expect(Object.values(profile)).not.toContain(undefined)
  })
})

it('maps an appointment row', () => {
  const appointment = toAppointment({
    id: 'a1',
    user_id: 'u1',
    profile_id: 'p1',
    doctor_slug: 'maya-chen',
    at: '2026-08-20T14:30:00.000Z',
    mode: 'video',
    reason: 'Headaches',
    insurance: 'Aetna',
    status: 'booked',
    summary: null,
    created_at: '2026-08-12T09:00:00.000Z',
  })
  expect(appointment.doctorSlug).toBe('maya-chen')
  expect(appointment.profileId).toBe('p1')
  expect(appointment.createdAt).toBe('2026-08-12T09:00:00.000Z')
})

it('keys a slot by local wall-clock time, because that is how the picker offers it', () => {
  expect(slotKey(new Date(2026, 7, 20, 9, 5).toISOString())).toBe('2026-08-20T09:05')
})

describe('toThreads', () => {
  const rows: Tables<'messages'>[] = [
    { id: 'm1', user_id: 'u1', doctor_slug: 'maya-chen', sender: 'care-team', body: 'Diary received', created_at: '2026-08-10T10:00:00.000Z' },
    { id: 'm2', user_id: 'u1', doctor_slug: 'raj-mehta', sender: 'you', body: 'Question', created_at: '2026-08-11T10:00:00.000Z' },
    { id: 'm3', user_id: 'u1', doctor_slug: 'maya-chen', sender: 'you', body: 'Thanks', created_at: '2026-08-12T10:00:00.000Z' },
  ]
  const messages = rows.map(toMessage)
  const threads = toThreads(messages)

  it('groups one thread per clinician', () => {
    expect(threads).toHaveLength(2)
  })

  it('keeps messages in the order they were loaded', () => {
    expect(threads[0]?.messages.map((m) => m.text)).toEqual(['Diary received', 'Thanks'])
  })

  it('maps the sender', () => {
    expect(messages[0]?.from).toBe('care-team')
  })
})

describe('prefs round-trip', () => {
  const prefRow: Tables<'user_prefs'> = {
    user_id: 'u1',
    active_profile_id: null,
    dismissed: [],
    follow_up: null,
    theme: 'dark',
    text_scale: 'lg',
    reminder_sms: false,
    reminder_email: true,
    reminder_push: true,
    ai_suggestions: false,
  }

  it('gives every default a column', () => {
    expect(Object.keys(DEFAULT_PREFS).sort()).toEqual(Object.keys(PREF_COLUMNS).sort())
  })

  it('survives row → prefs → row', () => {
    expect(prefsToRow(toPrefs(prefRow))).toEqual({
      theme: 'dark',
      text_scale: 'lg',
      reminder_sms: false,
      reminder_email: true,
      reminder_push: true,
      ai_suggestions: false,
    })
  })

  it('falls back to defaults when the row is missing', () => {
    expect(toPrefs(null)).toEqual(DEFAULT_PREFS)
  })

  it('never lets an unknown key reach the database', () => {
    expect(prefsToRow({ theme: 'dark', is_self: true, user_id: 'nope' })).toEqual({ theme: 'dark' })
  })
})

it('builds initials from multi-byte names', () => {
  expect(initialsFor('Sofía Álvarez')).toBe('SÁ')
  expect(initialsFor('')).toBe('')
})
