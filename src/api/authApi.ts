import { apiFetch } from '@/api/client'
import type {
  ActivationTarget,
  Profile,
  SessionResponse,
  SessionSummary,
} from '@/types/auth'

/**
 * The auth API, matching the backend's /api/auth router - the endpoints an
 * account hits for itself.
 *
 * `renewOnExpiry: false` appears on the three calls where a 401 means "these
 * credentials are wrong" rather than "your session ended". Without it, a
 * mistyped password would trigger a refresh attempt and then a spurious
 * sign-out on a session that was never established.
 */

export function login(identifier: string, password: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
    renewOnExpiry: false,
  })
}

/**
 * Ends the session server-side.
 *
 * The refresh family is revoked before the cookies are cleared, so the session
 * is genuinely over rather than merely forgotten by this browser.
 */
export function logout(): Promise<{ state: 'UNAUTHENTICATED' }> {
  return apiFetch('/api/auth/logout', { method: 'POST', renewOnExpiry: false })
}

/**
 * The signed-in account, re-read from the server.
 *
 * Called after anything that changes role, permissions or grants: the backend
 * re-reads all of them per request, so the UI has to ask rather than assume its
 * cached copy is still true.
 */
export function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>('/api/auth/me')
}

export function fetchSessions(): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>('/api/auth/sessions')
}

/**
 * Changes the password and returns a fresh session.
 *
 * The backend revokes every other session in the process, so the response is a
 * new access token rather than an acknowledgement - the old one is no longer
 * backed by anything.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    renewOnExpiry: false,
  })
}

/** Describes an activation link, so the set-password screen can say who it is for. */
export function fetchActivationTarget(token: string): Promise<ActivationTarget> {
  return apiFetch<ActivationTarget>(`/api/auth/activation?token=${encodeURIComponent(token)}`, {
    renewOnExpiry: false,
  })
}

/** Sets the password on a pending account and signs it in. */
export function activateAccount(token: string, password: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/activation', {
    method: 'POST',
    body: { token, password },
    renewOnExpiry: false,
  })
}
