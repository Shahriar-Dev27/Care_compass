import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Header, Footer, TabBar } from './components/Chrome'
import ChatAssistant from './components/ChatAssistant'
import Home from './pages/Home'
import FindCare from './pages/FindCare'
import DoctorProfile from './pages/DoctorProfile'
import Assistant from './pages/Assistant'
import CareHome from './pages/CareHome'
import Trust from './pages/Trust'
import { useSmoothScroll } from './lib/motion'

function NotFound() {
  return (
    <div className="container section">
      <h1>That page has moved.</h1>
      <p className="lede">Let’s get you back to finding care.</p>
      <Link className="btn btn-primary" to="/" style={{ marginTop: 20 }}>
        Back to home
      </Link>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  useSmoothScroll(pathname)

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header />

      {/* Fixed UI stays outside the smoother, or GSAP transforms would drag it along. */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/find" element={<FindCare />} />
              <Route path="/doctor/:slug" element={<DoctorProfile />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/care" element={<CareHome />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>

      <TabBar />
      <ChatAssistant />
    </>
  )
}
