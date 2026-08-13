import { NavLink, Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Compass, Home, LogIn, LogOut, Moon, Search, Sparkles, Stethoscope, Sun, UserRound } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Avatar } from '../ui'
import { useCare } from '../features/care/CareDataProvider'
import { usePrefs } from '../features/prefs/PrefsProvider'
import { useAuth } from '../features/auth/AuthProvider'

function Brand({ onClick }) {
  return (
    <Link to="/" className="brand" onClick={onClick}>
      <span className="brand-mark" aria-hidden="true">
        <Compass size={19} />
      </span>
      <span>
        Care<em>Compass</em>
      </span>
    </Link>
  )
}

/* ── Auth-aware profile button in header ────────────────────────────────────── */
function HeaderProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) {
    return (
      <Link to="/auth" className="btn btn-primary btn-sm header-signin">
        <LogIn size={16} />
        Sign in
      </Link>
    )
  }

  const displayName = user.displayName
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="header-profile-wrap" ref={ref}>
      <button
        className="header-profile"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <Avatar name={displayName} initials={initials} tint="var(--brand)" size={30} />
        <span>{displayName.split(' ')[0]}</span>
      </button>

      {open && (
        <div className="header-profile-menu" role="menu" aria-label="Account options">
          <div className="header-profile-meta">
            <span className="header-profile-name">{displayName}</span>
            <span className="header-profile-email">{user.email}</span>
          </div>
          <div className="header-profile-divider" role="separator" />
          <Link
            to="/care"
            role="menuitem"
            className="header-profile-item"
            onClick={() => setOpen(false)}
          >
            <UserRound size={15} />
            My Care Home
          </Link>
          <button
            role="menuitem"
            className="header-profile-item header-profile-signout"
            onClick={handleSignOut}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { prefs, setPref } = usePrefs()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const dark = prefs.theme === 'dark'

  return (
    <header className="site-header">
      <div className="container">
        <Brand />
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/find" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Find care
          </NavLink>
          <NavLink to="/assistant" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Care assistant
          </NavLink>
          <NavLink to="/care" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            My Care Home
          </NavLink>
          <NavLink to="/trust" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Trust &amp; safety
          </NavLink>
        </nav>

        <div className="header-tools">
          <form
            className="header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/find?q=${encodeURIComponent(q.trim())}`)
            }}
          >
            <label htmlFor="header-q" className="sr-only">
              Search doctors and specialties
            </label>
            <Search size={17} aria-hidden="true" />
            <input id="header-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search care" />
          </form>

          <button
            className="icon-btn"
            onClick={() => setPref('theme', dark ? 'light' : 'dark')}
            aria-pressed={dark}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <HeaderProfile />
        </div>
      </div>
    </header>
  )
}

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/find', label: 'Find care', icon: Stethoscope },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
  { to: '/care', label: 'Visits', icon: CalendarDays },
  { to: '/care?panel=account', label: 'Account', icon: UserRound },
]

export function TabBar() {
  const { user } = useAuth()
  const { next } = useCare()
  return (
    <nav className="tab-bar" aria-label="Primary">
      {TABS.map(({ to, label, icon: Icon, end }) => {
        // Account tab → go to /auth if not signed in
        const href = label === 'Account' && !user ? '/auth' : to
        return (
          <NavLink key={label} to={href} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <span style={{ position: 'relative' }}>
              <Icon size={20} aria-hidden="true" />
              {label === 'Visits' && next && <span className="tab-badge" aria-hidden="true" />}
            </span>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Footer() {
  const { prefs, setPref } = usePrefs()
  const { theme, textScale } = prefs

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>Find the right clinician, book in minutes, and keep every visit in one calm place.</p>
            <span className="pill pill-teal">
              <Sparkles size={13} /> Concept prototype · simulated data
            </span>
          </div>

          <div className="footer-col">
            <b>Find care</b>
            <Link to="/find">Search clinicians</Link>
            <Link to="/assistant">Care assistant</Link>
            <Link to="/find?q=Urgent%20care">Urgent care</Link>
            <Link to="/find?visit=video">Video visits</Link>
          </div>

          <div className="footer-col">
            <b>Your account</b>
            <Link to="/care">My Care Home</Link>
            <Link to="/care?panel=account">Insurance &amp; payment</Link>
            <Link to="/care?panel=account">Privacy controls</Link>
            <Link to="/care?panel=account">Reminders</Link>
          </div>

          <div className="footer-col">
            <b>Trust &amp; support</b>
            <Link to="/trust">How your data is used</Link>
            <Link to="/trust#security">Security</Link>
            <Link to="/trust#support">Help &amp; human support</Link>
            <Link to="/trust#ai">How the AI works</Link>
          </div>
        </div>

        <div className="a11y-bar">
          <span>Accessibility</span>
          <div className="a11y-group" role="group" aria-label="Text size">
            {[
              ['base', 'A', 'Default text size'],
              ['lg', 'A+', 'Larger text'],
              ['xl', 'A++', 'Largest text'],
            ].map(([value, label, hint]) => (
              <button key={value} aria-pressed={textScale === value} onClick={() => setPref('textScale', value)} title={hint}>
                {label}
              </button>
            ))}
          </div>
          <div className="a11y-group" role="group" aria-label="Theme">
            <button aria-pressed={theme === 'light'} onClick={() => setPref('theme', 'light')}>
              <Sun size={15} aria-hidden="true" /> Light
            </button>
            <button aria-pressed={theme === 'dark'} onClick={() => setPref('theme', 'dark')}>
              <Moon size={15} aria-hidden="true" /> Dark
            </button>
          </div>
          {/* Deleting care data lives in Account & privacy, next to the export it
              pairs with — a destructive action does not belong in global chrome. */}
          <Link className="link-btn" to="/care?panel=account">
            Privacy controls
          </Link>
        </div>

        <p className="footer-disclaimer">
          CareCompass provides scheduling and AI-assisted guidance. It does not diagnose, treat, or replace a licensed clinician, and it is
          not for emergencies. If you may be having a medical emergency, call your local emergency number.
        </p>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} CareCompass AI</span>
          <span>Pilot build · encrypted in transit and at rest · not yet HIPAA-certified</span>
        </div>
      </div>
    </footer>
  )
}
