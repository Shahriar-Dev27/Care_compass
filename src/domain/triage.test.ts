// Safety net for the triage rules. These assertions cover the two things that
// must never regress — red flags routing to emergency, and every suggested
// specialty having a real clinician behind it.

import { describe, expect, it } from 'vitest'
import { RED_FLAGS, assess, findRedFlags, matchCondition } from './triage'
import { specialtyLabel } from './taxonomy'
import { DOCTORS, bestIn } from '../features/directory/api/doctors'

const emergency = (text: string) => assess({ text, duration: '1–3 days', severity: 5, answer: '' })

describe('red flags', () => {
  it('routes to emergency care', () => {
    expect(emergency('crushing chest pain and my left arm feels numb').level).toBe('emergency')
    expect(emergency('I have trouble breathing since last night').level).toBe('emergency')
    expect(emergency('sudden worst headache of my life').level).toBe('emergency')
  })

  it('marks self-harm as a crisis', () => {
    expect(emergency('I keep thinking about hurting myself').crisis).toBe(true)
  })

  it('does not fire on routine text', () => {
    expect(findRedFlags('routine checkup please')).toHaveLength(0)
  })

  // A red flag missing either one is a dead end at the worst possible moment.
  it.each(RED_FLAGS)('$label carries first aid and a real follow-up clinician', (flag) => {
    expect(flag.aid.length).toBeGreaterThan(0)
    expect(flag.aid.every((step) => step.trim())).toBe(true)
    const doctor = bestIn(flag.followUp)
    expect(doctor.slug).toBeTruthy()
    expect(doctor.specialty).toBe(flag.followUp)
  })
})

describe('matchCondition', () => {
  // Substring traps: "crushing" contains "shin", "ribs" contains "ibs".
  it('respects word boundaries', () => {
    expect(matchCondition('crushing chest pain').id).toBe('general')
    expect(matchCondition('my ribs ache after a fall').id).toBe('general')
  })

  it('matches the obvious cases', () => {
    expect(matchCondition('my knee is sore after running').id).toBe('knee')
    expect(matchCondition('feeling anxious and I cannot sleep').id).toBe('mood')
    expect(matchCondition('itchy rash on my arm').id).toBe('skin')
  })
})

describe('urgency', () => {
  it('escalates on severity', () => {
    expect(assess({ text: 'sore knee', duration: '1–3 days', severity: 9 }).level).toBe('urgent')
  })

  it("escalates on the condition's own escalation answer", () => {
    expect(assess({ text: 'sore knee', duration: '1–3 days', severity: 4, answer: 'No, I cannot bear weight' }).level).toBe('urgent')
  })

  it('drops to routine for long-running, low-severity concerns', () => {
    expect(assess({ text: 'sore knee', duration: 'More than a month', severity: 3, answer: 'Yes, with some discomfort' }).level).toBe('routine')
  })
})

describe('no dead ends', () => {
  const specialties = new Set(DOCTORS.map((d) => d.specialty))

  it.each([
    'migraine behind my eye',
    'sore knee',
    'itchy rash',
    'feeling anxious',
    'acid reflux after meals',
    'heart palpitations',
    'sinus congestion',
    'pregnancy question',
    'my child has a fever',
    'thyroid and blood sugar',
    'something else entirely',
  ])('"%s" suggests a bookable specialty', (text) => {
    const result = assess({ text, duration: '4–7 days', severity: 4, answer: '' })
    expect(specialties).toContain(result.specialty)
    if (result.alternative) expect(specialties).toContain(result.alternative)
  })

  it('returns somebody for an unknown specialty rather than undefined', () => {
    expect(bestIn('Astrology').specialty).toBe('Primary care')
  })
})

it('keeps acronym specialties intact when lowercasing mid-sentence', () => {
  expect(specialtyLabel('ENT')).toBe('ENT')
  expect(specialtyLabel('OB-GYN')).toBe('OB-GYN')
  expect(specialtyLabel('Primary care')).toBe('primary care')
})
