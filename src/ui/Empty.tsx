import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyProps = {
  icon?: LucideIcon
  title: string
  children: ReactNode
  action?: ReactNode
}

export function Empty({ icon: Icon, title, children, action }: EmptyProps) {
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
