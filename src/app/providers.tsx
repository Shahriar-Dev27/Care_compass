import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { PrefsProvider } from '../features/prefs/PrefsProvider'
import { CareDataProvider } from '../features/care/CareDataProvider'

/** Order matters: care data reads the session and clears prefs state on wipe. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PrefsProvider>
          <CareDataProvider>{children}</CareDataProvider>
        </PrefsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
