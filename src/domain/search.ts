// Directory search: fuzzy matching, filtering and ranking. Takes the clinician
// list as an argument rather than importing it, so this keeps working unchanged
// when the directory moves from a seed file to a Supabase query.

import { CONCERNS, SPECIALTIES, specialtyLabel } from './taxonomy'
import { nextAvailable } from './schedule'
import type { Doctor, Slot, SpecialtyName, TakenFor } from './types'

export type SortKey = 'best' | 'soonest' | 'rating' | 'distance' | 'fee'

export type Filters = {
  specialty: string
  insurance: string
  language: string
  gender: string
  visit: 'any' | 'video' | 'in-person'
  when: 'any' | 'today' | 'week'
  distance: string
  rating: string
  accessible: boolean
  sort: SortKey
}

export type Suggestion = {
  kind: 'Specialty' | 'Concern' | 'Doctor'
  label: string
  hint: string
  query?: string
  slug?: string
}

export type SearchResult = { doctor: Doctor; next: Slot | null }

const norm = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, ' ')

/** Damerau-lite edit distance, capped — enough for one-key typos. */
function close(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

const hit = (haystack: string, token: string): boolean => {
  const text = norm(haystack)
  if (text.includes(token)) return true
  return text.split(/[^a-z0-9]+/).some((word) => close(word, token))
}

export const DEFAULT_FILTERS: Filters = {
  specialty: '',
  insurance: '',
  language: '',
  gender: '',
  visit: 'any',
  when: 'any',
  distance: '',
  rating: '',
  accessible: false,
  sort: 'best',
}

export function suggest(doctors: Doctor[], query: string, limit = 7): Suggestion[] {
  const q = norm(query)
  if (!q) return []
  const out: Suggestion[] = []
  SPECIALTIES.forEach(({ name, blurb }) => {
    if (hit(name, q)) out.push({ kind: 'Specialty', label: name, hint: blurb, query: name })
  })
  CONCERNS.forEach(([term, specialty]) => {
    if (hit(term, q)) out.push({ kind: 'Concern', label: term, hint: `Usually handled by ${specialtyLabel(specialty)}`, query: term })
  })
  doctors.forEach((d) => {
    if (hit(d.name, q) || d.focus.some((f) => hit(f, q))) {
      out.push({ kind: 'Doctor', label: `Dr. ${d.name}`, hint: `${d.specialty} · ${d.practice}`, slug: d.slug })
    }
  })
  return out.slice(0, limit)
}

/** Maps a free-text query to the specialty most likely to handle it. */
export function specialtyFor(query: string): SpecialtyName | '' {
  const q = norm(query)
  if (!q) return ''
  const spec = SPECIALTIES.find((s) => hit(s.name, q))
  if (spec) return spec.name
  const concern = CONCERNS.find(([term]) => q.includes(term) || hit(term, q))
  return concern ? concern[1] : ''
}

function score(doctor: Doctor, query: string, filters: Filters, next: Slot | null): number {
  let s = doctor.rating * 8 + Math.min(doctor.years, 20)
  const q = norm(query)
  if (q) {
    if (hit(doctor.name, q)) s += 60
    if (hit(doctor.specialty, q)) s += 45
    if (doctor.focus.some((f) => hit(f, q))) s += 35
    const mapped = specialtyFor(q)
    if (mapped && mapped === doctor.specialty) s += 40
  }
  if (filters.insurance && doctor.insurance.includes(filters.insurance)) s += 12
  if (next) s += Math.max(0, 24 - (next.at.getTime() - Date.now()) / 3_600_000) // sooner ranks higher
  return s
}

export function searchDoctors(
  doctors: Doctor[],
  query: string,
  filters: Filters = DEFAULT_FILTERS,
  takenFor: TakenFor = () => new Set(),
): SearchResult[] {
  const q = norm(query)
  const mapped = specialtyFor(q)
  const endOfToday = new Date().setHours(23, 59, 59, 999)
  const endOfWeek = Date.now() + 7 * 86_400_000

  const rows = doctors
    .map((doctor) => ({ doctor, next: nextAvailable(doctor, takenFor(doctor.slug)) }))
    .filter(({ doctor, next }) => {
      if (q && !(hit(doctor.name, q) || hit(doctor.specialty, q) || doctor.focus.some((f) => hit(f, q)) || (mapped && mapped === doctor.specialty))) return false
      if (filters.specialty && doctor.specialty !== filters.specialty) return false
      if (filters.insurance && !doctor.insurance.includes(filters.insurance)) return false
      if (filters.language && !doctor.languages.includes(filters.language)) return false
      if (filters.gender && doctor.gender !== filters.gender) return false
      if (filters.visit === 'video' && !doctor.telehealth) return false
      if (filters.visit === 'in-person' && !doctor.inPerson) return false
      if (filters.distance && (!doctor.inPerson || doctor.distance > Number(filters.distance))) return false
      if (filters.rating && doctor.rating < Number(filters.rating)) return false
      if (filters.accessible && !doctor.accessibility.some((a) => /wheelchair|asl|sensory|hearing loop/i.test(a))) return false
      if (filters.when === 'today' && (!next || next.at.getTime() > endOfToday)) return false
      if (filters.when === 'week' && (!next || next.at.getTime() > endOfWeek)) return false
      return true
    })

  const sorters: Record<SortKey, (a: SearchResult, b: SearchResult) => number> = {
    best: (a, b) => score(b.doctor, q, filters, b.next) - score(a.doctor, q, filters, a.next),
    soonest: (a, b) => (a.next?.at.getTime() ?? Infinity) - (b.next?.at.getTime() ?? Infinity),
    rating: (a, b) => b.doctor.rating - a.doctor.rating,
    distance: (a, b) => a.doctor.distance - b.doctor.distance,
    fee: (a, b) => a.doctor.fee - b.doctor.fee,
  }
  // `sort` arrives from the URL, so it is not trusted to be a known key.
  return rows.sort(sorters[filters.sort] ?? sorters.best)
}
