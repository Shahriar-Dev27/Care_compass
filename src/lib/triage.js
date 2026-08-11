// Rule-based triage for the care assistant. It suggests a *specialty and an
// urgency level* — never a diagnosis — and always checks red flags first.
//
// ponytail: keyword rules, not a model. Swap `assess()` for a clinically
// evaluated inference service before this is used with real patients.

const RED_FLAGS = [
  { re: /chest (pain|pressure|tight|heav)/i, label: 'chest pain or pressure' },
  { re: /(can.?t|trouble|difficulty|short(ness)? of) breath/i, label: 'trouble breathing' },
  { re: /(worst|thunderclap).{0,20}headache|sudden.{0,15}(severe|worst).{0,15}headache/i, label: 'a sudden, severe "worst-ever" headache' },
  { re: /(slurred speech|face droop|weak(ness)? on one side|one side.{0,15}(numb|weak))/i, label: 'stroke warning signs' },
  { re: /(passed out|fainted|unconscious|unresponsive)/i, label: 'fainting or loss of consciousness' },
  { re: /(uncontrolled|heavy) bleeding|bleeding (that )?(won.?t|will not) stop/i, label: 'bleeding that will not stop' },
  {
    re: /(suicid|kill myself|end my life|(hurt|harm)(ing)? myself|self.?harm|want to die|don.?t want to (live|be here))/i,
    label: 'thoughts of self-harm',
    crisis: true,
  },
  { re: /stiff neck.{0,30}fever|fever.{0,30}stiff neck/i, label: 'fever with a stiff neck' },
  { re: /seizure|convulsion/i, label: 'a seizure' },
  { re: /(severe|sudden).{0,20}(abdominal|stomach) pain/i, label: 'sudden severe abdominal pain' },
  { re: /vision loss|lost (my )?vision|can.?t see/i, label: 'sudden vision loss' },
  { re: /overdose|poison(ed|ing)/i, label: 'a possible overdose or poisoning' },
]

