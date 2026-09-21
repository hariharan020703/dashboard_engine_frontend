import { apiFetch } from '@/api/client'
import type {
  ActivationTarget,
  Profile,
  SessionResponse,
  SessionSummary,
} from '@/types/auth'

export function login(identifier: string, password: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
    renewOnExpiry: false,
  })
}

export function logout(): Promise<{ state: 'UNAUTHENTICATED' }> {
  return apiFetch('/api/auth/logout', { method: 'POST', renewOnExpiry: false })
}

export function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>('/api/auth/me')
}

export function fetchSessions(): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>('/api/auth/sessions')
}

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
