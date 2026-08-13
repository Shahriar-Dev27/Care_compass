import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { lockScroll } from '../lib/motion'

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  onClose: () => void
  /** Class for the dialog itself — each surface keeps its own look. */
  className: string
  backdropClassName?: string
  /** Id of the heading inside the dialog, or a literal label when there is none. */
  labelledBy?: string
  label?: string
  children: ReactNode
}

/**
 * The shared dialog surface: portal, backdrop dismissal, Escape, focus trap,
 * scroll lock, and focus returned to whatever opened it. Anything modal in the
 * app goes through here so those behaviours cannot drift apart.
 */
export function Modal({ onClose, className, backdropClassName = 'modal-backdrop', labelledBy, label, children }: ModalProps) {
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    opener.current = document.activeElement
    lockScroll(true)
    dialog.current?.focus()
    return () => {
      lockScroll(false)
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialog.current) return
      const nodes = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portalled to <body> so no ancestor transform, overflow or stacking context
  // can strand a fixed-position dialog. GSAP reveals leave transforms behind on
  // page sections, which is exactly such an ancestor.
  return createPortal(
    <div className={backdropClassName} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={label} tabIndex={-1} ref={dialog}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
