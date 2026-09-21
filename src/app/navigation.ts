import type { LucideIcon } from 'lucide-react'
import { Building2, Database, House, ShieldCheck, User, Users, UsersRound } from 'lucide-react'

/**
 * The application's navigation, as data.
 *
 * One table drives three things: what the sidebar offers, what each route is
 * guarded on, and what the home screen lists as an available area.
 *
 * There is deliberately no adminNavigation / userNavigation split. `permission`
 * is a permission id straight from the backend's catalogue, so what the UI
 * offers and what the API enforces are the same vocabulary, and a change to
 * what a role may do needs no change here at all. Omitting it means every
 * signed-in user sees the item.
 *
 * Visibility here decides what the app OFFERS. It is not a security boundary:
 * every guarded endpoint checks again server-side.
 */

export type NavSection = 'workspace' | 'administration' | 'account'

export interface NavItem {
  label: string
  /** What this area is for, shown on the home screen. */
  summary: string
  path: string
  icon: LucideIcon
  section: NavSection
  /** Permission required to see it; omitted means any signed-in user. */
  permission?: string
  /** True when child routes (e.g. /admin/users/3) belong to this item. */
  nested?: boolean
}

/** Rendered in this order; a null label prints the group without a heading. */
export const NAV_SECTIONS: Array<{ id: NavSection; label: string | null }> = [
  { id: 'workspace', label: null },
  { id: 'administration', label: 'Administration' },
  { id: 'account', label: 'Account' },
]

/*
 * Not exported: every consumer goes through visibleNav, so nothing can render
 * an item the signed-in user should not be offered.
 */
const NAV: NavItem[] = [
  {
    section: 'workspace',
    label: 'Home',
    summary: 'The dashboards you have been granted, and where to go next.',
    path: '/',
    icon: House,
  },
  {
    section: 'workspace',
    label: 'Data',
    summary: 'The source table behind a dashboard, and every column in it.',
    path: '/data',
    icon: Database,
    permission: 'data.read',
  },
  {
    section: 'administration',
    label: 'Companies',
    summary: 'Customer companies, their people and the dashboards they may use.',
    path: '/admin/companies',
    icon: Building2,
    permission: 'company.read',
    nested: true,
  },
  {
    section: 'administration',
    label: 'Users',
    summary: 'Accounts, roles, dashboard access and row-level data scopes.',
    path: '/admin/users',
    icon: Users,
    permission: 'user.read',
    nested: true,
  },
  {
    section: 'administration',
    label: 'Groups',
    summary: 'Teams that carry dashboard access for all of their members.',
    path: '/admin/groups',
    icon: UsersRound,
    permission: 'group.read',
    nested: true,
  },
  {
    section: 'administration',
    label: 'Roles',
    summary: 'What each of the three roles may do, from the permission catalogue.',
    path: '/admin/roles',
    icon: ShieldCheck,
    permission: 'role.read',
  },
  {
    section: 'account',
    label: 'Profile',
    summary: 'Your role, permissions, sessions and data scopes.',
    path: '/profile',
    icon: User,
  },
]

/** The items a user holding these permissions may see. */
export function visibleNav(can: (permission: string) => boolean): NavItem[] {
  return NAV.filter((item) => !item.permission || can(item.permission))
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true
  return Boolean(item.nested) && pathname.startsWith(`${item.path}/`)
}
