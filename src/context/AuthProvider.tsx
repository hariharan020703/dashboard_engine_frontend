import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { restoreSession, setAccessToken, setSessionLostHandler } from '@/api/client'
import { fetchProfile, login as loginRequest, logout as logoutRequest } from '@/api/authApi'
import { useNotification } from '@/ui/notificationContext'
import { AuthContext } from './authContext'
import type { AuthState } from './authContext'
import type { AccessibleDashboard, AuthStatus, AuthUser, SessionResponse } from '@/types/auth'

/**
 * Owns the session: the access token, the profile behind it, and every
 * transition between the authentication states.
 *
 * On mount it does NOT trust anything stored in the browser, because nothing is
 * stored in the browser. The access token lives in memory and is gone after a
 * reload; what survives is the HttpOnly refresh cookie, so the app recovers a
 * session by asking the server to mint a new access token from it. That request
 * either works or it does not, and there is no third state to guess about.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const notify = useNotification()

  const [status, setStatus] = useState<AuthStatus>('RESTORING')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboards, setDashboards] = useState<AccessibleDashboard[]>([])
  const [scopes, setScopes] = useState<Record<string, string[]>>({})
  const [scopesEnforced, setScopesEnforced] = useState(false)

  /*
   * Read inside the session-lost handler, which must not be re-registered every
   * time the status changes - an in-flight request would otherwise lose the
   * handler it was going to report to. Written in an effect rather than during
   * render, because a render can be discarded and a ref written in one cannot
   * be taken back.
   */
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

  /**
   * Loads everything the shell needs in one call.
   *
   * The profile endpoint returns the user, their permissions, their scopes AND
   * the dashboards they may open, so there is a single answer to "what is this
   * person allowed to see" rather than three requests that can disagree.
   */
  const applyProfile = useCallback(async () => {
    const profile = await fetchProfile()
    setUser(profile.user)
    setDashboards(profile.dashboards)
    setScopes(profile.scopes)
    setScopesEnforced(profile.scopesEnforced)
    setStatus(profile.state === 'PASSWORD_CHANGE_REQUIRED' ? 'PASSWORD_CHANGE_REQUIRED' : 'AUTHENTICATED')
  }, [])

  /*
   * Any request anywhere can discover the session is over - it expired and
   * could not be renewed, it was revoked elsewhere, or the account was switched
   * off. The API client reports it here so one place handles it, and the user
   * is told why rather than being silently returned to the login screen.
   */
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
  }, [clearSession, notify])

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
  }, [clearSession, notify])

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
