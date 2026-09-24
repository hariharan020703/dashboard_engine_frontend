import { createContext, useContext } from 'react'
import type { AccessibleDashboard, AuthStatus, AuthUser } from '@/types/auth'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  dashboards: AccessibleDashboard[]

  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  adoptSession: (response: import('@/types/auth').SessionResponse) => void
  refresh: () => Promise<void>

  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
