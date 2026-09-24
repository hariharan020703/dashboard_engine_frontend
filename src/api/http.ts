import axios from 'axios'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

/**
 * The application's only HTTP transport.
 *
 * Every call the frontend makes goes through this axios instance, so the things
 * that must happen on every request happen in one place: the session cookies,
 * the CSRF header, unwrapping the API's envelope, and renewing an expired session
 * before the caller ever sees a 401.
 *
 * Callers get plain data or an ApiError. They never see an axios response, an
 * envelope, or a retry - which is what keeps a page's error handling about the
 * page rather than about HTTP.
 */

/* ------------------------------------------------------------------ errors --- */

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

/* ------------------------------------------------------------ session state --- */

/**
 * This module holds no token, and neither does anything else in the app.
 *
 * The access and refresh tokens are HttpOnly cookies (da_access, da_refresh):
 * the browser attaches them, and no script - ours or an injected one - can
 * read them. The backend never puts a token in a response body, so there is
 * nothing here to store, attach or leak. The one value script does read is the
 * CSRF cookie, which proves a request came from this page, not a session.
 */

const CSRF_COOKIE = 'da_csrf'

function csrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export type SessionLostReason = 'expired' | 'revoked' | 'disabled'

let onSessionLost: ((reason: SessionLostReason) => void) | null = null

/**
 * AuthProvider registers here, so any call anywhere can end the session without
 * every caller having to handle it.
 */
export function setSessionLostHandler(handler: ((reason: SessionLostReason) => void) | null): void {
  onSessionLost = handler
}

/* ----------------------------------------------------------------- instance --- */

/**
 * `baseURL` is '/api' and every caller passes a path below it, so an endpoint
 * is written once as '/platform/companies' rather than as a string that repeats
 * the prefix and could disagree with it.
 *
 * The browser and the API are same-origin in every supported deployment - this
 * process serves the built frontend, and Vite proxies /api to it in dev - so
 * there is no API host to configure and none is read from the environment.
 */
export const http: AxiosInstance = axios.create({
  baseURL: '/api',
  // The session cookies are HttpOnly and same-origin; this makes them travel.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Per-request switches this module reads. They steer the transport and are not
 * part of the request, so they are stripped before the call goes out.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Set false on login and activation. A 401 there means "wrong credentials",
     * not "your session ended", and must not trigger a refresh or a sign-out.
     */
    renewOnExpiry?: boolean
    /** Set by the interceptor so one request is never retried twice. */
    retriedAfterRenewal?: boolean
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Required on every state-changing request: the session is a cookie, so the
  // backend needs proof the request came from this page. Harmless on reads.
  const token = csrfToken()
  if (token) config.headers.set('X-CSRF-Token', token)

  return config
})

/* ------------------------------------------------------------------ refresh --- */

/**
 * In-flight refresh, shared by every request that hits an expired token at once.
 *
 * Without this, a page that fires five requests on mount would send five
 * refreshes. Four of them would present a token the first had already rotated,
 * which the backend correctly reads as replay and answers by revoking the whole
 * session - so the deduplication here is not an optimisation, it is what keeps
 * concurrent requests from signing the user out.
 */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const token = csrfToken()
    if (!token) return false
    try {
      // Deliberately a bare axios call, not `http`: going through the instance
      // would re-enter the response interceptor below, and a failing refresh
      // would try to refresh itself.
      // Success means the backend wrote fresh session cookies; there is
      // nothing in the body to keep.
      const res = await axios.post<SuccessEnvelope<unknown>>(
        '/api/auth/refresh',
        undefined,
        { headers: { 'X-CSRF-Token': token }, withCredentials: true }
      )
      return res.data?.success === true
    } catch {
      return false
    } finally {
      // Cleared in a microtask so every caller awaiting this promise observes
      // the same result before a new attempt can start.
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

/* -------------------------------------------------------------- unwrapping --- */

function envelopeError(data: unknown, status: number): ApiError {
  const envelope = data as ErrorEnvelope | null
  if (envelope && envelope.success === false && envelope.error) {
    return new ApiError(envelope.error.code, envelope.error.message, status, envelope.error.details)
  }
  // A response that is neither shape means something between us and the API
  // answered - a proxy, a gateway, a crash before the handler ran.
  return new ApiError(
    'INTERNAL_ERROR',
    `The server returned an unexpected response (${status}).`,
    status
  )
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as SuccessEnvelope<unknown> | ErrorEnvelope | null

    // A 2xx carrying an error envelope is not something the API does, but
    // trusting the status alone is how a failure gets rendered as data.
    if (!body || typeof body !== 'object' || !('success' in body)) {
      throw envelopeError(body, response.status)
    }
    if (body.success === false) throw envelopeError(body, response.status)

    response.data = body.data
    return response
  },
  async (error: AxiosError) => {
    // Thrown by the success handler above: already an ApiError, pass it on.
    if (error instanceof ApiError) throw error

    const config = error.config as InternalAxiosRequestConfig | undefined

    if (!error.response) {
      // No response at all: DNS, refused connection, offline, timeout.
      throw new ApiError(
        'NETWORK_ERROR',
        'Cannot reach the server. Check your connection and try again.',
        0
      )
    }

    const { status, data } = error.response
    const renewOnExpiry = config?.renewOnExpiry !== false

    /*
     * An expired access token is renewed once and the request replayed, so an
     * expiry mid-session is invisible rather than an error the user has to
     * recover from by signing in again.
     */
    if (status === 401 && renewOnExpiry && config && !config.retriedAfterRenewal) {
      const renewed = await refreshSession()
      if (renewed) {
        config.retriedAfterRenewal = true
        return http.request(config)
      }
      onSessionLost?.('expired')
      throw envelopeError(data, status)
    }

    const apiError = envelopeError(data, status)

    /*
     * An account switched off, or a company switched off, mid-session. The
     * session is over; the difference from an expiry is only the message.
     */
    if (
      renewOnExpiry &&
      (apiError.code === 'ACCOUNT_DISABLED' || apiError.code === 'COMPANY_DISABLED')
    ) {
      onSessionLost?.('disabled')
    }

    throw apiError
  }
)

/* -------------------------------------------------------------- call helpers --- */

/**
 * The verbs, typed to the unwrapped payload.
 *
 * `T` is what the endpoint's `data` field holds, so a caller writes
 * `get<Company[]>('/platform/companies')` and receives `Company[]`.
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<T>(url, config)
  return res.data
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await http.post<T>(url, body, config)
  return res.data
}

export async function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put<T>(url, body, config)
  return res.data
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await http.patch<T>(url, body, config)
  return res.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<T>(url, config)
  return res.data
}

/* ------------------------------------------------------------- error reading --- */

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

/** True when the error is the API refusing on authorization grounds. */
export function isForbidden(err: unknown): boolean {
  const code = errorCode(err)
  return code === 'INSUFFICIENT_PERMISSION' || code === 'TENANT_ACCESS_DENIED'
}

/** True when the error is the API saying the resource does not exist. */
export function isNotFound(err: unknown): boolean {
  return errorCode(err) === 'RESOURCE_NOT_FOUND'
}
