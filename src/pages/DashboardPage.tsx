import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardRenderer from '@/components/dashboard/DashboardRenderer'
import { fetchView, patchCard } from '@/api/dashboardApi'
import { useAuth } from '@/context/authContext'
import { buildFilters } from '@/services/filters'
import { useNotification } from '@/ui/notificationContext'
import { Loading, PageHeader, Panel } from '@/ui/page'
import type { HydratedDashboardView, CardDefinition, Selections } from '@/types/dashboard'
import { errorCode, errorMessage } from '@/api/client'

/**
 * One dashboard, by id.
 *
 * The engine flow is unchanged: the page sends a dashboard id, slicer ids and
 * the values the user picked, and the backend resolves the spec, plans, runs
 * and formats every visual. Nothing structural is decided here.
 *
 * What changed is that authorization is no longer this page's guess. The view
 * response carries the level the backend resolved for this caller on THIS
 * dashboard, so the editor is offered from the server's answer rather than from
 * a list the client is holding - and a dashboard the caller may not open never
 * produces a view at all.
 */

/** Levels at or above `developer`, which is what editing cards is defined as. */
const EDITING_LEVELS = new Set(['developer', 'admin'])

export default function DashboardPage() {
  const { dashboardId = '' } = useParams()
  const { can } = useAuth()
  const notify = useNotification()

  const [view, setView] = useState<HydratedDashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewLoading, setViewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [selections, setSelections] = useState<Selections>({})

  // Editing needs both halves: the permission to edit any dashboard, and a
  // strong enough grant on this one. The backend requires exactly the same pair.
  const canEdit = Boolean(view && EDITING_LEVELS.has(view.accessLevel) && can('dashboard.update'))

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
      } catch (err) {
        if (!active) return
        const code = errorCode(err)
        // The backend answers "not found" for a dashboard that exists but is
        // not reachable by this caller, on purpose - so ids cannot be probed.
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
      notify.success('Dashboard saved.')
    } catch (err) {
      notify.error('Could not save the dashboard.', errorMessage(err, ''))
    } finally {
      setViewLoading(false)
    }
  }

  if (loading) return <Loading label="Loading dashboard…" />

  if (denied) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard not available" />
        <Panel>
          <p className="text-sm text-slate-600">
            You do not have access to <code className="text-slate-800">{dashboardId}</code>, or it
            does not exist.
          </p>
          <p className="mt-2 text-[13px] text-slate-500">
            An administrator can grant it to you directly or through a group you belong to.
          </p>
          <Link to="/" className="mt-4 inline-block text-[13px] font-medium text-blue-600">
            Back to home
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
      {viewLoading && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-white/60 text-sm font-medium text-slate-500">
          Refreshing…
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
