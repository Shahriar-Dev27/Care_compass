// Safety net for the triage rules: run with `npm run check`.
// These assertions cover the two things that must never regress — red flags
// routing to emergency, and every suggested specialty having a real clinician.

import assert from 'node:assert/strict'
import { assess, findRedFlags, matchCondition } from './triage.js'
import { DOCTORS } from '../data/directory.js'

const emergency = (text) => assess({ text, duration: '1–3 days', severity: 5, answer: '' })

assert.equal(emergency('crushing chest pain and my left arm feels numb').level, 'emergency')
assert.equal(emergency('I have trouble breathing since last night').level, 'emergency')
assert.equal(emergency('sudden worst headache of my life').level, 'emergency')
assert.equal(emergency('I keep thinking about hurting myself').crisis, true)

// Substring traps: "crushing" contains "shin", "ribs" contains "ibs".
assert.equal(matchCondition('crushing chest pain').id, 'general')
assert.equal(matchCondition('my ribs ache after a fall').id, 'general')
assert.equal(matchCondition('my knee is sore after running').id, 'knee')
assert.equal(matchCondition('feeling anxious and I cannot sleep').id, 'mood')
assert.equal(matchCondition('itchy rash on my arm').id, 'skin')

// Urgency escalates on severity and on the condition's own escalation answer.
assert.equal(assess({ text: 'sore knee', duration: '1–3 days', severity: 9 }).level, 'urgent')
assert.equal(assess({ text: 'sore knee', duration: '1–3 days', severity: 4, answer: 'No, I cannot bear weight' }).level, 'urgent')
assert.equal(assess({ text: 'sore knee', duration: 'More than a month', severity: 3, answer: 'Yes, with some discomfort' }).level, 'routine')

// No dead ends: anything triage can suggest must be bookable.
const specialties = new Set(DOCTORS.map((d) => d.specialty))
for (const text of [
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
]) {
  const result = assess({ text, duration: '4–7 days', severity: 4, answer: '' })
  assert.ok(specialties.has(result.specialty), `no clinician for ${result.specialty}`)
  if (result.alternative) assert.ok(specialties.has(result.alternative), `no clinician for ${result.alternative}`)
}

assert.equal(findRedFlags('routine checkup please').length, 0)

console.log('triage checks passed')
