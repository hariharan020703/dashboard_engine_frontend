import { del, get, patch, post, put } from '@/api/http'
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
  ScopeOptions,
  UserGrant,
  UserOption,
  UserScope,
  WorkspaceOverview,
} from '@/types/admin'

/**
 * The customer workspace's API: one company's people, groups and access.
 *
 * None of these take a company id. The server reads it from the authenticated
 * identity, so there is nothing for a caller to get wrong and nothing for an
 * attacker to change - a company administrator asking for another tenant's team
 * has no way to say which tenant they mean.
 *
 * The platform console does not import this module; it reads the same facts
 * across tenants through platformApi.
 */

/* -------------------------------------------------------------- workspace --- */

/** Real counts for the caller's own company, plus the company itself. */
export function fetchWorkspaceOverview(): Promise<WorkspaceOverview> {
  return get<WorkspaceOverview>('/workspace/overview')
}

/** The company the caller belongs to. */
export function fetchMyCompany(): Promise<Company> {
  return get<Company>('/workspace/company')
}

/* ------------------------------------------------------------------ team --- */

/** The caller's company directory. */
export function listTeam(): Promise<AdminUser[]> {
  return get<AdminUser[]>('/users')
}

/** id, username and email for pickers, same company only. */
export function listUserOptions(): Promise<UserOption[]> {
  return get<UserOption[]>('/users/options')
}

export function fetchTeamMember(id: number): Promise<AdminUser> {
  return get<AdminUser>(`/users/${id}`)
}

/**
 * Onboards a colleague and sends their activation email.
 *
 * The company is the caller's own and is not sent. No password is generated,
 * shown or returned: the account is created with none and its owner sets one
 * through the emailed link.
 */
export function createTeamMember(body: {
  username: string
  email: string
  displayName?: string
  role: RoleName
}): Promise<AdminUser> {
  return post<AdminUser>('/users', body)
}

export function updateTeamMember(
  id: number,
  body: { role?: RoleName; displayName?: string | null }
): Promise<AdminUser> {
  return patch<AdminUser>(`/users/${id}`, body)
}

export function deactivateTeamMember(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/users/${id}/deactivate`)
}

export function activateTeamMember(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/users/${id}/activate`)
}

/** Reissues the activation link. This is also how access is reset. */
export function resendTeamActivation(id: number): Promise<AdminUser> {
  return post<AdminUser>(`/users/${id}/activation`)
}

export function deleteTeamMember(id: number): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(`/users/${id}`)
}

/** Every grant reaching a user, direct and inherited through their groups. */
export function fetchUserGrants(id: number): Promise<UserGrant[]> {
  return get<UserGrant[]>(`/users/${id}/access`)
}

/* ---------------------------------------------------------------- scopes --- */

export function fetchScopeOptions(): Promise<ScopeOptions> {
  return get<ScopeOptions>('/users/scope-options')
}

export function fetchUserScope(id: number): Promise<UserScope> {
  return get<UserScope>(`/users/${id}/scope`)
}

/** Replaces the dimensions named in the payload; others keep their values. */
export function saveUserScope(id: number, scopes: Record<string, string[]>): Promise<UserScope> {
  return put<UserScope>(`/users/${id}/scope`, { scopes })
}

/* ---------------------------------------------------------------- groups --- */

export function listGroups(): Promise<Group[]> {
  return get<Group[]>('/groups')
}

export function fetchGroup(id: number): Promise<GroupDetail> {
  return get<GroupDetail>(`/groups/${id}`)
}

export function fetchGroupMembers(id: number): Promise<GroupMember[]> {
  return get<GroupMember[]>(`/groups/${id}/members`)
}

export function createGroup(body: {
  name: string
  active?: boolean
  userIds?: number[]
  /** Only read for a platform account, which must say which company. */
  companyId?: number
}): Promise<Group> {
  return post<Group>('/groups', body)
}

export function updateGroup(
  id: number,
  body: { name?: string; active?: boolean; userIds?: number[] }
): Promise<Group> {
  return put<Group>(`/groups/${id}`, body)
}

export function deleteGroup(id: number): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(`/groups/${id}`)
}

/* ---------------------------------------------------------------- access --- */

/** What each per-dashboard level means, in words, weakest first. */
export function listAccessLevels(): Promise<AccessLevelDef[]> {
  return get<AccessLevelDef[]>('/access/levels')
}

/**
 * What the caller may hand out.
 *
 * For a company administrator this is their company's assigned dashboards, not
 * the whole registry - so the picker cannot offer something the backend would
 * refuse. `companyId` is only honoured for a platform account.
 */
export function listGrantableDashboards(companyId?: number): Promise<DashboardSummary[]> {
  return get<DashboardSummary[]>('/access/dashboards/grantable', {
    params: companyId ? { companyId } : undefined,
  })
}

export function fetchDashboardGrants(
  dashboardId: string,
  companyId?: number
): Promise<DashboardGrants> {
  return get<DashboardGrants>(`/access/dashboards/${encodeURIComponent(dashboardId)}/grants`, {
    params: companyId ? { companyId } : undefined,
  })
}

export function grantUserAccess(
  dashboardId: string,
  userId: number,
  level: AccessLevel
): Promise<unknown> {
  return put(`/access/dashboards/${encodeURIComponent(dashboardId)}/users/${userId}`, { level })
}

export function revokeUserAccess(dashboardId: string, userId: number): Promise<unknown> {
  return del(`/access/dashboards/${encodeURIComponent(dashboardId)}/users/${userId}`)
}

export function grantGroupAccess(
  dashboardId: string,
  groupId: number,
  level: AccessLevel
): Promise<unknown> {
  return put(`/access/dashboards/${encodeURIComponent(dashboardId)}/groups/${groupId}`, { level })
}

export function revokeGroupAccess(dashboardId: string, groupId: number): Promise<unknown> {
  return del(`/access/dashboards/${encodeURIComponent(dashboardId)}/groups/${groupId}`)
}

export function fetchGroupDashboards(groupId: number): Promise<GroupDashboards> {
  return get<GroupDashboards>(`/access/groups/${groupId}/dashboards`)
}

/* ---------------------------------------------------------------- health --- */

export interface HealthStatus {
  status: 'ok' | 'starting'
  detail: string | null
  email: string
}

export function fetchHealth(): Promise<HealthStatus> {
  return get<HealthStatus>('/health')
}
