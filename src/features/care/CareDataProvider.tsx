import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PostgrestError } from '@supabase/supabase-js'
import { slotKey, toThreads } from '../../domain/rows'
import type { Appointment, AppointmentView, PatientProfile, Thread, VisitMode } from '../../domain/types'
import { bySlug } from '../directory/api/doctors'
import { useAuth } from '../auth/AuthProvider'
import { usePrefs } from '../prefs/PrefsProvider'
import { savePrefRow } from '../prefs/api/prefs'
import { bookAppointment, cancelAppointment, rescheduleAppointment } from '../booking/api/appointments'
import { joinWaitlist as joinWaitlistRow, leaveWaitlist as leaveWaitlistRow } from './api/waitlist'
import { sendMessage as sendMessageRow } from './api/messages'
import { EMPTY_CARE, deleteCareData, loadAccessLog, loadBookedSlots, loadCareData, type CareData } from './api/careData'

type WriteResult = { error?: string; appointment?: Appointment }

type CareValue = CareData & {
  loading: boolean
  error: string | null
  profile: PatientProfile | null
  upcoming: AppointmentView[]
  past: AppointmentView[]
  next: AppointmentView | null
  threads: Thread[]
  takenFor: (doctorSlug: string) => Set<string>
  book: (input: {
    profileId?: string
    doctorSlug: string
    at: string
    mode: VisitMode
    reason: string
    insurance: string
  }) => Promise<WriteResult>
  reschedule: (id: string, at: string, mode: VisitMode) => Promise<WriteResult>
  cancel: (id: string) => Promise<WriteResult>
  joinWaitlist: (doctorSlug: string) => Promise<WriteResult>
  leaveWaitlist: (id: string) => Promise<WriteResult>
  sendMessage: (doctorSlug: string, text: string) => Promise<WriteResult>
  switchProfile: (id: string) => Promise<void>
  clearMyData: () => Promise<WriteResult>
}

const Ctx = createContext<CareValue | null>(null)

const friendlyWriteError = (error: PostgrestError): string =>
  error.code === '23505'
    ? 'That time was just booked by someone else. Please pick another slot.'
    : error.message || 'Something went wrong. Please try again.'

