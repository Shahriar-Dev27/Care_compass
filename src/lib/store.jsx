import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { bySlug, specialtyLabel } from '../data/directory'
import { dayKey, slotDate } from './schedule'
import { supabase } from './supabase'
import { useAuth } from './auth'
import {
  DEFAULT_PREFS,
  prefsToRow,
  slotKey,
  toAppointment,
  toLogEntry,
  toMessage,
  toPrefs,
  toProfile,
  toThreads,
  toWaitlistEntry,
} from './rows'

const LOCAL_KEY = 'carecompass.prefs.v2'
const DAY_MS = 86_400_000

const Ctx = createContext(null)

const EMPTY = {
  profiles: [],
  appointments: [],
  messages: [],
  waitlist: [],
  accessLog: [],
  bookedSlots: [],
  activeProfileId: null,
}

/** Theme, text size and dismissals are useful before anyone signs in, so they
 *  are cached locally and written through to the account once there is one. */
function readLocalPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
    return {
      prefs: { ...DEFAULT_PREFS, ...saved.prefs },
      dismissed: saved.dismissed ?? [],
      followUp: saved.followUp ?? null,
    }
  } catch {
    return { prefs: { ...DEFAULT_PREFS }, dismissed: [], followUp: null }
  }
}

function writeLocalPrefs({ prefs, dismissed, followUp }) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ prefs, dismissed, followUp }))
  } catch {
    // Private browsing with storage blocked: preferences just will not persist.
  }
}

const firstError = (...results) => results.find((r) => r?.error)?.error ?? null

const friendlyWriteError = (error) =>
  error.code === '23505'
    ? 'That time was just booked by someone else. Please pick another slot.'
    : error.message || 'Something went wrong. Please try again.'

