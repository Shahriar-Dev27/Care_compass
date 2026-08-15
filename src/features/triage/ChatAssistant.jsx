import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { findRedFlags } from '../../domain/triage'
import { specialtyFor } from '../../domain/search'
import { specialtyLabel } from '../../domain/taxonomy'
import { bestIn, bySlug } from '../directory/api/doctors'
import { useCare } from '../care/CareDataProvider'
import { usePrefs } from '../prefs/PrefsProvider'
import { formatSlot } from '../../domain/schedule'

const GREETING = {
  from: 'ai',
  text: 'Hi — I can help you find the right kind of clinician, explain how booking works, or point you to a person. What is going on?',
}

const QUICK = ['Which doctor should I see?', 'How do I reschedule?', 'Will my insurance cover this?', 'I want a human']

/** Scoped, rule-based replies. Anything clinical is handed to the triage flow. */
function reply(text, care) {
  const flags = findRedFlags(text)
  if (flags.length) {
    const flag = flags[0]
    const call = flag.crisis
      ? 'Call or text 988 in the US to reach the Suicide & Crisis Lifeline, or your local emergency number.'
      : 'Call your local emergency number — 911 in the US.'
    return {
      from: 'ai',
      urgent: true,
      text: `${flag.crisis ? 'Thank you for telling me. You should not have to hold that on your own. ' : ''}You mentioned ${flag.label}, and that needs emergency help now rather than an online booking. ${call} While you wait:`,
      steps: flag.aid,
    }
  }

  const q = text.toLowerCase()

  if (/human|person|agent|representative|someone real/.test(q)) {
    return {
      from: 'ai',
      text: 'Connecting you with a support specialist. They are available 7am–9pm daily, and typically reply in under 3 minutes. For anything clinical, they can route you to a nurse line.',
      cta: { label: 'Open support chat', to: '/trust#support' },
    }
  }

  if (/cancel|reschedul|move my|change my appointment/.test(q)) {
    const next = care.next
    return {
      from: 'ai',
      text: next
        ? `Your next visit is with Dr. ${next.doctor.name}, ${formatSlot(next.date)}. You can move or cancel it yourself in My Care Home — free up to 2 hours before.`
        : 'You have no upcoming visits right now. Once you book one, you can move or cancel it from My Care Home.',
      cta: { label: 'Go to My Care Home', to: '/care' },
    }
  }

  if (/insur|cost|price|pay|bill|charge|cover/.test(q)) {
    return {
      from: 'ai',
      text: 'You can filter by your plan on the search page, and each clinician lists the plans they accept plus their self-pay rate. Nothing is charged until the clinic confirms your visit. Billing disputes go to a human specialist.',
      cta: { label: 'Search by insurance', to: '/find' },
    }
  }

  if (/appointment|book|available|slot|time/.test(q)) {
    return {
      from: 'ai',
      text: 'Booking takes two steps: pick a time from a clinician’s live calendar, then confirm the reason for your visit. Confirmation is instant.',
      cta: { label: 'Find available clinicians', to: '/find' },
    }
  }

  const specialty = specialtyFor(text)
  if (specialty) {
    return {
      from: 'ai',
      ai: true,
      text: `Based on what you described, ${specialtyLabel(specialty)} is usually the right starting point. This is guidance, not a diagnosis — a clinician makes the call.`,
      cta: { label: `See ${specialtyLabel(specialty)} clinicians`, to: `/find?q=${encodeURIComponent(text.slice(0, 60))}` },
    }
  }

  return {
    from: 'ai',
    text: 'I can help with finding the right specialty, booking and rescheduling, or insurance questions. If you describe how you are feeling, the care assistant can ask a few questions and suggest where to start.',
    cta: { label: 'Open the care assistant', to: '/assistant' },
  }
}

/**
 * Asks the OpenRouter-backed proxy and streams the answer back word by word.
 * Only what the user typed is sent, plus the name of a clinician this app
 * already suggested — no profile, appointment or insurance data leaves.
 */
async function askModel(log, context, onText) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: log.map((m) => ({ role: m.from === 'you' ? 'user' : 'assistant', content: m.text })),
      context,
    }),
  })
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  if (!text.trim()) throw new Error('empty reply')
  return text.trim()
}

