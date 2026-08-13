import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { toMessage } from '../../../domain/rows'
import type { Message } from '../../../domain/types'

export async function sendMessage(
  userId: string,
  doctorSlug: string,
  body: string,
): Promise<{ data: Message | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, doctor_slug: doctorSlug, sender: 'you', body })
    .select()
    .single()
  return { data: data ? toMessage(data) : null, error }
}
