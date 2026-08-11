import { Sparkles, Star } from 'lucide-react'

export function Avatar({ name, initials, tint, size = 52, className = '' }) {
  const letters = initials || (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <span className={`avatar ${className}`} style={{ '--size': `${size}px`, '--tint': tint }} aria-hidden="true">
      {letters}
    </span>
  )
}

export function Stars({ value, size = 14 }) {
  const full = Math.round(value)
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= full ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  )
}

/** Wraps anything the assistant generated so it never reads as clinician advice. */
export function AiNote({ children, title = 'AI-assisted' }) {
  return (
    <p className="ai-note">
      <Sparkles size={16} aria-hidden="true" />
      <span>
        <b>{title}:</b> {children}
      </span>
    </p>
  )
}

export function AiTag({ label = 'AI-assisted' }) {
  return (
    <span className="ai-tag">
      <Sparkles size={13} aria-hidden="true" /> {label}
    </span>
  )
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon size={21} aria-hidden="true" />
        </span>
      )}
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  )
}