/** The clinician to see once the emergency itself has been handled. */
const followUpMessage = (doctor, fresh) => ({
  from: 'ai',
  ai: true,
  text: fresh
    ? `When you are safe and through the worst of it, Dr. ${doctor.name} handles ${specialtyLabel(doctor.specialty)} follow-ups like this — ${doctor.focus.slice(0, 2).join(' and ').toLowerCase()}. I will keep this here so you do not have to search for it later.`
    : `Still here from earlier: Dr. ${doctor.name}, ${specialtyLabel(doctor.specialty)}, for your follow-up whenever you are ready.`,
  cta: { label: `See Dr. ${doctor.name} · ${specialtyLabel(doctor.specialty)}`, to: `/doctor/${doctor.slug}` },
})

/** Directory context only — never anything about the patient. */
const clinicianContext = (followUp) =>
  followUp ? `A clinician has already been suggested to this patient for follow-up: Dr. ${followUp.name}, ${specialtyLabel(followUp.specialty)}. Refer to them by name if the patient asks who to see.` : ''

export default function ChatAssistant() {
  const care = useCare()
  const { followUp, rememberFollowUp } = usePrefs()
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState([GREETING])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const logRef = useRef(null)
  const panel = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log, open])

  useEffect(() => {
    if (!open) return undefined
    panel.current?.querySelector('input')?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Reopening after an emergency: bring the remembered clinician back up front
  // instead of making someone scroll or search for the name again.
  useEffect(() => {
    const doctor = followUp && bySlug(followUp.slug)
    setLog((current) => (doctor && current.length === 1 ? [...current, followUpMessage(doctor, false)] : current))
  }, [followUp])

  const send = async (text) => {
    const value = text.trim()
    if (!value || pending) return
    setDraft('')
    const local = reply(value, care)
    const history = [...log, { from: 'you', text: value }]
    setLog(history)

    // Red flags are answered by the rules, never by a model — emergency
    // routing must not depend on a network call or on what a model decides.
    if (local.urgent) {
      const flag = findRedFlags(value)[0]
      const doctor = bestIn(flag.followUp)
      // Remembered in preferences, so the name is still here after the emergency
      // is over — in this panel and on the My Care Home dashboard.
      rememberFollowUp({ slug: doctor.slug, name: doctor.name, specialty: doctor.specialty, reason: flag.label })
      setLog([...history, local, followUpMessage(doctor, true)])
      return
    }

    setPending(true)
    const placeholder = { from: 'ai', ai: true, text: '', streaming: true }
    setLog([...history, placeholder])
    try {
      const answer = await askModel(history, clinicianContext(followUp), (partial) =>
        setLog([...history, { ...placeholder, text: partial }]),
      )
      // The CTA still comes from the rules, so every link is one we control.
      setLog([...history, { from: 'ai', ai: true, text: answer, cta: local.cta }])
    } catch {
      setLog([...history, local])
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button className="chat-launcher" onClick={() => setOpen(true)} aria-expanded="false">
        <MessageCircle size={20} aria-hidden="true" />
        <span>Ask CareCompass</span>
      </button>
    )
  }

  return (
    <aside className="chat-panel" ref={panel} role="dialog" aria-label="CareCompass assistant">
      <div className="chat-head">
        <span className="brand-mark">
          <Sparkles size={17} aria-hidden="true" />
        </span>
        <div>
          <b>CareCompass assistant</b>
          <small>AI guidance · a human is one message away</small>
        </div>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close assistant" style={{ marginLeft: 'auto' }}>
          <X size={18} />
        </button>
      </div>

      <div className="chat-log" ref={logRef} role="log" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className={m.from === 'you' ? 'bubble bubble-you' : `bubble bubble-ai${m.urgent ? ' bubble-urgent' : ''}`}>
            {m.streaming && !m.text ? (
              <span className="chat-typing">
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span className="sr-only">Assistant is typing</span>
              </span>
            ) : (
              m.text
            )}
            {m.steps && (
              <ol className="chat-steps">
                {m.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {m.cta && (
              <Link className="chat-cta" to={m.cta.to} onClick={() => setOpen(false)}>
                {m.cta.label} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div>
        {/* Openers only: once the conversation starts they take room the log
            needs, which is most of the panel on a phone. */}
        {!log.some((m) => m.from === 'you') && (
          <div className="chat-quick">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} disabled={pending}>
                {q}
              </button>
            ))}
          </div>
        )}
        <p className="chat-disclaimer">
          <Info size={14} aria-hidden="true" />
          AI guidance, never a diagnosis. What you type here is sent to an AI provider — your records and appointments are not. In an
          emergency, call your local emergency number.
        </p>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message the assistant
          </label>
          <input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question" autoComplete="off" />
          <button className="icon-btn" type="submit" aria-label="Send message" disabled={pending}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </aside>
  )
}
