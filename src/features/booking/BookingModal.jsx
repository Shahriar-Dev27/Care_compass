import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Check, ChevronLeft, LockKeyhole, MapPin, ShieldCheck, Video, X } from 'lucide-react'
import { Avatar, Modal } from '../ui'
import { downloadIcs } from '../features/booking/ics'
import { useCare } from '../features/care/CareDataProvider'
import { useAuth } from '../features/auth/AuthProvider'
import { formatDay, formatSlot, formatTime, openDays } from '../domain/schedule'
import { INSURANCE } from '../domain/taxonomy'

export default function BookingModal({ doctor, slot: preselect = null, appointment = null, onClose }) {
  const care = useCare()
  const { user } = useAuth()
  const rescheduling = Boolean(appointment)
  const [step, setStep] = useState(1)
  const [slot, setSlot] = useState(preselect)
  const [dayKeySel, setDayKeySel] = useState(preselect?.key ?? null)
  const [mode, setMode] = useState(appointment?.mode ?? (doctor.telehealth ? 'video' : 'in-person'))
  const [reason, setReason] = useState(appointment?.reason ?? '')
  const [insurance, setInsurance] = useState(care.profile?.insurance ?? INSURANCE[0])
  const [forProfile, setForProfile] = useState(appointment?.profileId ?? care.profile?.id ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [booked, setBooked] = useState(null)

  const days = useMemo(() => openDays(doctor, care.takenFor(doctor.slug), 8), [doctor, care])
  const activeDay = days.find((d) => d.key === dayKeySel) || days[0]

  // The active profile can land a moment after the modal opens, right after a
  // sign-in redirect.
  useEffect(() => {
    if (!forProfile && care.profile) {
      setForProfile(care.profile.id)
      if (care.profile.insurance) setInsurance(care.profile.insurance)
    }
  }, [care.profile, forProfile])

  const confirm = async () => {
    if (!slot) {
      setError('Choose a day and time to continue.')
      setStep(1)
      return
    }
    if (!rescheduling && reason.trim().length < 4) {
      setError('Add a short reason for the visit so the clinician can prepare.')
      return
    }
    setError('')
    setSaving(true)
    const result = rescheduling
      ? await care.reschedule(appointment.id, slot.at.toISOString(), mode)
      : await care.book({
          profileId: forProfile,
          doctorSlug: doctor.slug,
          at: slot.at.toISOString(),
          mode,
          reason: reason.trim(),
          insurance,
        })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setBooked(result.appointment)
    setStep(3)
  }

  const stepTitle = booked ? 'Appointment confirmed' : step === 1 ? 'Choose a time' : 'Confirm details'

  return (
    <Modal className="booking-modal" labelledBy="booking-title" onClose={onClose}>
      <div className="booking-head">
          <div className="booking-doctor">
            <Avatar name={doctor.name} tint={doctor.tint} size={44} />
            <div>
              <b>Dr. {doctor.name}</b>
              <small>
                {doctor.specialty} · ${doctor.fee} per visit
              </small>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close booking">
            <X size={19} />
          </button>
        </div>

        {!booked && (
          <p className="booking-progress" aria-live="polite">
            <span>Step {step} of 2</span> · {stepTitle}
          </p>
        )}

        <div className="booking-body">
          {booked ? (
            <div className="booking-done">
              <span className="success-mark">
                <Check size={26} />
              </span>
              <h2 id="booking-title">{rescheduling ? 'Your visit was moved.' : 'You’re booked.'}</h2>
              <p>
                {mode === 'video' ? 'Secure video visit' : 'In-person visit'} with Dr. {doctor.name} on{' '}
                <b>{formatSlot(new Date(booked.at))}</b>.
              </p>
              <div className="confirm-card">
                <CalendarDays size={20} aria-hidden="true" />
                <div>
                  <small>{formatDay(new Date(booked.at))}</small>
                  <b>{formatTime(new Date(booked.at))} · 30 minutes</b>
                  <span>{mode === 'video' ? 'Join link opens 10 minutes early' : `${doctor.practice}, ${doctor.address}`}</span>
                </div>
              </div>
              <p className="muted small">
                This visit is saved to My Care Home. Email and text reminders are not sending yet in this pilot — add it to your calendar
                below and you will get the 2-hour alert from there. Free cancellation up to 2 hours before the visit.
              </p>
              <div className="booking-done-actions">
                <button className="btn btn-quiet" onClick={() => downloadIcs(booked)}>
                  <CalendarPlus size={17} /> Add to calendar
                </button>
                <Link className="btn btn-primary" to="/care" onClick={onClose}>
                  Go to My Care Home
                </Link>
              </div>
            </div>
          ) : step === 1 ? (
            <>
              <h2 id="booking-title" className="booking-h">
                {rescheduling ? 'Pick a new time' : 'Pick a time that works'}
              </h2>
              {days.length === 0 ? (
                <p className="muted">
                  No open slots in the next month. Joining the waitlist records your interest in My Care Home; automatic alerts arrive with
                  the first clinic pilot.
                </p>
              ) : (
                <>
                  <fieldset className="booking-field">
                    <legend>Day</legend>
                    <div className="chips day-chips">
                      {days.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          className="chip day-chip"
                          aria-pressed={activeDay?.key === d.key}
                          onClick={() => {
                            setDayKeySel(d.key)
                            setSlot(null)
                          }}
                        >
                          <small>{formatDay(d.date)}</small>
                          <b>{d.slots.length} open</b>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="booking-field">
                    <legend>Available times</legend>
                    <div className="chips">
                      {activeDay?.slots.map((s) => (
                        <button key={s.time} type="button" className="chip" aria-pressed={slot?.time === s.time && slot?.key === s.key} onClick={() => setSlot(s)}>
                          {formatTime(s.at)}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {doctor.telehealth && doctor.inPerson && (
                    <fieldset className="booking-field">
                      <legend>Visit type</legend>
                      <div className="chips">
                        <button type="button" className="chip" aria-pressed={mode === 'video'} onClick={() => setMode('video')}>
                          <Video size={15} /> Video
                        </button>
                        <button type="button" className="chip" aria-pressed={mode === 'in-person'} onClick={() => setMode('in-person')}>
                          <MapPin size={15} /> In person
                        </button>
                      </div>
                    </fieldset>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h2 id="booking-title" className="booking-h">
                Confirm your details
              </h2>
              <div className="booking-summary">
                <CalendarDays size={18} aria-hidden="true" />
                <span>
                  {formatSlot(slot.at)} · {mode === 'video' ? 'Video visit' : 'In person'}
                </span>
                <button className="link-btn" onClick={() => setStep(1)}>
                  Change
                </button>
              </div>

              {user ? (
                <div className="field">
                  <label htmlFor="booking-for">Who is this visit for?</label>
                  <select id="booking-for" value={forProfile} onChange={(e) => setForProfile(e.target.value)}>
                    {care.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.relation})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="policy-note">
                  <LockKeyhole size={16} aria-hidden="true" />
                  Appointments are kept in your health record, so you will be asked to sign in before this is confirmed.
                </p>
              )}

              <div className={`field ${error && reason.trim().length < 4 ? 'has-error' : ''}`}>
                <label htmlFor="booking-reason">Reason for visit</label>
                <input
                  id="booking-reason"
                  type="text"
                  value={reason}
                  placeholder="For example: recurring headaches for two weeks"
                  onChange={(e) => setReason(e.target.value)}
                  aria-describedby="reason-help"
                />
                <small id="reason-help">Shared only with this clinician and their care team.</small>
              </div>

              <div className="field">
                <label htmlFor="booking-insurance">Insurance</label>
                <select id="booking-insurance" value={insurance} onChange={(e) => setInsurance(e.target.value)}>
                  {INSURANCE.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <small>
                  {doctor.insurance.includes(insurance)
                    ? `Dr. ${doctor.name} accepts ${insurance}.`
                    : `Dr. ${doctor.name} does not list ${insurance}. You would pay the $${doctor.fee} self-pay rate.`}
                </small>
              </div>

              <p className="policy-note">
                <ShieldCheck size={16} aria-hidden="true" />
                Free cancellation up to 2 hours before. CareCompass takes no payment — the clinic bills you after the visit.
              </p>
            </>
          )}

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>

        {!booked && days.length > 0 && (
          <div className="booking-bar">
            {step === 2 ? (
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <ChevronLeft size={17} /> Back
              </button>
            ) : (
              <span className="booking-price">
                <b>${doctor.fee}</b> per visit
              </span>
            )}
            {step === 1 ? (
              <button
                className="btn btn-accent"
                disabled={!slot || saving}
                onClick={() => (rescheduling ? confirm() : setStep(2))}
              >
                {rescheduling ? (saving ? 'Moving…' : 'Confirm new time') : 'Continue'}
              </button>
            ) : (
              <button className="btn btn-accent" onClick={confirm} disabled={saving}>
                <LockKeyhole size={17} /> {saving ? 'Confirming…' : user ? 'Confirm booking' : 'Sign in and confirm'}
              </button>
            )}
          </div>
        )}
    </Modal>
  )
}
