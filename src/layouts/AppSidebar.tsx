import { ChartColumn, LayoutDashboard } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { NAV_SECTIONS, isNavItemActive, visibleNav } from '@/app/navigation'
import { dedupeDashboards } from '@/services/dashboards'
import type { AccessibleDashboard } from '@/types/auth'

/**
 * The application's one navigation rail.
 *
 * There is deliberately no AdminSidebar/AnalystSidebar split: the items come
 * from the navigation table and are filtered by the permissions the backend
 * reports for this user, so a new role needs no change here at all.
 */
export default function AppSidebar({
  dashboards,
  onNavigate,
}: {
  dashboards: AccessibleDashboard[]
  /** Lets the mobile drawer close itself after a link is followed. */
  onNavigate?: () => void
}) {
  const { can } = useAuth()
  const { pathname } = useLocation()
  const items = visibleNav(can)
  const listed = dedupeDashboards(dashboards)

  const linkCls = (active: boolean) =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
      active
        ? 'bg-blue-50 font-semibold text-blue-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <nav
      aria-label="Application"
      className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white">
          <LayoutDashboard size={16} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">BI Dashboard</span>
          <span className="block truncate text-[11px] text-slate-400">Analytics workspace</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = items.filter((i) => i.section === section.id)
          if (!sectionItems.length) return null
          return (
            <div key={section.id} className="mb-4 last:mb-0">
              {section.label && (
                <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {sectionItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={linkCls(isNavItemActive(item, pathname))}
                    >
                      <item.icon size={15} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/*
                The dashboards a user may open are grants, not configuration, so
                they are listed under the workspace items rather than declared
                in the navigation table.
              */}
              {section.id === 'workspace' && (
                <>
                  <p className="mt-4 px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Dashboards
                  </p>
                  <ul className="space-y-0.5">
                    {listed.length === 0 && (
                      <li className="px-2.5 py-1.5 text-[12px] text-slate-400">
                        None granted yet
                      </li>
                    )}
                    {listed.map((d) => {
                        const path = `/dashboards/${encodeURIComponent(d.id)}`
                        return (
                          <li key={d.id}>
                            <NavLink
                              to={path}
                              onClick={onNavigate}
                              title={d.title || d.id}
                              className={linkCls(pathname === path)}
                            >
                              <ChartColumn size={15} className="shrink-0 text-slate-400" />
                              <span className="truncate">{d.title || d.id}</span>
                            </NavLink>
                          </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
