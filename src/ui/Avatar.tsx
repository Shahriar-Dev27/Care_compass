import type { CSSProperties } from 'react'

type AvatarProps = {
  name?: string
  initials?: string
  tint?: string
  size?: number
  className?: string
}

export function Avatar({ name, initials, tint, size = 52, className = '' }: AvatarProps) {
  const letters =
    initials ||
    (name || '?')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
  return (
    <span className={`avatar ${className}`} style={{ '--size': `${size}px`, '--tint': tint } as CSSProperties} aria-hidden="true">
      {letters}
    </span>
  )
}
