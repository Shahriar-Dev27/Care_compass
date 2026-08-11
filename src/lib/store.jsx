import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { DOCTORS, bySlug } from '../data/directory'
import { dayKey, nextAvailable, slotDate } from './schedule'

const KEY = 'carecompass.v1'
const DAY_MS = 86_400_000

const Ctx = createContext(null)

const uid = () => Math.random().toString(36).slice(2, 10)

function seed() {
  const past = new Date(Date.now() - 47 * DAY_MS)
  past.setHours(10, 30, 0, 0)
  const firstOpen = nextAvailable(DOCTORS[0])
  const upcoming = firstOpen ? firstOpen.at : new Date(Date.now() + 3 * DAY_MS)

  return {
    activeProfile: 'me',
    profiles: [
      {
        id: 'me',
        name: 'Jordan Lee',
        initials: 'JL',
        relation: 'You',
        dob: '1989-04-17',
        insurance: 'Blue Cross Blue Shield',
        memberId: 'BCB-••••-4821',
        medications: ['Sumatriptan 50mg, as needed', 'Vitamin D 1000 IU, daily'],
        allergies: ['Penicillin — rash'],
        conditions: ['Episodic migraine'],
      },
      {
        id: 'ari',
        name: 'Ari Lee',
        initials: 'AL',
        relation: 'Child, age 8',
        dob: '2017-09-02',
        insurance: 'Blue Cross Blue Shield',
        memberId: 'BCB-••••-4822',
        medications: ['Albuterol inhaler, as needed'],
        allergies: ['None recorded'],
        conditions: ['Mild asthma'],
      },
    ],
    appointments: [
      {
        id: uid(),
        profileId: 'me',
        doctorSlug: 'maya-chen',
        at: upcoming.toISOString(),
        mode: 'video',
        reason: 'Follow-up on recurring headaches',
        status: 'booked',
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        profileId: 'me',
        doctorSlug: 'maya-chen',
        at: past.toISOString(),
        mode: 'in-person',
        reason: 'Annual physical',
        status: 'booked',
        summary:
          'Blood pressure 118/76. Discussed headache frequency and sleep. Continue current plan, recheck in one year, keep a headache diary.',
        createdAt: new Date(past.getTime() - 5 * DAY_MS).toISOString(),
      },
    ],
    waitlist: [],
    threads: [
      {
        doctorSlug: 'maya-chen',
        messages: [
          {
            id: uid(),
            from: 'care-team',
            at: new Date(Date.now() - 2 * DAY_MS).toISOString(),
            text: 'Your headache diary came through — thank you. Bring it to the video visit and we will look at the pattern together.',
          },
        ],
      },
    ],
    dismissed: [],
    accessLog: [
      { id: uid(), who: 'You', what: 'Viewed your visit summary', at: new Date(Date.now() - 6 * 3600_000).toISOString() },
      { id: uid(), who: 'Dr. Maya Chen', what: 'Opened your intake notes before the upcoming visit', at: new Date(Date.now() - 2 * DAY_MS).toISOString() },
      { id: uid(), who: 'Riverside Family Health billing', what: 'Verified insurance eligibility', at: new Date(Date.now() - 9 * DAY_MS).toISOString() },
    ],
    prefs: {
      theme: 'light',
      textScale: 'base',
      reminderSms: true,
      reminderEmail: true,
      reminderPush: false,
      aiSuggestions: true,
    },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const saved = JSON.parse(raw)
    return { ...seed(), ...saved, prefs: { ...seed().prefs, ...saved.prefs } }
  } catch {
    return seed()
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'book':
      return { ...state, appointments: [...state.appointments, { id: uid(), status: 'booked', createdAt: new Date().toISOString(), ...action.appointment }] }
    case 'reschedule':
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.id ? { ...a, at: action.at, mode: action.mode ?? a.mode } : a)),
      }
    case 'cancel':
      return { ...state, appointments: state.appointments.map((a) => (a.id === action.id ? { ...a, status: 'cancelled' } : a)) }
    case 'waitlist':
      return state.waitlist.some((w) => w.doctorSlug === action.doctorSlug && w.profileId === state.activeProfile)
        ? state
        : { ...state, waitlist: [...state.waitlist, { id: uid(), doctorSlug: action.doctorSlug, profileId: state.activeProfile, at: new Date().toISOString() }] }
    case 'unwaitlist':
      return { ...state, waitlist: state.waitlist.filter((w) => w.id !== action.id) }
    case 'message': {
      const exists = state.threads.some((t) => t.doctorSlug === action.doctorSlug)
      const message = { id: uid(), from: 'you', at: new Date().toISOString(), text: action.text }
      return {
        ...state,
        threads: exists
          ? state.threads.map((t) => (t.doctorSlug === action.doctorSlug ? { ...t, messages: [...t.messages, message] } : t))
          : [...state.threads, { doctorSlug: action.doctorSlug, messages: [message] }],
      }
    }
    case 'profile':
      return { ...state, activeProfile: action.id }
    case 'dismiss':
      return { ...state, dismissed: [...state.dismissed, action.id] }
    case 'pref':
      return { ...state, prefs: { ...state.prefs, [action.key]: action.value } }
    case 'reset':
      return seed()
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = state.prefs.theme
    root.dataset.scale = state.prefs.textScale
  }, [state.prefs.theme, state.prefs.textScale])

  const value = useMemo(() => {
    const profile = state.profiles.find((p) => p.id === state.activeProfile) || state.profiles[0]
    const mine = state.appointments.filter((a) => a.profileId === profile.id)
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

    /** Slots already booked with a doctor, so the picker can never double-book. */
    const takenFor = (doctorSlug) =>
      new Set(
        state.appointments
          .filter((a) => a.doctorSlug === doctorSlug && a.status === 'booked')
          .map((a) => {
            const d = new Date(a.at)
            return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          }),
      )

    return {
      ...state,
      profile,
      upcoming,
      past,
      next: upcoming[0] || null,
      takenFor,
      book: (appointment) => dispatch({ type: 'book', appointment: { profileId: profile.id, ...appointment } }),
      reschedule: (id, at, mode) => dispatch({ type: 'reschedule', id, at, mode }),
      cancel: (id) => dispatch({ type: 'cancel', id }),
      joinWaitlist: (doctorSlug) => dispatch({ type: 'waitlist', doctorSlug }),
      leaveWaitlist: (id) => dispatch({ type: 'unwaitlist', id }),
      sendMessage: (doctorSlug, text) => dispatch({ type: 'message', doctorSlug, text }),
      switchProfile: (id) => dispatch({ type: 'profile', id }),
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
      setPref: (key, value) => dispatch({ type: 'pref', key, value }),
      resetDemo: () => dispatch({ type: 'reset' }),
    }
  }, [state])

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
  const { profile, upcoming, past, dismissed, prefs } = store
  if (!prefs.aiSuggestions) return out

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
