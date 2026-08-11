import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { findRedFlags } from '../lib/triage'
import { specialtyFor } from '../lib/search'
import { useStore } from '../lib/store'
import { formatSlot } from '../lib/schedule'

const GREETING = {
  from: 'ai',
  text: 'Hi — I can help you find the right kind of clinician, explain how booking works, or point you to a person. What is going on?',
}

const QUICK = ['Which doctor should I see?', 'How do I reschedule?', 'Will my insurance cover this?', 'I want a human']

/** Scoped, rule-based replies. Anything clinical is handed to the triage flow. */
function reply(text, store) {
  const flags = findRedFlags(text)
  if (flags.length) {
    return {
      from: 'ai',
      urgent: true,
      text: `You mentioned ${flags[0].label}. That needs emergency care, not an online booking — call your local emergency number (911 in the US) or go to the nearest emergency department now.`,
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
    const next = store.next
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
      text: `Based on what you described, ${specialty.toLowerCase()} is usually the right starting point. This is guidance, not a diagnosis — a clinician makes the call.`,
      cta: { label: `See ${specialty.toLowerCase()} clinicians`, to: `/find?q=${encodeURIComponent(text.slice(0, 60))}` },
    }
  }

  return {
    from: 'ai',
    text: 'I can help with finding the right specialty, booking and rescheduling, or insurance questions. If you describe how you are feeling, the care assistant can ask a few questions and suggest where to start.',
    cta: { label: 'Open the care assistant', to: '/assistant' },
  }
}

export default function ChatAssistant() {
  const store = useStore()
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState([GREETING])
  const [draft, setDraft] = useState('')
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

  const send = (text) => {
    const value = text.trim()
    if (!value) return
    setDraft('')
    setLog((l) => [...l, { from: 'you', text: value }, reply(value, store)])
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
            {m.text}
            {m.cta && (
              <Link className="chat-cta" to={m.cta.to} onClick={() => setOpen(false)}>
                {m.cta.label} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="chat-quick">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <p className="chat-disclaimer">
          <Info size={14} aria-hidden="true" />
          AI guidance, never a diagnosis. In an emergency, call your local emergency number.
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
          <button className="icon-btn" type="submit" aria-label="Send message">
            <Send size={18} />
          </button>
        </form>
      </div>
    </aside>
  )
}
