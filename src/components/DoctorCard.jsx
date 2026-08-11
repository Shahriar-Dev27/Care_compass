import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarClock, Globe, MapPin, ShieldCheck, Video } from 'lucide-react'
import { Avatar, AiTag, Stars } from './Bits'
import { formatSlot, formatTime, openDays } from '../lib/schedule'

export default function DoctorCard({ doctor, next, taken, insurance, onBook, onWaitlist, waitlisted }) {
  const quickSlots = openDays(doctor, taken, 1)[0]?.slots.slice(0, 3) ?? []

  return (
    <article className="doctor-card" data-reveal>
      <div className="doctor-top">
        <Avatar name={doctor.name} tint={doctor.tint} size={58} />
        <div className="doctor-id">
          <h3>
            <Link to={`/doctor/${doctor.slug}`}>
              Dr. {doctor.name}, {doctor.credential}
            </Link>
            <span className="verified" title="Credentials verified by CareCompass">
              <BadgeCheck size={17} aria-hidden="true" />
              <span className="sr-only">Credentials verified</span>
            </span>
          </h3>
          <p className="doctor-meta">
            {doctor.specialty} · {doctor.years} years in practice
          </p>
          <div className="rating-row">
            <Stars value={doctor.rating} />
            <b>{doctor.rating.toFixed(1)}</b>
            <span>({doctor.reviewCount} verified reviews)</span>
          </div>
        </div>
        <div className="doctor-fee">
          <b>${doctor.fee}</b>
          <small>per visit</small>
        </div>
      </div>

      <ul className="focus-pills">
        {doctor.focus.slice(0, 4).map((f) => (
          <li key={f} className="pill">
            {f}
          </li>
        ))}
      </ul>

      <div className="doctor-facts">
        <span>
          <MapPin size={15} aria-hidden="true" />
          {doctor.inPerson ? `${doctor.distance} mi · ${doctor.practice}` : 'Video visits only'}
        </span>
        <span>
          <Video size={15} aria-hidden="true" />
          {doctor.telehealth && doctor.inPerson ? 'Video or in person' : doctor.telehealth ? 'Video visits' : 'In person'}
        </span>
        <span>
          <Globe size={15} aria-hidden="true" />
          {doctor.languages.join(', ')}
        </span>
        {insurance && (
          <span className={doctor.insurance.includes(insurance) ? 'fact-ok' : 'fact-no'}>
            <ShieldCheck size={15} aria-hidden="true" />
            {doctor.insurance.includes(insurance) ? `Accepts ${insurance}` : `Does not list ${insurance}`}
          </span>
        )}
      </div>

      <p className="ai-fit">
        <AiTag label="How this doctor fits you" /> {doctor.aiFit}
      </p>

      <div className="doctor-actions">
        {next ? (
          <div className="slot-line">
            <span className="pill pill-teal">
              <CalendarClock size={14} aria-hidden="true" /> Next available: {formatSlot(next.at)}
            </span>
            <div className="quick-slots">
              {quickSlots.map((slot) => (
                <button key={slot.time} type="button" className="chip" onClick={() => onBook(doctor, slot)}>
                  {formatTime(slot.at)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="pill pill-warn">
            <CalendarClock size={14} aria-hidden="true" /> Fully booked for the next month
          </span>
        )}

        <div className="doctor-buttons">
          <Link className="btn btn-quiet btn-sm" to={`/doctor/${doctor.slug}`}>
            View profile
          </Link>
          {next ? (
            <button type="button" className="btn btn-accent btn-sm" onClick={() => onBook(doctor)}>
              Book visit
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onWaitlist?.(doctor)} disabled={waitlisted}>
              {waitlisted ? 'On waitlist' : 'Join waitlist'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
