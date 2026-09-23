import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bot,
  BookOpen,
  Building2,
  Database,
  KeyRound,
  LayoutDashboard,
  Layers,
  Home,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
  UsersRound,
} from 'lucide-react'
import type { AppPaths } from '@/app/paths'

/**
 * The sidebar, as data.
 *
 * Both shells are described here rather than in the component that draws them,
 * so "what can this account reach" is a list you can read, and adding a screen
 * is one entry rather than an edit to JSX.
 *
 * Two rules hold everywhere:
 *
 *   - an item appears only if the account holds its permission. The sidebar is
 *     not the security boundary - the server is - but offering somebody a link
 *     that will refuse them is its own kind of broken.
 *
 *   - every path comes from the shell's AppPaths table. No item writes a URL,
 *     which is what stops the platform console linking into the workspace.
 */

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission?: string
  /** Matches child routes too - '/platform/companies' stays lit on '/…/42'. */
  exact?: boolean
}

export interface NavGroup {
  /** Null renders the items with no heading, for the first group. */
  title: string | null
  items: NavItem[]
}

/** Drops the items this account may not use, then the groups left empty. */
function visible(groups: NavGroup[], can: (permission: string) => boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0)
}

function platformGroups(paths: AppPaths): NavGroup[] {
  return [
    {
      title: null,
      items: [{ label: 'Overview', path: paths.overview, icon: Home, exact: true }],
    },
    {
      title: 'Customers',
      items: [
        { label: 'Companies', path: paths.companies!, icon: Building2, permission: 'company.read' },
        { label: 'Users', path: paths.users, icon: Users, permission: 'user.read' },
      ],
    },
    {
      title: 'Product',
      items: [
        { label: 'Dashboards', path: paths.dashboards, icon: LayoutDashboard, permission: 'dashboard.read' },
        { label: 'Data sources', path: paths.data, icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Context layer', path: paths.context, icon: Layers, permission: 'context.read' },
        { label: 'Data analyst', path: paths.dataAnalyst(), icon: Bot },
        { label: 'Playbooks', path: paths.playbooks, icon: BookOpen },
      ],
    },
    {
      title: 'Access',
      items: [
        { label: 'Roles', path: paths.roles!, icon: ShieldCheck, permission: 'role.read' },
        { label: 'Groups', path: paths.groups, icon: UsersRound, permission: 'group.read' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Audit log', path: paths.audit!, icon: Activity },
        { label: 'Settings', path: paths.settings, icon: Settings },
      ],
    },
  ]
}

function workspaceGroups(paths: AppPaths): NavGroup[] {
  return [
    {
      title: null,
      items: [{ label: 'Overview', path: paths.overview, icon: Home, exact: true }],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Dashboards', path: paths.dashboards, icon: LayoutDashboard, permission: 'dashboard.read' },
        { label: 'Data', path: paths.data, icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Context layer', path: paths.context, icon: Layers, permission: 'context.read' },
        { label: 'Data analyst', path: paths.dataAnalyst(), icon: Bot },
        { label: 'Playbooks', path: paths.playbooks, icon: BookOpen },
      ],
    },
    {
      title: 'Team',
      items: [
        { label: 'Members', path: paths.users, icon: Users, permission: 'user.read' },
        { label: 'Groups', path: paths.groups, icon: UsersRound, permission: 'group.read' },
        { label: 'Dashboard access', path: paths.access!, icon: KeyRound, permission: 'access.read' },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          label: 'Company',
          path: paths.companySettings!,
          icon: SlidersHorizontal,
          permission: 'company.read',
        },
        { label: 'Your account', path: paths.profile, icon: UserCircle },
      ],
    },
  ]
}

/** The navigation this account actually sees, for the shell it is in. */
export function navigationFor(
  paths: AppPaths,
  can: (permission: string) => boolean
): NavGroup[] {
  return visible(paths.shell === 'platform' ? platformGroups(paths) : workspaceGroups(paths), can)
}

/** Whether `item` is the screen currently open. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
