import { get, post } from '@/api/http'
import type {
  ActivationTarget,
  Profile,
  SessionResponse,
  SessionSummary,
} from '@/types/auth'

/**
 * Session endpoints.
 *
 * `renewOnExpiry: false` on login, activation and password change is load
 * bearing: a 401 from those means the credentials were wrong, not that a
 * session expired, and letting the transport treat it as an expiry would fire a
 * refresh and sign the user out of a session they were trying to start.
 */

export function login(identifier: string, password: string): Promise<SessionResponse> {
  return post<SessionResponse>(
    '/auth/login',
    { identifier, password },
    { renewOnExpiry: false }
  )
}

export function logout(): Promise<{ state: 'UNAUTHENTICATED' }> {
  return post<{ state: 'UNAUTHENTICATED' }>('/auth/logout', undefined, { renewOnExpiry: false })
}

export function fetchProfile(): Promise<Profile> {
  return get<Profile>('/auth/me')
}

export function fetchSessions(): Promise<SessionSummary[]> {
  return get<SessionSummary[]>('/auth/sessions')
}

export function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<SessionResponse> {
  return post<SessionResponse>(
    '/auth/change-password',
    { currentPassword, newPassword },
    { renewOnExpiry: false }
  )
}

export function fetchActivationTarget(token: string): Promise<ActivationTarget> {
  return get<ActivationTarget>('/auth/activation', {
    params: { token },
    renewOnExpiry: false,
  })
}

/** Sets the password on a pending account and signs it in. */
export function activateAccount(token: string, password: string): Promise<SessionResponse> {
  return post<SessionResponse>('/auth/activation', { token, password }, { renewOnExpiry: false })
}
