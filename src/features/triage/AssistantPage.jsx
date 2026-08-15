import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, ChevronLeft, Mic, Phone, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import DoctorCard from '../directory/DoctorCard'
import BookingModal from '../booking/BookingModal'
import { AiNote } from '../../ui'
import { DURATIONS, assess, findRedFlags, matchCondition } from '../../domain/triage'
import { searchDoctors, DEFAULT_FILTERS } from '../../domain/search'
import { specialtyLabel } from '../../domain/taxonomy'
import { DOCTORS, bestIn } from '../directory/api/doctors'
import { useCare } from '../care/CareDataProvider'
import { usePrefs } from '../prefs/PrefsProvider'
import { useReveal } from '../../lib/motion'

const STEPS = ['Describe', 'A few questions', 'Guidance']

// Chrome/Edge only; the button is hidden entirely when unsupported.
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function Assistant() {
  const care = useCare()
  const { rememberFollowUp } = usePrefs()
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [duration, setDuration] = useState('')
  const [severity, setSeverity] = useState(4)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [booking, setBooking] = useState(null)
  const recognition = useRef(null)
  const scope = useReveal([step])

  const condition = useMemo(() => matchCondition(text), [text])
  const result = useMemo(() => (step === 2 ? assess({ text, duration, severity, answer }) : null), [step, text, duration, severity, answer])

  const matches = useMemo(() => {
    if (!result) return []
    return searchDoctors(DOCTORS, '', { ...DEFAULT_FILTERS, specialty: result.specialty, sort: 'soonest' }, care.takenFor).slice(0, 3)
  }, [result, care])

  // An emergency ends with an ambulance, not a booking — but the visit after it
  // still has to happen. Naming a clinician now and remembering it means nobody
  // has to start the search over once they are home.
  const followUp = useMemo(() => (result?.level === 'emergency' ? bestIn(result.flags[0].followUp) : null), [result])

  useEffect(() => {
    if (!followUp) return
    rememberFollowUp({ slug: followUp.slug, name: followUp.name, specialty: followUp.specialty, reason: result.flags[0].label })
  }, [followUp])

  const dictate = () => {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const rec = new SpeechRecognition()
    recognition.current = rec
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = false
    rec.onresult = (e) => setText((prev) => `${prev}${prev ? ' ' : ''}${e.results[0][0].transcript}`)
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    setListening(true)
  }

  const toQuestions = (e) => {
    e.preventDefault()
    if (text.trim().length < 12) {
      setError('Add a little more detail — when it started, where it is, and how it feels all help.')
      return
    }
    setError('')
    // The promise made on this screen: anything with a red flag skips the
    // questions and goes straight to "call for help now".
    setStep(findRedFlags(text).length ? 2 : 1)
  }

  return (
    <div ref={scope} className="assistant-page">
      <div className="container assistant-shell">
        <aside className="assistant-rail" aria-label={`Step ${step + 1} of 3: ${STEPS[step]}`}>
          <ol>
            {STEPS.map((label, i) => (
              <li key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <p className="rail-note">
            <ShieldCheck size={17} aria-hidden="true" />
            This guided check never leaves your browser — nothing here is saved, sold, or used for advertising.
          </p>
        </aside>

        <main className="assistant-main">
          {step === 0 && (
            <form className="card assistant-card" onSubmit={toQuestions} noValidate>
              <span className="eyebrow">
                <Sparkles size={15} /> Care assistant · about 2 minutes
              </span>
              <h1>What is going on?</h1>
              <p className="lede">
                Use your own words. This suggests the right kind of clinician and how soon to be seen — it does not diagnose, and a person
                can take over at any point.
              </p>

              <div className={`field ${error ? 'has-error' : ''}`}>
                <label htmlFor="symptoms">Describe what you are feeling</label>
                <textarea
                  id="symptoms"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="For example: my knee has been sore after running for about two weeks, worse going downstairs"
                  aria-describedby="symptoms-help"
                  autoFocus
                />
                <div className="field-row">
                  <small id="symptoms-help">Include where it is, how long it has lasted, and what makes it better or worse.</small>
                  {SpeechRecognition && (
                    <button type="button" className={`btn btn-quiet btn-sm ${listening ? 'is-listening' : ''}`} onClick={dictate}>
                      <Mic size={16} /> {listening ? 'Listening…' : 'Dictate'}
                    </button>
                  )}
                </div>
                {error && (
                  <p className="error-text" role="alert">
                    <AlertTriangle size={15} /> {error}
                  </p>
                )}
              </div>

              <p className="policy-note">
                <ShieldCheck size={15} aria-hidden="true" />
                If you describe something that needs emergency care, this stops and tells you to call for help immediately.
              </p>

              <button className="btn btn-primary btn-lg" type="submit">
                Continue <ArrowRight size={18} />
              </button>
            </form>
          )}

          {step === 1 && (
            <div className="card assistant-card">
              <span className="eyebrow">
                <Sparkles size={15} /> Three quick questions
              </span>
              <h1>Help me narrow it down.</h1>

              <div className="field">
                <label htmlFor="duration">How long has this been going on?</label>
                <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="">Select a duration</option>
                  {DURATIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>

              <fieldset className="field">
                <legend>
                  How uncomfortable is it right now? <b>{severity}/10</b>
                </legend>
                <input type="range" min="1" max="10" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} aria-valuetext={`${severity} out of 10`} />
                <div className="range-ends">
                  <span>Barely noticeable</span>
                  <span>Unbearable</span>
                </div>
              </fieldset>

              <fieldset className="field">
                <legend>{condition.ask.q}</legend>
                <div className="chips">
                  {condition.ask.options.map((option) => (
                    <button key={option} type="button" className="chip" aria-pressed={answer === option} onClick={() => setAnswer(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="assistant-actions">
                <button className="btn btn-ghost" onClick={() => setStep(0)}>
                  <ChevronLeft size={17} /> Edit what I wrote
                </button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!duration || !answer}>
                  See my guidance <ArrowRight size={18} />
                </button>
              </div>
              {(!duration || !answer) && <p className="muted small">Answer both questions to continue.</p>}
            </div>
          )}

          {step === 2 && result && (
            <div className="assistant-result">
              {result.level === 'emergency' ? (
                <div className="card emergency-card" role="alert">
                  <span className="emergency-icon">
                    <AlertTriangle size={26} />
                  </span>
                  <h1>Get emergency help now.</h1>
                  <p>{result.reasons[0]} That needs to be assessed in person immediately — not through an online booking.</p>
                  <ol className="emergency-steps">
                    <li>Call your local emergency number (911 in the US) right now.</li>
                    {/* Flag-specific first aid: what genuinely helps in the minutes before help arrives. */}
                    {result.flags[0].aid.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    <li>Tell them exactly what you feel and when it started.</li>
                  </ol>
                  {result.crisis && (
                    <p className="crisis-note">
                      <Phone size={16} aria-hidden="true" />
                      If you are thinking about harming yourself, call or text <b>988</b> (US Suicide &amp; Crisis Lifeline). Someone is there
                      right now, day or night.
                    </p>
                  )}
                  {followUp && (
                    <div className="followup-note">
                      <p>
                        <b>For afterwards:</b> Dr. {followUp.name}, {specialtyLabel(followUp.specialty)} —{' '}
                        {followUp.focus.slice(0, 2).join(' and ').toLowerCase()}. Saved to My Care Home, so this is waiting for you when the
                        emergency is over.
                      </p>
                      <Link className="link-btn" to={`/doctor/${followUp.slug}`}>
                        See Dr. {followUp.name} <ArrowRight size={15} />
                      </Link>
                    </div>
                  )}
                  <button className="btn btn-quiet" onClick={() => setStep(0)}>
                    <ChevronLeft size={17} /> Review what I wrote
                  </button>
                </div>
              ) : (
                <>
                  <div className={`card level-card level-${result.tone}`}>
                    <div>
                      <span className="eyebrow">Suggested next step</span>
                      <h1>{result.label}</h1>
                      <p>
                        Start with <b>{specialtyLabel(result.specialty)}</b>. {result.reasons.join(' ')}
                      </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                      <ChevronLeft size={16} /> Change answers
                    </button>
                  </div>

                  <AiNote>
                    This is a suggestion based on what you described, not a diagnosis. A licensed clinician decides what is actually going on
                    — and you can always go to urgent care instead if you are worried.
                  </AiNote>

                  <div className="guidance-grid">
                    <section className="card">
                      <h2>Possible pattern</h2>
                      <p className="pattern">{result.condition.pattern}</p>
                      <p className="muted small">Patterns like this are common and often manageable. Only an examination can confirm the cause.</p>
                    </section>
                    <section className="card">
                      <h2>While you wait</h2>
                      <ul className="check-list">
                        {result.condition.selfCare.map((item) => (
                          <li key={item}>
                            <Check size={15} aria-hidden="true" /> {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className="card watch-card">
                    <AlertTriangle size={20} aria-hidden="true" />
                    <div>
                      <h2>Get urgent help if</h2>
                      <ul>
                        {result.condition.watchFor.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="matched-block">
                    <div className="matched-head">
                      <div>
                        <span className="eyebrow">
                          <Stethoscope size={15} /> Matched clinicians
                        </span>
                        <h2>{result.specialty} clinicians with the soonest openings</h2>
                      </div>
                      <Link className="link-btn" to={`/find?specialty=${encodeURIComponent(result.specialty)}`}>
                        See all <ArrowRight size={15} />
                      </Link>
                    </div>
                    <div className="results">
                      {matches.map(({ doctor, next }) => (
                        <DoctorCard
                          key={doctor.slug}
                          doctor={doctor}
                          next={next}
                          taken={care.takenFor(doctor.slug)}
                          onBook={(d, slot) => setBooking({ doctor: d, slot })}
                          onWaitlist={(d) => care.joinWaitlist(d.slug)}
                          waitlisted={care.waitlist.some((w) => w.doctorSlug === doctor.slug)}
                        />
                      ))}
                    </div>
                    <p className="muted small">
                      Prefer to be seen today? <Link to="/find?q=Urgent%20care&when=today">Urgent care options near you</Link>.
                    </p>
                  </section>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {booking && <BookingModal doctor={booking.doctor} slot={booking.slot} onClose={() => setBooking(null)} />}
    </div>
  )
}
