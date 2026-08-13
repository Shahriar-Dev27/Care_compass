import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Compass, Mail, MailCheck, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import '../styles/auth.css'

/* ── Friendly Supabase Auth error messages ─────────────────────────────────── */
function friendlyError(error) {
  switch (error?.code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'That email is already registered. Try signing in instead.'
    case 'validation_failed':
      return 'Please check the email address and try again.'
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'email_not_confirmed':
      return 'Confirm your email address first — check your inbox for the link.'
    case 'weak_password':
      return 'Password must be at least 6 characters.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'provider_disabled':
      return 'That sign-in method is not enabled for this site yet.'
    case 'access_denied':
      return 'Google sign-in was cancelled.'
    case 'bad_oauth_state':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return 'That sign-in attempt expired. Please try again.'
    default:
      if (error?.message?.includes('Failed to fetch')) return 'Network error. Please check your connection.'
      return error?.message || 'Something went wrong. Please try again.'
  }
}

/* ── Google G logo (inline SVG) ────────────────────────────────────────────── */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function Auth() {
  const { user, signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/care'

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  // Already logged in → bounce away
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, navigate, next])

  // Google can bounce back here with a failure instead of a session: the PKCE
  // flow puts it in the query string, email links use the hash. Without this the
  // page looks idle and the person clicks Google again.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const reason = params.get('error') || hash.get('error')
    if (!reason) return
    setError(
      friendlyError({
        code: params.get('error_code') || hash.get('error_code') || reason,
        message: params.get('error_description') || hash.get('error_description'),
      }),
    )
    // Drop it from the URL so a refresh does not resurrect a stale failure.
    window.history.replaceState({}, '', `${window.location.pathname}?next=${encodeURIComponent(next)}`)
  }, [params, next])

  const clearError = () => {
    setError('')
    setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    clearError()
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password, name.trim())
        if (needsConfirmation) {
          setNotice(`Almost there — open the confirmation link we sent to ${email}, then sign in.`)
          setMode('login')
          setPassword('')
          return
        }
      } else {
        await signIn(email, password)
      }
      navigate(next, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  // Google sign-in leaves the page and returns to /auth, where the effect above
  // forwards to `next`.
  async function handleGoogle() {
    setBusy(true)
    clearError()
    try {
      await signInWithGoogle(next)
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address first, then choose “Forgot password?”.')
      return
    }
    setBusy(true)
    clearError()
    try {
      await sendPasswordReset(email.trim())
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    clearError()
  }

  return (
    <div className="auth-page">
      {/* ── Left hero panel ─────────────────────────────────── */}
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero-inner">
          <div className="auth-hero-brand">
            <span className="auth-hero-icon">
              <Compass size={36} />
            </span>
            <span className="auth-hero-wordmark">
              Care<em>Compass</em>
            </span>
          </div>
          <h2 className="auth-hero-headline">
            Your health, all in one calm place.
          </h2>
          <p className="auth-hero-body">
            Book appointments, message your care team, and track every visit — securely and privately.
          </p>

          <ul className="auth-feature-list" role="list">
            {[
              ['🗓️', 'Upcoming & past appointments at a glance'],
              ['💬', 'Messages with your care teams'],
              ['🩺', 'Health snapshot & medication records'],
              ['🔒', 'Encrypted in transit & at rest, readable only by you'],
            ].map(([icon, text]) => (
              <li key={text}>
                <span className="auth-feature-icon">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="auth-hero-deco" aria-hidden="true">
            <div className="auth-deco-ring auth-deco-ring-1" />
            <div className="auth-deco-ring auth-deco-ring-2" />
            <div className="auth-deco-ring auth-deco-ring-3" />
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────── */}
      <div className="auth-form-side">
        <div className="auth-card">

          {/* Mobile brand (only visible on small screens) */}
          <div className="auth-mobile-brand">
            <Link to="/" className="brand">
              <span className="brand-mark"><Compass size={19} /></span>
              <span>Care<em>Compass</em></span>
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => switchMode('login')}
              id="tab-login"
              aria-controls="panel-login"
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => switchMode('signup')}
              id="tab-signup"
              aria-controls="panel-signup"
            >
              Create account
            </button>
          </div>

          <div
            id={mode === 'login' ? 'panel-login' : 'panel-signup'}
            role="tabpanel"
            aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-signup'}
          >
            <h1 className="auth-card-title">
              {mode === 'login' ? 'Welcome back' : 'Get started free'}
            </h1>
            <p className="auth-card-sub">
              {mode === 'login'
                ? 'Sign in to view your appointments and care home.'
                : 'Create your account to access your patient dashboard.'}
            </p>

            {/* Google button */}
            <button
              type="button"
              className="btn-google"
              onClick={handleGoogle}
              disabled={busy}
              aria-label="Continue with Google"
            >
              <GoogleLogo />
              Continue with Google
            </button>

            <div className="auth-divider" role="separator">
              <span>or continue with email</span>
            </div>

            {/* Error banner */}
            {error && (
              <div className="auth-error" role="alert">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {notice && (
              <div className="auth-notice" role="status">
                <MailCheck size={15} />
                {notice}
              </div>
            )}

            {/* Form */}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              {mode === 'signup' && (
                <div className="auth-field">
                  <label htmlFor="auth-name">Full name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" aria-hidden="true" />
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jordan Lee"
                      value={name}
                      onChange={(e) => { setName(e.target.value); clearError() }}
                      required={mode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" aria-hidden="true" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete={mode === 'signup' ? 'email' : 'username'}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError() }}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === 'login' && (
                    <button type="button" className="link-btn auth-forgot" onClick={handleForgotPassword} disabled={busy}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" aria-hidden="true" />
                  <input
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError() }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPw((p) => !p)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={busy}
              >
                {busy ? (
                  <span className="auth-spinner" aria-hidden="true" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                    Sign up free
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                    Sign in
                  </button>
                </>
              )}
            </p>

            {mode === 'signup' && (
              <p className="auth-legal">
                By creating an account you agree to our{' '}
                <Link to="/trust">privacy policy</Link> and{' '}
                <Link to="/trust">terms of service</Link>.
              </p>
            )}
          </div>
        </div>

        <p className="auth-back-link">
          <Link to="/">← Back to CareCompass</Link>
        </p>
      </div>
    </div>
  )
}
