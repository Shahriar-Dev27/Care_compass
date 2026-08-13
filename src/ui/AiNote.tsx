import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

/** Wraps anything the assistant generated so it never reads as clinician advice. */
export function AiNote({ children, title = 'AI-assisted' }: { children: ReactNode; title?: string }) {
  return (
    <p className="ai-note">
      <Sparkles size={16} aria-hidden="true" />
      <span>
        <b>{title}:</b> {children}
      </span>
    </p>
  )
}

export function AiTag({ label = 'AI-assisted' }: { label?: string }) {
  return (
    <span className="ai-tag">
      <Sparkles size={13} aria-hidden="true" /> {label}
    </span>
  )
}
