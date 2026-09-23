import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { ApiError, del, get, patch, post, put } from '@/api/http'
import { CONTEXT_API_BASE_URL, IS_SAME_ORIGIN_API } from '../config'

/**
 * The Context Layer's one transport.
 *
 * Two modes, chosen by config.ts from a single environment variable:
 *
 *   same-origin (the default, VITE_CONTEXT_API_URL unset or a relative path)
 *     Goes through the app's own client in src/api/http.ts, which is what
 *     carries the bearer token, the CSRF header, the success/error envelope
 *     and the silent session renewal. A Context Layer request is an
 *     authenticated request like any other, so it must not bypass that.
 *
 *   absolute origin (VITE_CONTEXT_API_URL=https://...)
 *     A separate service. The app's access token is not valid there, and
 *     sending it to a third-party origin would be leaking it, so this mode
 *     uses a bare axios instance with no credentials attached and no envelope
 *     assumed. Configure that service's own auth here when it is specified.
 *
 * Callers never see either. They get typed data or an ApiError, exactly as the
 * rest of the app does — which is what keeps a page's error handling about the
 * page rather than about HTTP.
 */

/** Used only in absolute-origin mode. */
const external = axios.create({
  baseURL: CONTEXT_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Turns an external service's failure into the same ApiError the rest of the
 * app throws, so every consumer has one error type to reason about.
 */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new ApiError(
        'NETWORK_ERROR',
        'Cannot reach the context service. Check your connection and try again.',
        0
      )
    }
    const { status, data } = err.response
    const body = data as { error?: { code?: string; message?: string }; detail?: unknown } | null
    const message =
      body?.error?.message ??
      (typeof body?.detail === 'string' ? body.detail : null) ??
      `The context service returned an unexpected response (${status}).`
    const code = status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR'
    return new ApiError((body?.error?.code as never) ?? (code as never), message, status)
  }
  return new ApiError('INTERNAL_ERROR', 'Something went wrong.', 0)
}

async function externalRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await external.request<T>(config)
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

/**
 * The verbs. Every service module in this folder goes through these four and
 * nothing else — no component, hook or service imports axios directly.
 */
export const contextHttp = {
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? get<T>(path, config)
      : externalRequest<T>({ ...config, url: path, method: 'GET' })
  },
  post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? post<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'POST', data: body })
  },
  put<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? put<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'PUT', data: body })
  },
  patch<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? patch<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'PATCH', data: body })
  },
  delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? del<T>(path, config)
      : externalRequest<T>({ ...config, url: path, method: 'DELETE' })
  },
}

/**
 * Whether a caught error means "the backend has no such route yet", as opposed
 * to "the request failed".
 *
 * The Express backend answers an unmatched /api path with RESOURCE_NOT_FOUND
 * and the message `Unknown API endpoint: GET /api/...`; an absolute-origin
 * service answers a bare 404. Both are the same fact from the UI's point of
 * view, and it is a fact worth telling apart from a genuine failure: one is
 * "this feature is not built yet", the other is "something went wrong", and
 * showing a Retry button for the first wastes the user's time.
 *
 * A 404 that names a resource rather than a route — a deleted connection, a
 * table id that no longer exists — is deliberately NOT treated as unbuilt.
 * Against our own backend the two are distinguishable, because only the
 * router's catch-all produces "Unknown API endpoint", so that message is
 * required. Against an absolute origin nothing distinguishes them, so any 404
 * is taken as unbuilt — the safer reading while that service does not exist.
 */
export function isEndpointMissing(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (err.status !== 404) return false
  if (!IS_SAME_ORIGIN_API) return true
  return /unknown api endpoint/i.test(err.message)
}

export { ApiError }
