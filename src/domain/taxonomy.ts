// Stable vocabulary: specialties, plans, languages, and the plain-language
// concerns people actually type. This does not move to the database with the
// provider directory — it is the taxonomy the directory is classified against.

import type { Specialty, SpecialtyName } from './types'

export const INSURANCE = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'UnitedHealthcare', 'Medicare', 'Self-pay'] as const

export const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Bengali', 'Arabic', 'ASL', 'French'] as const

/** Lowercases a specialty for mid-sentence use, but leaves ENT and OB-GYN alone. */
export const specialtyLabel = (name: string): string => (/[a-z]/.test(name) ? name.toLowerCase() : name)

export const SPECIALTIES: Specialty[] = [
  { name: 'Primary care', blurb: 'Checkups, everyday illness, referrals' },
  { name: 'Urgent care', blurb: 'Same-day help for non-emergencies' },
  { name: 'Dermatology', blurb: 'Skin, hair, nails, rashes, moles' },
  { name: 'Neurology', blurb: 'Headache, migraine, dizziness, numbness' },
  { name: 'Orthopedics', blurb: 'Joints, sports injuries, back pain' },
  { name: 'Pediatrics', blurb: 'Care for infants, children, teens' },
  { name: 'Cardiology', blurb: 'Heart, blood pressure, palpitations' },
  { name: 'Mental health', blurb: 'Anxiety, mood, sleep, therapy' },
  { name: 'OB-GYN', blurb: 'Reproductive and pregnancy care' },
  { name: 'Gastroenterology', blurb: 'Stomach, reflux, digestion' },
  { name: 'ENT', blurb: 'Ear, nose, throat, sinus, hearing' },
  { name: 'Endocrinology', blurb: 'Diabetes, thyroid, hormones' },
]

/** Plain-language concerns people actually type, mapped to who treats them. */
export const CONCERNS: ReadonlyArray<readonly [string, SpecialtyName]> = [
  ['knee pain', 'Orthopedics'],
  ['back pain', 'Orthopedics'],
  ['shoulder pain', 'Orthopedics'],
  ['headache', 'Neurology'],
  ['migraine', 'Neurology'],
  ['dizziness', 'Neurology'],
  ['skin rash', 'Dermatology'],
  ['acne', 'Dermatology'],
  ['mole check', 'Dermatology'],
  ['eczema', 'Dermatology'],
  ['anxiety', 'Mental health'],
  ['depression', 'Mental health'],
  ['trouble sleeping', 'Mental health'],
  ['annual physical', 'Primary care'],
  ['high blood pressure', 'Cardiology'],
  ['heart palpitations', 'Cardiology'],
  ['acid reflux', 'Gastroenterology'],
  ['stomach pain', 'Gastroenterology'],
  ['sinus infection', 'ENT'],
  ['sore throat', 'ENT'],
  ['hearing loss', 'ENT'],
  ['child fever', 'Pediatrics'],
  ['birth control', 'OB-GYN'],
  ['pregnancy care', 'OB-GYN'],
  ['thyroid', 'Endocrinology'],
  ['diabetes', 'Endocrinology'],
  ['flu symptoms', 'Urgent care'],
  ['covid test', 'Urgent care'],
]
