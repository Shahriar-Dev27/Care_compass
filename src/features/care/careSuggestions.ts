import { specialtyLabel } from '../../domain/taxonomy'
import type { AppointmentView, FollowUp, PatientProfile, Prefs } from '../../domain/types'

const DAY_MS = 86_400_000

export type Suggestion = {
  id: string
  title: string
  body: string
  action: { label: string; to: string }
}

/** Everything the prompts read, taken from both providers at the call site. */
type SuggestionInput = {
  profile: PatientProfile | null
  upcoming: AppointmentView[]
  past: AppointmentView[]
  prefs: Prefs
  dismissed: string[]
  followUp: FollowUp | null
}

/** Gentle, dismissible prompts for the dashboard. Nothing here is diagnostic. */
export function careSuggestions({ profile, upcoming, past, prefs, dismissed, followUp }: SuggestionInput): Suggestion[] {
  const out: Suggestion[] = []
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

  const lastPhysical = past.find((a) => /physical|checkup|check-up/i.test(a.reason))
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
  if (profile.conditions.includes('Mild asthma')) {
    out.push({
      id: 'asthma',
      title: 'Inhaler technique check',
      body: 'Paediatric guidance suggests reviewing inhaler technique at least once a year.',
      action: { label: 'Ask a clinician', to: '/assistant' },
    })
  }
  return out.filter((s) => !dismissed.includes(s.id))
}
