import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { restoreSession, setAccessToken, setSessionLostHandler } from '@/api/http'
import { fetchProfile, login as loginRequest, logout as logoutRequest } from '@/api/authApi'
import { notify } from '@/components/common/notify'
import { AuthContext } from './authContext'
import type { AuthState } from './authContext'
import type { AccessibleDashboard, AuthStatus, AuthUser, SessionResponse } from '@/types/auth'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('RESTORING')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboards, setDashboards] = useState<AccessibleDashboard[]>([])
  const [scopes, setScopes] = useState<Record<string, string[]>>({})
  const [scopesEnforced, setScopesEnforced] = useState(false)

  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const clearSession = useCallback((next: AuthStatus) => {
    setAccessToken(null)
    setUser(null)
    setDashboards([])
    setScopes({})
    setStatus(next)
  }, [])

  const applyProfile = useCallback(async () => {
    const profile = await fetchProfile()
    setUser(profile.user)
    setDashboards(profile.dashboards)
    setScopes(profile.scopes)
    setScopesEnforced(profile.scopesEnforced)
    setStatus(profile.state === 'PASSWORD_CHANGE_REQUIRED' ? 'PASSWORD_CHANGE_REQUIRED' : 'AUTHENTICATED')
  }, [])

  useEffect(() => {
    setSessionLostHandler((reason) => {
      // Nothing to lose, and no message worth showing, if we never got in.
      if (statusRef.current === 'RESTORING' || statusRef.current === 'UNAUTHENTICATED') return

      if (reason === 'disabled') {
        clearSession('ACCOUNT_DISABLED')
        notify.error('Your access has been withdrawn.', 'Contact your administrator.')
      } else {
        clearSession('SESSION_EXPIRED')
        notify.warning('Your session has expired.', 'Sign in again to continue.')
      }
    })
    return () => setSessionLostHandler(null)
  }, [clearSession])

  // Recover a session from the refresh cookie, once, on start.
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const restored = await restoreSession()
      if (cancelled) return
      if (!restored) {
        setStatus('UNAUTHENTICATED')
        return
      }
      try {
        await applyProfile()
      } catch {
        // The refresh worked but the profile did not. Whatever the reason, we
        // cannot describe this session, so we do not claim to have one.
        if (!cancelled) clearSession('UNAUTHENTICATED')
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [applyProfile, clearSession])

  const adoptSession = useCallback((response: SessionResponse) => {
    setAccessToken(response.accessToken)
    setUser(response.user)
    setStatus(response.state === 'PASSWORD_CHANGE_REQUIRED' ? 'PASSWORD_CHANGE_REQUIRED' : 'AUTHENTICATED')
  }, [])

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const session = await loginRequest(identifier, password)
      setAccessToken(session.accessToken)

      if (session.state === 'PASSWORD_CHANGE_REQUIRED') {
        // The profile endpoint is blocked in this state, and correctly so. The
        // login response already carries everything the gate screen needs.
        setUser(session.user)
        setStatus('PASSWORD_CHANGE_REQUIRED')
        return
      }
      await applyProfile()
    },
    [applyProfile]
  )

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
      notify.info('You have been signed out.')
    } catch {
      // The server could not be reached, or the session was already gone. The
      // local half still has to happen, or the user is stuck on a dead session.
      notify.warning('Signed out locally.', 'The server could not be reached to end the session.')
    } finally {
      clearSession('UNAUTHENTICATED')
    }
  }, [clearSession])

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      dashboards,
      scopes,
      scopesEnforced,
      signIn,
      signOut,
      adoptSession,
      refresh: applyProfile,
      can: (permission: string) => Boolean(user?.permissions?.includes(permission)),
    }),
    [status, user, dashboards, scopes, scopesEnforced, signIn, signOut, adoptSession, applyProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
