import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Building2,
  ChartColumn,
  Database,
  Home,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  User,
  Users,
  UsersRound,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { dedupeDashboards } from '@/services/dashboards'
import type { AccessibleDashboard } from '@/types/auth'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'

interface NavLinkItem {
  label: string
  path: string
  icon: LucideIcon
  badge?: string | number
  permission?: string
  exact?: boolean
}

interface NavGroup {
  title: string
  items: NavLinkItem[]
}

interface SidebarProps {
  mode: 'platform' | 'workspace'
  dashboards?: AccessibleDashboard[]
  onNavigate?: () => void
}

export default function Sidebar({
  mode,
  dashboards = [],
  onNavigate,
}: SidebarProps) {
  const { can } = useAuth()
  const { pathname } = useLocation()
  const listedDashboards = dedupeDashboards(dashboards)

  const platformGroups: NavGroup[] = [
    {
      title: 'PLATFORM',
      items: [
        { label: 'Overview', path: '/platform', icon: Home, exact: true },
        { label: 'Companies', path: '/platform/companies', icon: Building2 },
        { label: 'Users', path: '/platform/users', icon: Users },
      ],
    },
    {
      title: 'PRODUCT',
      items: [
        { label: 'Dashboards', path: '/platform/dashboards', icon: LayoutDashboard },
        { label: 'Data Sources', path: '/platform/data', icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'ACCESS',
      items: [
        { label: 'Roles & RBAC', path: '/platform/roles', icon: ShieldCheck, permission: 'role.read' },
        { label: 'Groups', path: '/platform/groups', icon: UsersRound, permission: 'group.read' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Audit Log', path: '/platform/audit', icon: Activity },
        { label: 'Settings', path: '/platform/settings', icon: Settings },
      ],
    },
  ]

  const workspaceGroups: NavGroup[] = [
    {
      title: 'WORKSPACE',
      items: [
        { label: 'Overview', path: '/workspace', icon: Home, exact: true },
        { label: 'Data Catalog', path: '/data', icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'TEAM',
      items: [
        { label: 'Members', path: '/team/users', icon: Users, permission: 'user.read' },
        { label: 'Groups', path: '/team/groups', icon: UsersRound, permission: 'group.read' },
        { label: 'Access Matrix', path: '/team/access', icon: KeyRound, permission: 'access.read' },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        ...(can('company.read')
          ? [{ label: 'Company Settings', path: '/settings/company', icon: Building2 }]
          : []),
        { label: 'Profile & Security', path: '/settings/profile', icon: User },
      ],
    },
  ]

  const activeGroups = mode === 'platform' ? platformGroups : workspaceGroups

  const isActive = (item: NavLinkItem) => {
    if (item.exact) {
      return pathname === item.path
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`)
  }

  const linkClass = (active: boolean) =>
    `group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
      active
        ? 'bg-blue-50/80 font-semibold text-blue-700 shadow-2xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold text-sm tracking-wider shadow-xs">
          E
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="block truncate text-xl font-black tracking-wider text-slate-900">
              ELZE
            </span>
          </div>
          <span className="block truncate text-[10px] font-medium text-slate-400">
            {mode === 'platform' ? 'Management Console' : 'Enterprise Analytics'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {activeGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.permission || can(item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title}>
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onNavigate}
                        className={linkClass(active)}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={15}
                            className={`shrink-0 transition-colors ${
                              active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>

              {mode === 'workspace' && group.title === 'WORKSPACE' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between px-2.5 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Dashboards
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-500">
                      {listedDashboards.length}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {listedDashboards.length === 0 ? (
                      <li className="px-2.5 py-2 text-[11px] italic text-slate-400">
                        No dashboards assigned yet
                      </li>
                    ) : (
                      listedDashboards.map((d) => {
                        const path = `/dashboards/${encodeURIComponent(d.id)}`
                        const active = pathname === path
                        return (
                          <li key={d.id}>
                            <NavLink
                              to={path}
                              onClick={onNavigate}
                              title={d.title || d.id}
                              className={linkClass(active)}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <ChartColumn
                                  size={14}
                                  className={`shrink-0 ${
                                    active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                                />
                                <span className="truncate">{d.title || d.id}</span>
                              </span>
                              <AccessLevelBadge level={d.accessLevel} />
                            </NavLink>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
