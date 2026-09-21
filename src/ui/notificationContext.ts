import { createContext, useContext } from 'react'

export type NotificationTone = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: number
  tone: NotificationTone
  message: string
  detail?: string
}

export interface NotificationApi {
  success: (message: string, detail?: string) => void
  error: (message: string, detail?: string) => void
  warning: (message: string, detail?: string) => void
  info: (message: string, detail?: string) => void
  dismiss: (id: number) => void
  pending: (message: string) => number
}

export const NotificationContext = createContext<NotificationApi | null>(null)

export function useNotification(): NotificationApi {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used inside <NotificationProvider>')
  return ctx
}
