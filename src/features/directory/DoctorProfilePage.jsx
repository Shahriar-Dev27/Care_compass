import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Accessibility,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Globe,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import { Avatar, AiNote, Stars } from '../../ui'
import BookingModal from '../booking/BookingModal'
import { bySlug } from './api/doctors'
import { formatDay, formatTime, openDays } from '../../domain/schedule'
import { useCare } from '../care/CareDataProvider'
import { useReveal } from '../../lib/motion'

export default function DoctorProfile() {
  const { slug } = useParams()
  const care = useCare()
  const doctor = bySlug(slug)
  const [booking, setBooking] = useState(null)
  const [compose, setCompose] = useState(null) // null = closed, string = draft
  const [sent, setSent] = useState(false)
  const scope = useReveal([slug])

  const days = useMemo(() => (doctor ? openDays(doctor, care.takenFor(doctor.slug), 4) : []), [doctor, care])

  if (!doctor) {
    return (
      <div className="container section">
        <h1>We could not find that clinician</h1>
        <p className="lede">The profile may have been removed. Search again to see who is available.</p>
        <Link className="btn btn-primary" to="/find" style={{ marginTop: 20 }}>
          Back to search
        </Link>
      </div>
    )
  }

  const waitlisted = care.waitlist.some((w) => w.doctorSlug === doctor.slug)

  return (
    <div ref={scope} className="profile-page">
      <div className="container">
        <Link className="link-btn back-link" to="/find">
          <ArrowLeft size={16} /> All clinicians
        </Link>

        <div className="profile-layout">
          <main className="profile-main">
            <header className="profile-head card" data-reveal>
              <Avatar name={doctor.name} tint={doctor.tint} size={92} />
              <div>
                <h1>
                  Dr. {doctor.name}, {doctor.credential}
                </h1>
                <p className="profile-specialty">
                  {doctor.specialty} · {doctor.years} years in practice
                </p>
                <div className="rating-row">
                  <Stars value={doctor.rating} size={16} />
                  <b>{doctor.rating.toFixed(1)}</b>
                  <span>({doctor.reviewCount} sample reviews)</span>
                </div>
                <ul className="profile-badges">
                  <li className="pill pill-brand">
                    <BadgeCheck size={14} /> Licence verified
                  </li>
                  {doctor.telehealth && (
                    <li className="pill pill-teal">
                      <Video size={14} /> Video visits
                    </li>
                  )}
                  <li className="pill">
                    <Globe size={14} /> {doctor.languages.join(', ')}
                  </li>
                </ul>
              </div>
            </header>

            <section className="card profile-block" data-reveal>
              <h2>In their own words</h2>
              <blockquote className="philosophy">“{doctor.philosophy}”</blockquote>
              <AiNote title="How this doctor fits you">{doctor.aiFit}</AiNote>
            </section>

            <section className="card profile-block" data-reveal>
              <h2>Credentials and focus</h2>
              <dl className="cred-list">
                <div>
                  <dt>
                    <BadgeCheck size={16} aria-hidden="true" /> Board certification
                  </dt>
                  <dd>{doctor.boardCertified}</dd>
                </div>
                <div>
                  <dt>
                    <GraduationCap size={16} aria-hidden="true" /> Training
                  </dt>
                  <dd>{doctor.education}</dd>
                </div>
                <div>
                  <dt>
                    <MapPin size={16} aria-hidden="true" /> Practice
                  </dt>
                  <dd>
                    {doctor.practice}
                    {doctor.inPerson ? ` · ${doctor.address} · ${doctor.distance} mi away` : ''}
                  </dd>
                </div>
                <div>
                  <dt>
                    <Accessibility size={16} aria-hidden="true" /> Accessibility
                  </dt>
                  <dd>{doctor.accessibility.join(' · ')}</dd>
                </div>
              </dl>
              <ul className="focus-pills">
                {doctor.focus.map((f) => (
                  <li key={f} className="pill">
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card profile-block" data-reveal>
              <h2>Insurance accepted</h2>
              <ul className="focus-pills">
                {doctor.insurance.map((i) => (
                  <li key={i} className="pill pill-ok">
                    <ShieldCheck size={13} /> {i}
                  </li>
                ))}
              </ul>
              <p className="muted small">
                Self-pay visits are ${doctor.fee}. This pilot does not yet run a live eligibility check, so confirm coverage with your plan
                before the visit.
              </p>
            </section>

            <section className="card profile-block" data-reveal>
              <div className="reviews-head">
                <h2>Patient reviews</h2>
                <span className="pill pill-warn">
                  <Sparkles size={13} /> Sample reviews · pilot data
                </span>
              </div>
              <ul className="review-list">
                {doctor.reviews.map((r) => (
                  <li key={r.by}>
                    <div>
                      <Stars value={r.stars} size={13} />
                      <b>{r.by}</b>
                      <small>{r.when}</small>
                    </div>
                    <p>{r.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <aside className="profile-aside">
            <div className="card booking-aside" data-reveal>
              <div className="aside-price">
                <b>${doctor.fee}</b>
                <span>per visit · {doctor.telehealth && doctor.inPerson ? 'video or in person' : doctor.telehealth ? 'video' : 'in person'}</span>
              </div>

              {days.length ? (
                <>
                  <p className="aside-label">
                    <CalendarClock size={16} aria-hidden="true" /> Next available times
                  </p>
                  <div className="aside-days">
                    {days.map((d) => (
                      <div key={d.key}>
                        <b>{formatDay(d.date)}</b>
                        <div className="chips">
                          {d.slots.slice(0, 4).map((s) => (
                            <button key={s.time} className="chip" onClick={() => setBooking({ slot: s })}>
                              {formatTime(s.at)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-accent btn-block" onClick={() => setBooking({ slot: null })}>
                    See all times and book
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">No open times in the next month.</p>
                  <button
                    className="btn btn-primary btn-block"
                    disabled={waitlisted}
                    onClick={() => care.joinWaitlist(doctor.slug)}
                  >
                    {waitlisted ? 'You are on the waitlist' : 'Join the waitlist'}
                  </button>
                </>
              )}

              {compose === null ? (
                <button className="btn btn-quiet btn-block" onClick={() => { setCompose(''); setSent(false) }}>
                  <MessageSquare size={16} /> Message the care team
                </button>
              ) : (
                <form
                  className="aside-message"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const { error } = await care.sendMessage(doctor.slug, compose)
                    if (!error) {
                      setCompose(null)
                      setSent(true)
                    }
                  }}
                >
                  <label htmlFor="aside-msg">Message Dr. {doctor.name}’s care team</label>
                  <textarea
                    id="aside-msg"
                    rows={3}
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    placeholder="Ask a non-urgent question before booking"
                  />
                  <div className="aside-message-actions">
                    <button className="btn btn-primary btn-sm" type="submit" disabled={!compose.trim()}>
                      <MessageSquare size={15} /> Send
                    </button>
                    <button className="btn btn-quiet btn-sm" type="button" onClick={() => setCompose(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {sent && (
                <p className="muted small" role="status">
                  Sent. Read the reply in <Link to="/care#messages">My Care Home</Link>.
                </p>
              )}
              <p className="policy-note">
                <ShieldCheck size={15} aria-hidden="true" /> Free cancellation up to 2 hours before your visit.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {booking && <BookingModal doctor={doctor} slot={booking.slot} onClose={() => setBooking(null)} />}
    </div>
  )
}
