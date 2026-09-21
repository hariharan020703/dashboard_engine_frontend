import { createContext, useContext } from 'react'

/**
 * The notification contract.
 *
 * Kept in a .ts file rather than beside the provider: Vite's react-refresh rule
 * wants a .tsx module to export components and nothing else, and a hook
 * exported from the same file as a component breaks fast refresh.
 */

export type NotificationTone = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: number
  tone: NotificationTone
  message: string
  /** A second line for the detail behind the headline, when there is one. */
  detail?: string
}

export interface NotificationApi {
  /** "User created successfully." Confirms something that actually happened. */
  success: (message: string, detail?: string) => void
  /** "Unable to create user." Something was attempted and did not happen. */
  error: (message: string, detail?: string) => void
  /** "This action cannot be undone." A caution about what is about to happen. */
  warning: (message: string, detail?: string) => void
  /** "Sending the invitation email..." Progress, not an outcome. */
  info: (message: string, detail?: string) => void
  /** Removes a notification early - used by the progress-then-outcome pattern. */
  dismiss: (id: number) => void
  /** Like `info`, but returns the id so the caller can replace it on completion. */
  pending: (message: string) => number
}

export const NotificationContext = createContext<NotificationApi | null>(null)

/**
 * The only way a component should report the outcome of an action.
 *
 * Every screen uses this rather than its own banner state, so "did that work?"
 * is answered the same way everywhere and a new screen cannot forget to answer
 * it at all.
 */
export function useNotification(): NotificationApi {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used inside <NotificationProvider>')
  return ctx
}