export function CareDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { clearSuggestionState } = usePrefs()
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState<CareData>(EMPTY_CARE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAccessLog = useCallback(async () => {
    const { data: accessLog } = await loadAccessLog()
    setData((prev) => ({ ...prev, accessLog }))
  }, [])

  useEffect(() => {
    if (authLoading) return undefined
    let alive = true
    setLoading(true)
    setError(null)

    // Signed out, the picker still needs to know which slots are gone.
    const load = user ? loadCareData() : loadBookedSlots().then((r) => ({ data: { ...EMPTY_CARE, bookedSlots: r.data }, error: r.error }))
    load.then(({ data: loaded, error: loadError }) => {
      if (!alive) return
      setData(loaded)
      setError(loadError ? loadError.message : null)
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [user, authLoading])

  const value = useMemo<CareValue>(() => {
    const profile = data.profiles.find((p) => p.id === data.activeProfileId) ?? data.profiles[0] ?? null
    const mine = profile ? data.appointments.filter((a) => a.profileId === profile.id) : []
    const now = Date.now()
    const withDoctor = (a: Appointment): AppointmentView => ({ ...a, doctor: bySlug(a.doctorSlug)!, date: new Date(a.at) })

    const upcoming = mine
      .filter((a) => a.status === 'booked' && new Date(a.at).getTime() > now)
      .map(withDoctor)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const past = mine
      .filter((a) => a.status !== 'booked' || new Date(a.at).getTime() <= now)
      .map(withDoctor)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    /** Anything needing a record of its own sends you to sign in first. */
    const requireAuth = (): boolean => {
      if (user) return true
      navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`)
      return false
    }

    /** Reports a failed write both in place and in the account-wide banner. */
    const fail = (writeError: PostgrestError): WriteResult => {
      const message = friendlyWriteError(writeError)
      setError(message)
      return { error: message }
    }

    return {
      ...data,
      loading,
      error,
      profile,
      upcoming,
      past,
      next: upcoming[0] ?? null,
      threads: toThreads(data.messages),
      takenFor: (doctorSlug) => new Set(data.bookedSlots.filter((s) => s.doctorSlug === doctorSlug).map((s) => s.key)),

      async book({ profileId, doctorSlug, at, mode, reason, insurance }) {
        if (!requireAuth() || !user) return { error: 'Sign in to book a visit.' }
        const targetProfile = profileId ?? profile?.id
        if (!targetProfile) return { error: 'Add a patient profile before booking.' }

        const { data: appointment, error: writeError } = await bookAppointment({
          userId: user.id,
          profileId: targetProfile,
          doctorSlug,
          at,
          mode,
          reason,
          insurance,
        })
        if (writeError || !appointment) return fail(writeError ?? ({ message: 'Booking failed.' } as PostgrestError))

        setData((prev) => ({
          ...prev,
          appointments: [...prev.appointments, appointment],
          bookedSlots: [...prev.bookedSlots, { doctorSlug, key: slotKey(at) }],
        }))
        refreshAccessLog()
        return { appointment }
      },

      async reschedule(id, at, mode) {
        if (!requireAuth()) return { error: 'Sign in to change a visit.' }
        const previous = data.appointments.find((a) => a.id === id)
        const { data: appointment, error: writeError } = await rescheduleAppointment(id, at, mode)
        if (writeError || !appointment) return fail(writeError ?? ({ message: 'Reschedule failed.' } as PostgrestError))

        setData((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? appointment : a)),
          bookedSlots: [
            ...prev.bookedSlots.filter((s) => !(previous && s.doctorSlug === previous.doctorSlug && s.key === slotKey(previous.at))),
            { doctorSlug: appointment.doctorSlug, key: slotKey(at) },
          ],
        }))
        refreshAccessLog()
        return { appointment }
      },

      async cancel(id) {
        if (!requireAuth()) return { error: 'Sign in to change a visit.' }
        const previous = data.appointments.find((a) => a.id === id)
        const { error: writeError } = await cancelAppointment(id)
        if (writeError) return fail(writeError)

        setData((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
          bookedSlots: prev.bookedSlots.filter((s) => !(previous && s.doctorSlug === previous.doctorSlug && s.key === slotKey(previous.at))),
        }))
        refreshAccessLog()
        return {}
      },

      async joinWaitlist(doctorSlug) {
        if (!requireAuth() || !user) return { error: 'Sign in to join a waitlist.' }
        if (!profile) return { error: 'Add a patient profile first.' }
        if (data.waitlist.some((w) => w.doctorSlug === doctorSlug && w.profileId === profile.id)) return {}

        const { data: entry, error: writeError } = await joinWaitlistRow(user.id, profile.id, doctorSlug)
        if (writeError || !entry) return fail(writeError ?? ({ message: 'Could not join the waitlist.' } as PostgrestError))
        setData((prev) => ({ ...prev, waitlist: [...prev.waitlist, entry] }))
        return {}
      },

      async leaveWaitlist(id) {
        if (!requireAuth()) return { error: 'Sign in first.' }
        const { error: writeError } = await leaveWaitlistRow(id)
        if (writeError) return fail(writeError)
        setData((prev) => ({ ...prev, waitlist: prev.waitlist.filter((w) => w.id !== id) }))
        return {}
      },

      async sendMessage(doctorSlug, text) {
        if (!requireAuth() || !user) return { error: 'Sign in to message a care team.' }
        const body = text.trim()
        if (!body) return { error: 'Write a message first.' }

        const { data: message, error: writeError } = await sendMessageRow(user.id, doctorSlug, body)
        if (writeError || !message) return fail(writeError ?? ({ message: 'Message not sent.' } as PostgrestError))
        setData((prev) => ({ ...prev, messages: [...prev.messages, message] }))
        return {}
      },

      async switchProfile(id) {
        setData((prev) => ({ ...prev, activeProfileId: id }))
        if (user) await savePrefRow(user.id, { active_profile_id: id })
      },

      /** Deletes this account's care data. Destructive, so it asks first. */
      async clearMyData() {
        if (!requireAuth() || !user) return { error: 'Sign in first.' }
        if (!window.confirm('Delete your appointments, waitlist entries and messages? This cannot be undone.')) return {}

        const { error: writeError } = await deleteCareData(user.id)
        if (writeError) return fail(writeError)

        const { data: slots } = await loadBookedSlots()
        setData((prev) => ({ ...prev, appointments: [], waitlist: [], messages: [], bookedSlots: slots }))
        await clearSuggestionState()
        refreshAccessLog()
        return {}
      },
    }
  }, [data, loading, error, user, navigate, location, refreshAccessLog, clearSuggestionState])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCare(): CareValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useCare must be used inside <CareDataProvider>')
  return value
}
