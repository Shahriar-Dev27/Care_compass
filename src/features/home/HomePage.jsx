import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Clock3,
  Languages,
  LockKeyhole,
  MessageSquareHeart,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import SearchField from '../directory/SearchField'
import { Avatar, AiTag, Stars } from '../../ui'
import { SPECIALTIES } from '../../domain/taxonomy'
import { DOCTORS } from '../directory/api/doctors'
import { daySlots, formatSlot, nextAvailable } from '../../domain/schedule'
import { gsap, reducedMotion, useReveal } from '../../lib/motion'
import { useCare } from '../care/CareDataProvider'

const STEPS = [
  {
    icon: Search,
    title: 'Say what is going on',
    body: 'Type a symptom, a specialty, or a doctor’s name. The assistant can ask a few questions if you are not sure where to start.',
  },
  {
    icon: ClipboardList,
    title: 'Compare real options',
    body: 'See live availability, verified credentials, honest reviews, and whether each clinician takes your plan — before you commit.',
  },
  {
    icon: CalendarCheck,
    title: 'Book and get on with your day',
    body: 'Pick a slot, confirm instantly, and manage everything — rescheduling, cancelling, messages, calendar — from one screen.',
  },
]

export default function Home() {
  const care = useCare()
  const [insurance, setInsurance] = useState('')
  const hero = useRef(null)
  const scope = useReveal([])

  const todayCount = useMemo(
    () => DOCTORS.reduce((sum, d) => sum + daySlots(d, new Date(), care.takenFor(d.slug)).length, 0),
    [care],
  )

  const soonest = useMemo(
    () =>
      DOCTORS.map((d) => ({ doctor: d, next: nextAvailable(d, care.takenFor(d.slug)) }))
        .filter((r) => r.next)
        .sort((a, b) => a.next.at - b.next.at)
        .slice(0, 3),
    [care],
  )

  useLayoutEffect(() => {
    if (reducedMotion()) return undefined
    const ctx = gsap.context(() => {
      // fromTo, not from: ScrollSmoother's first refresh invalidates in-flight
      // `from` tweens and re-reads the current transform as their end value,
      // which strands the hero cards mid-animation.
      const rise = (y, duration, extra = {}) => [
        { y, opacity: 0 },
        { y: 0, opacity: 1, duration, ...extra },
      ]

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.hero-eyebrow', ...rise(18, 0.5))
        .fromTo('.hero-title > span', ...rise(34, 0.75, { stagger: 0.09 }), '-=0.25')
        .fromTo('.hero-lede', ...rise(20, 0.6), '-=0.45')
        .fromTo('.hero-search-wrap', ...rise(24, 0.6), '-=0.4')
        .fromTo('.hero-quick li', ...rise(14, 0.4, { stagger: 0.05 }), '-=0.35')
        .fromTo('.hero-assurance li', ...rise(12, 0.45, { stagger: 0.07 }), '-=0.25')
        .fromTo('.hero-card', ...rise(40, 0.7, { stagger: 0.12 }), '-=0.7')

      gsap.utils.toArray('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count)
        const obj = { n: 0 }
        gsap.to(obj, {
          n: target,
          duration: 1.2,
          ease: 'power1.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: () => {
            el.textContent = Math.round(obj.n).toLocaleString()
          },
        })
      })
    }, hero)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={scope}>
      <section className="hero" ref={hero}>
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">
              <span className="live-dot" aria-hidden="true" />
              {todayCount} appointments open today
            </span>
            <h1 className="hero-title">
              <span>Find the right doctor.</span>
              <span className="hero-accent">Book in two minutes.</span>
            </h1>
            <p className="lede hero-lede">
              Search by how you feel, not by medical jargon. Compare clinicians who actually have time this week, and confirm a real
              appointment on the spot.
            </p>

            <div className="hero-search-wrap">
              <SearchField variant="hero" insurance={insurance} onInsurance={setInsurance} />
            </div>

            <ul className="hero-quick">
              {['Headache', 'Knee pain', 'Anxiety', 'Annual physical', 'Skin rash', 'Child fever'].map((term) => (
                <li key={term}>
                  <Link className="chip" to={`/find?q=${encodeURIComponent(term)}`}>
                    {term}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="hero-assurance">
              <li>
                <ShieldCheck size={17} aria-hidden="true" /> Encrypted in transit and at rest
              </li>
              <li>
                <BadgeCheck size={17} aria-hidden="true" /> Your record is never sent to the AI
              </li>
              <li>
                <CalendarCheck size={17} aria-hidden="true" /> Real calendars, instant confirmation
              </li>
            </ul>
          </div>

          <div className="hero-visual" data-speed="0.92" aria-label="Clinicians with the soonest openings">
            <div className="hero-card hero-card-head">
              <span className="pill pill-teal">
                <CalendarClock size={14} /> Soonest openings near you
              </span>
            </div>
            {soonest.map(({ doctor, next }) => (
              <Link key={doctor.slug} to={`/doctor/${doctor.slug}`} className="hero-card hero-doctor">
                <Avatar name={doctor.name} tint={doctor.tint} size={46} />
                <div>
                  <b>Dr. {doctor.name}</b>
                  <small>{doctor.specialty}</small>
                  <span className="rating-row">
                    <Stars value={doctor.rating} size={12} />
                    <b>{doctor.rating.toFixed(1)}</b>
                  </span>
                </div>
                <span className="hero-slot">{formatSlot(next.at)}</span>
              </Link>
            ))}
            <div className="hero-card hero-ai">
              <AiTag />
              <p>“Knee pain after running for two weeks” usually points to orthopedics — the assistant checks before it suggests.</p>
              <Link className="link-btn" to="/assistant">
                Try the care assistant <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="stat-strip">
        <div className="container">
          <ul>
            {/* Counted from the directory itself, so these cannot drift from what
                the site actually offers. No invented adoption metrics. */}
            <li data-reveal>
              <b>
                <span data-count={SPECIALTIES.length}>0</span>
              </b>
              <span>specialties, from primary care to neurology</span>
            </li>
            <li data-reveal data-reveal-delay="0.08">
              <b>
                <span data-count={DOCTORS.length}>0</span>
              </b>
              <span>clinicians in the pilot directory</span>
            </li>
            <li data-reveal data-reveal-delay="0.16">
              <b>
                <span data-count={DOCTORS.filter((d) => d.telehealth).length}>0</span>
              </b>
              <span>offering same-week video visits</span>
            </li>
            <li className="stat-trust" data-reveal data-reveal-delay="0.24">
              <LockKeyhole size={20} aria-hidden="true" />
              <span>
                Your health details are encrypted, never sold, and never used to set prices.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section container" id="how">
        <div className="section-head" data-reveal>
          <span className="eyebrow">How CareCompass works</span>
          <h2>Three steps, no phone tag.</h2>
          <p className="lede">
            Most people give up on booking because it takes five calls and a hold queue. This is the whole process.
          </p>
        </div>
        <ol className="step-grid">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="step-card" data-reveal data-reveal-delay={i * 0.08}>
              <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="assistant-band">
        <div className="container assistant-band-grid">
          <div data-reveal>
            <span className="eyebrow">
              <Sparkles size={15} /> Care assistant
            </span>
            <h2>Not sure who you should even see?</h2>
            <p className="lede">
              Describe it in your own words. The assistant asks two or three clarifying questions, then suggests a specialty and an urgency
              level — never a diagnosis. If anything you say sounds like an emergency, it stops and tells you to get help immediately.
            </p>
            <ul className="assistant-points">
              <li>
                <MessageSquareHeart size={18} aria-hidden="true" /> Plain language in, plain language out
              </li>
              <li>
                <Stethoscope size={18} aria-hidden="true" /> Hands you straight to matched, available clinicians
              </li>
              <li>
                <Languages size={18} aria-hidden="true" /> Filter for clinicians who speak your language, including ASL
              </li>
            </ul>
            <Link className="btn btn-primary btn-lg" to="/assistant">
              Start the care assistant <ArrowRight size={18} />
            </Link>
          </div>

          <div className="assistant-preview card" data-reveal data-reveal-delay="0.1">
            <div className="bubble bubble-you">My knee has hurt after running for about two weeks.</div>
            <div className="bubble bubble-ai">Can you put full weight on it and walk normally?</div>
            <div className="bubble bubble-you">Yes, with some discomfort.</div>
            <div className="bubble bubble-ai">
              That points to <b>orthopedics</b>, and it can wait for a scheduled visit this week. Here are three clinicians who treat running
              injuries and have openings.
            </div>
            <p className="preview-note">
              <Sparkles size={14} aria-hidden="true" /> Example conversation. Guidance only — a clinician makes the diagnosis.
            </p>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head" data-reveal>
          <span className="eyebrow">Browse by need</span>
          <h2>Start where it hurts.</h2>
        </div>
        <ul className="specialty-grid">
          {SPECIALTIES.map(({ name, blurb }, i) => (
            <li key={name} data-reveal data-reveal-delay={(i % 4) * 0.05}>
              <Link to={`/find?specialty=${encodeURIComponent(name)}`}>
                <b>{name}</b>
                <small>{blurb}</small>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section container">
        <div className="trust-grid">
          <div className="section-head" data-reveal>
            <span className="eyebrow">Why people trust it</span>
            <h2>Reliability is the product.</h2>
            <p className="lede">
              A booking platform that shows a slot which is not really open has failed. These are the commitments the whole experience is
              built around.
            </p>
            <Link className="link-btn" to="/trust">
              Read the plain-language privacy notice <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="trust-cards">
            <li className="card" data-reveal>
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>Your data stays yours</h3>
              <p>Encrypted in transit and at rest, never sold, and readable only by your signed-in account — enforced in the database, not by hiding buttons.</p>
            </li>
            <li className="card" data-reveal data-reveal-delay="0.08">
              <BadgeCheck size={22} aria-hidden="true" />
              <h3>The AI never sees your record</h3>
              <p>Emergency checks run in your browser. Only the words you type in chat reach a model — never your name, visits, or insurance.</p>
            </li>
            <li className="card" data-reveal data-reveal-delay="0.16">
              <Clock3 size={22} aria-hidden="true" />
              <h3>Live availability, no waiting game</h3>
              <p>Times come from each clinician’s calendar. If it is on screen, it is bookable right now.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section container">
        <div className="section-head" data-reveal>
          <span className="eyebrow">Patient stories</span>
          <h2>“It made a worrying week feel manageable.”</h2>
        </div>
        <div className="story-grid">
          <blockquote className="card story-main" data-reveal>
            <p>
              CareCompass did not pretend to diagnose me. It helped me understand the warning signs, organise my questions, and find a
              neurologist who actually treats migraine — with an appointment nine days sooner than my clinic offered.
            </p>
            <footer>
              <Avatar name="Jordan Lee" tint="#1b5fa8" size={44} />
              <div>
                <b>Jordan L.</b>
                <small>Verified visit · New York</small>
              </div>
              <Stars value={5} />
            </footer>
          </blockquote>
          <div className="story-side">
            <blockquote className="card" data-reveal data-reveal-delay="0.08">
              <p>“I booked a Saturday paediatric slot at 7am while my son had a fever. No calls, no hold music.”</p>
              <footer>
                <b>Amelia R.</b>
                <small>Verified visit</small>
              </footer>
            </blockquote>
            <blockquote className="card" data-reveal data-reveal-delay="0.16">
              <p>“The insurance filter saved me a $340 surprise. That alone was worth it.”</p>
              <footer>
                <b>Samir K.</b>
                <small>Verified visit</small>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="final-cta" data-reveal>
        <div className="container">
          <h2>From “I don’t feel well” to a confirmed appointment.</h2>
          <p className="lede">No account needed to search or to see real availability. Create one only when you want to keep your visits together.</p>
          <div className="final-actions">
            <Link className="btn btn-accent btn-lg" to="/find">
              Find a clinician <ArrowRight size={18} />
            </Link>
            <Link className="btn btn-quiet btn-lg" to="/assistant">
              Ask the care assistant
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
