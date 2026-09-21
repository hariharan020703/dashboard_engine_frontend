import type { LucideIcon } from 'lucide-react'
import { Building2, Database, House, ShieldCheck, User, Users, UsersRound } from 'lucide-react'

export type NavSection = 'workspace' | 'administration' | 'account'

export interface NavItem {
  label: string
  summary: string
  path: string
  icon: LucideIcon
  section: NavSection
  permission?: string
  nested?: boolean
}

export const NAV_SECTIONS: Array<{ id: NavSection; label: string | null }> = [
  { id: 'workspace', label: null },
  { id: 'administration', label: 'Administration' },
  { id: 'account', label: 'Account' },
]

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

export function visibleNav(can: (permission: string) => boolean): NavItem[] {
  return NAV.filter((item) => !item.permission || can(item.permission))
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true
  return Boolean(item.nested) && pathname.startsWith(`${item.path}/`)
}
