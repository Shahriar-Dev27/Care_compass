import { Star } from 'lucide-react'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value)
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= full ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  )
}
