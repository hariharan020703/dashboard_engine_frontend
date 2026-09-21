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
