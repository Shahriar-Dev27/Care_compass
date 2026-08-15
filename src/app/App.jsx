import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Header, Footer, TabBar } from './Chrome'
import ChatAssistant from '../features/triage/ChatAssistant'
import ProtectedRoute from '../features/auth/ProtectedRoute'
import Home from '../features/home/HomePage'
import FindCare from '../features/directory/FindCarePage'
import DoctorProfile from '../features/directory/DoctorProfilePage'
import Assistant from '../features/triage/AssistantPage'
import CareHome from '../features/care/CareHomePage'
import Trust from '../features/trust/TrustPage'
import Auth from '../features/auth/AuthPage'
import { useRouteScroll } from '../lib/motion'

function NotFound() {
  return (
    <div className="container section">
      <h1>That page has moved.</h1>
      <p className="lede">Let's get you back to finding care.</p>
      <Link className="btn btn-primary" to="/" style={{ marginTop: 20 }}>
        Back to home
      </Link>
    </div>
  )
}

export default function App() {
  const { pathname, hash } = useLocation()
  useRouteScroll(pathname, hash)

  const isAuthPage = pathname === '/auth'

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      {!isAuthPage && <Header />}

      <main id="main" style={isAuthPage ? { paddingTop: 0 } : undefined}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find" element={<FindCare />} />
          <Route path="/doctor/:slug" element={<DoctorProfile />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route
            path="/care"
            element={
              <ProtectedRoute>
                <CareHome />
              </ProtectedRoute>
            }
          />
          <Route path="/trust" element={<Trust />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}

      {!isAuthPage && <TabBar />}
      {!isAuthPage && <ChatAssistant />}
    </>
  )
}
