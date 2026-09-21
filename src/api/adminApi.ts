import { apiFetch } from '@/api/client'
import type { AccessLevel, RoleName } from '@/types/auth'
import type {
  AccessLevelDef,
  AdminUser,
  Company,
  DashboardGrants,
  DashboardSummary,
  Group,
  GroupDashboards,
  GroupDetail,
  GroupMember,
  NewCompany,
  PermissionDef,
  Role,
  RolePermissions,
  ScopeOptions,
  UserGrant,
  UserOption,
  UserScope,
} from '@/types/admin'

/**
 * The administration API: the backend's RBAC routes, one thin function each.
 *
 * Deliberately one module rather than five. These are all calls the same
 * screens make in the same breath - granting a user access needs the directory,
 * the company's dashboards and the access levels - and splitting them by URL
 * prefix would buy nothing but imports.
 *
 * Nothing here adds capability; it only reaches what the backend already has.
 * Note what is absent: no companyId is ever sent from a screen a company
 * administrator uses, because the server derives it from who is asking.
 */

/* ------------------------------------------------------------ companies --- */

export function listCompanies(): Promise<Company[]> {
  return apiFetch<Company[]>('/api/companies')
}

export function fetchCompany(id: number): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`)
}

/**
 * Creates the company and invites its administrator in one request.
 *
 * Both happen or neither does: if the invitation cannot be delivered the
 * backend removes the company again, so a rejected call leaves nothing behind
 * and the same name can be retried.
 */
export function createCompany(body: NewCompany): Promise<Company> {
  return apiFetch<Company>('/api/companies', { method: 'POST', body })
}

export function updateCompany(
  id: number,
  body: { name?: string; active?: boolean }
): Promise<Company> {
  return apiFetch<Company>(`/api/companies/${id}`, { method: 'PATCH', body })
}

export function deleteCompany(id: number): Promise<{ deleted: true }> {
  return apiFetch(`/api/companies/${id}`, { method: 'DELETE' })
}

/** Every dashboard in the registry, flagged with whether this company has it. */
export function listCompanyDashboards(companyId: number): Promise<DashboardSummary[]> {
  return apiFetch<DashboardSummary[]>(`/api/companies/${companyId}/dashboards`)
}

export function assignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return apiFetch(`/api/companies/${companyId}/dashboards/${encodeURIComponent(dashboardId)}`, {
    method: 'PUT',
  })
}

export function unassignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return apiFetch(`/api/companies/${companyId}/dashboards/${encodeURIComponent(dashboardId)}`, {
    method: 'DELETE',
  })
}

/* ---------------------------------------------------------------- users --- */

/** `companyId` narrows the list, and is only honoured for a platform account. */
export function listUsers(companyId?: number): Promise<AdminUser[]> {
  const qs = companyId ? `?companyId=${companyId}` : ''
  return apiFetch<AdminUser[]>(`/api/users${qs}`)
}

export function listUserOptions(): Promise<UserOption[]> {
  return apiFetch<UserOption[]>('/api/users/options')
}

export function fetchUser(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/users/${id}`)
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
  /** Only meaningful for a platform account; ignored by the server otherwise. */
  companyId?: number
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/api/users', { method: 'POST', body })
}

export function updateUser(
  id: number,
  body: { role?: RoleName; displayName?: string | null }
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/users/${id}`, { method: 'PATCH', body })
}

export function deactivateUser(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/users/${id}/deactivate`, { method: 'POST' })
}

export function activateUser(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/users/${id}/activate`, { method: 'POST' })
}

/** Reissues the activation link. This is also how access is reset. */
export function resendActivation(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/users/${id}/activation`, { method: 'POST' })
}

export function deleteUser(id: number): Promise<{ deleted: true }> {
  return apiFetch(`/api/users/${id}`, { method: 'DELETE' })
}

/** Every grant reaching a user, direct and inherited through their groups. */
export function fetchUserGrants(id: number): Promise<UserGrant[]> {
  return apiFetch<UserGrant[]>(`/api/users/${id}/access`)
}

/* --------------------------------------------------------------- scopes --- */

export function fetchScopeOptions(): Promise<ScopeOptions> {
  return apiFetch<ScopeOptions>('/api/users/scope-options')
}

export function fetchUserScope(id: number): Promise<UserScope> {
  return apiFetch<UserScope>(`/api/users/${id}/scope`)
}

