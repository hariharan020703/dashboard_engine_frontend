import type { AccessLevel, AuthUser, RoleName } from '@/types/auth'

/**
 * The administration API contract: companies, users, roles, groups, dashboard
 * grants and row-level data scopes, exactly as the backend returns them.
 *
 * Every screen under pages/admin reads these shapes rather than inventing its
 * own, so a change to what the server sends is one edit here and a type error
 * everywhere it matters.
 */

export interface Company {
  id: number
  name: string
  slug: string
  active: boolean
  createdAt: string | null
  /** Present on list and detail reads; absent on the create response. */
  userCount?: number
  dashboardCount?: number
  /** Only on the create response: the administrator who was just invited. */
  admin?: AdminUser
}

/**
 * What POST /api/companies takes.
 *
 * The administrator is required rather than optional, because a company with
 * no account in it can neither be signed into nor administered - it only holds
 * the name that the second attempt then collides with.
 */
export interface NewCompany {
  name: string
  slug?: string
  admin: {
    username: string
    email: string
    displayName?: string
  }
}

/**
 * An account as the directory shows it.
 *
 * Identical to the signed-in user's shape minus the permissions, which are
 * resolved from the role and only ever reported for the caller themselves.
 */
export type AdminUser = Omit<AuthUser, 'permissions'>

/** id, username and email - what the member and grant pickers need. */
export interface UserOption {
  id: number
  username: string
  email: string
}

/** One entry of the backend's permission catalogue. */
export interface PermissionDef {
  id: string
  label: string
  description: string
  /** True when a company-scoped role may never hold it. */
  platformOnly: boolean
}

export interface AccessLevelDef {
  id: AccessLevel
  description: string
}

export interface Role {
  name: RoleName
  /** 'platform' roles are not bounded by a company; 'company' roles are. */
  scope: 'platform' | 'company'
  description: string | null
  userCount: number
}

export interface RolePermissions {
  role: RoleName
  scope: 'platform' | 'company'
  /** False for SUPER_ADMIN, which always holds everything. */
  editable: boolean
  permissions: string[]
}

export interface Group {
  id: number
  companyId: number
  companyName: string
  name: string
  active: boolean
  createdAt: string | null
  memberCount: number
}

export interface GroupDetail extends Group {
  userIds: number[]
}

export interface GroupMember {
  id: number
  username: string
  email: string
  role: RoleName
  status: string
}

/** A dashboard the registry can resolve, with whether a company may use it. */
export interface DashboardSummary {
  id: string
  title?: string
  source: string
  assigned?: boolean
}

/** One grant reaching a user, labelled by how it reached them. */
export interface UserGrant {
  dashboardId: string
  dashboardTitle: string | null
  level: AccessLevel
  origin: 'direct' | 'group'
  groupId: number | null
  groupName: string | null
}

export interface DashboardGrants {
  dashboardId: string
  users: Array<{
    userId: number
    username: string
    email: string
    level: AccessLevel
    grantedAt: string | null
  }>
  groups: Array<{
    groupId: number
    groupName: string
    level: AccessLevel
    grantedAt: string | null
    active: boolean
  }>
}

/** What one group carries, alongside everything it could be given. */
export interface GroupDashboards {
  groupId: number
  available: DashboardSummary[]
  held: Array<DashboardSummary & { level: AccessLevel }>
}

/** One row-level dimension a scope may be assigned on, with its real values. */
export interface ScopeDimension {
  dimension: string
  label: string
  values: string[]
  /** Set when the column could not be read; the dimension still lists, empty. */
  error?: string
}

export interface ScopeOptions {
  /** False today: scopes are stored and configurable but nothing filters on them. */
  enforced: boolean
  dimensions: ScopeDimension[]
}

export interface UserScope {
  userId: number
  scopes: Record<string, string[]>
  enforced: boolean
}
