import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { slotKey, toAppointment, toLogEntry, toMessage, toProfile, toWaitlistEntry } from '../../../domain/rows'
import type { Appointment, BookedSlot, LogEntry, Message, PatientProfile, WaitlistEntry } from '../../../domain/types'

export type CareData = {
  profiles: PatientProfile[]
  appointments: Appointment[]
  waitlist: WaitlistEntry[]
  messages: Message[]
  accessLog: LogEntry[]
  bookedSlots: BookedSlot[]
  activeProfileId: string | null
}

export const EMPTY_CARE: CareData = {
  profiles: [],
  appointments: [],
  waitlist: [],
  messages: [],
  accessLog: [],
  bookedSlots: [],
  activeProfileId: null,
}

const firstError = (...results: { error: PostgrestError | null }[]): PostgrestError | null =>
  results.find((r) => r.error)?.error ?? null

/** Slots taken across every patient, so the picker cannot offer one twice. The
 *  RPC returns only a slug and a time — no patient data leaves the database. */
export async function loadBookedSlots(): Promise<{ data: BookedSlot[]; error: PostgrestError | null }> {
  const { data, error } = await supabase.rpc('booked_slots')
  return { data: (data ?? []).map((row) => ({ doctorSlug: row.doctor_slug, key: slotKey(row.at) })), error }
}

export async function loadAccessLog(): Promise<{ data: LogEntry[]; error: PostgrestError | null }> {
  const { data, error } = await supabase.from('access_log').select('*').order('at', { ascending: false }).limit(50)
  return { data: (data ?? []).map(toLogEntry), error }
}

export async function loadCareData(): Promise<{ data: CareData; error: PostgrestError | null }> {
  const [slotRes, profileRes, apptRes, waitRes, msgRes, logRes, activeRes] = await Promise.all([
    loadBookedSlots(),
    supabase.from('patient_profiles').select('*').order('is_self', { ascending: false }).order('created_at'),
    supabase.from('appointments').select('*').order('at'),
    supabase.from('waitlist').select('*').order('created_at'),
    supabase.from('messages').select('*').order('created_at'),
    loadAccessLog(),
    supabase.from('user_prefs').select('active_profile_id').maybeSingle(),
  ])

  const profiles = (profileRes.data ?? []).map(toProfile)
  return {
    data: {
      profiles,
      appointments: (apptRes.data ?? []).map(toAppointment),
      waitlist: (waitRes.data ?? []).map(toWaitlistEntry),
      messages: (msgRes.data ?? []).map(toMessage),
      accessLog: logRes.data,
      bookedSlots: slotRes.data,
      activeProfileId: activeRes.data?.active_profile_id ?? profiles[0]?.id ?? null,
    },
    error: firstError(slotRes, profileRes, apptRes, waitRes, msgRes, logRes, activeRes),
  }
}

/** Deletes this account's care data. The profile itself is kept — it is created
 *  by a signup trigger and deleting it would break the foreign keys. */
export async function deleteCareData(userId: string): Promise<{ error: PostgrestError | null }> {
  const results = await Promise.all([
    supabase.from('appointments').delete().eq('user_id', userId),
    supabase.from('waitlist').delete().eq('user_id', userId),
    supabase.from('messages').delete().eq('user_id', userId),
  ])
  return { error: firstError(...results) }
}
