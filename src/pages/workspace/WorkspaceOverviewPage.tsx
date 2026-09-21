import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ChartColumn,
  Database,
  LayoutDashboard,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { listGroups, listUsers } from '@/api/adminApi'
import { useAuth } from '@/context/authContext'
import { dedupeDashboards } from '@/services/dashboards'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import StatCard from '@/ui/StatCard'
import { EmptyState, Panel } from '@/ui/page'
import { actionPrimaryCls } from '@/ui/styles'
import type { AdminUser, Group } from '@/types/admin'
import UserOnboardingModal from '@/components/onboarding/UserOnboardingModal'

export default function WorkspaceOverviewPage() {
  const { user, dashboards, can } = useAuth()
  const navigate = useNavigate()
  const listedDashboards = dedupeDashboards(dashboards)
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN'

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  useEffect(() => {
    if (!isCompanyAdmin) return
    let active = true

    if (can('user.read')) {
      listUsers()
        .then((data) => {
          if (active) setUsers(data)
        })
        .catch(() => {})
    }

    if (can('group.read')) {
      listGroups()
        .then((data) => {
          if (active) setGroups(data)
        })
        .catch(() => {})
    }

    return () => {
      active = false
    }
  }, [isCompanyAdmin, can])

  const greetingTime = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {greetingTime()}, {user?.displayName || user?.username || 'Team Member'}!
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {isCompanyAdmin
                ? 'Manage your team, allocate dashboard access, and explore enterprise analytics.'
                : 'Explore your assigned business analytics dashboards and data insights.'}
            </p>
          </div>

          {isCompanyAdmin && can('user.create') && (
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className={actionPrimaryCls}
            >
              <UserPlus size={14} />
              Add Team Member
            </button>
          )}
        </div>
      </div>

      {isCompanyAdmin && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Team Members"
            value={users?.length ?? '—'}
            subtitle="Active company employees"
            icon={Users}
            tone="blue"
            onClick={() => navigate('/team/users')}
          />

          <StatCard
            title="Team Groups"
            value={groups?.length ?? '—'}
            subtitle="Functional teams (Sales, Marketing)"
            icon={UsersRound}
            tone="purple"
            onClick={() => navigate('/team/groups')}
          />

          <StatCard
            title="Assigned Dashboards"
            value={listedDashboards.length}
            subtitle="Available to company users"
            icon={LayoutDashboard}
            tone="emerald"
          />
        </div>
      )}

      <div className="space-y-6">
        <Panel
          title="Your Dashboards"
          description="Interactive analytics applications backed by the live query engine."
          flush
        >
          {listedDashboards.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                message="No dashboards have been granted to your account yet."
                hint={
                  isCompanyAdmin
                    ? 'Your company needs dashboards assigned by the platform owner.'
                    : 'Your company administrator can grant dashboard access to your account or group.'
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {listedDashboards.map((d) => (
                <Link
                  key={d.id}
                  to={`/dashboards/${encodeURIComponent(d.id)}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <ChartColumn size={17} />
                      </span>
                      <AccessLevelBadge level={d.accessLevel} />
                    </div>

                    <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-blue-600">
                      {d.title || d.id}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      Live data analysis with slice-and-dice aggregations, KPI metrics, and charts.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-blue-600">
                    <span>Open Dashboard</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        {/* Data Catalog Link Banner */}
        {can('data.read') && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Database size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Explore Data Catalog</h4>
                <p className="text-xs text-slate-500">
                  Inspect available reporting metrics, measures, and dimension attributes.
                </p>
              </div>
            </div>
            <Link
              to="/data"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Browse Data
            </Link>
          </div>
        )}
      </div>

      {onboardingOpen && (
        <UserOnboardingModal
          onCreated={() => {
            if (can('user.read')) {
              listUsers().then(setUsers).catch(() => {})
            }
          }}
          onClose={() => setOnboardingOpen(false)}
        />
      )}
    </div>
  )
}