// Word boundaries matter here: without them "crushing" matches "shin" and
// "ribs" matches "ibs", which sends people to the wrong specialty.
const CONDITIONS = [
  {
    id: 'headache',
    re: /\b(headache|migraine|temple)|head (hurts|pain)|behind (my )?eye/i,
    specialty: 'Neurology',
    fallback: 'Primary care',
    pattern: 'Primary headache, such as tension-type or migraine',
    ask: {
      q: 'Does light, sound, or movement make it noticeably worse?',
      options: ['Yes, clearly worse', 'A little', 'No'],
      escalateOn: [],
    },
    selfCare: [
      'Rest in a quiet, dimly lit room when the pain peaks',
      'Drink water regularly and avoid skipping meals',
      'Note the time of day, sleep, and food before each episode',
    ],
    watchFor: [
      'A sudden "worst-ever" headache',
      'Weakness, numbness, or confusion',
      'Fever with a stiff neck, or vision loss',
    ],
  },
  {
    id: 'knee',
    re: /\b(knee|ankle|shoulder|sprain|shin|shins|tendon|tendons|rotator)\b|hip pain|running injur/i,
    specialty: 'Orthopedics',
    fallback: 'Primary care',
    pattern: 'Overuse or soft-tissue injury',
    ask: {
      q: 'Can you put full weight on it and walk normally?',
      options: ['Yes, with some discomfort', 'Only with a limp', 'No, I cannot bear weight'],
      escalateOn: ['No, I cannot bear weight'],
    },
    selfCare: [
      'Reduce the activity that triggers it rather than stopping all movement',
      'Ice for 15 minutes after activity for the first few days',
      'Avoid new speed or distance increases until it settles',
    ],
    watchFor: ['A joint that gives way or locks', 'Rapid swelling within an hour of injury', 'Inability to bear weight'],
  },
  {
    id: 'skin',
    re: /\b(rash|rashes|acne|eczema|mole|moles|skin|hives|psoriasis|breakout)\b|\bitch/i,
    specialty: 'Dermatology',
    fallback: 'Primary care',
    pattern: 'Inflammatory or irritant skin reaction',
    ask: {
      q: 'Is the area spreading, or is it staying in one place?',
      options: ['Staying put', 'Slowly spreading', 'Spreading quickly'],
      escalateOn: ['Spreading quickly'],
    },
    selfCare: [
      'Photograph the area daily in the same light to track change',
      'Switch to a fragrance-free cleanser and moisturizer',
      'Avoid new products until a clinician has seen it',
    ],
    watchFor: ['Spreading redness with fever', 'A mole changing shape or colour', 'Blistering or peeling skin'],
  },
  {
    id: 'mood',
    re: /\b(anxi|depress|panic|stress|burnout|insomnia|overwhelm|mood)|can.?t sleep/i,
    specialty: 'Mental health',
    fallback: 'Primary care',
    pattern: 'Anxiety, low mood, or sleep disruption',
    ask: {
      q: 'Is this getting in the way of work, school, or relationships?',
      options: ['Not really', 'Somewhat', 'A great deal'],
      escalateOn: ['A great deal'],
    },
    selfCare: [
      'Keep a consistent wake-up time, even after a poor night',
      'Write down what you would want a clinician to know before the visit',
      'Tell one person you trust what you are dealing with',
    ],
    watchFor: ['Any thought of harming yourself', 'Being unable to keep up with daily basics', 'Using alcohol or drugs to cope'],
  },
  {
    id: 'stomach',
    re: /\b(stomach|nausea|nauseous|reflux|heartburn|diarrh|constipat|bloat|vomit|indigest)|\bibs\b/i,
    specialty: 'Gastroenterology',
    fallback: 'Primary care',
    pattern: 'Upper or lower digestive irritation',
    ask: {
      q: 'Have you noticed blood, black stools, or unexplained weight loss?',
      options: ['No', 'Not sure', 'Yes'],
      escalateOn: ['Yes'],
    },
    selfCare: [
      'Keep a short food and symptom log for a few days',
      'Stay hydrated with small, frequent sips',
      'Note whether symptoms track with meals, stress, or time of day',
    ],
    watchFor: ['Blood in stool or black stools', 'Severe pain that wakes you at night', 'Unexplained weight loss'],
  },
  {
    id: 'heart',
    re: /\b(palpitat|flutter)|heart rac|blood pressure|irregular heartbeat/i,
    specialty: 'Cardiology',
    fallback: 'Primary care',
    level: 'urgent',
    pattern: 'Rhythm or blood-pressure concern needing measurement',
    ask: {
      q: 'Do the episodes come with dizziness, fainting, or chest discomfort?',
      options: ['No', 'Sometimes dizzy', 'Yes'],
      escalateOn: ['Yes'],
    },
    selfCare: [
      'Record when episodes start, how long they last, and what you were doing',
      'Note caffeine, alcohol, and sleep before each episode',
      'Take blood-pressure readings at the same time each day if you have a cuff',
    ],
    watchFor: ['Chest pain or pressure', 'Fainting or near-fainting', 'Breathlessness at rest'],
  },
  {
    id: 'ent',
    re: /\b(sinus|earache|hearing|congestion|tonsil|vertigo|dizz)|sore throat|ear ache/i,
    specialty: 'ENT',
    fallback: 'Urgent care',
    pattern: 'Upper airway, sinus, or inner-ear irritation',
    ask: {
      q: 'How long has it lasted without improving?',
      options: ['Under a week', '1–3 weeks', 'Over a month'],
      escalateOn: [],
    },
    selfCare: [
      'Use saline rinses or steam for congestion',
      'Rest your voice if your throat is involved',
      'Track fever readings rather than estimating',
    ],
    watchFor: ['Fever above 39°C / 102°F', 'Difficulty swallowing or breathing', 'Sudden hearing loss in one ear'],
  },
  {
    id: 'pregnancy',
    re: /\b(pregnan|period|menstrual|contracept|menopause|pelvic)|ob.?gyn/i,
    specialty: 'OB-GYN',
    fallback: 'Primary care',
    pattern: 'Reproductive or hormonal health concern',
    ask: {
      q: 'Is there bleeding that is heavier or different from your usual pattern?',
      options: ['No', 'Somewhat', 'Yes, much heavier'],
      escalateOn: ['Yes, much heavier'],
    },
    selfCare: [
      'Track cycle dates and symptom days before the visit',
      'Bring a list of any hormonal medication you take',
      'Note any new pain, its location, and its timing',
    ],
    watchFor: ['Soaking through a pad every hour', 'Severe one-sided pelvic pain', 'Fever with pelvic pain'],
  },
  {
    id: 'child',
    re: /my (kid|child|son|daughter|baby|toddler)|infant|newborn|fever in/i,
    specialty: 'Pediatrics',
    fallback: 'Urgent care',
    pattern: 'Childhood illness needing a paediatric assessment',
    ask: {
      q: 'Are they drinking fluids and staying alert between symptoms?',
      options: ['Yes, mostly normal', 'Less than usual', 'No, very drowsy or not drinking'],
      escalateOn: ['No, very drowsy or not drinking'],
    },
    selfCare: [
      'Offer small amounts of fluid often rather than large drinks',
      'Record temperatures with times rather than estimating',
      'Keep them home from school or daycare while fever lasts',
    ],
    watchFor: ['A rash that does not fade when pressed', 'Drowsiness or being difficult to wake', 'Fewer wet nappies or trips to the toilet'],
  },
  {
    id: 'endocrine',
    re: /\b(diabet|thyroid|hormone)|blood sugar|\ba1c\b|weight (gain|loss)/i,
    specialty: 'Endocrinology',
    fallback: 'Primary care',
    pattern: 'Metabolic or hormonal pattern needing lab review',
    ask: {
      q: 'Have you had blood work for this in the last twelve months?',
      options: ['Yes, recently', 'Over a year ago', 'Never'],
      escalateOn: [],
    },
    selfCare: [
      'Gather any recent lab results before the appointment',
      'Note changes in thirst, energy, appetite, and weight',
      'List every supplement and medication you take',
    ],
    watchFor: ['Confusion or severe drowsiness', 'Vomiting with high blood sugar', 'Chest pain or breathlessness'],
  },
]

