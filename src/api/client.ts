
export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_ACTIVATION_TOKEN'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_PENDING_ACTIVATION'
  | 'COMPANY_DISABLED'
  | 'CSRF_TOKEN_INVALID'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_PERMISSION'
  | 'TENANT_ACCESS_DENIED'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_DASHBOARD_ID'
  | 'DASHBOARD_NOT_FOUND'
  | 'INVALID_FILTER'
  | 'CONNECTOR_AUTH_FAILED'
  | 'CONNECTOR_UNREACHABLE'
  | 'EMAIL_DELIVERY_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

interface SuccessEnvelope<T> {
  success: true
  data: T
}
interface ErrorEnvelope {
  success: false
  error: { code: ApiErrorCode; message: string; details?: unknown }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function hasAccessToken(): boolean {
  return accessToken !== null
}

const CSRF_COOKIE = 'da_csrf'

function csrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/* ---------------------------------------------------------- session events --- */

export type SessionLostReason = 'expired' | 'revoked' | 'disabled'

let onSessionLost: ((reason: SessionLostReason) => void) | null = null

/**
 * AuthProvider registers here, so any call anywhere can end the session without
 * every caller having to handle it.
 */
export function setSessionLostHandler(handler: ((reason: SessionLostReason) => void) | null): void {
  onSessionLost = handler
}

/* ---------------------------------------------------------------- refresh --- */

/**
 * In-flight refresh, shared by every request that hits an expired token at once.
 *
 * Without this, a page that fires five requests on mount would send five
 * refreshes. Four of them would present a token the first had already rotated,
 * which the backend correctly reads as replay and answers by revoking the whole
 * session - so the deduplication here is not an optimisation, it is what keeps
 * concurrent requests from logging the user out.
 */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const token = csrfToken()
    if (!token) return false
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'X-CSRF-Token': token },
      })
      if (!res.ok) return false
      const body = (await res.json()) as SuccessEnvelope<{ accessToken: string }>
      if (!body.success || !body.data.accessToken) return false
      accessToken = body.data.accessToken
      return true
    } catch {
      return false
    } finally {
      // Cleared in a microtask so callers awaiting this promise all observe the
      // same result before a new attempt can start.
      queueMicrotask(() => {
        refreshInFlight = null
      })
    }
  })()

  return refreshInFlight
}

/** Used by AuthProvider on app start to recover a session from the cookie. */
export async function restoreSession(): Promise<boolean> {
  return refreshSession()
}

/* ------------------------------------------------------------------ fetch --- */

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /**
   * Set false on login and activation. A 401 there means "wrong credentials",
   * not "your session ended", and must not trigger a refresh or a sign-out.
   */
  renewOnExpiry?: boolean
}

async function rawFetch(path: string, options: ApiOptions): Promise<Response> {
  // `renewOnExpiry` steers this module and is not part of the request, so it is
  // named here to keep it out of `init` rather than being spread into fetch.
  const { body, renewOnExpiry, ...init } = options
  void renewOnExpiry

  const headers = new Headers(init.headers)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  // Needed on /api/auth so the refresh cookie travels; harmless elsewhere.
  const token = csrfToken()
  if (token) headers.set('X-CSRF-Token', token)

  return fetch(path, {
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let envelope: SuccessEnvelope<T> | ErrorEnvelope | null = null
  if (text) {
    try {
      envelope = JSON.parse(text)
    } catch {
      envelope = null
    }
  }

  if (res.ok && envelope && envelope.success) return envelope.data

  if (envelope && envelope.success === false) {
    throw new ApiError(envelope.error.code, envelope.error.message, res.status, envelope.error.details)
  }

  // A response that is neither shape means something between us and the API
  // answered - a proxy, a gateway, a crash before the handler ran.
  throw new ApiError(
    'INTERNAL_ERROR',
    `The server returned an unexpected response (${res.status}).`,
    res.status
  )
}

/**
 * Makes one API call.
 *
 * On an expired access token it renews the session once and retries, so an
 * expiry mid-session is invisible rather than being an error the user has to
 * recover from by signing in again.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { renewOnExpiry = true } = options

  let res: Response
  try {
    res = await rawFetch(path, options)
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.', 0)
  }

  if (res.status === 401 && renewOnExpiry) {
    const renewed = await refreshSession()
    if (renewed) {
      try {
        res = await rawFetch(path, options)
      } catch {
        throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.', 0)
      }
    } else {
      accessToken = null
      onSessionLost?.('expired')
    }
  }

  try {
    return await parse<T>(res)
  } catch (err) {
    // An account switched off, or a company switched off, mid-session. The
    // session is over; the difference from an expiry is only the message.
    if (
      err instanceof ApiError &&
      (err.code === 'ACCOUNT_DISABLED' || err.code === 'COMPANY_DISABLED') &&
      renewOnExpiry
    ) {
      accessToken = null
      onSessionLost?.('disabled')
    }
    throw err
  }
}

/**
 * The message to show for a caught error.
 *
 * Every backend message is written for the person reading it, so it is used as
 * given. The fallback only covers something that is not an ApiError at all.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** The code for a caught error, for the rare case a caller must branch on it. */
export function errorCode(err: unknown): ApiErrorCode | null {
  return err instanceof ApiError ? err.code : null
}
