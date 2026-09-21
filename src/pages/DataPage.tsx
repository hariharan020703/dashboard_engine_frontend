import { useEffect, useState } from 'react'
import {
  BarChart3,
  Filter,
  Table,
} from 'lucide-react'
import { fetchColumns } from '@/api/dashboardApi'
import { useAppData } from '@/layouts/appOutlet'
import { dedupeDashboards } from '@/services/dashboards'
import { useNotification } from '@/ui/notificationContext'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { labelCls, selectCls, tableCls, tdCls, thCls } from '@/ui/styles'
import type { ColumnCatalogue } from '@/types/dashboard'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import StatCard from '@/ui/StatCard'

export default function DataPage() {
  const { dashboards } = useAppData()
  const { user } = useAuth()
  const notify = useNotification()
  const isPlatform = user?.companyId === null
  const listed = dedupeDashboards(dashboards)

  const [picked, setPicked] = useState('')
  const [catalogue, setCatalogue] = useState<ColumnCatalogue | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'measures' | 'dimensions'>('all')

  const dashboardId = picked || listed[0]?.id || ''

  useEffect(() => {
    if (!dashboardId) return
    let active = true

    const run = async () => {
      setLoading(true)
      try {
        const c = await fetchColumns(dashboardId)
        if (active) setCatalogue(c)
      } catch (err) {
        if (!active) return
        setCatalogue(null)
        notify.error('Could not read the data catalog.', errorMessage(err, ''))
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()

    return () => {
      active = false
    }
  }, [dashboardId, notify])

  const measures = catalogue?.columns.filter((c) => c.role === 'measure') ?? []
  const dimensions = catalogue?.columns.filter((c) => c.role !== 'measure') ?? []

  const displayedColumns =
    activeTab === 'measures'
      ? measures
      : activeTab === 'dimensions'
      ? dimensions
      : catalogue?.columns ?? []

  return (
    <div className="p-6">
      <PageHeader
        title={isPlatform ? 'Data Sources & Schema Catalog' : 'Business Data Catalog'}
        description={
          isPlatform
            ? 'Technical schema specifications, reporting tables, and column roles mapped to the query engine.'
            : 'Explore business metrics, measures, and dimension attributes available in your dashboards.'
        }
        actions={
          listed.length > 1 ? (
            <div className="w-60">
              <label className={labelCls} htmlFor="data-dashboard-selector">
                Active Dataset
              </label>
              <select
                id="data-dashboard-selector"
                className={selectCls}
                value={dashboardId}
                onChange={(e) => setPicked(e.target.value)}
              >
                {listed.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.id}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {!listed.length && (
        <Panel flush>
          <EmptyState
            message="No dashboards assigned to your account."
            hint="The data catalog presents columns and metrics mapped to your assigned dashboards."
          />
        </Panel>
      )}

      {loading && (
        <Panel flush>
          <Loading label="Inspecting data catalog…" />
        </Panel>
      )}

      {!loading && catalogue && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Analytical Measures"
              value={measures.length}
              subtitle="Numeric metrics aggregated by query engine"
              icon={BarChart3}
              tone="blue"
            />
            <StatCard
              title="Dimensions & Slicers"
              value={dimensions.length}
              subtitle="Attributes available for grouping and filtering"
              icon={Filter}
              tone="purple"
            />
            <StatCard
              title="Total Data Records"
              value={catalogue.rowCountText || 'Live'}
              subtitle="Validated records in current data source"
              icon={Table}
              tone="emerald"
            />
          </div>

          {isPlatform && (
            <Panel title="Technical Database & Schema Properties">
              <dl className="grid gap-4 sm:grid-cols-4 text-xs">
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Database Name</dt>
                  <dd className="mt-1 font-mono font-semibold text-slate-800">
                    {catalogue.database}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Schema & Table</dt>
                  <dd className="mt-1 font-mono text-slate-800">
                    {catalogue.schema}.{catalogue.table}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Target Driver</dt>
                  <dd className="mt-1 font-mono text-slate-800">PostgreSQL (pg pool)</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Total Columns</dt>
                  <dd className="mt-1 text-slate-800">{catalogue.columns.length}</dd>
                </div>
              </dl>
            </Panel>
          )}

          <Panel
            title="Available Fields & Attributes"
            description="Fields available for visualization, slicer filtering, and dimensional grouping."
            actions={
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({catalogue.columns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('measures')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'measures'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Measures ({measures.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dimensions')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'dimensions'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dimensions ({dimensions.length})
                </button>
              </div>
            }
            flush
          >
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className={thCls}>Field Name</th>
                    <th className={thCls}>Role</th>
                    <th className={thCls}>Data Type</th>
                    {isPlatform && <th className={thCls}>Nullable</th>}
                    <th className={thCls}>Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedColumns.map((c) => {
                    const isMeasure = c.role === 'measure'
                    return (
                      <tr key={c.name} className="hover:bg-slate-50/50">
                        <td className={`${tdCls} font-semibold text-slate-800`}>{c.name}</td>
                        <td className={tdCls}>
                          <Badge tone={isMeasure ? 'info' : 'neutral'}>
                            {isMeasure ? 'Measure' : 'Dimension'}
                          </Badge>
                        </td>
                        <td className={`${tdCls} font-mono text-xs text-slate-500`}>
                          {c.columnType}
                        </td>
                        {isPlatform && (
                          <td className={`${tdCls} text-xs text-slate-500`}>
                            {c.nullable ? 'Yes' : 'No'}
                          </td>
                        )}
                        <td className={`${tdCls} text-xs text-slate-600`}>
                          {isMeasure
                            ? 'Calculated numeric value suitable for charts and KPI cards.'
                            : 'Categorical attribute used for slicer filters and chart axes.'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