const FALLBACK = {
  id: 'general',
  specialty: 'Primary care',
  fallback: 'Urgent care',
  pattern: 'A general concern best assessed by primary care',
  ask: {
    q: 'Is this getting better, staying the same, or getting worse?',
    options: ['Getting better', 'Staying the same', 'Getting worse'],
    escalateOn: ['Getting worse'],
  },
  selfCare: [
    'Write down when it started and what changes it',
    'Note anything that makes it better or worse',
    'Bring a list of your current medications',
  ],
  watchFor: ['Symptoms that worsen quickly', 'A fever that will not come down', 'Anything that frightens you — trust that instinct'],
}

export const DURATIONS = ['Less than 24 hours', '1–3 days', '4–7 days', '1–4 weeks', 'More than a month']

export function findRedFlags(text) {
  return RED_FLAGS.filter((f) => f.re.test(text))
}

export function matchCondition(text) {
  return CONDITIONS.find((c) => c.re.test(text)) || FALLBACK
}

const LEVELS = {
  emergency: { label: 'Emergency care now', tone: 'danger' },
  urgent: { label: 'Same-day or urgent care', tone: 'warn' },
  soon: { label: 'Book within 24–48 hours', tone: 'brand' },
  routine: { label: 'Routine visit this week', tone: 'ok' },
}

/**
 * @param {{ text: string, duration?: string, severity?: number, answer?: string }} input
 */
export function assess({ text, duration = '', severity = 4, answer = '' }) {
  const flags = findRedFlags(text)
  const condition = matchCondition(text)

  if (flags.length) {
    return {
      level: 'emergency',
      ...LEVELS.emergency,
      condition,
      flags,
      crisis: flags.some((f) => f.crisis),
      specialty: 'Urgent care',
      reasons: flags.map((f) => `You mentioned ${f.label}.`),
    }
  }

  let level = condition.level || 'soon'
  const reasons = []

  if (severity >= 8) {
    level = 'urgent'
    reasons.push(`You rated the discomfort ${severity} out of 10.`)
  }
  if (condition.ask?.escalateOn?.includes(answer)) {
    level = 'urgent'
    reasons.push(`You answered “${answer}”, which is worth checking sooner.`)
  }
  if (level !== 'urgent' && (duration === 'More than a month' || duration === '1–4 weeks')) {
    level = 'routine'
    reasons.push(`This has been going on for ${duration.toLowerCase()}, so a scheduled visit fits better than urgent care.`)
  }
  if (!reasons.length) {
    reasons.push(`What you described lines up with concerns ${condition.specialty.toLowerCase()} clinicians see regularly.`)
  }

  return {
    level,
    ...LEVELS[level],
    condition,
    flags: [],
    crisis: false,
    specialty: level === 'urgent' && condition.fallback === 'Urgent care' ? 'Urgent care' : condition.specialty,
    alternative: condition.fallback,
    reasons,
  }
}
