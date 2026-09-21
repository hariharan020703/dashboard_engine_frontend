import { useEffect, useState } from 'react'
import {
  ChevronRight,
  Clock,
  RefreshCw,
  Share2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import DashboardRenderer from '@/components/dashboard/DashboardRenderer'
import { fetchView, patchCard } from '@/api/dashboardApi'
import { useAuth } from '@/context/authContext'
import { buildFilters } from '@/services/filters'
import { useNotification } from '@/ui/notificationContext'
import { Loading, PageHeader, Panel } from '@/ui/page'
import type { HydratedDashboardView, CardDefinition, Selections } from '@/types/dashboard'
import { errorCode, errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import { actionButtonCls } from '@/ui/styles'

const EDITING_LEVELS = new Set(['developer', 'admin'])

export default function DashboardPage() {
  const { dashboardId = '' } = useParams()
  const { can, user } = useAuth()
  const notify = useNotification()
  const isPlatform = user?.companyId === null

  const [view, setView] = useState<HydratedDashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewLoading, setViewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [selections, setSelections] = useState<Selections>({})
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const canEdit = Boolean(view && EDITING_LEVELS.has(view.accessLevel) && can('dashboard.update'))
  const canShare = Boolean(view && view.accessLevel !== 'view' && can('access.grant'))

  const syncSelections = (v: HydratedDashboardView) => {
    const sel: Selections = {}
    for (const s of v.slicers || []) {
      const selected = s.options.filter((o) => o.selected).map((o) => o.value)
      if (selected.length) sel[s.id] = new Set(selected)
    }
    setSelections(sel)
  }

  useEffect(() => {
    if (!dashboardId) return
    let active = true

    const run = async () => {
      setLoading(true)
      setError(null)
      setDenied(false)
      setSelections({})
      try {
        const v = await fetchView(dashboardId)
        if (!active) return
        setView(v)
        syncSelections(v)
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } catch (err) {
        if (!active) return
        const code = errorCode(err)
        if (code === 'DASHBOARD_NOT_FOUND' || code === 'TENANT_ACCESS_DENIED') {
          setDenied(true)
        } else {
          setError(errorMessage(err, 'Failed to load the dashboard.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()

    return () => {
      active = false
    }
  }, [dashboardId])

  const loadView = async (filters: Record<string, string[]>) => {
    setViewLoading(true)
    try {
      const v = await fetchView(dashboardId, filters)
      setView(v)
      syncSelections(v)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      notify.error('Could not apply the filter.', errorMessage(err, ''))
    } finally {
      setViewLoading(false)
    }
  }

  const onSlicerChange = (id: string, sel: Set<string>) => {
    setSelections((prev) => {
      const next = { ...prev, [id]: sel }
      void loadView(buildFilters(next))
      return next
    })
  }

  const onClearAll = () => {
    setSelections({})
    void loadView({})
  }

  const onCardEdit = async (index: number, card: CardDefinition) => {
    setViewLoading(true)
    try {
      const v = await patchCard(dashboardId, index, card, buildFilters(selections))
      setView(v)
      syncSelections(v)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      notify.success('Dashboard saved.')
    } catch (err) {
      notify.error('Could not save the dashboard.', errorMessage(err, ''))
    } finally {
      setViewLoading(false)
    }
  }

  if (loading) return <Loading label="Connecting to query engine…" />

  if (denied) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard Unavailable" />
        <Panel>
          <p className="text-sm text-slate-600">
            You do not have access to <code className="text-slate-800">{dashboardId}</code>, or it
            does not exist for your organization.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            An administrator can grant access to your account or team group.
          </p>
          <Link
            to={isPlatform ? '/platform' : '/workspace'}
            className="mt-4 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Back to overview
          </Link>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard" />
        <Panel>
          <p className="text-sm text-red-600">{error}</p>
        </Panel>
      </div>
    )
  }

  if (!view) return null

  return (
    <div className="relative">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Link
            to={isPlatform ? '/platform' : '/workspace'}
            className="hover:text-slate-700"
          >
            {isPlatform ? 'Platform' : 'Workspace'}
          </Link>
          <ChevronRight size={12} />
          <span>Dashboards</span>
          <ChevronRight size={12} />
          <span className="font-semibold text-slate-700">{view.dashboard?.title || dashboardId}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{view.dashboard?.title || dashboardId}</h1>
              <AccessLevelBadge level={view.accessLevel} />
            </div>
            {view.dashboard?.description && (
              <p className="mt-0.5 text-xs text-slate-500">{view.dashboard.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:flex">
                <Clock size={12} />
                Updated at {lastUpdated}
              </span>
            )}

            <button
              type="button"
              onClick={() => void loadView(buildFilters(selections))}
              disabled={viewLoading}
              className={actionButtonCls}
              title="Re-run query engine"
            >
              <RefreshCw size={13} className={viewLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canShare && (
              <Link to="/team/access" className={actionButtonCls}>
                <Share2 size={13} />
                Manage Access
              </Link>
            )}
          </div>
        </div>
      </div>

      {viewLoading && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-white/40 text-xs font-semibold text-slate-600 backdrop-blur-2xs">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <RefreshCw size={14} className="animate-spin text-blue-600" />
            Executing visual queries…
          </div>
        </div>
      )}

      <DashboardRenderer
        dashboardId={dashboardId}
        view={view}
        selections={selections}
        canEdit={canEdit}
        onSlicerChange={onSlicerChange}
        onClearAll={onClearAll}
        onCardEdit={onCardEdit}
      />
    </div>
  )
}
