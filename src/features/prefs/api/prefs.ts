import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { DEFAULT_PREFS, toPrefs } from '../../../domain/rows'
import type { FollowUp, Prefs } from '../../../domain/types'
import type { TablesUpdate } from '../../../types/database.types'

/** Must stay in step with the inline theme script in index.html, which reads
 *  this key before React mounts to avoid a flash of the wrong theme. */
const LOCAL_KEY = 'carecompass.prefs.v2'

export type PrefState = { prefs: Prefs; dismissed: string[]; followUp: FollowUp | null }

/** Theme, text size and dismissals are useful before anyone signs in, so they
 *  are cached locally and written through to the account once there is one. */
export function readLocalPrefs(): PrefState {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') as Partial<PrefState>
    return {
      prefs: { ...DEFAULT_PREFS, ...saved.prefs },
      dismissed: saved.dismissed ?? [],
      followUp: saved.followUp ?? null,
    }
  } catch {
    return { prefs: { ...DEFAULT_PREFS }, dismissed: [], followUp: null }
  }
}

export function writeLocalPrefs({ prefs, dismissed, followUp }: PrefState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ prefs, dismissed, followUp }))
  } catch {
    // Private browsing with storage blocked: preferences just will not persist.
  }
}

export async function loadPrefs(): Promise<{ data: PrefState | null; error: PostgrestError | null }> {
  const { data, error } = await supabase.from('user_prefs').select('*').maybeSingle()
  if (!data) return { data: null, error }
  return {
    data: { prefs: toPrefs(data), dismissed: data.dismissed, followUp: (data.follow_up as FollowUp | null) ?? null },
    error,
  }
}

/** Upsert, because a first-time account has no user_prefs row yet. */
export async function savePrefRow(userId: string, row: TablesUpdate<'user_prefs'>): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, ...row })
  return { error }
}
