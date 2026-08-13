// The seam between the app and provider data. Everything reads clinicians from
// here; only this file knows they currently come from a seed file rather than
// Postgres. Phase 2 replaces the bodies with Supabase queries and nothing else
// has to change.

import type { Doctor, SpecialtyName } from '../../../domain/types'
import { DOCTORS } from '../seed/doctors.seed'

export { DOCTORS }

export const bySlug = (slug: string): Doctor | undefined => DOCTORS.find((d) => d.slug === slug)

export const byId = (id: number): Doctor | undefined => DOCTORS.find((d) => d.id === id)

/**
 * Best-rated clinician in a specialty, for follow-up suggestions the assistant
 * makes by name. Falls back to primary care so it never returns nothing.
 */
export function bestIn(specialty: SpecialtyName | string): Doctor {
  const pool = DOCTORS.filter((d) => d.specialty === specialty)
  const list = pool.length ? pool : DOCTORS.filter((d) => d.specialty === 'Primary care')
  const [best] = [...list].sort((a, b) => b.rating - a.rating)
  if (!best) throw new Error('directory is empty: no clinician to fall back to')
  return best
}
