import type { AccessLevel, AuthUser, RoleName } from '@/types/auth'

export interface Company {
  id: number
  name: string
  slug: string
  active: boolean
  createdAt: string | null
  userCount?: number
  dashboardCount?: number
  admin?: AdminUser
}

export interface NewCompany {
  name: string
  slug?: string
  admin: {
    username: string
    email: string
    displayName?: string
  }
}

export type AdminUser = Omit<AuthUser, 'permissions'>

export interface UserOption {
  id: number
  username: string
  email: string
}

export interface PermissionDef {
  id: string
  label: string
  description: string
  platformOnly: boolean
}

export interface AccessLevelDef {
  id: AccessLevel
  description: string
}

export interface Role {
  name: RoleName
  scope: 'platform' | 'company'
  description: string | null
  userCount: number
}

export interface RolePermissions {
  role: RoleName
  scope: 'platform' | 'company'
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

export interface DashboardSummary {
  id: string
  title?: string
  source: string
  assigned?: boolean
}

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

export interface GroupDashboards {
  groupId: number
  available: DashboardSummary[]
  held: Array<DashboardSummary & { level: AccessLevel }>
}

export interface ScopeDimension {
  dimension: string
  label: string
  values: string[]
  error?: string
}

export interface ScopeOptions {
  enforced: boolean
  dimensions: ScopeDimension[]
}

export interface UserScope {
  userId: number
  scopes: Record<string, string[]>
  enforced: boolean
}

export interface AuditLogEntry {
  ts: string
  event: string
  actorId: number | null
  actor: string | null
  actorCompanyId: number | null
  [key: string]: unknown
}

/**
 * Counts for the platform console's landing page.
 *
 * Every field is a COUNT the backend computes over a real table. There is no
 * placeholder and no estimate: a number the platform cannot source is simply
 * not in this shape, so the console cannot display one that was invented.
 */
export interface PlatformOverview {
  companies: number
  companiesActive: number
  companiesInactive: number
  users: number
  usersActive: number
  usersPending: number
  companyAdmins: number
  groups: number
  assignments: number
  dashboards: number
}

/** The same, for one company: the caller's own. */
export interface WorkspaceOverview {
  users: number
  usersActive: number
  usersPending: number
  groups: number
  groupsActive: number
  /** Dashboards assigned to the company. */
  dashboards: number
  /** Of those, how many the caller personally holds a grant on. */
  dashboardsGranted: number
  company: Company
}