/** Replaces the dimensions named in the payload; others keep their values. */
export function saveUserScope(id: number, scopes: Record<string, string[]>): Promise<UserScope> {
  return apiFetch<UserScope>(`/api/users/${id}/scope`, { method: 'PUT', body: { scopes } })
}

/* ---------------------------------------------------------------- roles --- */

export function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>('/api/roles')
}

/** The whole permission vocabulary. One absent here cannot be granted. */
export function listPermissions(): Promise<PermissionDef[]> {
  return apiFetch<PermissionDef[]>('/api/roles/permissions')
}

export function listAccessLevels(): Promise<AccessLevelDef[]> {
  return apiFetch<AccessLevelDef[]>('/api/roles/access-levels')
}

export function fetchRolePermissions(name: RoleName): Promise<RolePermissions> {
  return apiFetch<RolePermissions>(`/api/roles/${encodeURIComponent(name)}/permissions`)
}

export function saveRolePermissions(
  name: RoleName,
  permissions: string[]
): Promise<RolePermissions> {
  return apiFetch<RolePermissions>(`/api/roles/${encodeURIComponent(name)}/permissions`, {
    method: 'PUT',
    body: { permissions },
  })
}

/* --------------------------------------------------------------- groups --- */

export function listGroups(): Promise<Group[]> {
  return apiFetch<Group[]>('/api/groups')
}

export function fetchGroup(id: number): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/api/groups/${id}`)
}

export function fetchGroupMembers(id: number): Promise<GroupMember[]> {
  return apiFetch<GroupMember[]>(`/api/groups/${id}/members`)
}

export function createGroup(body: {
  name: string
  active?: boolean
  userIds?: number[]
  companyId?: number
}): Promise<Group> {
  return apiFetch<Group>('/api/groups', { method: 'POST', body })
}

export function updateGroup(
  id: number,
  body: { name?: string; active?: boolean; userIds?: number[] }
): Promise<Group> {
  return apiFetch<Group>(`/api/groups/${id}`, { method: 'PUT', body })
}

export function deleteGroup(id: number): Promise<{ deleted: true }> {
  return apiFetch(`/api/groups/${id}`, { method: 'DELETE' })
}

/* --------------------------------------------------------------- access --- */

/**
 * What the caller may hand out.
 *
 * For a company administrator this is their company's assigned dashboards, not
 * the whole registry - so the picker cannot offer something the backend would
 * refuse.
 */
export function listGrantableDashboards(companyId?: number): Promise<DashboardSummary[]> {
  const qs = companyId ? `?companyId=${companyId}` : ''
  return apiFetch<DashboardSummary[]>(`/api/access/dashboards/grantable${qs}`)
}

export function fetchDashboardGrants(
  dashboardId: string,
  companyId?: number
): Promise<DashboardGrants> {
  const qs = companyId ? `?companyId=${companyId}` : ''
  return apiFetch<DashboardGrants>(
    `/api/access/dashboards/${encodeURIComponent(dashboardId)}/grants${qs}`
  )
}

export function grantUserAccess(
  dashboardId: string,
  userId: number,
  level: AccessLevel
): Promise<unknown> {
  return apiFetch(`/api/access/dashboards/${encodeURIComponent(dashboardId)}/users/${userId}`, {
    method: 'PUT',
    body: { level },
  })
}

export function revokeUserAccess(dashboardId: string, userId: number): Promise<unknown> {
  return apiFetch(`/api/access/dashboards/${encodeURIComponent(dashboardId)}/users/${userId}`, {
    method: 'DELETE',
  })
}

export function grantGroupAccess(
  dashboardId: string,
  groupId: number,
  level: AccessLevel
): Promise<unknown> {
  return apiFetch(`/api/access/dashboards/${encodeURIComponent(dashboardId)}/groups/${groupId}`, {
    method: 'PUT',
    body: { level },
  })
}

export function revokeGroupAccess(dashboardId: string, groupId: number): Promise<unknown> {
  return apiFetch(`/api/access/dashboards/${encodeURIComponent(dashboardId)}/groups/${groupId}`, {
    method: 'DELETE',
  })
}

export function fetchGroupDashboards(groupId: number): Promise<GroupDashboards> {
  return apiFetch<GroupDashboards>(`/api/access/groups/${groupId}/dashboards`)
}
