/**
 * The auth API contract, mirroring what the backend actually returns.
 *
 * `AuthUser` is the backend's `publicUser()` shape - never a password hash,
 * never a token. Nothing here is inferred on the client: the state, the
 * permissions and the accessible dashboards are all the server's answers.
 */

/**
 * The account lifecycle, as the backend records it.
 *
 *   pending   created, no password yet, waiting on its activation link
 *   active    can sign in
 *   disabled  switched off by an administrator
 */
export type UserStatus = 'pending' | 'active' | 'disabled'

export interface AuthUser {
  id: number
  /** Null only for a platform account, which belongs to no company. */
  companyId: number | null
  companyName: string | null
  username: string
  email: string
  displayName: string | null
  role: RoleName
  status: UserStatus
  /** True until the account changes a password somebody else set for it. */
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string | null
  /** Permission ids from the backend's catalogue. */
  permissions: string[]
}

export type RoleName = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER'

/**
 * The authentication states the application can be in.
 *
 * Modelled explicitly rather than derived from whether some value happens to be
 * null. "Loading" and "signed out" look identical if the only signal is an
 * absent user, and showing a login form to somebody who is already signed in is
 * the bug that produces.
 */
export type AuthStatus =
  | 'RESTORING'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_DISABLED'

/** What the backend reports on login, refresh, activation and password change. */
export interface SessionResponse {
  accessToken: string
  expiresIn: number
  csrfToken: string
  state: 'AUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED'
  user: AuthUser
}

/** Ranked weakest to strongest; the strongest grant reaching a user wins. */
export type AccessLevel = 'view' | 'share' | 'developer' | 'admin'

/**
 * One dashboard the signed-in user may open. `source` is how the registry
 * resolved the id: a file of its own ('registry') or an alias of the default
 * dashboard ('alias').
 */
export interface AccessibleDashboard {
  id: string
  title?: string
  source: string
  accessLevel: AccessLevel
}

/** `GET /api/auth/me`. */
export interface Profile {
  state: 'AUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED'
  user: AuthUser
  /** Row-level data scopes, as { dimension: values[] }. */
  scopes: Record<string, string[]>
  /**
   * Whether those scopes actually filter queries. The backend reports false
   * today - they are stored and configurable but not yet applied.
   */
  scopesEnforced: boolean
  dashboards: AccessibleDashboard[]
}

/** One live refresh session, for the profile screen. Carries no secrets. */
export interface SessionSummary {
  familyId: string
  startedAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}

/** What an activation link resolves to, before a password is chosen. */
export interface ActivationTarget {
  username: string
  email: string
  displayName: string | null
  companyName: string | null
}
