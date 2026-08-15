import { Link } from 'react-router-dom'
import { Accessibility, AlertTriangle, Eye, Headphones, Languages, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { PilotNotice } from '../../ui'
import { useReveal } from '../../lib/motion'

const FAQ = [
  {
    q: 'Do I need an account to book?',
    a: 'Searching, comparing, and using the assistant need no account. Booking does, because a visit has to belong to a record only you can open.',
  },
  {
    q: 'What does the AI actually do?',
    a: 'It reads what you typed, asks two or three follow-up questions, and suggests which kind of clinician to start with and how soon. It never names a diagnosis and never tells you to skip care.',
  },
  {
    q: 'Can a clinic delete a bad review?',
    a: 'Every review in this pilot is sample content, so nothing here is a real patient’s words. When reviews go live they will come only from patients with a completed visit, and clinics will be able to respond but not remove them.',
  },
  {
    q: 'What if my question is about a bill?',
    a: 'Billing disputes go straight to a human specialist. The assistant will not guess about money you owe.',
  },
  {
    q: 'What happens to what I type into the assistant?',
    a: 'The guided symptom check never leaves your browser — it is not saved anywhere, not even to your account. Free-text chat messages do go to a third-party language model that writes the reply; your name, appointments, insurance and records never do. Nothing is sold, used for advertising, or used to set your price.',
  },
]

export default function Trust() {
  const scope = useReveal([])

  return (
    <div ref={scope} className="trust-page">
      <div className="container">
        <header className="section-head" data-reveal>
          <span className="eyebrow">Trust &amp; safety</span>
          <h1>What we do with your information, in plain words.</h1>
          <p className="lede">
            You are trusting this with your health. Here is exactly how it works, written to be read once and understood — not buried in
            forty pages.
          </p>
          <PilotNotice>
            Clinicians, availability and reviews on this site are sample data. Accounts, bookings and messages are real and stored in a
            live database, so do not enter anything you would not want held there. Where a promise below is not yet kept, it says so.
          </PilotNotice>
        </header>

        <section className="card trust-block" id="privacy" data-reveal>
          <h2>
            <LockKeyhole size={20} aria-hidden="true" /> Your privacy
          </h2>
          <ul className="check-list">
            <li>We collect what a booking needs: who you are, what the visit is for, and your insurance details.</li>
            <li>We do not sell your data. Not to advertisers, not to data brokers, not to insurers.</li>
            <li>Your symptoms are never used to change what you are charged.</li>
            <li>You can export everything, or delete every appointment, waitlist entry and message, at any time from My Care Home.</li>
            <li>Consent is asked for once, in context, in plain language — no pre-ticked boxes, no dark patterns.</li>
          </ul>
        </section>

        <section className="card trust-block" id="security" data-reveal>
          <h2>
            <ShieldCheck size={20} aria-hidden="true" /> Security
          </h2>
          <p>
            Health information is encrypted in transit and at rest. Every row in the database carries a row-level security policy tied to
            your account, so a query signed as anyone else returns nothing — the guarantee is enforced by the database, not by hiding
            buttons in the interface.
          </p>
          <p>
            The audit trail is built but not switched on in this pilot, so it will read empty. Turning it on before real patient data is
            loaded is a release blocker, not a nice-to-have.
          </p>
          <p className="muted">
            <Eye size={15} aria-hidden="true" /> Check it yourself under <Link to="/care?panel=account">Account &amp; privacy → who has accessed your record</Link>.
          </p>
        </section>

        <section className="card trust-block" id="ai" data-reveal>
          <h2>
            <Sparkles size={20} aria-hidden="true" /> How the AI works, and where it stops
          </h2>
          <div className="rule-grid">
            <div>
              <h3>It does</h3>
              <ul className="check-list">
                <li>Suggest which specialty usually handles what you described</li>
                <li>Suggest how soon to be seen</li>
                <li>Rank available clinicians by fit, availability, plan, and distance</li>
                <li>Label every one of its own words as AI-assisted</li>
              </ul>
            </div>
            <div>
              <h3>It never</h3>
              <ul className="cross-list">
                <li>Gives you a diagnosis</li>
                <li>Tells you to wait when something sounds serious</li>
                <li>Replaces a clinician’s judgement</li>
                <li>Handles billing disputes or clinical decisions on its own</li>
              </ul>
            </div>
          </div>
          <p className="policy-note">
            <AlertTriangle size={16} aria-hidden="true" />
            If anything you write mentions emergency symptoms, the assistant stops everything else and tells you to get emergency help
            first. That check runs on your device, before anything is sent anywhere.
          </p>
          <p className="policy-note">
            <Sparkles size={16} aria-hidden="true" />
            Chat replies are generated by a third-party language model. Only the words you type in the chat are sent to it — never your
            name, appointments, insurance, or records.
          </p>
        </section>

        <section className="card trust-block" id="access" data-reveal>
          <h2>
            <Accessibility size={20} aria-hidden="true" /> Access for everyone
          </h2>
          <ul className="check-list">
            <li>Full keyboard navigation and screen-reader labelling throughout.</li>
            <li>Text scaling and a re-tuned dark theme in the footer toolbar, not buried in settings.</li>
            <li>Colour tokens are built to the WCAG 2.1 AA contrast ratios, and status is never shown by colour alone. An independent audit is still outstanding.</li>
            <li>
              Filter clinicians by spoken language, including ASL, and by step-free access, accessible exam tables, and sensory-friendly
              rooms.
            </li>
          </ul>
          <p className="muted">
            <Languages size={15} aria-hidden="true" /> Full interface localisation is on the roadmap; today the clinician language filter is
            the honest version of that promise.
          </p>
        </section>

        <section className="card trust-block" id="support" data-reveal>
          <h2>
            <Headphones size={20} aria-hidden="true" /> Help and human support
          </h2>
          <p>
            The assistant refuses to answer anything that involves clinical judgement or a bill, and points you to a person instead. Staffed
            human support arrives with the first clinic pilot; today the handover is the boundary, not the queue behind it.
          </p>
          <dl className="faq">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card trust-block emergency-block" data-reveal>
          <h2>
            <AlertTriangle size={20} aria-hidden="true" /> This is not for emergencies
          </h2>
          <p>
            If you may be having a medical emergency, call your local emergency number now — 911 in the US. For thoughts of self-harm, call
            or text 988 in the US to reach the Suicide &amp; Crisis Lifeline.
          </p>
        </section>
      </div>
    </div>
  )
}
