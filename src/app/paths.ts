import type { RoleName } from '@/types/auth'

/**
 * Where every screen lives, per shell.
 *
 * The product has two shells - the platform console and the customer workspace
 * - and several features appear in both: the context layer, the analyst agent,
 * the data catalogue, dashboards. They are the same screens, mounted at
 * different paths, because a SUPER_ADMIN working in /platform must stay in
 * /platform.
 *
 * Before this existed each page wrote its own links, so ContextLayerPage sent
 * everyone to /context whichever shell they were in - which dropped a platform
 * administrator out of the console and into the workspace layout mid-task. That
 * is not a bug you fix link by link; it is a bug you fix by never writing the
 * link twice. A page asks for `paths.contextConnection(id)` and gets the one
 * for the shell it is rendering in.
 *
 * Sections that exist in only one shell are typed `null` in the other, so a
 * caller has to decide what to do about a missing destination instead of
 * linking somewhere that would redirect.
 */

export type Shell = 'platform' | 'workspace'

export interface AppPaths {
  readonly shell: Shell

  /** The shell's landing page. Where "home" and a cancelled flow return to. */
  readonly overview: string

  /* Analytics */
  readonly dashboards: string
  dashboard(dashboardId: string): string
  readonly data: string

  /* Intelligence */
  readonly context: string
  contextConnection(connectionId: string): string
  agent(sessionId?: string): string
  readonly playbooks: string
  playbookBuilder(sessionId?: string): string

  /* People */
  readonly users: string
  user(userId: number | string): string
  readonly groups: string

  /* Access. Platform manages the permission model; a tenant manages grants. */
  readonly access: string | null
  readonly roles: string | null

  /* Customers. Platform only - a tenant has no directory of companies. */
  readonly companies: string | null
  company(companyId: number | string): string | null

  /* System */
  readonly audit: string | null
  readonly settings: string
  readonly companySettings: string | null
  readonly profile: string
}

const PLATFORM: AppPaths = {
  shell: 'platform',
  overview: '/platform',

  dashboards: '/platform/dashboards',
  dashboard: (id) => `/platform/dashboards/${encodeURIComponent(id)}`,
  data: '/platform/data',

  context: '/platform/context',
  contextConnection: (id) => `/platform/context/connections/${encodeURIComponent(id)}`,
  agent: (sessionId) => (sessionId ? `/platform/agent/${encodeURIComponent(sessionId)}` : '/platform/agent'),
  playbooks: '/platform/playbooks',
  playbookBuilder: (sessionId) =>
    sessionId ? `/platform/playbook-builder/${encodeURIComponent(sessionId)}` : '/platform/playbook-builder',

  users: '/platform/users',
  user: (id) => `/platform/users/${id}`,
  groups: '/platform/groups',

  // The platform edits the permission model itself; it hands out no grants of
  // its own, because it holds no company for a grant to live in.
  access: null,
  roles: '/platform/roles',

  companies: '/platform/companies',
  company: (id) => `/platform/companies/${id}`,

  audit: '/platform/audit',
  settings: '/platform/settings',
  companySettings: null,
  profile: '/platform/profile',
}

const WORKSPACE: AppPaths = {
  shell: 'workspace',
  overview: '/workspace',

  dashboards: '/dashboards',
  dashboard: (id) => `/dashboards/${encodeURIComponent(id)}`,
  data: '/data',

  context: '/context',
  contextConnection: (id) => `/context/connections/${encodeURIComponent(id)}`,
  agent: (sessionId) => (sessionId ? `/agent/${encodeURIComponent(sessionId)}` : '/agent'),
  playbooks: '/playbooks',
  playbookBuilder: (sessionId) =>
    sessionId ? `/playbook-builder/${encodeURIComponent(sessionId)}` : '/playbook-builder',

  users: '/team/users',
  user: (id) => `/team/users/${id}`,
  groups: '/team/groups',

  access: '/team/access',
  // Editing what a role may do is a change to the product, not to one
  // customer's configuration. A tenant has no roles screen.
  roles: null,

  companies: null,
  company: () => null,

  audit: null,
  settings: '/settings',
  companySettings: '/settings/company',
  profile: '/settings/profile',
}

/**
 * The shell a role belongs in.
 *
 * Derived from the role's scope, which is the same distinction the backend
 * draws with `actor.isPlatform`. There is no default: an unrecognised role is a
 * programming error, and answering "workspace" for one would put an account
 * with unknown privileges into a tenant shell.
 */
export function shellForRole(role: RoleName): Shell {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'platform'
    case 'COMPANY_ADMIN':
    case 'USER':
      return 'workspace'
  }
}

export function pathsFor(shell: Shell): AppPaths {
  return shell === 'platform' ? PLATFORM : WORKSPACE
}

export function pathsForRole(role: RoleName): AppPaths {
  return pathsFor(shellForRole(role))
}