export function StoreProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState(() => ({ ...EMPTY, ...readLocalPrefs(), loading: true, error: null }))

  const patch = useCallback((changes) => setState((prev) => ({ ...prev, ...changes })), [])

  /** Slots taken across every patient, so the picker cannot offer one twice. */
  const loadBookedSlots = useCallback(async () => {
    const { data, error } = await supabase.rpc('booked_slots')
    return { slots: (data ?? []).map((row) => ({ doctorSlug: row.doctor_slug, key: slotKey(row.at) })), error }
  }, [])

  const loadAccessLog = useCallback(async () => {
    const { data } = await supabase.from('access_log').select('*').order('at', { ascending: false }).limit(50)
    if (data) patch({ accessLog: data.map(toLogEntry) })
  }, [patch])

  useEffect(() => {
    if (authLoading) return
    let alive = true

    async function load() {
      patch({ loading: true, error: null })

      if (!user) {
        const { slots, error } = await loadBookedSlots()
        if (!alive) return
        setState((prev) => ({ ...prev, ...EMPTY, ...readLocalPrefs(), bookedSlots: slots, loading: false, error: error?.message ?? null }))
        return
      }

      const [slotRes, profileRes, apptRes, waitRes, msgRes, logRes, prefRes] = await Promise.all([
        loadBookedSlots(),
        supabase.from('patient_profiles').select('*').order('is_self', { ascending: false }).order('created_at'),
        supabase.from('appointments').select('*').order('at'),
        supabase.from('waitlist').select('*').order('created_at'),
        supabase.from('messages').select('*').order('created_at'),
        supabase.from('access_log').select('*').order('at', { ascending: false }).limit(50),
        supabase.from('user_prefs').select('*').maybeSingle(),
      ])
      if (!alive) return

      const error = firstError(slotRes, profileRes, apptRes, waitRes, msgRes, logRes, prefRes)
      const local = readLocalPrefs()
      const prefRow = prefRes.data

      setState((prev) => ({
        ...prev,
        profiles: (profileRes.data ?? []).map(toProfile),
        appointments: (apptRes.data ?? []).map(toAppointment),
        waitlist: (waitRes.data ?? []).map(toWaitlistEntry),
        messages: (msgRes.data ?? []).map(toMessage),
        accessLog: (logRes.data ?? []).map(toLogEntry),
        bookedSlots: slotRes.slots,
        activeProfileId: prefRow?.active_profile_id ?? profileRes.data?.[0]?.id ?? null,
        prefs: prefRow ? toPrefs(prefRow) : local.prefs,
        dismissed: prefRow?.dismissed ?? local.dismissed,
        followUp: prefRow?.follow_up ?? local.followUp,
        loading: false,
        error: error ? error.message : null,
      }))
    }

    load()
    return () => {
      alive = false
    }
  }, [user, authLoading, loadBookedSlots, patch])

  useEffect(() => {
    writeLocalPrefs({ prefs: state.prefs, dismissed: state.dismissed, followUp: state.followUp })
  }, [state.prefs, state.dismissed, state.followUp])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = state.prefs.theme
    root.dataset.scale = state.prefs.textScale
  }, [state.prefs.theme, state.prefs.textScale])

  const value = useMemo(() => {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0] ?? null
    const mine = profile ? state.appointments.filter((a) => a.profileId === profile.id) : []
    const now = Date.now()
    const withDoctor = (a) => ({ ...a, doctor: bySlug(a.doctorSlug), date: new Date(a.at) })

    const upcoming = mine
      .filter((a) => a.status === 'booked' && new Date(a.at).getTime() > now)
      .map(withDoctor)
      .sort((a, b) => a.date - b.date)

    const past = mine
      .filter((a) => a.status !== 'booked' || new Date(a.at).getTime() <= now)
      .map(withDoctor)
      .sort((a, b) => b.date - a.date)

    /** Anything needing a record of its own sends you to sign in first. */
    const requireAuth = () => {
      if (user) return true
      navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`)
      return false
    }

    const savePrefRow = async (row) => {
      if (!user) return
      const { error } = await supabase.from('user_prefs').upsert({ user_id: user.id, ...row })
      if (error) patch({ error: error.message })
    }

    /** Reports a failed write both in place and in the account-wide banner. */
    const fail = (error) => {
      const message = friendlyWriteError(error)
      patch({ error: message })
      return { error: message }
    }

    return {
      ...state,
      profile,
      upcoming,
      past,
      next: upcoming[0] || null,
      threads: toThreads(state.messages),
      takenFor: (doctorSlug) => new Set(state.bookedSlots.filter((s) => s.doctorSlug === doctorSlug).map((s) => s.key)),

      async book({ profileId, doctorSlug, at, mode, reason, insurance }) {
        if (!requireAuth()) return { error: 'Sign in to book a visit.' }
        const targetProfile = profileId ?? profile?.id
        if (!targetProfile) return { error: 'Add a patient profile before booking.' }

        const { data, error } = await supabase
          .from('appointments')
          .insert({ user_id: user.id, profile_id: targetProfile, doctor_slug: doctorSlug, at, mode, reason, insurance })
          .select()
          .single()
        if (error) return fail(error)

        const appointment = toAppointment(data)
        setState((prev) => ({
          ...prev,
          appointments: [...prev.appointments, appointment],
          bookedSlots: [...prev.bookedSlots, { doctorSlug, key: slotKey(at) }],
        }))
        loadAccessLog()
        return { appointment }
      },

      async reschedule(id, at, mode) {
        if (!requireAuth()) return { error: 'Sign in to change a visit.' }
        const previous = state.appointments.find((a) => a.id === id)
        const { data, error } = await supabase
          .from('appointments')
          .update({ at, mode })
          .eq('id', id)
          .select()
          .single()
        if (error) return fail(error)

        const appointment = toAppointment(data)
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? appointment : a)),
          bookedSlots: [
            ...prev.bookedSlots.filter((s) => !(previous && s.doctorSlug === previous.doctorSlug && s.key === slotKey(previous.at))),
            { doctorSlug: appointment.doctorSlug, key: slotKey(at) },
          ],
        }))
        loadAccessLog()
        return { appointment }
      },

      async cancel(id) {
        if (!requireAuth()) return { error: 'Sign in to change a visit.' }
        const previous = state.appointments.find((a) => a.id === id)
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
        if (error) return fail(error)

        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
          bookedSlots: prev.bookedSlots.filter((s) => !(previous && s.doctorSlug === previous.doctorSlug && s.key === slotKey(previous.at))),
        }))
        loadAccessLog()
        return {}
      },

      async joinWaitlist(doctorSlug) {
        if (!requireAuth()) return { error: 'Sign in to join a waitlist.' }
        if (!profile) return { error: 'Add a patient profile first.' }
        if (state.waitlist.some((w) => w.doctorSlug === doctorSlug && w.profileId === profile.id)) return {}

        const { data, error } = await supabase
          .from('waitlist')
          .insert({ user_id: user.id, profile_id: profile.id, doctor_slug: doctorSlug })
          .select()
          .single()
        if (error) return fail(error)
        setState((prev) => ({ ...prev, waitlist: [...prev.waitlist, toWaitlistEntry(data)] }))
        return {}
      },

      async leaveWaitlist(id) {
        if (!requireAuth()) return { error: 'Sign in first.' }
        const { error } = await supabase.from('waitlist').delete().eq('id', id)
        if (error) return fail(error)
        setState((prev) => ({ ...prev, waitlist: prev.waitlist.filter((w) => w.id !== id) }))
        return {}
      },

      async sendMessage(doctorSlug, text) {
        if (!requireAuth()) return { error: 'Sign in to message a care team.' }
        const body = text.trim()
        if (!body) return { error: 'Write a message first.' }

        const { data, error } = await supabase
          .from('messages')
          .insert({ user_id: user.id, doctor_slug: doctorSlug, sender: 'you', body })
          .select()
          .single()
        if (error) return fail(error)
        setState((prev) => ({ ...prev, messages: [...prev.messages, toMessage(data)] }))
        return {}
      },

      async switchProfile(id) {
        patch({ activeProfileId: id })
        await savePrefRow({ active_profile_id: id })
      },

      async dismiss(id) {
        const dismissed = state.dismissed.includes(id) ? state.dismissed : [...state.dismissed, id]
        patch({ dismissed })
        await savePrefRow({ dismissed })
      },

      async rememberFollowUp(followUp) {
        const record = { ...followUp, at: new Date().toISOString() }
        const dismissed = state.dismissed.filter((d) => d !== 'emergency-followup')
        patch({ followUp: record, dismissed })
        await savePrefRow({ follow_up: record, dismissed })
      },

      async setPref(key, prefValue) {
        patch({ prefs: { ...state.prefs, [key]: prefValue } })
        await savePrefRow(prefsToRow({ [key]: prefValue }))
      },

      /** Deletes this account's care data. Destructive, so it asks first. */
      async clearMyData() {
        if (!requireAuth()) return { error: 'Sign in first.' }
        if (!window.confirm('Delete your appointments, waitlist entries and messages? This cannot be undone.')) return {}

        const results = await Promise.all([
          supabase.from('appointments').delete().eq('user_id', user.id),
          supabase.from('waitlist').delete().eq('user_id', user.id),
          supabase.from('messages').delete().eq('user_id', user.id),
        ])
        const error = firstError(...results)
        if (error) return fail(error)

        const { slots } = await loadBookedSlots()
        setState((prev) => ({ ...prev, appointments: [], waitlist: [], messages: [], bookedSlots: slots, followUp: null, dismissed: [] }))
        await savePrefRow({ follow_up: null, dismissed: [] })
        loadAccessLog()
        return {}
      },
    }
  }, [state, user, navigate, location, patch, loadAccessLog, loadBookedSlots])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const value = useContext(Ctx)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}

/** Gentle, dismissible prompts for the dashboard. Nothing here is diagnostic. */
export function careSuggestions(store) {
  const out = []
  const { profile, upcoming, past, dismissed, prefs, followUp } = store
  if (!prefs.aiSuggestions || !profile) return out

  // Kept whether or not AI suggestions stay on elsewhere in the flow: someone
  // who was sent to the ER should not have to remember the name themselves.
  if (followUp && !upcoming.some((a) => a.doctorSlug === followUp.slug)) {
    out.push({
      id: 'emergency-followup',
      title: 'Follow-up care after your emergency',
      body: `The assistant lined up Dr. ${followUp.name}, ${specialtyLabel(followUp.specialty)}, for after ${followUp.reason}. Book when you are ready.`,
      action: { label: `See Dr. ${followUp.name.split(' ').pop()}`, to: `/doctor/${followUp.slug}` },
    })
  }

  const lastPhysical = past.find((a) => /physical|checkup|check-up/i.test(a.reason || ''))
  if (lastPhysical && Date.now() - lastPhysical.date.getTime() > 30 * DAY_MS) {
    const months = Math.round((Date.now() - lastPhysical.date.getTime()) / (30 * DAY_MS))
    out.push({
      id: 'physical',
      title: 'Annual physical is coming due',
      body: `${profile.name.split(' ')[0]}’s last checkup with Dr. ${lastPhysical.doctor.name} was ${months} month${months > 1 ? 's' : ''} ago.`,
      action: { label: 'Find a time', to: `/doctor/${lastPhysical.doctorSlug}` },
    })
  }
  if (past.some((a) => a.summary) && upcoming.length === 0) {
    out.push({
      id: 'followup',
      title: 'Want to book the follow-up?',
      body: 'Your last visit summary suggested a recheck. Same clinician, or we can suggest another.',
      action: { label: 'See options', to: '/find?q=' },
    })
  }
  if (profile.conditions?.includes('Mild asthma')) {
    out.push({
      id: 'asthma',
      title: 'Inhaler technique check',
      body: 'Paediatric guidance suggests reviewing inhaler technique at least once a year.',
      action: { label: 'Ask a clinician', to: '/assistant' },
    })
  }
  return out.filter((s) => !dismissed.includes(s.id))
}

/** Build an .ics file in the browser — no dependency needed. */
export function downloadIcs(appointment) {
  const doctor = bySlug(appointment.doctorSlug)
  const start = new Date(appointment.at)
  const end = new Date(start.getTime() + 30 * 60000)
  const stamp = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const escape = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CareCompass//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@carecompass`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`${appointment.mode === 'video' ? 'Video visit' : 'Visit'} with Dr. ${doctor.name}`)}`,
    `DESCRIPTION:${escape(appointment.reason || 'CareCompass appointment')}`,
    `LOCATION:${escape(appointment.mode === 'video' ? 'Secure video link in CareCompass' : `${doctor.practice}, ${doctor.address}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `carecompass-${doctor.slug}-${dayKey(start)}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

export { slotDate }
