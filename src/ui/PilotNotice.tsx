import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'

/** One place to say what is real and what is not, so the claim never drifts
 *  from the build. Every page that shows seeded content should carry it. */
export function PilotNotice({ children }: { children: ReactNode }) {
  return (
    <p className="pilot-notice" role="note">
      <FlaskConical size={16} aria-hidden="true" />
      <span>
        <b>Pilot build.</b> {children}
      </span>
    </p>
  )
}
