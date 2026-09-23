import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/http'

/**
 * The Context Layer's own QueryClient.
 *
 * Scoped to this module's routes rather than mounted at the app root, because
 * the rest of the application uses the `useAsync` hook and a Context-based
 * session, and putting a second server-state system under all of it would be a
 * change to every screen rather than to this feature. The provider wraps the
 * builder; nothing outside it is affected.
 *
 * Created in state, not at module scope: a module-level client is shared
 * across React roots and survives a remount with the previous session's data
 * still in it, which is how one user briefly sees another's cached response in
 * a test or a fast-refresh reload.
 */

/**
 * Retrying is wrong for most of the failures this module produces.
 *
 * A refused credential, a permission denial, a validation error and a route
 * that does not exist yet are all settled answers — retrying them three times
 * turns an instant, actionable message into several seconds of spinner and the
 * same message. Only a transport failure and a genuine server error are worth
 * a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  if (!(error instanceof ApiError)) return false
  if (error.code === 'NETWORK_ERROR') return true
  return error.status >= 500
}

export function ContextQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            /*
             * A minute is long enough that stepping backwards and forwards
             * through the workflow does not refetch everything, and short
             * enough that a profile somebody is actively working through does
             * not go quietly out of date.
             */
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            /*
             * Off: this is a multi-step form. Alt-tabbing away to read a Domo
             * page and coming back should not discard the step's state or
             * re-run an expensive profile fetch.
             */
            refetchOnWindowFocus: false,
          },
          mutations: {
            // A mutation is somebody's decision. Replaying it automatically
            // could approve the same review item twice.
            retry: false,
          },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
