import type { AccessLevel, AuthUser, RoleName, UserStatus } from '@/types/auth'

/**
 * One page of a server-side list, and the query that asks for it.
 *
 * Every paged endpoint takes ?page&pageSize&search&sort&dir (plus its own
 * filters) and answers { items, total }: the database searches, sorts and
 * limits, and only the visible page crosses the wire. `total` is the number of
 * rows matching the filters, which is what the pager counts.
 */
export interface Paged<T> {
  items: T[]
  total: number
}

export interface ListQuery {
  page: number
  pageSize: number
  search?: string
  sort?: string
  dir?: 'asc' | 'desc'
}

export interface Company {
  id: number
  name: string
  slug: string
  active: boolean
  createdAt: string | null
  userCount?: number
  dashboardCount?: number
  /** Accounts awaiting activation. Sent by the company detail endpoint only. */
  pendingCount?: number
  admin?: AdminUser
}

/** What a company picker renders. GET /platform/companies/options. */
export interface CompanyOption {
  id: number
  name: string
  active: boolean
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

/**
 * One row of the people table - the columns it renders. Optional fields are
 * omitted by the server when empty; `companyName` is only sent to a platform
 * caller, and its absence there means a platform account.
 */
export interface UserListItem {
  id: number
  username: string
  email: string
  role: RoleName
  status: UserStatus
  displayName?: string
  lastLoginAt?: string
  companyName?: string
}

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

export interface DashboardSummary {
  id: string
  title?: string | null
  source: string
  assigned?: boolean
}

export interface UserGrant {
  dashboardId: string
  dashboardTitle: string | null
  level: AccessLevel
  origin: 'direct' | 'group'
  /** Present on a group grant only. */
  groupId?: number
  groupName?: string
}

export interface DashboardGrants {
  dashboardId: string
  /**
   * What the CALLER may do here. A company administrator has full authority;
   * anyone else acts through their own level on this dashboard - sharing up to
   * that level, and removing access only with "Full control".
   */
  you?: {
    userId: number
    level: AccessLevel
    administrator: boolean
    mayRevoke: boolean
  }
  users: Array<{
    userId: number
    username: string
    email: string
    level: AccessLevel
  }>
  groups: Array<{
    groupId: number
    groupName: string
    level: AccessLevel
    active: boolean
  }>
}

export interface GroupDashboards {
  available: Array<{ id: string; title: string | null }>
  held: Array<{ id: string; title: string | null; level: AccessLevel }>
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

/**
 * One audit entry, shaped by the server for the table: `label` and `summary`
 * are what the Event and Detail columns print, `tone` categorises the event,
 * `detail` is every non-envelope field for the inspect dialog. `ts` stays ISO -
 * how it reads depends on the viewer's locale and timezone, which only the
 * browser knows.
 */
export interface AuditLogEntry {
  ts: string
  event: string
  label: string
  tone: 'danger' | 'warning' | 'success' | 'neutral'
  summary: string
  detail: Record<string, unknown>
  actor?: string
  actorId?: number
  actorCompanyId?: number
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
}
