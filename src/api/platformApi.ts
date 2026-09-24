import { del, get, patch, post, put } from '@/api/http'
import type { RoleName } from '@/types/auth'
import type {
  AdminUser,
  AuditLogEntry,
  Company,
  CompanyOption,
  DashboardSummary,
  ListQuery,
  NewCompany,
  Paged,
  UserListItem,
  PermissionDef,
  PlatformOverview,
  Role,
  RolePermissions,
} from '@/types/admin'

/**
 * The platform console's API: everything under /api/platform.
 *
 * These endpoints cross tenants, and the namespace is gated as a whole on the
 * server by requirePlatform. A company-scoped account calling any of them gets
 * 403 - which is why nothing in the customer workspace imports this module.
 */

/* -------------------------------------------------------------- overview --- */

/** Real counts across the platform. Every figure is a COUNT over a table. */
export function fetchPlatformOverview(): Promise<PlatformOverview> {
  return get<PlatformOverview>('/platform/overview')
}

/* ------------------------------------------------------------- companies --- */

/** One page of companies, searched and sorted by the server. */
export function listCompanies(query: ListQuery & { active?: boolean }): Promise<Paged<Company>> {
  return get<Paged<Company>>('/platform/companies', { params: query })
}

/*
 * The company picker list is read by the platform top bar on every page AND by
 * the page beneath it (user directory, onboarding dialogs, connection form) at
 * the same moment. One in-flight request is shared, and the answer is reused
 * briefly; any company write clears it, so a new or renamed company appears in
 * the pickers immediately.
 */
const OPTIONS_TTL_MS = 30_000
let optionsCache: { at: number; value: Promise<CompanyOption[]> } | null = null

function invalidateCompanyOptions(): void {
  optionsCache = null
}

/** id, name and active of every company - for pickers, not for the table. */
export function listCompanyOptions(): Promise<CompanyOption[]> {
  if (optionsCache && Date.now() - optionsCache.at < OPTIONS_TTL_MS) return optionsCache.value
  const value = get<CompanyOption[]>('/platform/companies/options')
  optionsCache = { at: Date.now(), value }
  // A failure must not be served from the cache for the next 30 seconds.
  value.catch(invalidateCompanyOptions)
  return value
}

export function fetchCompany(id: number): Promise<Company> {
  return get<Company>(`/platform/companies/${id}`)
}

/**
 * Creates the company and invites its administrator in one request.
 *
 * Both happen or neither does: if the invitation cannot be delivered the
 * backend removes the company again, so a rejected call leaves nothing behind
 * and the same name can be retried.
 */
export function createCompany(body: NewCompany): Promise<Company> {
  invalidateCompanyOptions()
  return post<Company>('/platform/companies', body)
}

export function updateCompany(
  id: number,
  body: { name?: string; active?: boolean }
): Promise<Company> {
  invalidateCompanyOptions()
  return patch<Company>(`/platform/companies/${id}`, body)
}

export function deleteCompany(id: number): Promise<{ deleted: true }> {
  invalidateCompanyOptions()
  return del<{ deleted: true }>(`/platform/companies/${id}`)
}

/* --------------------------------------------- dashboard assignment --- */

/** Every dashboard in the registry, flagged with whether this company has it. */
export function listCompanyDashboards(companyId: number): Promise<DashboardSummary[]> {
  return get<DashboardSummary[]>(`/platform/companies/${companyId}/dashboards`)
}

export function assignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return put(`/platform/companies/${companyId}/dashboards/${encodeURIComponent(dashboardId)}`)
}

export function unassignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return del(`/platform/companies/${companyId}/dashboards/${encodeURIComponent(dashboardId)}`)
}

/* ----------------------------------------------------------------- users --- */

/** One page of the cross-tenant directory. `companyId` narrows it to one customer. */
export function listUsers(
  query: ListQuery & { companyId?: number; role?: string; status?: string }
): Promise<Paged<UserListItem>> {
  return get<Paged<UserListItem>>('/platform/users', { params: query })
}

export function fetchUser(id: number): Promise<AdminUser> {
  return get<AdminUser>(`/platform/users/${id}`)
}

/**
 * Onboards an account and sends its activation email.
 *
 * No password is sent or returned: the account is created with none, and its
 * owner sets one through the emailed link.
 */
export function createUser(body: {
  username: string
  email: string
  displayName?: string
  role: RoleName
  /** Required for a company-scoped role: the platform has no company of its own. */
  companyId?: number
}): Promise<AdminUser> {
  return post<AdminUser>('/platform/users', body)
}

export function updateUser(
  id: number,
  body: { role?: RoleName; displayName?: string | null }
): Promise<AdminUser> {
  return patch<AdminUser>(`/platform/users/${id}`, body)
}

export function deactivateUser(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/platform/users/${id}/deactivate`)
}

export function activateUser(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/platform/users/${id}/activate`)
}

/** Reissues the activation link. This is also how access is reset. */
export function resendActivation(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/platform/users/${id}/activation`)
}

export function deleteUser(id: number): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(`/platform/users/${id}`)
}

/* ----------------------------------------------------------------- roles --- */

export function listRoles(): Promise<Role[]> {
  return get<Role[]>('/platform/roles')
}

/** The whole permission vocabulary. One absent here cannot be granted. */
export function listPermissions(): Promise<PermissionDef[]> {
  return get<PermissionDef[]>('/platform/roles/permissions')
}

export function fetchRolePermissions(name: RoleName): Promise<RolePermissions> {
  return get<RolePermissions>(`/platform/roles/${encodeURIComponent(name)}/permissions`)
}

export function saveRolePermissions(
  name: RoleName,
  permissions: string[]
): Promise<RolePermissions> {
  return put<RolePermissions>(`/platform/roles/${encodeURIComponent(name)}/permissions`, {
    permissions,
  })
}

/* ---------------------------------------------------------------- system --- */

/** One page of the audit trail, searched and sorted over the whole file. */
export function fetchAuditLogs(query: ListQuery & { event?: string }): Promise<Paged<AuditLogEntry>> {
  return get<Paged<AuditLogEntry>>('/platform/audit', { params: query })
}

/**
 * The runtime configuration, as the process actually has it.
 *
 * Read live from the server's config rather than restated in the settings
 * screen, so what is displayed cannot drift from what is in force.
 */
export interface PlatformSettings {
  tokens: {
    accessTokenTtlSeconds: number
    refreshTokenTtlSeconds: number
    activationTokenTtlSeconds: number
  }
  login: { maxAttempts: number; windowSeconds: number; lockoutSeconds: number }
  password: { minLength: number; bcryptRounds: number }
  session: { cookieSecure: boolean; cookieSameSite: string }
  engine: { queryConcurrency: number; dashboardCount: number }
  email: { provider: string; from: string }
}

export function fetchPlatformSettings(): Promise<PlatformSettings> {
  return get<PlatformSettings>('/platform/settings')
}
