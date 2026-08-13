import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { toAppointment } from '../../../domain/rows'
import type { Appointment, VisitMode } from '../../../domain/types'

type Result<T> = { data: T | null; error: PostgrestError | null }

export type BookInput = {
  userId: string
  profileId: string
  doctorSlug: string
  /** ISO timestamp. */
  at: string
  mode: VisitMode
  reason: string
  insurance: string
}

export async function bookAppointment(input: BookInput): Promise<Result<Appointment>> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: input.userId,
      profile_id: input.profileId,
      doctor_slug: input.doctorSlug,
      at: input.at,
      mode: input.mode,
      reason: input.reason,
      insurance: input.insurance,
    })
    .select()
    .single()
  return { data: data ? toAppointment(data) : null, error }
}

export async function rescheduleAppointment(id: string, at: string, mode: VisitMode): Promise<Result<Appointment>> {
  const { data, error } = await supabase.from('appointments').update({ at, mode }).eq('id', id).select().single()
  return { data: data ? toAppointment(data) : null, error }
}

export async function cancelAppointment(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
  return { error }
}
