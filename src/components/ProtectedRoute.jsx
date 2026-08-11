import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Compass } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading" aria-label="Checking your session…">
        <span className="auth-loading-icon">
          <Compass size={28} />
        </span>
        <span className="auth-loading-text">Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  return children
}
