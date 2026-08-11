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
  Video,
} from 'lucide-react'
import { Avatar, AiNote, Stars } from '../components/Bits'
import BookingModal from '../components/BookingModal'
import { bySlug } from '../data/directory'
import { formatDay, formatTime, openDays } from '../lib/schedule'
import { useStore } from '../lib/store'
import { useReveal } from '../lib/motion'

export default function DoctorProfile() {
  const { slug } = useParams()
  const store = useStore()
  const doctor = bySlug(slug)
  const [booking, setBooking] = useState(null)
  const scope = useReveal([slug])

  const days = useMemo(() => (doctor ? openDays(doctor, store.takenFor(doctor.slug), 4) : []), [doctor, store])

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

  const waitlisted = store.waitlist.some((w) => w.doctorSlug === doctor.slug)

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
                  <span>({doctor.reviewCount} verified reviews)</span>
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
                Self-pay visits are ${doctor.fee}. Coverage is confirmed with your plan before the visit — you are never billed a surprise
                difference without being told first.
              </p>
            </section>

            <section className="card profile-block" data-reveal>
              <div className="reviews-head">
                <h2>Patient reviews</h2>
                <span className="pill pill-brand">
                  <ShieldCheck size={13} /> Only patients with a completed visit can review
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
                    onClick={() => store.joinWaitlist(doctor.slug)}
                  >
                    {waitlisted ? 'You are on the waitlist' : 'Alert me when a slot opens'}
                  </button>
                </>
              )}

              <button className="btn btn-quiet btn-block" onClick={() => store.sendMessage(doctor.slug, 'I have a question before booking.')}>
                <MessageSquare size={16} /> Message the care team
              </button>
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
