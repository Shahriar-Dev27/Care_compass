import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { toWaitlistEntry } from '../../../domain/rows'
import type { WaitlistEntry } from '../../../domain/types'

export async function joinWaitlist(
  userId: string,
  profileId: string,
  doctorSlug: string,
): Promise<{ data: WaitlistEntry | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('waitlist')
    .insert({ user_id: userId, profile_id: profileId, doctor_slug: doctorSlug })
    .select()
    .single()
  return { data: data ? toWaitlistEntry(data) : null, error }
}

export async function leaveWaitlist(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('waitlist').delete().eq('id', id)
  return { error }
}
