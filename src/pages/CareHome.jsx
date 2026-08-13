import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarPlus,
  CalendarX,
  Check,
  CreditCard,
  Eye,
  History,
  MapPin,
  MessageSquare,
  Pill,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  LogOut,
  X,
} from 'lucide-react'
import { Avatar, AiTag, Empty } from '../components/Bits'
import BookingModal from '../components/BookingModal'
import { careSuggestions, downloadIcs, useStore } from '../lib/store'
import { countdown, formatSlot } from '../lib/schedule'
import { bySlug } from '../data/directory'
import { scrollToId, useReveal } from '../lib/motion'

const TABS = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
  ['waitlist', 'Waitlisted'],
]

/** Snapshot lists start empty on a new account, so say so rather than show a gap. */
function RecordList({ items, empty }) {
  if (!items.length) return <p className="muted small">{empty}</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

const when = (iso) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

export default function CareHome() {
  const store = useStore()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('upcoming')
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [draft, setDraft] = useState('')
  const scope = useReveal([tab, store.appointments.length])

  const suggestions = careSuggestions(store)
  const next = store.next
  const panelOpen = params.get('panel') === 'account'
  const setPanel = (open) => {
    const p = new URLSearchParams(params)
    if (open) p.set('panel', 'account')
    else p.delete('panel')
    setParams(p, { replace: true })
  }

  const joinable = next && new Date(next.at).getTime() - Date.now() < 15 * 60000
  const messageCount = store.threads.reduce((n, t) => n + t.messages.length, 0)

  // Care data arrives from Supabase after the session does, and everything
  // below reads the active patient profile.
  if (store.loading || !store.profile) {
    return (
      <div className="auth-loading" aria-live="polite">
        <span className="auth-loading-icon">
          <ShieldCheck size={28} />
        </span>
        <span className="auth-loading-text">{store.error ? store.error : 'Loading your care record…'}</span>
      </div>
    )
  }

  return (
    <div ref={scope} className="care-page">
      <div className="container">
        <header className="care-head" data-reveal>
          <div>
            <span className="eyebrow">My Care Home</span>
            <h1>Hello, {(user?.displayName || store.profile.name).split(' ')[0]}.</h1>
            {store.error && (
              <p className="error-text" role="alert">
                {store.error}
              </p>
            )}
          </div>
          <div className="profile-switch" role="group" aria-label="Choose whose care you are viewing">
            {store.profiles.map((p) => (
              <button key={p.id} className={p.id === store.profile.id ? 'is-on' : ''} onClick={() => store.switchProfile(p.id)} aria-pressed={p.id === store.profile.id}>
                <Avatar name={p.name} initials={p.initials} tint={p.id === store.profile.id ? 'var(--brand)' : 'var(--ink-3)'} size={30} />
                <span>
                  <b>{p.name}</b>
                  <small>{p.relation}</small>
                </span>
              </button>
            ))}
            <button className="btn btn-quiet btn-sm" onClick={() => setPanel(true)}>
              Account &amp; privacy
            </button>
          </div>
        </header>

        {/* 1 — what needs attention right now */}
        <section className="status-strip" data-reveal aria-label="What needs your attention">
          {next ? (
            <div className="card status-next">
              <div className="status-when">
                <span className="pill pill-brand">{countdown(next.at)}</span>
                <b>{formatSlot(next.date)}</b>
                <span className="muted">
                  {next.mode === 'video' ? 'Secure video visit' : `${next.doctor.practice} · ${next.doctor.address}`} · 30 minutes
                </span>
              </div>
              <div className="status-doctor">
                <Avatar name={next.doctor.name} tint={next.doctor.tint} size={48} />
                <div>
                  <b>Dr. {next.doctor.name}</b>
                  <small>
                    {next.doctor.specialty} · {next.reason}
                  </small>
                </div>
              </div>
              <div className="status-actions">
                {next.mode === 'video' ? (
                  <button className="btn btn-accent" disabled={!joinable} title={joinable ? undefined : 'The join link opens 15 minutes before your visit'}>
                    <Video size={17} /> {joinable ? 'Join video visit' : 'Join opens 15 min before'}
                  </button>
                ) : (
                  <a
                    className="btn btn-accent"
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${next.doctor.practice} ${next.doctor.address}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin size={17} /> Directions
                  </a>
                )}
                <button className="btn btn-quiet btn-sm" onClick={() => setRescheduling(next)}>
                  Reschedule
                </button>
                <button className="btn btn-quiet btn-sm" onClick={() => downloadIcs(next)}>
                  <CalendarPlus size={16} /> Calendar
                </button>
              </div>
            </div>
          ) : (
            <Empty
              icon={Search}
              title="No upcoming visits"
              action={
                <Link className="btn btn-primary" to="/find">
                  Find a clinician <ArrowRight size={17} />
                </Link>
              }
            >
              When you book, your next visit, join link, and directions all appear here first.
            </Empty>
          )}

          <div className="status-side">
            <button type="button" className="card status-tile" onClick={() => scrollToId('#messages')}>
              <MessageSquare size={19} aria-hidden="true" />
              <b>
                {messageCount} {messageCount === 1 ? 'message' : 'messages'}
              </b>
              <small>with your care teams</small>
            </button>
            <div className="card status-tile">
              <ShieldCheck size={19} aria-hidden="true" />
              <b>{store.profile.insurance}</b>
              <small>{store.profile.memberId}</small>
            </div>
          </div>
        </section>

        {/* 2 — gentle AI prompts */}
        {suggestions.length > 0 && (
          <section className="suggestion-row" data-reveal aria-label="Care suggestions">
            {suggestions.map((s) => (
              <article key={s.id} className="card suggestion-card">
                <AiTag label="Suggestion" />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <div>
                  <Link className="btn btn-quiet btn-sm" to={s.action.to}>
                    {s.action.label}
                  </Link>
                  <button className="link-btn" onClick={() => store.dismiss(s.id)}>
                    Dismiss
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* 3 — appointments */}
        <section className="care-block" data-reveal>
          <div className="care-block-head">
            <h2>Appointments</h2>
            <div className="chips" role="tablist" aria-label="Appointment filter">
              {TABS.map(([value, label]) => (
                <button key={value} role="tab" aria-selected={tab === value} className="chip" onClick={() => setTab(value)}>
                  {label}
                  {value === 'upcoming' && store.upcoming.length ? ` (${store.upcoming.length})` : ''}
                  {value === 'waitlist' && store.waitlist.length ? ` (${store.waitlist.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          {tab === 'upcoming' &&
            (store.upcoming.length === 0 ? (
              <Empty icon={Search} title="Nothing booked yet" action={<Link className="btn btn-primary" to="/find">Search for a doctor</Link>}>
                Search by symptom or specialty to see who has time this week.
              </Empty>
            ) : (
              <ul className="appt-list">
                {store.upcoming.map((a) => (
                  <li key={a.id} className="card appt-card">
                    <Avatar name={a.doctor.name} tint={a.doctor.tint} size={46} />
                    <div className="appt-main">
                      <b>Dr. {a.doctor.name}</b>
                      <small>
                        {a.doctor.specialty} · {a.reason}
                      </small>
                      <span className="pill pill-brand">
                        {formatSlot(a.date)} · {a.mode === 'video' ? 'Video' : 'In person'}
                      </span>
                    </div>
                    {confirmCancel === a.id ? (
                      <div className="appt-confirm" role="alertdialog" aria-label="Confirm cancellation">
                        <span>Cancel this visit?</span>
                        <button className="btn btn-quiet btn-sm" onClick={() => setConfirmCancel(null)}>
                          Keep it
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            store.cancel(a.id)
                            setConfirmCancel(null)
                          }}
                        >
                          Yes, cancel
                        </button>
                      </div>
                    ) : (
                      <div className="appt-actions">
                        <button className="btn btn-quiet btn-sm" onClick={() => setRescheduling(a)}>
                          Reschedule
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancel(a.id)}>
                          <CalendarX size={15} /> Cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'past' &&
            (store.past.length === 0 ? (
              <Empty icon={History} title="No past visits yet">Visit summaries appear here once you have been seen.</Empty>
            ) : (
              <ul className="appt-list">
                {store.past.map((a) => (
                  <li key={a.id} className="card appt-card is-past">
                    <Avatar name={a.doctor.name} tint={a.doctor.tint} size={46} />
                    <div className="appt-main">
                      <b>Dr. {a.doctor.name}</b>
                      <small>
                        {formatSlot(a.date)} · {a.reason}
                      </small>
                      {a.status === 'cancelled' ? (
                        <span className="pill pill-warn">Cancelled</span>
                      ) : (
                        a.summary && <p className="visit-summary">{a.summary}</p>
                      )}
                    </div>
                    <div className="appt-actions">
                      <Link className="btn btn-quiet btn-sm" to={`/doctor/${a.doctorSlug}`}>
                        Book again
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'waitlist' &&
            (store.waitlist.length === 0 ? (
              <Empty icon={Bell} title="You are not on any waitlists">
                When a clinician is fully booked, join their waitlist and we will alert you the moment a slot opens.
              </Empty>
            ) : (
              <ul className="appt-list">
                {store.waitlist.map((w) => {
                  const doctor = bySlug(w.doctorSlug)
                  return (
                    <li key={w.id} className="card appt-card">
                      <Avatar name={doctor.name} tint={doctor.tint} size={46} />
                      <div className="appt-main">
                        <b>Dr. {doctor.name}</b>
                        <small>{doctor.specialty} · we will alert you when a slot opens</small>
                      </div>
                      <div className="appt-actions">
                        <button className="btn btn-quiet btn-sm" onClick={() => store.leaveWaitlist(w.id)}>
                          Leave waitlist
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ))}
        </section>

        {/* 4 — messages */}
        <section className="care-block" id="messages" data-reveal>
          <div className="care-block-head">
            <h2>Messages</h2>
            <span className="pill pill-teal">
              <ShieldCheck size={13} /> End-to-end encrypted
            </span>
          </div>
          {store.threads.length === 0 ? (
            <Empty icon={MessageSquare} title="No messages yet">Message a care team from any clinician’s profile.</Empty>
          ) : (
            store.threads.map((thread) => {
              const doctor = bySlug(thread.doctorSlug)
              return (
                <div key={thread.doctorSlug} className="card thread-card">
                  <div className="thread-head">
                    <Avatar name={doctor.name} tint={doctor.tint} size={38} />
                    <b>Dr. {doctor.name}</b>
                    <small>{doctor.practice}</small>
                  </div>
                  <ul className="thread-log">
                    {thread.messages.map((m) => (
                      <li key={m.id} className={m.from === 'you' ? 'bubble bubble-you' : 'bubble bubble-ai'}>
                        {m.text}
                        <small>{when(m.at)}</small>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="thread-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!draft.trim()) return
                      store.sendMessage(thread.doctorSlug, draft.trim())
                      setDraft('')
                    }}
                  >
                    <label htmlFor={`msg-${thread.doctorSlug}`} className="sr-only">
                      Message Dr. {doctor.name}
                    </label>
                    <input id={`msg-${thread.doctorSlug}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message to the care team" />
                    <button className="btn btn-primary" type="submit">
                      <Send size={16} /> Send
                    </button>
                  </form>
                  <p className="muted small">Non-urgent questions only. Care teams usually reply within one working day.</p>
                </div>
              )
            })
          )}
        </section>

        {/* 5 — health snapshot */}
        <section className="care-block" data-reveal>
          <details className="card snapshot" open>
            <summary>
              <Activity size={18} aria-hidden="true" />
              <b>Health snapshot</b>
              <small>{store.profile.name}</small>
            </summary>
            <div className="snapshot-grid">
              <div>
                <h3>
                  <Pill size={16} aria-hidden="true" /> Medications
                </h3>
                <RecordList items={store.profile.medications} empty="No medications recorded yet." />
              </div>
              <div>
                <h3>Allergies</h3>
                <RecordList items={store.profile.allergies} empty="No allergies recorded yet." />
              </div>
              <div>
                <h3>Ongoing</h3>
                <RecordList items={store.profile.conditions} empty="Nothing ongoing recorded yet." />
              </div>
            </div>
            <p className="muted small">
              Records shown here come from visits booked through CareCompass. Linking an outside health system is not part of this
              prototype.
            </p>
          </details>
        </section>
      </div>

      {/* 6 — account & privacy drawer (portalled for the same reason as BookingModal) */}
      {panelOpen && createPortal(
        <div className="drawer-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setPanel(false)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Account and privacy">
            <div className="drawer-head">
              <h2>Account &amp; privacy</h2>
              <button className="icon-btn" onClick={() => setPanel(false)} aria-label="Close panel">
                <X size={19} />
              </button>
            </div>

            <section>
              <h3>
                <CreditCard size={16} aria-hidden="true" /> Insurance &amp; payment
              </h3>
              <p className="muted small">
                {store.profile.insurance} · {store.profile.memberId}
              </p>
              <p className="muted small">Card on file: Visa ending 4242. You are only charged after a clinic confirms a visit.</p>
            </section>

            <section>
              <h3>
                <Bell size={16} aria-hidden="true" /> Reminders
              </h3>
              {[
                ['reminderSms', 'Text message reminders (24 hr and 2 hr before)'],
                ['reminderEmail', 'Email confirmations and summaries'],
                ['reminderPush', 'Push notifications'],
              ].map(([key, label]) => (
                <label key={key} className="checkbox">
                  <input type="checkbox" checked={store.prefs[key]} onChange={(e) => store.setPref(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </section>

            <section>
              <h3>
                <Sparkles size={16} aria-hidden="true" /> AI personalisation
              </h3>
              <label className="checkbox">
                <input type="checkbox" checked={store.prefs.aiSuggestions} onChange={(e) => store.setPref('aiSuggestions', e.target.checked)} />
                <span>Use my visit history to suggest follow-ups and preventive care. Turning this off removes suggestions immediately.</span>
              </label>
            </section>

            <section>
              <h3>
                <Eye size={16} aria-hidden="true" /> Who has accessed your record
              </h3>
              {store.accessLog.length === 0 ? (
                <p className="muted small">Nothing yet. Booking or changing a visit is recorded here.</p>
              ) : (
                <ul className="access-log">
                  {store.accessLog.map((entry) => (
                    <li key={entry.id}>
                      <b>{entry.who}</b>
                      <span>{entry.what}</span>
                      <small>{when(entry.at)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3>Your data</h3>
              <div className="drawer-actions">
                <button
                  className="btn btn-quiet btn-sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify({ profile: store.profile, appointments: store.appointments }, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'carecompass-data.json'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Export my data
                </button>
                <button className="btn btn-danger btn-sm" onClick={store.clearMyData}>
                  <Trash2 size={15} /> Delete my care data
                </button>
              </div>
              <p className="muted small">
                <Check size={13} /> Your record lives in the CareCompass database and is readable only by your signed-in account.
              </p>
            </section>

            <section>
              <h3>Account</h3>
              {user && (
                <p className="muted small" style={{ marginBottom: 12 }}>
                  Signed in as <strong>{user.email}</strong>
                </p>
              )}
              <button
                className="btn btn-quiet btn-sm"
                onClick={async () => {
                  setPanel(false)
                  await signOut()
                  navigate('/')
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </section>
          </aside>
        </div>,
        document.body,
      )}

      {rescheduling && (
        <BookingModal doctor={rescheduling.doctor} appointment={rescheduling} onClose={() => setRescheduling(null)} />
      )}
    </div>
  )
}
