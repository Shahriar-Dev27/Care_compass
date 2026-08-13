// Row mapping self-check: `npm run check`.
// The database speaks snake_case and the components speak camelCase, so a
// dropped or misspelled field is silently empty in the UI. This catches that.

import assert from 'node:assert/strict'
import { DEFAULT_PREFS, PREF_COLUMNS, initialsFor, prefsToRow, slotKey, toAppointment, toMessage, toPrefs, toProfile, toThreads } from './rows.js'

const profileRow = {
  id: 'p1',
  name: 'Jordan Lee',
  relation: 'You',
  is_self: true,
  dob: '1989-04-17',
  insurance: 'Blue Cross Blue Shield',
  member_id: 'BCB-4821',
  medications: ['Sumatriptan 50mg'],
  allergies: null,
  conditions: ['Episodic migraine'],
}

const profile = toProfile(profileRow)
assert.equal(profile.memberId, 'BCB-4821')
assert.equal(profile.isSelf, true)
assert.equal(profile.initials, 'JL')
assert.deepEqual(profile.allergies, [], 'a null array column must render as empty, not crash a .map()')
assert.ok(!Object.values(profile).includes(undefined), `unmapped profile field: ${JSON.stringify(profile)}`)

const appointment = toAppointment({
  id: 'a1',
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
assert.equal(appointment.doctorSlug, 'maya-chen')
assert.equal(appointment.profileId, 'p1')
assert.equal(appointment.createdAt, '2026-08-12T09:00:00.000Z')

// A slot key is local wall-clock time, because that is how the picker offers it.
const at = new Date(2026, 7, 20, 9, 5)
assert.equal(slotKey(at.toISOString()), '2026-08-20T09:05')

const messages = [
  { id: 'm1', doctor_slug: 'maya-chen', sender: 'care-team', body: 'Diary received', created_at: '2026-08-10T10:00:00.000Z' },
  { id: 'm2', doctor_slug: 'raj-mehta', sender: 'you', body: 'Question', created_at: '2026-08-11T10:00:00.000Z' },
  { id: 'm3', doctor_slug: 'maya-chen', sender: 'you', body: 'Thanks', created_at: '2026-08-12T10:00:00.000Z' },
].map(toMessage)

const threads = toThreads(messages)
assert.equal(threads.length, 2, 'one thread per clinician')
assert.deepEqual(
  threads[0].messages.map((m) => m.text),
  ['Diary received', 'Thanks'],
  'messages stay in the order they were loaded',
)
assert.equal(messages[0].from, 'care-team')

// Prefs round-trip: every default has a column, and only known keys are written.
assert.deepEqual(Object.keys(DEFAULT_PREFS).sort(), Object.keys(PREF_COLUMNS).sort())
const prefRow = { theme: 'dark', text_scale: 'lg', reminder_sms: false, reminder_email: true, reminder_push: true, ai_suggestions: false }
const prefs = toPrefs(prefRow)
assert.deepEqual(prefsToRow(prefs), prefRow)
assert.deepEqual(toPrefs(null), DEFAULT_PREFS)
assert.deepEqual(prefsToRow({ theme: 'dark', is_self: true, user_id: 'nope' }), { theme: 'dark' }, 'unknown keys must not reach the database')

assert.equal(initialsFor('Sofía Álvarez'), 'SÁ')
assert.equal(initialsFor(''), '')

console.log('rows: ok')
