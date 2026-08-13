import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { prefsToRow } from '../../domain/rows'
import type { FollowUp, Prefs } from '../../domain/types'
import { useAuth } from '../auth/AuthProvider'
import { loadPrefs, readLocalPrefs, savePrefRow, writeLocalPrefs, type PrefState } from './api/prefs'

type PrefsValue = PrefState & {
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => Promise<void>
  dismiss: (id: string) => Promise<void>
  rememberFollowUp: (followUp: Omit<FollowUp, 'at'>) => Promise<void>
  /** Used when care data is wiped, so a stale suggestion cannot outlive it. */
  clearSuggestionState: () => Promise<void>
}

const Ctx = createContext<PrefsValue | null>(null)

/**
 * Display and suggestion preferences. Split out from care data so that
 * toggling the theme does not re-render every appointment card.
 */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<PrefState>(readLocalPrefs)

  useEffect(() => {
    if (authLoading) return undefined
    let alive = true
    if (!user) {
      setState(readLocalPrefs())
      return undefined
    }
    // The local copy is the fallback: a brand-new account has no row yet.
    loadPrefs().then(({ data }) => {
      if (alive && data) setState(data)
    })
    return () => {
      alive = false
    }
  }, [user, authLoading])

  useEffect(() => {
    writeLocalPrefs(state)
  }, [state])

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = state.prefs.theme
    root.dataset['scale'] = state.prefs.textScale
  }, [state.prefs.theme, state.prefs.textScale])

  const save = useCallback(
    async (row: Parameters<typeof savePrefRow>[1]) => {
      if (user) await savePrefRow(user.id, row)
    },
    [user],
  )

  const value = useMemo<PrefsValue>(
    () => ({
      ...state,
      async setPref(key, prefValue) {
        setState((prev) => ({ ...prev, prefs: { ...prev.prefs, [key]: prefValue } }))
        await save(prefsToRow({ [key]: prefValue }))
      },
      async dismiss(id) {
        const dismissed = state.dismissed.includes(id) ? state.dismissed : [...state.dismissed, id]
        setState((prev) => ({ ...prev, dismissed }))
        await save({ dismissed })
      },
      async rememberFollowUp(followUp) {
        const record: FollowUp = { ...followUp, at: new Date().toISOString() }
        const dismissed = state.dismissed.filter((d) => d !== 'emergency-followup')
        setState((prev) => ({ ...prev, followUp: record, dismissed }))
        await save({ follow_up: record, dismissed })
      },
      async clearSuggestionState() {
        setState((prev) => ({ ...prev, followUp: null, dismissed: [] }))
        await save({ follow_up: null, dismissed: [] })
      },
    }),
    [state, save],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs(): PrefsValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('usePrefs must be used inside <PrefsProvider>')
  return value
}
