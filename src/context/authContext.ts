import { createContext, useContext } from 'react'
import type { AccessibleDashboard, AuthStatus, AuthUser } from '@/types/auth'

/**
 * The auth context and its hook.
 *
 * Kept in a .ts file rather than beside the provider: Vite's react-refresh rule
 * wants a .tsx module to export components and nothing else, and a hook
 * exported from the same file as a component breaks fast refresh.
 */

export interface AuthState {
  /** See types/auth.ts - an explicit state, never inferred from a null user. */
  status: AuthStatus
  user: AuthUser | null
  /** The dashboards the backend says this user may open. */
  dashboards: AccessibleDashboard[]
  scopes: Record<string, string[]>
  scopesEnforced: boolean

  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Adopts a session returned by activation or a password change. */
  adoptSession: (response: import('@/types/auth').SessionResponse) => void
  /** Re-reads the profile - call after anything that changes role or grants. */
  refresh: () => Promise<void>

  /**
   * Whether the user's role holds a permission.
   *
   * This drives what the UI OFFERS. It is not a security boundary - every
   * guarded endpoint checks again server-side, and the backend is the only
   * thing standing between a request and the data.
   */
  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
