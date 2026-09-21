import { ChartColumn, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { visibleNav } from '@/app/navigation'
import { useAuth } from '@/context/authContext'
import { dedupeDashboards } from '@/services/dashboards'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import RoleBadge from '@/components/rbac/RoleBadge'
import { EmptyState, PageHeader, Panel } from '@/ui/page'

export default function HomePage() {
  const { user, dashboards, can } = useAuth()
  const listed = dedupeDashboards(dashboards)

  // Home itself is on the list; pointing at the screen you are already on is
  // not a destination.
  const areas = visibleNav(can).filter((item) => item.path !== '/')

  return (
    <div className="p-6">
      <PageHeader
        title={`Welcome, ${user?.displayName || user?.username || ''}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user && <RoleBadge role={user.role} />}
            {user?.companyName && <span>{user.companyName}</span>}
            <span>
              {user?.permissions.length ?? 0} permission
              {user?.permissions.length === 1 ? '' : 's'}
            </span>
          </span>
        }
      />

      <div className="space-y-6">
        <Panel
          title="Your dashboards"
          description="Each one is opened through the query engine against live data."
          flush
        >
          {listed.length === 0 ? (
            <EmptyState
              message="You have not been granted a dashboard yet."
              hint="An administrator grants access from Administration → Users."
            />
          ) : (
            <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {listed.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/dashboards/${encodeURIComponent(d.id)}`}
                    className="flex h-full items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
                      <ChartColumn size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {d.title || d.id}
                      </span>
                      <span className="mt-1 block">
                        <AccessLevelBadge level={d.accessLevel} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {areas.length > 0 && (
          <Panel
            title="Available to you"
            description="Filtered by the permissions your role holds."
            flush
          >
            <ul className="divide-y divide-slate-100">
              {areas.map((area) => (
                <li key={area.path}>
                  <Link
                    to={area.path}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
                      <area.icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{area.label}</span>
                      <span className="block text-[12px] text-slate-500">{area.summary}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
